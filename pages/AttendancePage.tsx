// src/pages/AttendancePage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../apiClient';
import { User } from '../types';

interface StaffSummary {
    profile_id: string;
    username: string;
    role: User['role'];
    entry_count: number;
}

interface AttendancePageProps {
  title: string;
  setActivePage: (page: string) => void;
}

const roleColors: { [key: string]: string } = {
  Admin: 'bg-red-100 text-red-800',
  Staff: 'bg-yellow-100 text-yellow-800',
  Client: 'bg-blue-100 text-blue-800',
};

const AttendancePage: React.FC<AttendancePageProps> = ({ title, setActivePage }) => {
    const [staffList, setStaffList] = useState<StaffSummary[]>([]);
    const [loading, setLoading] = useState(true);
    // Default to the current month in 'YYYY-MM' format
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    const fetchStaffSummary = useCallback(async () => {
        setLoading(true);
        try {
            const [profiles, attendance] = await Promise.all([
                api.get('/api/users'),
                api.get('/api/attendance')
            ]);
            
            // Filter attendance to selected month
            const filteredAttendance = attendance.filter((entry: any) => {
                return entry.date && entry.date.slice(0, 7) === selectedMonth;
            });
            
            // Count entries per profile
            const countsMap = new Map<string, number>();
            filteredAttendance.forEach((entry: any) => {
                const pid = entry.profile_id;
                countsMap.set(pid, (countsMap.get(pid) || 0) + 1);
            });
            
            // Map profiles to summaries
            const summaries = profiles
                .filter((u: any) => u.role !== 'Client')
                .map((u: any) => ({
                    profile_id: u.id,
                    username: u.username,
                    role: u.role,
                    entry_count: countsMap.get(u.id) || 0
                }));
            
            setStaffList(summaries);
        } catch (err) {
            console.error("Error fetching staff summary:", err);
        }
        setLoading(false);
    }, [selectedMonth]);

    useEffect(() => {
        fetchStaffSummary();
    }, [fetchStaffSummary]);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                 <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
                 <input 
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
            </div>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Entries ({selectedMonth})</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Details</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-500">Loading...</td></tr>
                        ) : staffList.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-500">No staff activity found for {selectedMonth}.</td></tr>
                        ) : (
                            staffList.map((staff) => (
                                <tr key={staff.profile_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{staff.username}</td>
                                    <td className="px-6 py-4"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColors[staff.role]}`}>{staff.role}</span></td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{staff.entry_count}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => setActivePage(`staff-attendance-detail/${staff.profile_id}`)} className="text-primary hover:underline text-sm font-medium">
                                            View Log
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AttendancePage;