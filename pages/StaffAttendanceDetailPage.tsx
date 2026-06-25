// src/pages/StaffAttendanceDetailPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../apiClient';
import { AttendanceRecord, AttendanceBreak } from '../types';
import { TrashIcon } from '../components/icons/Icons';
import { usePermissions } from '../components/auth/PermissionsContext';

interface DailyLog {
    date: string;
    entries: (AttendanceRecord & { attendance_breaks: AttendanceBreak[] })[];
}

interface StaffDetailPageProps {
    profileId: string;
    setActivePage: (page: string) => void;
}

// Helper to calculate duration
const calculateDuration = (start: string, end: string | null) => {
    if (!end) return 'Ongoing';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
};

const StaffAttendanceDetailPage: React.FC<StaffDetailPageProps> = ({ profileId, setActivePage }) => {
    const [logs, setLogs] = useState<DailyLog[]>([]);
    const [staffName, setStaffName] = useState('');
    const [loading, setLoading] = useState(true);
    const { hasPermission } = usePermissions();
    const canDelete = hasPermission('attendance', 'delete');

    const fetchDetails = useCallback(async () => {
        if (!profileId) return;
        setLoading(true);
        try {
            const [profiles, attendance] = await Promise.all([
                api.get('/api/users'),
                api.get('/api/attendance')
            ]);
            const profile = profiles.find((u: any) => u.id === profileId);
            if (profile) setStaffName(profile.username);
            
            const entriesData = attendance.filter((entry: any) => entry.profile_id === profileId);
            const groupedByDate = entriesData.reduce((acc: any, entry: any) => {
                const date = new Date(entry.date).toDateString();
                if (!acc[date]) acc[date] = [];
                acc[date].push(entry);
                return acc;
            }, {});

            const dailyLogs: DailyLog[] = Object.keys(groupedByDate).map(date => ({ date, entries: groupedByDate[date] }));
            setLogs(dailyLogs);
        } catch (error) {
             console.error("Error fetching staff summary:", error);
        }
        setLoading(false);
    }, [profileId]);

    useEffect(() => { fetchDetails(); }, [fetchDetails]);

    const handleDeleteEntry = async (entryId: number) => {
        if (!window.confirm("Are you sure you want to delete this entire entry (including breaks)?")) return;
        try {
            await api.delete(`/api/attendance/${entryId}`);
            alert('Entry deleted.');
            fetchDetails(); // Refresh the list
        } catch (err: any) {
            alert(`Failed to delete entry: ${err.message || err}`);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading details for {staffName}...</div>;

    return (
        <div>
            <button onClick={() => setActivePage('attendance')} className="text-primary hover:underline mb-4 inline-block">&larr; Back to All Staff</button>
            <h1 className="text-3xl font-bold text-text-primary mb-6">Attendance Log: {staffName}</h1>
            
            <div className="space-y-6">
                {logs.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No attendance records found for this staff member.</p>
                ) : (
                    logs.map(log => (
                        <div key={log.date} className="bg-white shadow-md rounded-lg p-4">
                            <h2 className="text-xl font-semibold mb-3">{log.date}</h2>
                            {log.entries.map(entry => (
                                <div key={entry.id} className="border-t pt-3 mt-3 first:mt-0 first:border-t-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p><strong>Check In:</strong> {new Date(entry.check_in_time).toLocaleTimeString()}</p>
                                            {entry.check_out_time ? (
                                                <p><strong>Check Out:</strong> {new Date(entry.check_out_time).toLocaleTimeString()}</p>
                                            ) : (
                                                <p className="text-yellow-600"><strong>Status:</strong> {entry.status}</p>
                                            )}
                                            <p className="font-semibold mt-1">Total Duration: {calculateDuration(entry.check_in_time, entry.check_out_time)}</p>
                                        </div>
                                        {canDelete && (
                                            <button onClick={() => handleDeleteEntry(entry.id)} className="p-1 text-red-400 hover:text-red-600" title="Delete Entry"><TrashIcon className="h-5 w-5"/></button>
                                        )}
                                    </div>
                                    {entry.attendance_breaks.length > 0 && (
                                        <div className="mt-2 pl-5 text-sm">
                                            <p className="font-semibold">Breaks:</p>
                                            <ul className="list-disc list-inside text-gray-600">
                                                {entry.attendance_breaks.map(br => (
                                                    <li key={br.id}>
                                                        {new Date(br.break_start_time).toLocaleTimeString()} - {br.break_end_time ? new Date(br.break_end_time).toLocaleTimeString() : 'Ongoing'}
                                                        <span className="ml-2">({calculateDuration(br.break_start_time, br.break_end_time)})</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default StaffAttendanceDetailPage;