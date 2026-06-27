// src/pages/UserManagementPage.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { api } from '../apiClient';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/icons/Icons';
import CreateUserModal from '../components/users/CreateUserModal';
import EditUserModal from '../components/users/EditUserModal';
import { User } from '../types';
import { usePermissions } from '../components/auth/PermissionsContext';

const roleColors: { [key: string]: string } = {
  Admin: 'bg-red-100 text-red-800',
  Staff: 'bg-yellow-100 text-yellow-800',
  Client: 'bg-blue-100 text-blue-800',
};

const ClientsPage: React.FC<{ title: string }> = ({ title }) => {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { hasPermission, currentProfile } = usePermissions();
  const canCreate = hasPermission('user-management', 'create');
  const canEdit   = hasPermission('user-management', 'edit');
  const canDelete = hasPermission('user-management', 'delete');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<User[]>('/api/users');
      setUsers(data.filter(u => u.role === 'Client'));
    } catch (err: any) {
      setError(`Failed to load users: ${err.message}`);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

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

  const handleDeleteUser = async (userToDelete: User) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${userToDelete.username}"?`)) return;
    setLoading(true);
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.username}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColors[user.role]}`}>{user.role}</span></td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.designation}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.mobile}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  {canEdit   && <button onClick={() => handleEditUser(user)}   className="p-1 text-gray-400 hover:text-primary"><PencilIcon className="h-5 w-5" /></button>}
                  {canDelete && currentProfile?.id !== user.id && <button onClick={() => handleDeleteUser(user)} className="p-1 text-red-400 hover:text-red-600"><TrashIcon className="h-5 w-5" /></button>}
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
    </>
  );
};

export default ClientsPage;