import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../apiClient';
import { usePermissions } from '../components/auth/PermissionsContext';
import { ClientReport, User } from '../types';
import { PlusIcon, TrashIcon, DownloadIcon } from '../components/icons/Icons';
import Modal from '../components/common/Modal';

const ClientReportsPage: React.FC<{ title: string }> = ({ title }) => {
    const { currentProfile, hasPermission } = usePermissions();
    const [reports, setReports] = useState<ClientReport[]>([]);
    const [clients, setClients] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setModalOpen] = useState(false);
    
    // Form states
    const [selectedClient, setSelectedClient] = useState('');
    const [reportTitle, setReportTitle] = useState('');
    const [category, setCategory] = useState<'SEO' | 'Digital Marketing' | 'Website' | 'Other'>('SEO');
    const [fileUrl, setFileUrl] = useState('');
    const [fileName, setFileName] = useState('');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const isClient = currentProfile?.role === 'Client';
    const canCreate = !isClient && hasPermission('client-reports', 'create');
    const canDelete = !isClient && hasPermission('client-reports', 'delete');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const reportsData = await api.get('/api/client-reports');
            setReports(reportsData || []);

            if (!isClient) {
                const usersData = await api.get('/api/users');
                setClients(usersData.filter((u: User) => u.role === 'Client'));
            }
        } catch (err) {
            console.error('Error fetching client reports:', err);
        }
        setLoading(false);
    }, [isClient]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient || !reportTitle || !fileUrl) {
            return alert('Please fill in all required fields (Client, Title, File URL).');
        }
        setIsSaving(true);
        try {
            await api.post('/api/client-reports', {
                client_id: selectedClient,
                title: reportTitle,
                category,
                file_url: fileUrl,
                file_name: fileName || reportTitle + '.pdf',
                notes
            });
            setModalOpen(false);
            
            // Reset form
            setSelectedClient(''); setReportTitle(''); setFileUrl(''); setFileName(''); setNotes('');
            fetchData();
        } catch (err: any) {
            alert('Failed to save report: ' + err.message);
        }
        setIsSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this report?')) return;
        try {
            await api.delete(`/api/client-reports/${id}`);
            fetchData();
        } catch (err: any) {
            alert('Failed to delete report: ' + err.message);
        }
    };

    const getClientName = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        return client ? client.username : 'Unknown Client';
    };

    const categoryColors = {
        'SEO': 'bg-green-100 text-green-800',
        'Digital Marketing': 'bg-blue-100 text-blue-800',
        'Website': 'bg-purple-100 text-purple-800',
        'Other': 'bg-gray-100 text-gray-800'
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
                {canCreate && (
                    <button onClick={() => setModalOpen(true)} className="inline-flex items-center bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark">
                        <PlusIcon className="w-5 h-5 mr-2" /> Upload Report
                    </button>
                )}
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            {!isClient && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-500">Loading reports...</td></tr>
                        ) : reports.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-500">No reports found.</td></tr>
                        ) : (
                            reports.map(report => (
                                <tr key={report.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(report.created_at).toLocaleDateString()}
                                    </td>
                                    {!isClient && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {getClientName(report.client_id)}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        <div className="font-semibold">{report.title}</div>
                                        {report.notes && <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">{report.notes}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${categoryColors[report.category]}`}>
                                            {report.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                        <a href={report.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900 inline-flex items-center" title="Download">
                                            <DownloadIcon className="w-5 h-5" />
                                        </a>
                                        {canDelete && (
                                            <button onClick={() => handleDelete(report.id)} className="text-red-500 hover:text-red-700" title="Delete">
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title="Upload Client Report">
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Select Client</label>
                        <select required value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary">
                            <option value="">-- Select Client --</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.username}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Report Title</label>
                        <input required type="text" value={reportTitle} onChange={e => setReportTitle(e.target.value)} placeholder="e.g. May 2026 SEO Report" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value as any)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary">
                            <option value="SEO">SEO</option>
                            <option value="Digital Marketing">Digital Marketing</option>
                            <option value="Website">Website</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">File URL (PDF/Excel Link)</label>
                        <input required type="url" value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://..." className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" />
                        <p className="text-xs text-gray-500 mt-1">Upload the file to File Manager and paste the link here.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" />
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="button" onClick={() => setModalOpen(false)} className="mr-3 px-4 py-2 border rounded-md text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark">{isSaving ? 'Uploading...' : 'Upload Report'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ClientReportsPage;
