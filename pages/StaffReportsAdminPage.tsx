// src/pages/StaffReportsAdminPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../apiClient';
import { usePermissions } from '../components/auth/PermissionsContext';
import { DailyReport, User } from '../types';
import AccessDeniedPage from './AccessDeniedPage';

const StaffReportsAdminPage: React.FC<{ title: string }> = ({ title }) => {
    const { currentProfile } = usePermissions();
    const [staffList, setStaffList] = useState<User[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [reports, setReports] = useState<DailyReport[]>([]);
    const [performance, setPerformance] = useState<any>(null);
    const [loadingReports, setLoadingReports] = useState(false);

    // Admin ah illana, access illa
    if (currentProfile?.role !== 'Admin') {
        return <AccessDeniedPage />;
    }

    // Staff list ah fetch panrom via REST API
    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const data = await api.get<User[]>('/api/users');
                // Filter Admin and Staff roles
                const filtered = data.filter(u => u.role === 'Admin' || u.role === 'Staff');
                setStaffList(filtered);
            } catch (err) {
                console.error('Error fetching staff:', err);
            }
        };
        fetchStaff();
    }, []);

    // "View Reports" button ah click panna, ithu run aagum
    const handleViewReports = useCallback(async () => {
        if (!selectedStaffId) return;
        setLoadingReports(true);

        try {
            const data = await api.get<DailyReport[]>(
                `/api/reports?profile_id=${selectedStaffId}&month=${selectedMonth}`
            );
            setReports(data || []);

            const perfData = await api.get(`/api/reports/performance?profile_id=${selectedStaffId}`);
            setPerformance(perfData);
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setLoadingReports(false);
        }
    }, [selectedStaffId, selectedMonth]);

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-primary mb-6">{title}</h1>
            
            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Select Staff and Month</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select onChange={e => setSelectedStaffId(e.target.value)} className="p-2 border rounded-md">
                        <option value="">Select a Staff</option>
                        {staffList.map(staff => <option key={staff.id} value={staff.id}>{staff.username}</option>)}
                    </select>
                    <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="p-2 border rounded-md"/>
                    <button onClick={handleViewReports} disabled={!selectedStaffId} className="bg-primary text-white p-2 rounded-md disabled:opacity-50">
                        View Reports
                    </button>
                </div>
            </div>

            {performance && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
                        <div className="text-sm text-gray-500 font-medium">Projects Completed</div>
                        <div className="text-2xl font-bold text-gray-800">{performance.projects_completed}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
                        <div className="text-sm text-gray-500 font-medium">Leads Taken</div>
                        <div className="text-2xl font-bold text-gray-800">{performance.leads_taken}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-purple-500">
                        <div className="text-sm text-gray-500 font-medium">Total Paid Amount</div>
                        <div className="text-2xl font-bold text-gray-800">₹{performance.total_paid}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-red-500">
                        <div className="text-sm text-gray-500 font-medium">Pending Amount</div>
                        <div className="text-2xl font-bold text-gray-800">₹{performance.total_pending}</div>
                    </div>
                </div>
            )}

            {loadingReports ? (
                <div className="text-center p-8">Loading reports...</div>
            ) : reports.length > 0 ? (
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tasks Completed</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th></tr></thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                            {reports.map(report => (
                                <tr key={report.id}><td className="px-6 py-4">{new Date(report.report_date).toLocaleDateString()}</td><td className="px-6 py-4 text-sm text-gray-600 max-w-md whitespace-pre-wrap">{report.tasks_completed}</td><td className="px-6 py-4">{report.hours_spent}</td></tr>
                            ))}
                         </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center p-8 bg-white rounded-lg shadow-md">No reports found for the selected staff and month.</div>
            )}
        </div>
    );
};

export default StaffReportsAdminPage;