import React, { useState, useEffect } from 'react';
import { api } from '../apiClient';
import { PlusIcon, SearchIcon, ChatIcon, CheckCircleIcon, XIcon, PaperAirplaneIcon, TrashIcon } from '../components/icons/Icons';
import { usePermissions } from '../components/auth/PermissionsContext';
import { User } from '../types';

interface Reply {
  profile_id: string;
  username: string;
  content: string;
  created_at: string;
}

interface Ticket {
  id: number;
  ticket_number: string;
  title: string;
  category: string;
  priority: string;
  description: string;
  status: string;
  client_id: string;
  client_username: string;
  assigned_to: string | null;
  internal_notes: string;
  replies: string; // JSON string
  created_at: string;
}

const TicketsPage: React.FC<{ title: string }> = ({ title }) => {
  const { currentProfile, hasPermission } = usePermissions();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Form state
  const [newTicket, setNewTicket] = useState({ title: '', category: 'Website Error', priority: 'Medium', description: '' });
  const [replyContent, setReplyContent] = useState('');

  const canCreate = hasPermission('support-ticket', 'create') || currentProfile?.role === 'Client';
  const canEdit = hasPermission('support-ticket', 'edit');

  const fetchTicketsAndUsers = async () => {
    setLoading(true);
    try {
      const [ticketsData, usersData] = await Promise.all([
        api.get<Ticket[]>('/api/tickets'),
        api.get<User[]>('/api/users')
      ]);
      
      // If client, filter to only their tickets
      if (currentProfile?.role === 'Client') {
        setTickets(ticketsData.filter(t => t.client_id === currentProfile.id));
      } else {
        setTickets(ticketsData);
      }
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load tickets', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentProfile) fetchTicketsAndUsers();
  }, [currentProfile]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.post<Ticket>('/api/tickets', newTicket);
      setTickets([created, ...tickets]);
      setCreateModalOpen(false);
      setNewTicket({ title: '', category: 'Website Error', priority: 'Medium', description: '' });
    } catch (error) {
      alert('Error creating ticket');
    }
  };

  const handleStatusChange = async (ticket: Ticket, newStatus: string) => {
    if (!canEdit) return;
    try {
      const updated = await api.put<Ticket>(`/api/tickets/${ticket.id}`, { status: newStatus });
      setTickets(tickets.map(t => t.id === ticket.id ? updated : t));
      if (selectedTicket?.id === ticket.id) setSelectedTicket(updated);
    } catch (error) {
      alert('Error updating status');
    }
  };
  
  const handleAssigneeChange = async (ticket: Ticket, assigned_to: string) => {
    if (!canEdit) return;
    try {
      const updated = await api.put<Ticket>(`/api/tickets/${ticket.id}`, { assigned_to });
      setTickets(tickets.map(t => t.id === ticket.id ? updated : t));
      if (selectedTicket?.id === ticket.id) setSelectedTicket(updated);
    } catch (error) {
      alert('Error assigning ticket');
    }
  };

  const handleSendReply = async () => {
    if (!replyContent.trim() || !selectedTicket || !currentProfile) return;
    
    let currentReplies: Reply[] = [];
    try { currentReplies = JSON.parse(selectedTicket.replies || '[]'); } catch (e) {}
    
    const newReply: Reply = {
      profile_id: currentProfile.id,
      username: currentProfile.username,
      content: replyContent.trim(),
      created_at: new Date().toISOString()
    };
    
    const updatedReplies = [...currentReplies, newReply];
    
    try {
      const updated = await api.put<Ticket>(`/api/tickets/${selectedTicket.id}`, { replies: JSON.stringify(updatedReplies) });
      setTickets(tickets.map(t => t.id === selectedTicket.id ? updated : t));
      setSelectedTicket(updated);
      setReplyContent('');
    } catch (error) {
      alert('Failed to send reply');
    }
  };

  const handleDeleteTicket = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    try {
      await api.delete(`/api/tickets/${id}`);
      setTickets(tickets.filter(t => t.id !== id));
      if (selectedTicket?.id === id) {
        setSelectedTicket(null);
      }
    } catch (error) {
      alert('Error deleting ticket');
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.client_username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const staffUsers = users.filter(u => u.role !== 'Client');

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Support Tickets...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and respond to support requests</p>
        </div>
        {canCreate && (
          <button onClick={() => setCreateModalOpen(true)} className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors shadow-sm">
            <PlusIcon className="w-5 h-5 mr-2" /> New Ticket
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="relative w-64">
            <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title & Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category / Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                {currentProfile?.role !== 'Client' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary">
                    {ticket.ticket_number}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{ticket.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{ticket.client_username} • {new Date(ticket.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {ticket.category}
                    </span>
                    <div className={`text-xs mt-2 font-semibold ${ticket.priority === 'Urgent' ? 'text-red-600' : ticket.priority === 'High' ? 'text-orange-500' : 'text-green-600'}`}>
                      {ticket.priority}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      ticket.status === 'Open' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                      ticket.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                      'bg-green-50 text-green-700 border-green-200'
                    }`}>
                      {ticket.status}
                    </span>
                  </td>
                  {currentProfile?.role !== 'Client' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <select
                      value={ticket.assigned_to || ''}
                      onChange={(e) => handleAssigneeChange(ticket, e.target.value)}
                      disabled={!canEdit}
                      className="border-gray-300 rounded-md text-sm shadow-sm focus:ring-primary focus:border-primary disabled:bg-gray-100"
                    >
                      <option value="">Unassigned</option>
                      {staffUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.username}</option>
                      ))}
                    </select>
                  </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => setSelectedTicket(ticket)}
                      className="text-primary hover:text-primary-dark inline-flex items-center bg-indigo-50 px-3 py-1.5 rounded-md transition-colors mb-2 md:mb-0 md:mr-2"
                    >
                      <ChatIcon className="w-4 h-4 mr-1.5" /> View / Reply
                    </button>
                    {currentProfile?.role === 'Admin' && (
                      <button 
                        onClick={() => handleDeleteTicket(ticket.id)}
                        className="text-red-600 hover:text-red-800 inline-flex items-center bg-red-50 px-3 py-1.5 rounded-md transition-colors"
                      >
                        <TrashIcon className="w-4 h-4 mr-1.5" /> Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No support tickets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Raise Support Ticket</h2>
              <button onClick={() => setCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <XIcon className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Title</label>
                <input required type="text" value={newTicket.title} onChange={e => setNewTicket({...newTicket, title: e.target.value})} className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary focus:border-primary" placeholder="E.g. Cannot upload image to slider" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={newTicket.category} onChange={e => setNewTicket({...newTicket, category: e.target.value})} className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary focus:border-primary">
                    <option>Website Error</option>
                    <option>App Bug</option>
                    <option>Billing Query</option>
                    <option>New Feature Request</option>
                    <option>SEO Update</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={newTicket.priority} onChange={e => setNewTicket({...newTicket, priority: e.target.value})} className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary focus:border-primary">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea required rows={4} value={newTicket.description} onChange={e => setNewTicket({...newTicket, description: e.target.value})} className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary focus:border-primary" placeholder="Describe the issue in detail..."></textarea>
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100">
                <button type="button" onClick={() => setCreateModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark">Submit Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW / REPLY MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden animate-fade-in-up">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  {selectedTicket.ticket_number} - {selectedTicket.title}
                </h2>
                <div className="text-xs text-gray-500 mt-1">Raised by {selectedTicket.client_username} • {new Date(selectedTicket.created_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-4">
                {canEdit && (
                  <select 
                    value={selectedTicket.status} 
                    onChange={(e) => handleStatusChange(selectedTicket, e.target.value)}
                    className="text-sm border-gray-300 rounded-md focus:ring-primary focus:border-primary shadow-sm"
                  >
                    <option>Open</option>
                    <option>In Progress</option>
                    <option>Resolved</option>
                    <option>Closed</option>
                  </select>
                )}
                <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-gray-600 transition-colors bg-white rounded-full p-1 border">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-6">
              {/* Original Description */}
              <div className="flex flex-col items-start">
                 <span className="text-xs text-gray-500 mb-1 ml-1">{selectedTicket.client_username} (Client)</span>
                 <div className="bg-white border border-gray-200 text-gray-800 p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] relative">
                   <div className="mb-2 pb-2 border-b border-gray-100 grid grid-cols-2 gap-2 text-xs">
                     <p><span className="text-gray-400">Category:</span> <span className="font-semibold">{selectedTicket.category}</span></p>
                     <p><span className="text-gray-400">Priority:</span> <span className={`font-semibold ${selectedTicket.priority === 'Urgent' ? 'text-red-500' : ''}`}>{selectedTicket.priority}</span></p>
                   </div>
                   <p className="whitespace-pre-wrap text-sm">{selectedTicket.description}</p>
                 </div>
              </div>

              {/* Replies */}
              {(() => {
                let parsedReplies: Reply[] = [];
                try { parsedReplies = JSON.parse(selectedTicket.replies || '[]'); } catch(e){}
                return parsedReplies.map((reply, idx) => {
                  const isMe = reply.profile_id === currentProfile?.id;
                  return (
                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className={`text-xs text-gray-500 mb-1 ${isMe ? 'mr-1' : 'ml-1'}`}>{reply.username}</span>
                      <div className={`p-3 rounded-2xl max-w-[85%] shadow-sm text-sm ${isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}`}>
                        <p className="whitespace-pre-wrap">{reply.content}</p>
                        <p className={`text-[10px] mt-2 text-right ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>{new Date(reply.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Reply Input */}
            <div className="p-4 bg-white border-t border-gray-100 flex items-center space-x-3">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendReply(); }}
                placeholder="Type your reply..."
                className="flex-1 bg-gray-100 border-transparent rounded-full px-4 py-3 focus:bg-white focus:border-primary focus:ring-primary sm:text-sm transition-colors"
                disabled={selectedTicket.status === 'Closed'}
              />
              <button 
                onClick={handleSendReply}
                disabled={!replyContent.trim() || selectedTicket.status === 'Closed'} 
                className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TicketsPage;
