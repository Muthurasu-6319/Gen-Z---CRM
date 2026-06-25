// src/pages/MyLeaveRequestsPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../apiClient';
import { usePermissions } from '../components/auth/PermissionsContext';
import { Leave } from '../types';
import { PlusIcon } from '../components/icons/Icons';
import Modal from '../components/common/Modal';

const statusColors: { [key: string]: string } = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Approved: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
};

const MyLeaveRequestsPage: React.FC<{ title: string }> = ({ title }) => {
    const { currentProfile } = usePermissions();
    const [myLeaves, setMyLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Namma ippo 2 modal states vechirukkom
    const [isRequestModalOpen, setRequestModalOpen] = useState(false);
    const [isInfoModalOpen, setInfoModalOpen] = useState(false); // <-- Pudhu state for alert
    
    const [isSaving, setIsSaving] = useState(false);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    const fetchMyLeaves = useCallback(async () => {
        if (!currentProfile) return;
        setLoading(true);
        try {
            const data = await api.get('/api/leave');
            setMyLeaves(data || []);
        } catch (err) {
            console.error("Error fetching my leaves:", err);
        }
        setLoading(false);
    }, [currentProfile]);

    useEffect(() => {
        if (currentProfile) {
            fetchMyLeaves();
        }
    }, [fetchMyLeaves, currentProfile]);

    const handleModalOpen = async () => {
        if (!currentProfile) return;
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
        
        try {
            const leavesList = await api.get('/api/leave');
            const count = leavesList.filter((l: any) => l.start_date >= firstDayOfMonth && l.start_date <= lastDayOfMonth).length;

            const LEAVE_LIMIT = 2;
            if (count >= LEAVE_LIMIT) {
                setInfoModalOpen(true);
            } else {
                setRequestModalOpen(true);
            }
        } catch (err: any) {
            alert(`Error checking leave limit: ${err.message || err}`);
        }
    };
    
    const handleRequestLeave = async () => {
        if (!startDate || !endDate || !reason || !currentProfile) return alert("Please fill all the fields.");
        setIsSaving(true);
        try {
            const leaveData = await api.post('/api/leave', { start_date: startDate, end_date: endDate, reason: reason });
            const admins = await api.get('/api/users').then(users => users.filter((u: any) => u.role === 'Admin'));
            if (admins && admins.length > 0) {
                await Promise.all(admins.map((admin: any) => 
                    api.post('/api/notifications', {
                        recipient_profile_id: admin.id,
                        message: `${currentProfile.username} has requested leave from ${startDate} to ${endDate}.`,
                        related_item_type: 'leave',
                        related_item_id: leaveData.id.toString(),
                    }).catch(e => console.error("Error sending leave notification:", e))
                ));
            }
            setRequestModalOpen(false);
            setStartDate(''); setEndDate(''); setReason('');
            fetchMyLeaves();
        } catch (err: any) {
            alert(`Error submitting request: ${err.message || err}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
                <button onClick={handleModalOpen} className="inline-flex items-center bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark">
                    <PlusIcon className="h-5 w-5 mr-2" /> Request New Leave
                </button>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th></tr></thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (<tr><td colSpan={4} className="p-8 text-center">Loading...</td></tr>) : 
                        myLeaves.map(leave => (
                            <tr key={leave.id}>
                                <td className="px-6 py-4">{leave.start_date}</td>
                                <td className="px-6 py-4">{leave.end_date}</td>
                                <td className="px-6 py-4 max-w-sm truncate">{leave.reason}</td>
                                <td className="px-6 py-4"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[leave.status]}`}>{leave.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Leave Request Form Modal */}
            <Modal isOpen={isRequestModalOpen} onClose={() => setRequestModalOpen(false)} title="Request New Leave">
                <div className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Start Date</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">End Date</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Reason</label>
                        <textarea rows={4} value={reason} onChange={e => setReason(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"></textarea>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button onClick={handleRequestLeave} disabled={isSaving} className="px-4 py-2 text-sm text-white bg-primary rounded-md">
                            {isSaving ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Leave Limit Info Modal */}
            <Modal isOpen={isInfoModalOpen} onClose={() => setInfoModalOpen(false)} title="Leave Limit Reached">
                <div className="text-center">
                    <p className="text-text-secondary mb-6">
                        You have already submitted 2 leave requests this month. To request additional leave, please contact your administrator directly.
                    </p>
                    <button onClick={() => setInfoModalOpen(false)} className="px-4 py-2 text-sm text-white bg-primary rounded-md">
                        OK
                    </button>
                </div>
            </Modal>
        </>
    );
};

export default MyLeaveRequestsPage;