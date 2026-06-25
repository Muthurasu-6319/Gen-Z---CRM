// src/pages/ReportsPage.tsx (Now primarily for Staff)

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../apiClient';
import { usePermissions } from '../components/auth/PermissionsContext';
import { DailyReport, User } from '../types';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/icons/Icons';
import Modal from '../components/common/Modal';

interface ReportWithProfile extends DailyReport {
    profiles: Pick<User, 'username'> | null;
}

const ReportsPage: React.FC<{ title: string }> = ({ title }) => {
    const { currentProfile, hasPermission } = usePermissions();
    const [reports, setReports] = useState<ReportWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [reportToEdit, setReportToEdit] = useState<ReportWithProfile | null>(null);

    const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
    const [tasksCompleted, setTasksCompleted] = useState('');
    const [hoursSpent, setHoursSpent] = useState<number | ''>('');

    const canCreate = hasPermission('reports', 'create');
    const canEdit = hasPermission('reports', 'edit');
    const canDelete = hasPermission('reports', 'delete');

    const fetchReports = useCallback(async () => {
        if (!currentProfile) return;
        setLoading(true);
        try {
            const data = await api.get('/api/reports');
            const mapped = data.map((r: any) => ({
                ...r,
                profiles: r.username ? { username: r.username } : null
            }));
            setReports(mapped);
        } catch (err) {
            console.error("Error fetching reports:", err);
        }
        setLoading(false);
    }, [currentProfile]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const openModal = (report: ReportWithProfile | null = null) => {
        if (report) {
            setReportToEdit(report); setReportDate(report.report_date);
            setTasksCompleted(report.tasks_completed); setHoursSpent(report.hours_spent || '');
        } else {
            setReportToEdit(null); setReportDate(new Date().toISOString().slice(0, 10));
            setTasksCompleted(''); setHoursSpent('');
        }
        setModalOpen(true);
    };
    
    const handleSaveReport = async () => {
        if (!currentProfile) return alert("Could not find user profile.");
        if (!tasksCompleted) return alert("Tasks completed field cannot be empty.");
        setIsSaving(true);
        
        const reportData = {
            report_date: reportDate,
            tasks_completed: tasksCompleted,
            hours_spent: hoursSpent || null
        };

        try {
            let savedReport: any = null;
            if (reportToEdit) {
                savedReport = await api.put(`/api/reports/${reportToEdit.id}`, reportData);
            } else {
                savedReport = await api.post('/api/reports', reportData);
            }
            
            const mappedReport = {
                ...savedReport,
                profiles: currentProfile ? { username: currentProfile.username } : null
            };
            
            if (reportToEdit) {
                setReports(prev => prev.map(r => r.id === mappedReport.id ? mappedReport : r));
            } else {
                setReports(prev => [mappedReport, ...prev]);
            }
            setModalOpen(false);
        } catch (error: any) {
            alert(`Error saving report: ${error.message || error}`);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteReport = async (reportId: number) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            await api.delete(`/api/reports/${reportId}`);
            setReports(prev => prev.filter(r => r.id !== reportId));
        } catch (error: any) {
            alert(`Error deleting report: ${error.message || error}`);
        }
    };
    // ^-- INSTANT UPDATE FIX MUDINJATHU --^

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
                {canCreate && (
                    <button onClick={() => openModal()} className="inline-flex items-center bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark">
                        <PlusIcon className="h-5 w-5 mr-2" /> Add My Report
                    </button>
                )}
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tasks Completed</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={4} className="p-8 text-center">Loading reports...</td></tr>
                        ) : reports.map(report => (
                            <tr key={report.id}>
                                <td className="px-6 py-4">{new Date(report.report_date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-sm text-gray-600 max-w-md whitespace-pre-wrap">{report.tasks_completed}</td>
                                <td className="px-6 py-4">{report.hours_spent}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    {canEdit && <button onClick={() => openModal(report)} className="p-1 text-gray-400 hover:text-primary"><PencilIcon className="h-5 w-5"/></button>}
                                    {canDelete && <button onClick={() => handleDeleteReport(report.id)} className="p-1 text-red-400 hover:text-red-600"><TrashIcon className="h-5 w-5"/></button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={reportToEdit ? "Edit Report" : "Add Daily Report"}>
                <div className="space-y-4">
                    <div><label className="block text-sm font-medium">Report Date</label><input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"/></div>
                    <div><label className="block text-sm font-medium">Tasks Completed</label><textarea rows={6} value={tasksCompleted} onChange={e => setTasksCompleted(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="- Worked on feature A&#10;- Attended team meeting&#10;- Fixed bug #123"></textarea></div>
                    <div><label className="block text-sm font-medium">Hours Spent (Optional)</label><input type="number" step="0.5" value={hoursSpent} onChange={e => setHoursSpent(parseFloat(e.target.value) || '')} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"/></div>
                    <div className="flex justify-end pt-4"><button onClick={handleSaveReport} disabled={isSaving} className="px-4 py-2 text-sm text-white bg-primary rounded-md">{isSaving ? 'Saving...' : 'Save Report'}</button></div>
                </div>
            </Modal>
        </>
    );
};

export default ReportsPage;