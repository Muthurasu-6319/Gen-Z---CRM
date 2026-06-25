// src/pages/LeadsPage.tsx

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../apiClient';
import { PlusIcon, PencilIcon, TrashIcon, UploadIcon, DownloadIcon } from '../components/icons/Icons';
import LeadModal from '../components/leads/LeadModal';
import { Lead } from '../types';
import { usePermissions } from '../components/auth/PermissionsContext';
import Papa from 'papaparse';

const LeadsPage: React.FC<{ title: string }> = ({ title }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const { hasPermission, currentProfile } = usePermissions();
  const canCreate = hasPermission('leads', 'create');
  const canEdit = hasPermission('leads', 'edit');
  const canDelete = hasPermission('leads', 'delete');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/leads');
      setLeads(data || []);
    } catch (err: any) {
      console.error("Error fetching leads:", err.message || err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleSaveLead = async (leadData: Omit<Lead, 'id' | 'created_at' | 'created_by'>) => {
    setIsSaving(true);
    try {
      if (leadToEdit) {
          await api.put(`/api/leads/${leadToEdit.id}`, leadData);
      } else {
          const finalData = { ...leadData, created_by: currentProfile?.id };
          await api.post('/api/leads', finalData);
      }
      setModalOpen(false);
      setLeadToEdit(null);
      fetchLeads();
    } catch (err: any) {
      alert(`Error saving lead: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLead = async (leadId: number) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
        try {
            await api.delete(`/api/leads/${leadId}`);
            fetchLeads();
        } catch (err: any) {
            alert(`Error deleting lead: ${err.message || err}`);
        }
    }
  };

  const handleDownloadCSV = () => {
    const csv = Papa.unparse(leads.map(({ id, created_at, created_by, ...rest }) => rest));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'leads.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const newLeads = results.data.map((row: any) => ({
          client_name: row.client_name,
          requirements: row.requirements,
          mobile_no: row.mobile_no,
          notes: row.notes,
          created_by: currentProfile?.id,
        }));

        if(newLeads.length > 0) {
            try {
                await Promise.all(newLeads.map(l => api.post('/api/leads', l)));
                alert(`${newLeads.length} leads imported successfully!`);
                fetchLeads();
            } catch (err: any) {
                alert(`Error importing CSV: ${err.message || err}`);
            }
        }
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      error: (error) => {
        alert(`CSV parsing error: ${error.message}`);
        setIsUploading(false);
      }
    });
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
        <div className="flex items-center space-x-2">
            <button onClick={handleDownloadCSV} className="inline-flex items-center bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-50"><DownloadIcon className="h-5 w-5 mr-2" /> Download CSV</button>
            <input type="file" ref={fileInputRef} accept=".csv" onChange={handleUploadCSV} className="hidden" id="csv-upload" />
            <label htmlFor="csv-upload" className="cursor-pointer inline-flex items-center bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-50"><UploadIcon className="h-5 w-5 mr-2" /> {isUploading ? "Importing..." : "Import CSV"}</label>
            {canCreate && <button onClick={() => { setLeadToEdit(null); setModalOpen(true); }} className="inline-flex items-center bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark"><PlusIcon className="h-5 w-5 mr-2" /> Create Lead</button>}
        </div>
      </div>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
            {/* v-- IPPO INGA PUDHUSA 'NOTES' NU ORU HEADER ADD PANROM --v */}
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requirements</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            {/* ^-- HEADER MUDINJATHU --^ */}
            <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (<tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading...</td></tr>) : 
                 leads.length === 0 ? (<tr><td colSpan={5} className="p-8 text-center text-gray-500">No leads found.</td></tr>) : 
                 (leads.map((lead) => (
                    <tr key={lead.id}>
                        <td className="px-6 py-4 font-medium">{lead.client_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-sm truncate">{lead.requirements}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{lead.mobile_no}</td>
                        {/* v-- IPPO INGA ANTHA SHORT NOTES AH KAATROM --v */}
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={lead.notes || ''}>{lead.notes}</td>
                        {/* ^-- NOTES MUDINJATHU --^ */}
                        <td className="px-6 py-4 text-right space-x-2">
                            {canEdit && <button onClick={() => { setLeadToEdit(lead); setModalOpen(true); }} className="p-1 text-gray-400 hover:text-primary" title="Edit Lead"><PencilIcon className="h-5 w-5"/></button>}
                            {canDelete && <button onClick={() => handleDeleteLead(lead.id)} className="p-1 text-red-400 hover:text-red-600" title="Delete Lead"><TrashIcon className="h-5 w-5"/></button>}
                        </td>
                    </tr>
                )))}
            </tbody>
        </table>
      </div>
      <LeadModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSaveLead} leadToEdit={leadToEdit} isSaving={isSaving} />
    </>
  );
};

export default LeadsPage;