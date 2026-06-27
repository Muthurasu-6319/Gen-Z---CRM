// src/pages/MyAttendancePage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../apiClient';
import { usePermissions } from '../components/auth/PermissionsContext';
import { AttendanceRecord, AttendanceBreak } from '../types'; // We'll update types.ts

interface MyAttendance extends AttendanceRecord {
    attendance_breaks: AttendanceBreak[];
}

const MyAttendancePage: React.FC<{ title: string }> = ({ title }) => {
    const { currentProfile } = usePermissions();
    const [records, setRecords] = useState<MyAttendance[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMyAttendance = useCallback(async () => {
        if (!currentProfile) return;
        setLoading(true);
        try {
            const data = await api.get('/api/attendance');
            setRecords(data);
        } catch (err) {
            console.error("Error fetching my attendance:", err);
        }
        setLoading(false);
    }, [currentProfile]);

    useEffect(() => {
        fetchMyAttendance();
    }, [fetchMyAttendance]);
    
    // Simple page, no realtime needed for now as they control it from the header.

    if (loading) return <div className="p-8 text-center">Loading your attendance...</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-primary mb-6">{title}</h1>
            <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">My Records</h2>
                {records.length === 0 ? (
                    <p>You have no attendance records yet.</p>
                ) : (
                    <ul className="space-y-4">
                        {records.map(rec => (
                            <li key={rec.id} className="p-4 border rounded-md">
                                <p className="font-bold text-lg">{new Date(rec.date).toDateString()}</p>
                                <p>Status: <span className="font-semibold">{rec.status}</span></p>
                                <p>Check In: {new Date(rec.check_in_time).toLocaleTimeString()}</p>
                                <p>Check Out: {rec.check_out_time ? new Date(rec.check_out_time).toLocaleTimeString() : 'Not yet'}</p>
                                {rec.attendance_breaks.length > 0 && (
                                    <div className="mt-2">
                                        <p className="font-semibold">Breaks:</p>
                                        <ul className="list-disc list-inside">
                                            {rec.attendance_breaks.map(br => (
                                                <li key={br.id}>
                                                    {new Date(br.break_start_time).toLocaleTimeString()} - {br.break_end_time ? new Date(br.break_end_time).toLocaleTimeString() : 'Ongoing'}
                                                    {br.reason && <span className="ml-2 italic text-gray-500">- Reason: {br.reason}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default MyAttendancePage;