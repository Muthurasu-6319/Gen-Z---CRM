import React, { useState, useCallback, useEffect } from 'react';
import { api } from '../apiClient';
import { PlusIcon, PencilIcon, TrashIcon, UserCircleIcon, DocumentTextIcon, CalculatorIcon, ClockIcon, FolderIcon } from '../components/icons/Icons';
import CreateUserModal from '../components/users/CreateUserModal';
import EditUserModal from '../components/users/EditUserModal';
import { User, Project, Invoice } from '../types';
import { usePermissions } from '../components/auth/PermissionsContext';

const roleColors: { [key: string]: string } = {
  Client: 'bg-blue-100 text-blue-800',
};

const ClientsPage: React.FC<{ title: string }> = ({ title }) => {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewingClient, setViewingClient] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'purchases' | 'payments' | 'documents' | 'timeline'>('profile');
  
  const [users, setUsers] = useState<User[]>([]);
  const [clientProjects, setClientProjects] = useState<Project[]>([]);
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { hasPermission, currentProfile } = usePermissions();
  // Assume clients page uses user-management permissions or custom clients permissions
  const canCreate = hasPermission('user-management', 'create') || hasPermission('clients', 'create');
  const canEdit   = hasPermission('user-management', 'edit') || hasPermission('clients', 'edit');
  const canDelete = hasPermission('user-management', 'delete') || hasPermission('clients', 'delete');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<User[]>('/api/users');
      setUsers(data.filter(u => u.role === 'Client'));
    } catch (err: any) {
      setError(`Failed to load clients: ${err.message}`);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const loadClientDetails = async (client: User) => {
      setViewingClient(client);
      setActiveTab('profile');
      try {
          const [projects, invoices] = await Promise.all([
              api.get<Project[]>('/api/projects'),
              api.get<Invoice[]>('/api/invoices')
          ]);
          setClientProjects(projects.filter(p => p.client_name === client.username || p.client_mobile === client.mobile));
          setClientInvoices(invoices.filter(i => i.client_id === client.id || i.client_name === client.username));
      } catch (e) {
          console.error("Failed to load client specific data", e);
      }
  };

  const handleCreateUser = useCallback((newUserData: Omit<User, 'id' | 'user_id'>) => {
    // Force role to Client
    const clientData = { ...newUserData, role: 'Client' };
    api.post('/api/users', clientData)
      .then(() => {
        alert('Client created successfully!');
        fetchUsers();
        setCreateModalOpen(false);
      })
      .catch((err: any) => {
        alert(`Failed to create client: ${err.message}`);
      });
  }, [fetchUsers]);

  const handleDeleteUser = async (userToDelete: User) => {
    if (!window.confirm(`Are you sure you want to permanently delete client "${userToDelete.username}"?`)) return;
    try {
      await api.delete(`/api/users/${userToDelete.id}`);
      fetchUsers();
      if (viewingClient?.id === userToDelete.id) setViewingClient(null);
    } catch (err: any) {
      alert(`Failed to delete client: ${err.message}`);
    }
  };

  // --- RENDERS ---

  if (viewingClient) {
      return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden min-h-[80vh]">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                      <div className="bg-white p-3 rounded-full text-blue-600">
                          <UserCircleIcon className="w-10 h-10" />
                      </div>
                      <div>
                          <h2 className="text-2xl font-bold">{viewingClient.username}</h2>
                          <p className="text-blue-100">{viewingClient.email} | {viewingClient.mobile || 'No Phone'}</p>
                      </div>
                  </div>
                  <button onClick={() => setViewingClient(null)} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-md transition text-sm font-medium">
                      Back to Clients
                  </button>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 bg-gray-50 flex overflow-x-auto">
                  {[
                      { id: 'profile', label: 'Customer Profile', icon: UserCircleIcon },
                      { id: 'purchases', label: 'Purchase History', icon: DocumentTextIcon },
                      { id: 'payments', label: 'Payment History', icon: CalculatorIcon },
                      { id: 'documents', label: 'Documents', icon: FolderIcon },
                      { id: 'timeline', label: 'Timeline', icon: ClockIcon },
                  ].map(tab => (
                      <button 
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex items-center px-6 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                      >
                          <tab.icon className="w-5 h-5 mr-2" />
                          {tab.label}
                      </button>
                  ))}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                  {activeTab === 'profile' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Contact Persons & Details</h3>
                              <div className="space-y-4">
                                  <div>
                                      <label className="text-xs text-gray-500 uppercase tracking-wider">Primary Name</label>
                                      <p className="font-medium text-gray-900">{viewingClient.username}</p>
                                  </div>
                                  <div>
                                      <label className="text-xs text-gray-500 uppercase tracking-wider">Email Address</label>
                                      <p className="font-medium text-gray-900">{viewingClient.email}</p>
                                  </div>
                                  <div>
                                      <label className="text-xs text-gray-500 uppercase tracking-wider">Mobile Number</label>
                                      <p className="font-medium text-gray-900">{viewingClient.mobile || 'N/A'}</p>
                                  </div>
                                  <div>
                                      <label className="text-xs text-gray-500 uppercase tracking-wider">Billing Address</label>
                                      <p className="font-medium text-gray-900">{viewingClient.address || 'N/A'}</p>
                                  </div>
                              </div>
                          </div>
                          <div>
                              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Financial Overview</h3>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                      <label className="text-xs text-green-600 uppercase tracking-wider">Total Paid</label>
                                      <p className="text-2xl font-bold text-green-700">₹{viewingClient.total_paid || 0}</p>
                                  </div>
                                  <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                      <label className="text-xs text-red-600 uppercase tracking-wider">Total Pending</label>
                                      <p className="text-2xl font-bold text-red-700">₹{viewingClient.total_pending || 0}</p>
                                  </div>
                              </div>
                              <div className="mt-6">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Services Availed</h4>
                                  <div className="flex flex-wrap gap-2">
                                      {viewingClient.services?.length ? viewingClient.services.map(s => (
                                          <span key={s} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium border border-indigo-100">{s}</span>
                                      )) : <span className="text-gray-400 text-sm">No specific services mapped.</span>}
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  {activeTab === 'purchases' && (
                      <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-4">Project Purchase History</h3>
                          {clientProjects.length === 0 ? <p className="text-gray-500 italic">No projects found for this client.</p> : (
                              <table className="min-w-full divide-y divide-gray-200 border rounded-lg overflow-hidden">
                                  <thead className="bg-gray-50">
                                      <tr>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project Name</th>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                                      </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                      {clientProjects.map(p => (
                                          <tr key={p.id}>
                                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.name}</td>
                                              <td className="px-6 py-4 text-sm text-gray-500">{p.category}</td>
                                              <td className="px-6 py-4 text-sm"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">{p.status}</span></td>
                                              <td className="px-6 py-4 text-sm text-gray-900">₹{p.total_cost || 0}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          )}
                      </div>
                  )}

                  {activeTab === 'payments' && (
                      <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-4">Invoice & Payment History</h3>
                          {clientInvoices.length === 0 ? <p className="text-gray-500 italic">No invoices found for this client.</p> : (
                              <table className="min-w-full divide-y divide-gray-200 border rounded-lg overflow-hidden">
                                  <thead className="bg-gray-50">
                                      <tr>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                      </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                      {clientInvoices.map(i => (
                                          <tr key={i.id}>
                                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{i.invoice_number}</td>
                                              <td className="px-6 py-4 text-sm text-gray-500">{new Date(i.created_at).toLocaleDateString()}</td>
                                              <td className="px-6 py-4 text-sm"><span className={`px-2 py-1 rounded-full text-xs ${i.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{i.status}</span></td>
                                              <td className="px-6 py-4 text-sm text-gray-900">₹{i.total || 0}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          )}
                      </div>
                  )}

                  {activeTab === 'documents' && (
                      <div className="text-center py-12">
                          <FolderIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900">No Documents Uploaded</h3>
                          <p className="text-gray-500">Client contracts and proposals will appear here.</p>
                      </div>
                  )}

                  {activeTab === 'timeline' && (
                      <div className="max-w-2xl">
                          <h3 className="text-lg font-semibold text-gray-800 mb-6">Activity Timeline</h3>
                          <div className="relative border-l-2 border-blue-200 ml-4 space-y-8">
                              <div className="relative pl-6">
                                  <div className="absolute w-4 h-4 bg-blue-500 rounded-full -left-[9px] top-1 border-2 border-white"></div>
                                  <p className="text-sm text-gray-500">{new Date(viewingClient.created_at || Date.now()).toLocaleDateString()}</p>
                                  <h4 className="font-semibold text-gray-800">Client Profile Created</h4>
                                  <p className="text-sm text-gray-600 mt-1">Client was added to the CRM system.</p>
                              </div>
                              {clientProjects.map(p => (
                                  <div key={p.id} className="relative pl-6">
                                      <div className="absolute w-4 h-4 bg-indigo-500 rounded-full -left-[9px] top-1 border-2 border-white"></div>
                                      <p className="text-sm text-gray-500">{new Date(p.created_at || Date.now()).toLocaleDateString()}</p>
                                      <h4 className="font-semibold text-gray-800">Purchased Project: {p.name}</h4>
                                      <p className="text-sm text-gray-600 mt-1">Status: {p.status}</p>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // --- CLIENT LIST VIEW ---

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold text-text-primary">Customers / Clients</h1>
            <p className="text-text-secondary mt-1">Manage all your client relationships and histories here.</p>
        </div>
        {canCreate && (
            <button onClick={() => setCreateModalOpen(true)} className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-all">
                <PlusIcon className="h-5 w-5 mr-2" /> Add New Client
            </button>
        )}
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Loading clients...</div> : 
         error ? <div className="p-8 text-center text-red-500">{error}</div> :
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Client Name & Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mobile</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Services</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-blue-50/50 transition-colors cursor-pointer" onClick={() => loadClientDetails(user)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">{user.username}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.mobile || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-1 flex-wrap max-w-[200px]">
                        {user.services?.slice(0,2).map(s => <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{s}</span>)}
                        {user.services && user.services.length > 2 && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">+{user.services.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2" onClick={(e) => e.stopPropagation()}>
                    {canEdit   && <button onClick={() => { setSelectedUser(user); setEditModalOpen(true); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"><PencilIcon className="h-5 w-5" /></button>}
                    {canDelete && currentProfile?.id !== user.id && <button onClick={() => handleDeleteUser(user)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"><TrashIcon className="h-5 w-5" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <div className="p-8 text-center text-gray-500">No clients found. Click 'Add New Client' to get started.</div>}
        </div>}
      </div>

      {isCreateModalOpen && <CreateUserModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} onCreateUser={handleCreateUser} />}
      {isEditModalOpen  && <EditUserModal isOpen={isEditModalOpen} onClose={() => { setSelectedUser(null); setEditModalOpen(false); }} user={selectedUser} onUserUpdated={fetchUsers} />}
    </>
  );
};

export default ClientsPage;