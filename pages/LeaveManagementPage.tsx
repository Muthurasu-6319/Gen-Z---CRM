// src/pages/LeaveManagementPage.tsx (This is for Admins)

import React, { useState, useEffect } from 'react';
import { api } from '../apiClient';
import { usePermissions } from '../components/auth/PermissionsContext';
import { Leave, User } from '../types';
import { PencilIcon, TrashIcon } from '../components/icons/Icons';
import AccessDeniedPage from './AccessDeniedPage';

interface LeaveWithProfile extends Leave {
    requesting_profile: Pick<User, 'id' | 'username'> | null;
}

const statusColors: { [key: string]: string } = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Approved: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
};

const LeaveManagementPage: React.FC<{ title: string }> = ({ title }) => {
    const { currentProfile, loading: profileLoading } = usePermissions();
    const [allLeaves, setAllLeaves] = useState<LeaveWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [updatingLeaveId, setUpdatingLeaveId] = useState<number | null>(null);
    const [editingLeave, setEditingLeave] = useState<LeaveWithProfile | null>(null);
    const [editForm, setEditForm] = useState({ start_date: '', end_date: '', reason: '', status: '' });

    const isAdmin = currentProfile?.role === 'Admin';

    useEffect(() => {
        const fetchAllLeaves = async () => {
            if (currentProfile?.role !== 'Admin') {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const data = await api.get('/api/leave');
                const mapped = data.map((l: any) => ({
                    ...l,
                    requesting_profile: { id: l.profile_id, username: l.username }
                }));
                setAllLeaves(mapped);
            } catch (error: any) {
                console.error("Error fetching all leaves:", error.message || error);
            }
            setLoading(false);
        };
        if (!profileLoading) {
            fetchAllLeaves();
        }
    }, [profileLoading, currentProfile]);

    const handleUpdateStatus = async (leave: LeaveWithProfile, status: 'Approved' | 'Rejected') => {
        if (!currentProfile || !isAdmin) return;

        setUpdatingLeaveId(leave.id); // Loading state start pannurom

        try {
            await api.put(`/api/leave/${leave.id}`, { status: status, approved_by: currentProfile.id });
            
            // 1. SUCCESS! Ippo namma local state ah manual ah update panrom
            setAllLeaves(prevLeaves => 
                prevLeaves.map(l => 
                    l.id === leave.id ? { ...l, status: status } : l
                )
            );

            // The global notification interceptor will automatically send the email.
            // We can keep this manual notification or rely solely on the global one.
            // Since we implemented the global interceptor, it handles this. So we can safely leave this or remove it.
            // For safety, we just let the global interceptor handle the email + in-app notification.
            
            alert(`Leave request updated successfully.`);
        } catch (updateError: any) {
            setUpdatingLeaveId(null);
            alert(`Error updating status: ${updateError.message || updateError}`);
        }
    };

    const handleDelete = async (leaveId: number) => {
        if (!isAdmin) return;
        if (!window.confirm("Are you sure you want to delete this leave request?")) return;
        
        try {
            await api.delete(`/api/leave/${leaveId}`);
            setAllLeaves(prev => prev.filter(l => l.id !== leaveId));
            alert("Leave request deleted. Admin will be notified.");
        } catch (error: any) {
            alert(`Error deleting leave: ${error.message || error}`);
        }
    };

    const openEditModal = (leave: LeaveWithProfile) => {
        setEditingLeave(leave);
        setEditForm({
            start_date: leave.start_date.split('T')[0],
            end_date: leave.end_date.split('T')[0],
            reason: leave.reason,
            status: leave.status
        });
    };

    const handleSaveEdit = async () => {
        if (!editingLeave || !isAdmin) return;
        setUpdatingLeaveId(editingLeave.id);
        
        try {
            await api.put(`/api/leave/${editingLeave.id}`, {
                ...editForm,
                approved_by: currentProfile.id
            });
            
            setAllLeaves(prev => prev.map(l => 
                l.id === editingLeave.id ? { ...l, ...editForm } : l
            ));
            
            setEditingLeave(null);
            setUpdatingLeaveId(null);
            alert("Leave request updated successfully.");
        } catch (error: any) {
            setUpdatingLeaveId(null);
            alert(`Error saving edit: ${error.message || error}`);
        }
    };


    if (profileLoading) {
        return <div className="p-8 text-center text-gray-500">Loading User Permissions...</div>;
    }

    if (!isAdmin) {
        return <AccessDeniedPage />;
    }

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading Leave Requests...</td></tr>
                        ) : allLeaves.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">No leave requests found.</td></tr>
                        ) : allLeaves.map(leave => (
                            <tr key={leave.id}>
                                <td className="px-6 py-4 font-medium">{leave.requesting_profile?.username}</td>
                                <td className="px-6 py-4">{leave.start_date}</td>
                                <td className="px-6 py-4">{leave.end_date}</td>
                                <td className="px-6 py-4 max-w-sm truncate">{leave.reason}</td>
                                <td className="px-6 py-4"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[leave.status]}`}>{leave.status}</span></td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    {leave.status === 'Pending' && (
                                        <>
                                            <button 
                                                onClick={() => handleUpdateStatus(leave, 'Approved')} 
                                                disabled={updatingLeaveId === leave.id}
                                                className="px-2 py-1 text-xs text-white bg-green-500 rounded hover:bg-green-600 disabled:opacity-50"
                                            >
                                                {updatingLeaveId === leave.id ? '...' : 'Approve'}
                                            </button>
                                            <button 
                                                onClick={() => handleUpdateStatus(leave, 'Rejected')}
                                                disabled={updatingLeaveId === leave.id}
                                                className="px-2 py-1 text-xs text-white bg-red-500 rounded hover:bg-red-600 disabled:opacity-50"
                                            >
                                                {updatingLeaveId === leave.id ? '...' : 'Reject'}
                                            </button>
                                        </>
                                    )}
                                    <button 
                                        onClick={() => openEditModal(leave)} 
                                        className="p-1 text-blue-500 hover:text-blue-700" 
                                        title="Edit"
                                    >
                                        <PencilIcon className="w-5 h-5 inline" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(leave.id)} 
                                        className="p-1 text-red-500 hover:text-red-700" 
                                        title="Delete"
                                    >
                                        <TrashIcon className="w-5 h-5 inline" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {editingLeave && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Edit Leave Request</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                                <input 
                                    type="date" 
                                    value={editForm.start_date} 
                                    onChange={(e) => setEditForm({...editForm, start_date: e.target.value})}
                                    className="mt-1 block w-full p-2 border rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">End Date</label>
                                <input 
                                    type="date" 
                                    value={editForm.end_date} 
                                    onChange={(e) => setEditForm({...editForm, end_date: e.target.value})}
                                    className="mt-1 block w-full p-2 border rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Reason</label>
                                <textarea 
                                    value={editForm.reason} 
                                    onChange={(e) => setEditForm({...editForm, reason: e.target.value})}
                                    className="mt-1 block w-full p-2 border rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <select 
                                    value={editForm.status} 
                                    onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                                    className="mt-1 block w-full p-2 border rounded-md"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button 
                                onClick={() => setEditingLeave(null)} 
                                className="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveEdit} 
                                disabled={updatingLeaveId !== null}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90 disabled:opacity-50"
                            >
                                {updatingLeaveId !== null ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default LeaveManagementPage;