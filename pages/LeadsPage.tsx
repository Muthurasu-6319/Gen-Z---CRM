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
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [locationFilter, setLocationFilter] = useState('');
  const [assignUser, setAssignUser] = useState('');
  
  const { hasPermission, currentProfile } = usePermissions();
  const canCreate = hasPermission('leads', 'create');
  const canEdit = hasPermission('leads', 'edit');
  const canDelete = hasPermission('leads', 'delete');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLeadsAndUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsData, usersData] = await Promise.all([
          api.get('/api/leads'),
          api.get('/api/users').catch(() => [])
      ]);
      setLeads(leadsData || []);
      setUsers(usersData || []);
    } catch (err: any) {
      console.error("Error fetching data:", err.message || err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeadsAndUsers(); }, [fetchLeadsAndUsers]);

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
      fetchLeadsAndUsers();
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
            fetchLeadsAndUsers();
        } catch (err: any) {
            alert(`Error deleting lead: ${err.message || err}`);
        }
    }
  };

  const handleConvertToClient = async (leadId: number) => {
    if (window.confirm('Are you sure you want to convert this lead to a Client?')) {
        try {
            await api.post(`/api/leads/${leadId}/convert`, {});
            alert('Successfully converted lead to client! Default password is 12345.');
            window.location.search = '?page=clients';
        } catch (err: any) {
            alert(`Error converting lead: ${err.message || err}`);
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
                fetchLeadsAndUsers();
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

  const handleBulkAssign = async () => {
      if (selectedLeads.size === 0 || !assignUser) return;
      if (window.confirm(`Assign ${selectedLeads.size} leads to selected user?`)) {
          setIsSaving(true);
          try {
              const leadsToUpdate = leads.filter(l => selectedLeads.has(l.id));
              await Promise.all(leadsToUpdate.map(l => 
                  api.put(`/api/leads/${l.id}`, { ...l, assigned_to: assignUser })
              ));
              alert('Leads assigned successfully!');
              setSelectedLeads(new Set());
              setAssignUser('');
              fetchLeadsAndUsers();
          } catch (err: any) {
              alert(`Error assigning leads: ${err.message || err}`);
          } finally {
              setIsSaving(false);
          }
      }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
      } else {
          setSelectedLeads(new Set());
      }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
      const newSet = new Set(selectedLeads);
      if (checked) newSet.add(id);
      else newSet.delete(id);
      setSelectedLeads(newSet);
  };

  const filteredLeads = leads.filter(l => {
      if (locationFilter && l.location?.toLowerCase() !== locationFilter.toLowerCase()) return false;
      return true;
  });

  const uniqueLocations = Array.from(new Set(leads.map(l => l.location).filter(Boolean))) as string[];

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
      
      <div className="mb-4 p-4 bg-gray-50 rounded-lg flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Filter by Location:</label>
              <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="p-2 border rounded-md bg-white text-sm">
                  <option value="">All Locations</option>
                  {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
          </div>
          
          {currentProfile?.role === 'Admin' && selectedLeads.size > 0 && (
              <div className="flex items-center space-x-2">
                  <select value={assignUser} onChange={e => setAssignUser(e.target.value)} className="p-2 border rounded-md bg-white text-sm">
                      <option value="">-- Assign To User --</option>
                      {users.filter(u => u.role !== 'Client').map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                  </select>
                  <button onClick={handleBulkAssign} disabled={isSaving || !assignUser} className="px-3 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
                      Assign ({selectedLeads.size})
                  </button>
              </div>
          )}
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
            {/* v-- IPPO INGA PUDHUSA 'NOTES' NU ORU HEADER ADD PANROM --v */}
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-4 py-3 text-left">
                        <input type="checkbox" onChange={handleSelectAll} checked={filteredLeads.length > 0 && selectedLeads.size === filteredLeads.length} className="h-4 w-4 rounded text-primary focus:ring-primary"/>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requirements</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            {/* ^-- HEADER MUDINJATHU --^ */}
            <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (<tr><td colSpan={8} className="p-8 text-center text-gray-500">Loading...</td></tr>) : 
                 filteredLeads.length === 0 ? (<tr><td colSpan={8} className="p-8 text-center text-gray-500">No leads found.</td></tr>) : 
                 (filteredLeads.map((lead) => {
                    const assignedUser = users.find(u => u.id === lead.assigned_to);
                    return (
                    <tr key={lead.id} className={selectedLeads.has(lead.id) ? 'bg-indigo-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-4">
                            <input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={e => handleSelectOne(lead.id, e.target.checked)} className="h-4 w-4 rounded text-primary focus:ring-primary"/>
                        </td>
                        <td className="px-6 py-4 font-medium">{lead.client_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-sm truncate">{lead.requirements}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{lead.mobile_no}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{lead.location || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{assignedUser ? assignedUser.username : '-'}</td>
                        {/* v-- IPPO INGA ANTHA SHORT NOTES AH KAATROM --v */}
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={lead.notes || ''}>{lead.notes}</td>
                        {/* ^-- NOTES MUDINJATHU --^ */}
                        <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => handleConvertToClient(lead.id)} className="p-1 text-green-500 hover:text-green-700 font-medium text-xs border border-green-500 rounded px-2 py-1 mr-1" title="Convert to Client">Convert</button>
                            {canEdit && <button onClick={() => { setLeadToEdit(lead); setModalOpen(true); }} className="p-1 text-gray-400 hover:text-primary" title="Edit Lead"><PencilIcon className="h-5 w-5"/></button>}
                            {canDelete && <button onClick={() => handleDeleteLead(lead.id)} className="p-1 text-red-400 hover:text-red-600" title="Delete Lead"><TrashIcon className="h-5 w-5"/></button>}
                        </td>
                    </tr>
                 )}))}
            </tbody>
        </table>
      </div>
      <LeadModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSaveLead} leadToEdit={leadToEdit} isSaving={isSaving} />
    </>
  );
};

export default LeadsPage;