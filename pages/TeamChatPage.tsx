import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { api, getStoredToken, API_BASE } from '../apiClient';
import { PaperAirplaneIcon } from '../components/icons/Icons';
import { usePermissions } from '../components/auth/PermissionsContext';
import { User } from '../types';

interface Message {
  id: number;
  content: string;
  created_at: string;
  profile_id: string;
  username: string;
  room_id: string;
}

interface OnlineUser { id: string; username: string; }

const TeamChatPage: React.FC<{ title: string }> = ({ title }) => {
  const { currentProfile, hasPermission } = usePermissions();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  // By default, clients go to Client Chat, Staff go to Staff Chat
  const [currentRoom, setCurrentRoom] = useState<string>('staff_group');
  
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const canSendMessage = hasPermission('team-chat', 'create');

  const isStaff = currentProfile?.role !== 'Client';

  useEffect(() => {
      if (currentProfile) {
          if (!isStaff) {
              setCurrentRoom(''); 
          } else {
              if (hasPermission('chat-staff', 'view') || hasPermission('team-chat', 'view')) {
                  setCurrentRoom('staff_group');
              } else if (hasPermission('chat-client', 'view')) {
                  setCurrentRoom('client_group');
              } else {
                  setCurrentRoom('');
              }
          }
      }
  }, [currentProfile, isStaff, hasPermission]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch Users
  useEffect(() => {
      api.get<User[]>('/api/users').then(data => {
          if (!isStaff) {
              // For Client: Only show Admins
              const admins = data.filter(u => u.role === 'Admin');
              setAllUsers(admins);
              
              // Set default room to first admin DM
              if (admins.length > 0 && currentProfile) {
                  const ids = [currentProfile.id, admins[0].id].sort();
                  setCurrentRoom(`dm_${ids[0]}_${ids[1]}`);
              }
          } else {
              // For Staff/Admin: Show everyone except themselves
              setAllUsers(data.filter(u => u.id !== currentProfile?.id));
          }
      }).catch(console.error);
  }, [currentProfile, isStaff]);

  // Handle Room Change
  useEffect(() => {
    if (!currentProfile || !currentRoom) return;
    setLoading(true);

    // Fetch history via REST for current room
    api.get<Message[]>(`/api/messages?room_id=${currentRoom}`)
      .then(data => { setMessages(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });

    if (socketRef.current?.connected) {
        socketRef.current.emit('join_room', currentRoom);
    }
  }, [currentRoom, currentProfile]);

  // Setup Socket
  useEffect(() => {
    if (!currentProfile) return;

    const socket = io(API_BASE, { auth: { token: getStoredToken() } });
    socketRef.current = socket;

    socket.on('connect', () => {
        socket.emit('join_room', currentRoom);
    });

    socket.on('new_message', (msg: Message) => {
        setMessages(prev => {
            // Prevent duplicates if REST already fetched it or it's in the same room
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
        });
    });

    socket.on('presence_update', (users: OnlineUser[]) => setOnlineUsers(users));
    socket.on('user_typing', ({ username }: { username: string }) => {
      if (username === currentProfile.username) return;
      setTypingUsers(prev => [...new Set([...prev, username])]);
      setTimeout(() => setTypingUsers(prev => prev.filter(u => u !== username)), 3000);
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [currentProfile]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentProfile) return;
    
    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', { content: newMessage.trim(), room_id: currentRoom });
    } else {
      try {
        const msg = await api.post<Message>('/api/messages', { content: newMessage.trim(), room_id: currentRoom });
        setMessages(prev => [...prev, msg]);
      } catch { alert('Failed to send message.'); }
    }
    setNewMessage('');
  };

  const handleTyping = () => socketRef.current?.emit('typing', currentRoom);

  const startDM = (otherUserId: string) => {
      if (!currentProfile) return;
      const ids = [currentProfile.id, otherUserId].sort();
      setCurrentRoom(`dm_${ids[0]}_${ids[1]}`);
  };

  const getRoomName = () => {
      if (currentRoom === 'staff_group') return '# Staff Group Chat';
      if (currentRoom === 'client_group') return '# Client Group Chat';
      if (currentRoom.startsWith('dm_')) {
          const ids = currentRoom.replace('dm_', '').split('_');
          const otherId = ids[0] === currentProfile?.id ? ids[1] : ids[0];
          const otherUser = allUsers.find(u => u.id === otherId);
          return `Chat with ${otherUser?.username || 'Unknown'}`;
      }
      return '# General';
  };

  if (!currentProfile) return null;

  return (
    <div className="flex h-[calc(100vh-128px)] bg-white rounded-lg shadow-md overflow-hidden">
      {/* Sidebar: Channels & Users */}
      <div className="w-64 bg-sidebar-bg text-sidebar-text flex flex-col border-r border-gray-700 flex-shrink-0 h-full">
        <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold text-white mb-2">Channels</h2>
            <ul className="space-y-1">
                {hasPermission('chat-staff', 'view') && (
                    <li>
                        <button onClick={() => setCurrentRoom('staff_group')} className={`w-full text-left px-3 py-2 rounded-md ${currentRoom === 'staff_group' ? 'bg-primary text-white' : 'hover:bg-gray-700 text-gray-300'}`}>
                            # Staff Chat
                        </button>
                    </li>
                )}
                {hasPermission('chat-client', 'view') && (
                    <li>
                        <button onClick={() => setCurrentRoom('client_group')} className={`w-full text-left px-3 py-2 rounded-md ${currentRoom === 'client_group' ? 'bg-primary text-white' : 'hover:bg-gray-700 text-gray-300'}`}>
                            # Client Chat
                        </button>
                    </li>
                )}
            </ul>
        </div>
        
        {hasPermission('chat-dm', 'view') && (
            <div className="flex-1 overflow-y-auto p-4">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Direct Messages</h2>
                <ul className="space-y-1">
                {allUsers.map(user => {
                    const ids = [currentProfile.id, user.id].sort();
                    const dmRoomId = `dm_${ids[0]}_${ids[1]}`;
                    const isOnline = onlineUsers.some(ou => ou.id === user.id);
                    
                    return (
                        <li key={user.id}>
                            <button onClick={() => startDM(user.id)} className={`w-full flex items-center px-3 py-2 rounded-md ${currentRoom === dmRoomId ? 'bg-primary text-white' : 'hover:bg-gray-700 text-gray-300'}`}>
                                <span className={`h-2 w-2 rounded-full mr-3 ${isOnline ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                                <span className="truncate">{user.username} {user.role === 'Client' && <span className="text-xs text-gray-400 ml-1">(Client)</span>}</span>
                            </button>
                        </li>
                    );
                })}
                </ul>
            </div>
        )}
      </div>
      
      {/* Chat Area */}
      <div className="flex flex-col flex-1 h-full bg-white">
        <div className="border-b p-4 shadow-sm z-10 bg-white flex justify-between items-center">
            <div className="flex flex-col">
                <h1 className="text-xl font-bold text-text-primary flex items-center">
                    {getRoomName()}
                </h1>
                {loading && <span className="text-xs text-gray-400">Loading messages...</span>}
            </div>
            
            <div className="flex items-center">
                <div className="text-xs font-semibold text-gray-400 mr-3 uppercase tracking-wider hidden sm:block">
                    Online — {onlineUsers.length}
                </div>
                <div className="flex -space-x-2 overflow-visible relative">
                    {onlineUsers.slice(0, 5).map(ou => (
                        <div key={ou.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shadow-sm relative group cursor-default">
                            {ou.username.charAt(0).toUpperCase()}
                            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white"></span>
                            
                            {/* Tooltip */}
                            <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-50 transition-opacity">
                                {ou.username}
                            </div>
                        </div>
                    ))}
                    {onlineUsers.length > 5 && (
                        <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs shadow-sm cursor-default">
                            +{onlineUsers.length - 5}
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
          <div className="space-y-4">
            {messages.map((message, idx) => {
              const isMe = message.profile_id === currentProfile?.id;
              const showName = !isMe && (idx === 0 || messages[idx - 1].profile_id !== message.profile_id);
              
              return (
                <div key={message.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {!isMe && (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold flex-shrink-0 text-sm">
                      {(message.username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={`max-w-md p-3 rounded-2xl ${isMe ? 'bg-primary text-white rounded-br-none shadow-sm' : 'bg-white border border-gray-200 text-text-primary rounded-bl-none shadow-sm'}`}>
                    {showName && <p className="text-xs font-bold mb-1 text-indigo-600">{message.username || 'Unknown'}</p>}
                    <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>{new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        <div className="h-6 px-6 text-xs text-gray-500 italic bg-white flex items-center">
          {typingUsers.length > 0 && `${typingUsers.join(', ')} is typing...`}
        </div>
        
        {canSendMessage && (
          <div className="border-t p-4 bg-white">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
              <input
                type="text" value={newMessage}
                onChange={e => { setNewMessage(e.target.value); handleTyping(); }}
                placeholder={`Message ${getRoomName()}`}
                className="flex-1 block w-full px-4 py-3 bg-gray-100 border-transparent rounded-full focus:bg-white focus:border-primary focus:ring-primary sm:text-sm transition-colors"
              />
              <button type="submit" disabled={!newMessage.trim()} className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md">
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamChatPage;