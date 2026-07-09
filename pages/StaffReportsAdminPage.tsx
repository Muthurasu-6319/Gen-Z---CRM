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
    const [fullReport, setFullReport] = useState<any>(null);
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
                // Filter out Clients so we only get Admin, Staff, and custom roles like CTO
                const filtered = data.filter(u => u.role !== 'Client');
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

            const perfData = await api.get(`/api/reports/full_report/${selectedStaffId}`);
            setFullReport(perfData);
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

            {fullReport && (
                <div id="print-area" className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-100 mb-6">
                    <div className="bg-gradient-to-r from-primary to-indigo-600 p-6 text-white flex justify-between items-center">
                        <div>
                            <h2 className="text-3xl font-bold">{fullReport.profile.username}</h2>
                            <p className="text-indigo-100 mt-1">{fullReport.profile.designation} • {fullReport.profile.role}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium opacity-80">Contact</p>
                            <p>{fullReport.profile.email}</p>
                            <p>{fullReport.profile.mobile}</p>
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Financials & HR */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-3">Financials</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                        <div className="text-xs text-green-600 font-bold uppercase">Total Paid</div>
                                        <div className="text-xl font-bold text-green-900">₹{fullReport.financials.total_paid}</div>
                                    </div>
                                    <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                                        <div className="text-xs text-red-600 font-bold uppercase">Pending Salary</div>
                                        <div className="text-xl font-bold text-red-900">₹{fullReport.financials.total_pending}</div>
                                    </div>
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 col-span-2">
                                        <div className="text-xs text-blue-600 font-bold uppercase">Project Incentives (Assigned Amounts)</div>
                                        <div className="text-xl font-bold text-blue-900">₹{fullReport.financials.project_incentives}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-3">HR & Activity</h3>
                                <div className="bg-gray-50 p-4 rounded-lg border flex items-center justify-between">
                                    <span className="font-medium text-gray-600">Total Attendance Days (Present)</span>
                                    <span className="text-2xl font-bold text-primary">{fullReport.hr.attendance_days} Days</span>
                                </div>
                            </div>
                        </div>

                        {/* Work & Productivity */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-3">Work & Productivity</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-gray-50 p-3 rounded-lg border text-center">
                                        <div className="text-xs text-gray-500 uppercase font-bold">Projects</div>
                                        <div className="text-2xl font-bold text-gray-800">{fullReport.work.projects_completed} <span className="text-sm text-gray-400 font-normal">/ {fullReport.work.projects_assigned}</span></div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg border text-center">
                                        <div className="text-xs text-gray-500 uppercase font-bold">Tasks</div>
                                        <div className="text-2xl font-bold text-gray-800">{fullReport.work.tasks_completed} <span className="text-sm text-gray-400 font-normal">/ {fullReport.work.tasks_assigned}</span></div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg border text-center">
                                        <div className="text-xs text-gray-500 uppercase font-bold">Products</div>
                                        <div className="text-2xl font-bold text-gray-800">{fullReport.work.products_completed} <span className="text-sm text-gray-400 font-normal">/ {fullReport.work.products_involved}</span></div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-3">CRM & Communications</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                                        <span className="text-sm font-medium text-purple-800">Leads Handled</span>
                                        <span className="font-bold text-purple-900 text-xl">{fullReport.crm.leads_handled}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                                        <span className="text-sm font-medium text-yellow-800">Meetings Attended</span>
                                        <span className="font-bold text-yellow-900 text-xl">{fullReport.communication.meetings}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                                        <span className="text-sm font-medium text-orange-800">Emails Sent</span>
                                        <span className="font-bold text-orange-900 text-xl">{fullReport.communication.emails_sent}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg border border-teal-100">
                                        <span className="text-sm font-medium text-teal-800">Support Tickets</span>
                                        <span className="font-bold text-teal-900 text-xl">{fullReport.communication.support_tickets}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-100 p-4 border-t flex justify-end">
                        <button 
                            onClick={() => {
                                const printContent = document.getElementById('print-area');
                                if (printContent) {
                                    const originalContents = document.body.innerHTML;
                                    document.body.innerHTML = printContent.outerHTML;
                                    window.print();
                                    document.body.innerHTML = originalContents;
                                    window.location.reload();
                                }
                            }} 
                            className="bg-primary text-white px-6 py-2 rounded-lg font-medium shadow hover:bg-primary-dark transition-colors"
                        >
                            Download Full Report (PDF)
                        </button>
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