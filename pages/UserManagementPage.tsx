// src/pages/UserManagementPage.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { api, API_BASE } from '../apiClient';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '../components/icons/Icons';
import CreateUserModal from '../components/users/CreateUserModal';
import EditUserModal from '../components/users/EditUserModal';
import { User } from '../types';
import { usePermissions } from '../components/auth/PermissionsContext';

const roleColors: { [key: string]: string } = {
  ADMIN: 'bg-red-100 text-red-800',
  STAFF: 'bg-yellow-100 text-yellow-800',
  CLIENT: 'bg-blue-100 text-blue-800',
};

const UserManagementPage: React.FC<{ title: string }> = ({ title }) => {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserForView, setSelectedUserForView] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});

  const togglePassword = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const { hasPermission, currentProfile } = usePermissions();
  const canCreate = hasPermission('user-management', 'create');
  const canEdit   = hasPermission('user-management', 'edit');
  const canDelete = hasPermission('user-management', 'delete');

  const fetchUsers = useCallback(async () => {
    // // setLoading(true) removed for zero-loading UI removed for zero-loading UI
    try {
      const data = await api.get<User[]>('/api/users');
      setUsers(data.filter(u => u.role !== 'Client'));
    } catch (err: any) {
      setError(`Failed to load users: ${err.message}`);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Auto-refresh on ANY CRM data update (Global Real-Time Sync)
  useEffect(() => {
    const handleDataUpdated = () => {
      fetchUsers();
    };
    window.addEventListener('crm:data_updated', handleDataUpdated);
    return () => window.removeEventListener('crm:data_updated', handleDataUpdated);
  }, [fetchUsers]);


  const handleCreateUser = useCallback((newUserData: Omit<User, 'id' | 'user_id'>) => {
    api.post('/api/users', newUserData)
      .then(() => {
        alert('User created successfully!');
        fetchUsers();
        setCreateModalOpen(false);
      })
      .catch((err: any) => {
        alert(`Failed to create user: ${err.message}`);
      });
  }, [fetchUsers]);

  const handleEditUser = (user: User) => { setSelectedUser(user); setEditModalOpen(true); };
  const handleViewUser = (user: User) => { setSelectedUserForView(user); setViewModalOpen(true); };

  const handleDeleteUser = async (userToDelete: User) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${userToDelete.username}"?`)) return;
    // // setLoading(true) removed for zero-loading UI removed for zero-loading UI
    try {
      await api.delete(`/api/users/${userToDelete.id}`);
      alert('User deleted successfully.');
      fetchUsers();
    } catch (err: any) {
      alert(`Failed to delete user: ${err.message}`);
    } finally { setLoading(false); }
  };

  const renderContent = () => {
    if (loading) return <div className="p-8 text-center">Loading users...</div>;
    if (error)   return <div className="p-8 text-center text-red-500">{error}</div>;
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emp ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Password</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {user.profile_picture ? (
                        <img 
                          className="h-10 w-10 rounded-full object-cover" 
                          src={user.profile_picture.startsWith('http') ? user.profile_picture : `${API_BASE}/uploads/${user.profile_picture}`} 
                          alt="" 
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 font-bold border border-indigo-200">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.username}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColors[user.role?.toUpperCase()] || 'bg-gray-100 text-gray-800'}`}>{user.role}</span></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.emp_id || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.mobile}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  <div className="flex items-center space-x-2">
                    <span>{visiblePasswords[user.id] ? (user.password || '******') : '******'}</span>
                    <button onClick={() => togglePassword(user.id)} className="text-gray-400 hover:text-gray-600 focus:outline-none">
                      {visiblePasswords[user.id] ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button onClick={() => handleViewUser(user)} className="p-1 text-gray-400 hover:text-blue-500" title="View"><EyeIcon className="h-5 w-5" /></button>
                  {canEdit && <button onClick={() => handleEditUser(user)} className="p-1 text-gray-400 hover:text-primary" title="Edit"><PencilIcon className="h-5 w-5" /></button>}
                  {canDelete && (
                    <button 
                      onClick={() => currentProfile?.id !== user.id && handleDeleteUser(user)} 
                      className={`p-1 ${currentProfile?.id === user.id ? 'text-gray-300 cursor-not-allowed' : 'text-red-400 hover:text-red-600'}`}
                      title={currentProfile?.id === user.id ? "You cannot delete yourself" : "Delete"}
                      disabled={currentProfile?.id === user.id}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
        {canCreate && <button onClick={() => setCreateModalOpen(true)} className="inline-flex items-center bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark"><PlusIcon className="h-5 w-5 mr-2" /> Create User</button>}
      </div>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">{renderContent()}</div>
      {isCreateModalOpen && <CreateUserModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} onCreateUser={handleCreateUser} />}
      {isEditModalOpen  && <EditUserModal isOpen={isEditModalOpen} onClose={() => { setSelectedUser(null); setEditModalOpen(false); }} user={selectedUser} onUserUpdated={fetchUsers} />}
      {isViewModalOpen && <EditUserModal isOpen={isViewModalOpen} onClose={() => { setSelectedUserForView(null); setViewModalOpen(false); }} user={selectedUserForView} onUserUpdated={fetchUsers} readOnly={true} />}
    </>
  );
};

export default UserManagementPage;