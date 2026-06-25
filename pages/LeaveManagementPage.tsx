// src/pages/LeaveManagementPage.tsx (This is for Admins)

import React, { useState, useEffect } from 'react';
import { api } from '../apiClient';
import { usePermissions } from '../components/auth/PermissionsContext';
import { Leave, User } from '../types';
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
    
    // v-- PUDHU STATE: Entha request ippo update aagitu irukku nu track panna --v
    const [updatingLeaveId, setUpdatingLeaveId] = useState<number | null>(null);

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

            setUpdatingLeaveId(null); // Loading state stop pannurom

            // 2. Apparam, notification anuppurom
            if (leave.requesting_profile?.id) {
                await api.post('/api/notifications', {
                    recipient_profile_id: leave.requesting_profile.id,
                    message: `Your leave request for ${leave.start_date} has been ${status}.`,
                    related_item_type: 'leave',
                    related_item_id: leave.id.toString(),
                });
            }
        } catch (updateError: any) {
            setUpdatingLeaveId(null); // Error na loading ah stop pannurom
            alert(`Error updating status: ${updateError.message || updateError}`);
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
                                    {/* Pudhu Loading state ah inga use panrom */}
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
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default LeaveManagementPage;