// src/pages/TeamChatPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { api, getStoredToken, API_BASE } from '../apiClient';
import { PaperAirplaneIcon } from '../components/icons/Icons';
import { usePermissions } from '../components/auth/PermissionsContext';

interface Message {
  id: number;
  content: string;
  created_at: string;
  profile_id: string;
  username: string;
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
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const canSendMessage = hasPermission('team-chat', 'create');

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (!currentProfile) return;

    // Fetch history via REST
    api.get<Message[]>('/api/messages')
      .then(data => { setMessages(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });

    // Connect Socket.IO
    const socket = io(API_BASE, { auth: { token: getStoredToken() } });
    socketRef.current = socket;

    socket.on('chat_history', (msgs: Message[]) => setMessages(msgs));
    socket.on('new_message', (msg: Message) => setMessages(prev => [...prev, msg]));
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
      socketRef.current.emit('send_message', newMessage.trim());
    } else {
      // Fallback to REST
      try {
        const msg = await api.post<Message>('/api/messages', { content: newMessage.trim() });
        setMessages(prev => [...prev, msg]);
      } catch { alert('Failed to send message.'); }
    }
    setNewMessage('');
  };

  const handleTyping = () => socketRef.current?.emit('typing');

  if (loading) return <div className="p-8 text-center">Loading chat...</div>;
  if (error)   return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="flex h-[calc(100vh-128px)] bg-white rounded-lg shadow-md">
      <div className="w-64 bg-sidebar-bg text-sidebar-text p-4 border-r border-gray-700 flex-shrink-0">
        <h2 className="text-lg font-bold text-white mb-4">Online ({onlineUsers.length})</h2>
        <ul>
          {onlineUsers.map(user => (
            <li key={user.id} className="flex items-center p-2 rounded-md text-gray-300">
              <span className="h-2 w-2 bg-green-400 rounded-full mr-3"></span>
              {user.username}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col flex-1">
        <div className="border-b p-4"><h1 className="text-xl font-bold text-text-primary"># General Chat</h1></div>
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-4">
            {messages.map(message => (
              <div key={message.id} className={`flex items-end gap-2 ${message.profile_id === currentProfile?.id ? 'justify-end' : 'justify-start'}`}>
                {message.profile_id !== currentProfile?.id && <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0"></div>}
                <div className={`max-w-md p-3 rounded-lg ${message.profile_id === currentProfile?.id ? 'bg-primary text-white' : 'bg-gray-100 text-text-primary'}`}>
                  {message.profile_id !== currentProfile?.id && <p className="text-sm font-semibold mb-1">{message.username || 'Unknown'}</p>}
                  <p>{message.content}</p>
                  <p className={`text-xs mt-1 ${message.profile_id === currentProfile?.id ? 'text-indigo-200' : 'text-gray-500'}`}>{new Date(message.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <div className="h-6 px-6 text-sm text-gray-500 italic">
          {typingUsers.length > 0 && `${typingUsers.join(', ')} is typing...`}
        </div>
        {canSendMessage && (
          <div className="border-t p-4 bg-gray-50">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
              <input
                type="text" value={newMessage}
                onChange={e => { setNewMessage(e.target.value); handleTyping(); }}
                placeholder="Type a message..."
                className="flex-1 block w-full px-4 py-2 border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              />
              <button type="submit" className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary text-white hover:bg-primary-dark">
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