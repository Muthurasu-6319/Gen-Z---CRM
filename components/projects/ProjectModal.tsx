// src/components/projects/ProjectModal.tsx

import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api, API_BASE } from '../../apiClient';
import { Project, User } from '../../types';

type ProjectFormData = Omit<Project, 'id' | 'created_at' | 'client_id'> & {
    client_name?: string | null;
};

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: ProjectFormData) => Promise<void>;
  projectToEdit?: Project | null;
  isSaving: boolean;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSave, projectToEdit, isSaving }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientMobile, setClientMobile] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [projectAsset, setProjectAsset] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [assignedPercentages, setAssignedPercentages] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<Project['status']>('Started');

  const [staffList, setStaffList] = useState<User[]>([]);
  const [clientList, setClientList] = useState<User[]>([]);
  const [folders, setFolders] = useState<{name: string, original_name: string}[]>([]);

  useEffect(() => {
    const fetchStaffAndFolders = async () => {
      try {
        const allUsers = await api.get('/api/users');
        const staff = allUsers.filter((u: any) => u.role === 'Staff' || u.role === 'Admin');
        setStaffList(staff);
        const clients = allUsers.filter((u: any) => u.role === 'Client');
        setClientList(clients);
        
        const filesData = await api.get('/api/files?folder=root');
        const folderItems = filesData.filter((f: any) => f.mime_type === 'folder');
        setFolders(folderItems);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    if (isOpen) {
      fetchStaffAndFolders();
    }
  }, [isOpen]);

  useEffect(() => {
    if (projectToEdit && isOpen) {
        setName(projectToEdit.name);
        setCategory(projectToEdit.category || '');
        setDescription(projectToEdit.description || '');
        setTags(projectToEdit.tags?.join(', ') || '');
        setClientName(projectToEdit.client_name || '');
        setClientMobile(projectToEdit.client_mobile || '');
        setTotalCost(projectToEdit.total_cost !== undefined && projectToEdit.total_cost !== null ? String(projectToEdit.total_cost) : '');
        setProjectAsset(projectToEdit.project_asset || '');
        setStartDate(projectToEdit.start_date || '');
        setEndDate(projectToEdit.end_date || '');
        setStatus(projectToEdit.status);
        setAssignedTo(projectToEdit.assigned_to || []);
        setAssignedPercentages(projectToEdit.assigned_percentages || {});
    } else {
        setName(''); setCategory(''); setDescription(''); setTags('');
        setClientName(''); setClientMobile(''); setTotalCost(''); setProjectAsset(''); setStartDate(''); setEndDate('');
        setAssignedTo([]); setAssignedPercentages({}); setStatus('Started');
    }
  }, [projectToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const projectData: any = {
      name,
      category,
      description: description.trim() === '' ? null : description.trim(),
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      client_name: clientName.trim() === '' ? null : clientName.trim(),
      client_mobile: clientMobile.trim() === '' ? null : clientMobile.trim(),
      total_cost: totalCost === '' ? null : Number(totalCost),
      project_asset: projectAsset.trim() === '' ? null : projectAsset.trim(),
      start_date: startDate || null,
      end_date: endDate || null,
      assigned_to: assignedTo,
      assigned_percentages: assignedPercentages,
      status,
      created_by: '',
    };
    onSave(projectData);
  };

  const handleAssigneeChange = (profileId: string) => {
    setAssignedTo(prev => 
        prev.includes(profileId) 
            ? prev.filter(id => id !== profileId) 
            : [...prev, profileId]
    );
    if (assignedTo.includes(profileId)) {
        setAssignedPercentages(prev => {
            const newObj = {...prev};
            delete newObj[profileId];
            return newObj;
        });
    }
  };

  const handlePercentageChange = (profileId: string, val: string) => {
      setAssignedPercentages(prev => ({
          ...prev,
          [profileId]: Number(val)
      }));
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
        setAssignedTo(staffList.map(staff => staff.id));
    } else {
        setAssignedTo([]);
        setAssignedPercentages({});
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={projectToEdit ? "Edit Project" : "Create New Project"}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <InputField label="Project Name" value={name} onChange={(e: any) => setName(e.target.value)} required />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Category" value={category} onChange={(e: any) => setCategory(e.target.value)} />
            <InputField label="Tags (comma-separated)" value={tags} onChange={(e: any) => setTags(e.target.value)} placeholder="e.g., html, css, react" />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" rows={3}></textarea>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Client Name</label>
              <select value={clientName} onChange={(e) => setClientName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white">
                 <option value="">-- Select Client --</option>
                 {clientList.map(c => <option key={c.id} value={c.username}>{c.username}</option>)}
              </select>
            </div>
            <InputField label="Client Mobile" value={clientMobile} onChange={(e: any) => setClientMobile(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="Total Cost" type="number" value={totalCost} onChange={(e: any) => setTotalCost(e.target.value)} placeholder="e.g., 5000" />
            <InputField label="Start Date" type="date" value={startDate} onChange={(e: any) => setStartDate(e.target.value)} />
            <InputField label="End Date" type="date" value={endDate} onChange={(e: any) => setEndDate(e.target.value)} />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Project Asset Link/Detail (or pick folder)</label>
            <div className="flex space-x-2 mt-1">
                <input value={projectAsset} onChange={e => setProjectAsset(e.target.value)} placeholder="URL or folder name" className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                <select onChange={e => setProjectAsset(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary bg-white sm:text-sm">
                    <option value="">Select Folder...</option>
                    {folders.map(f => (
                        <option key={f.name} value={`${API_BASE.replace('/api', '')}/?page=file-manager&folder=${encodeURIComponent(f.name)}`}>{f.original_name || f.name}</option>
                    ))}
                </select>
            </div>
        </div>
        
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To (with percentage share %)</label>
            <div className="p-2 border rounded-md max-h-48 overflow-y-auto bg-gray-50">
                <div className="flex items-center p-2 border-b sticky top-0 bg-gray-50">
                    <input 
                        type="checkbox" 
                        id="select-all-staff" 
                        onChange={handleSelectAll} 
                        checked={staffList.length > 0 && assignedTo.length === staffList.length}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="select-all-staff" className="ml-3 block text-sm font-medium text-gray-700">Select All Staff</label>
                </div>
                <div className="pt-2 space-y-2">
                    {staffList.map(staff => {
                        const isSelected = assignedTo.includes(staff.id);
                        return (
                        <div key={staff.id} className="flex items-center justify-between p-2 hover:bg-gray-100 rounded">
                            <div className="flex items-center">
                                <input 
                                    type="checkbox" 
                                    id={`staff-assign-${staff.id}`} 
                                    value={staff.id}
                                    checked={isSelected}
                                    onChange={() => handleAssigneeChange(staff.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor={`staff-assign-${staff.id}`} className="ml-3 block text-sm text-gray-700">{staff.username}</label>
                            </div>
                            {isSelected && (
                                <div className="flex items-center">
                                    <input 
                                        type="number" 
                                        min="0" max="100" 
                                        placeholder="%" 
                                        value={assignedPercentages[staff.id] || ''} 
                                        onChange={(e) => handlePercentageChange(staff.id, e.target.value)}
                                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                                    />
                                    <span className="ml-1 text-sm text-gray-500">%</span>
                                </div>
                            )}
                        </div>
                    )})}
                </div>
            </div>
        </div>

        <SelectField
          label="Status"
          value={status}
          onChange={(e: any) => setStatus(e.target.value as Project['status'])}
          options={['Started', 'In Progress', 'On Hold', 'Cancelled', 'Completed']}
        />
        
        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={isSaving} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:bg-indigo-400">
            {isSaving ? 'Saving...' : (projectToEdit ? 'Save Changes' : 'Create Project')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const InputField: React.FC<any> = ({ label, ...props }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/>
    </div>
);
const SelectField: React.FC<any> = ({ label, options, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <select {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
            {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

export default ProjectModal;