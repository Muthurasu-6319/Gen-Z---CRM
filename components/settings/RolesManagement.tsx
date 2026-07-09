// src/components/settings/RolesManagement.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../../apiClient';
import { PlusIcon, TrashIcon, PencilIcon } from '../icons/Icons';
import { PageId } from '../../types';
import { PERMISSION_PARENT_MAP } from '../../config/pages';

import { ALL_PAGES } from '../../config/pages';

export interface Role {
    id: string;
    name: string;
    permissions: any;
}

const PAGES: PageId[] = ALL_PAGES.map(p => p.id as PageId);

const RolesManagement: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [newRoleName, setNewRoleName] = useState('');
    const [loading, setLoading] = useState(false);
    const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const [editingRoleName, setEditingRoleName] = useState('');
    const [draftPermissions, setDraftPermissions] = useState<any>({});

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const data = await api.get('/api/roles');
            setRoles(data || []);
        } catch (err) {
            console.error('Error fetching roles', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleCreateRole = async () => {
        if (!newRoleName) return;
        try {
            await api.post('/api/roles', { name: newRoleName, permissions: {} });
            setNewRoleName('');
            fetchRoles();
        } catch (err: any) {
            alert('Failed to create role: ' + err.message);
        }
    };

    const handleDeleteRole = async (id: string) => {
        if (!window.confirm('Delete this role?')) return;
        try {
            await api.delete(`/api/roles/${id}`);
            fetchRoles();
        } catch (err: any) {
            alert('Failed to delete role: ' + err.message);
        }
    };

    const handleUpdateRoleName = async (role: Role) => {
        if (!editingRoleName) return;
        try {
            await api.put(`/api/roles/${role.id}`, { ...role, name: editingRoleName });
            setEditingRoleId(null);
            fetchRoles();
        } catch (err: any) {
            alert('Failed to update role name: ' + err.message);
        }
    };

    const handleTogglePermission = (page: PageId, action: 'view' | 'create' | 'edit' | 'delete') => {
        setDraftPermissions((prev: any) => {
            const updated = { ...prev };
            updated[page] = { ...(updated[page] || {}) };
            updated[page][action] = !updated[page][action];
            return updated;
        });
    };

    const handleSavePermissions = async (role: Role) => {
        try {
            await api.put(`/api/roles/${role.id}`, { ...role, permissions: draftPermissions });
            alert('Permissions saved successfully!');
            fetchRoles();
        } catch (err: any) {
            alert('Failed to save permissions: ' + err.message);
        }
    };

    return (
        <div className="mt-8 bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Roles & Permissions Management</h2>
            <div className="flex space-x-2 mb-6">
                <input 
                    className="border rounded-md p-2 flex-1 focus:ring-primary focus:border-primary" 
                    placeholder="New Role Name (e.g. Web Developer)" 
                    value={newRoleName} 
                    onChange={e => setNewRoleName(e.target.value)} 
                />
                <button 
                    onClick={handleCreateRole} 
                    className="bg-primary text-white px-4 py-2 rounded-md flex items-center hover:bg-primary-dark transition-colors"
                >
                    <PlusIcon className="w-5 h-5 mr-1" /> Add Role
                </button>
            </div>
            
            {loading ? <p>Loading...</p> : (
                <div className="space-y-4">
                    {roles.map(role => (
                        <div key={role.id} className="border rounded-lg bg-gray-50 overflow-hidden shadow-sm">
                            <div 
                                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => {
                                    if (editingRoleId !== role.id) {
                                        if (expandedRoleId !== role.id) {
                                            setExpandedRoleId(role.id);
                                            setDraftPermissions(JSON.parse(JSON.stringify(role.permissions || {})));
                                        } else {
                                            setExpandedRoleId(null);
                                        }
                                    }
                                }}
                            >
                                <div className="flex items-center space-x-2 flex-1">
                                    {editingRoleId === role.id ? (
                                        <div className="flex space-x-2" onClick={e => e.stopPropagation()}>
                                            <input 
                                                autoFocus
                                                value={editingRoleName}
                                                onChange={e => setEditingRoleName(e.target.value)}
                                                className="border rounded px-2 py-1 text-sm"
                                            />
                                            <button 
                                                onClick={() => handleUpdateRoleName(role)}
                                                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                                            >
                                                Save
                                            </button>
                                            <button 
                                                onClick={() => setEditingRoleId(null)}
                                                className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <h3 className="text-lg font-semibold text-gray-800">{role.name}</h3>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setEditingRoleId(role.id); setEditingRoleName(role.name); }}
                                                className="text-gray-400 hover:text-primary p-1 ml-2"
                                                title="Edit Role Name"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full ml-4">
                                                {expandedRoleId === role.id ? 'Close' : 'Edit Permissions'}
                                            </span>
                                        </>
                                    )}
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id); }} 
                                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                    title="Delete Role"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                            
                            {expandedRoleId === role.id && (
                                <div className="p-4 border-t bg-white">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-semibold text-gray-700">Edit Permissions for {role.name}</h4>
                                        <button 
                                            onClick={() => handleSavePermissions(role)}
                                            className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark transition-colors"
                                        >
                                            Save Permissions
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {PAGES.map(page => (
                                            <div key={page} className="border p-3 rounded-md bg-gray-50 shadow-sm">
                                                <div className="font-semibold text-sm mb-3 capitalize text-primary border-b pb-1">
                                                    {page.replace('-', ' ')}
                                                </div>
                                                <div className="flex flex-col space-y-2 text-sm">
                                                    {['view', 'create', 'edit', 'delete'].map(action => (
                                                        <label key={action} className="flex items-center space-x-2 cursor-pointer">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={!!draftPermissions?.[page]?.[action as any]}
                                                                onChange={() => handleTogglePermission(page, action as any)}
                                                                className="rounded text-primary focus:ring-primary h-4 w-4"
                                                            />
                                                            <span className="capitalize text-gray-700">{action}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RolesManagement;
