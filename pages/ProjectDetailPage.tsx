// src/pages/ProjectDetailPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../apiClient';
import { Project, User } from '../types';
import { usePermissions } from '../components/auth/PermissionsContext';

interface ProjectDetail extends Project {
    client_name?: string | null;
    assigned_staff: User[];
}

const statusColors: { [key: string]: string } = {
  Started: 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  'On Hold': 'bg-gray-100 text-gray-800',
  Cancelled: 'bg-red-100 text-red-800',
  Completed: 'bg-green-100 text-green-800',
};

interface ProjectDetailPageProps {
    title: string;
    projectId: string;
    setActivePage: (page: string) => void;
}

const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ title, projectId, setActivePage }) => {
    const { currentProfile } = usePermissions();
    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Redirect / Assign Modal States
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [assignAmount, setAssignAmount] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);
    const [allStaff, setAllStaff] = useState<User[]>([]);

    const fetchProjectDetails = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);

        try {
            const projectData = await api.get(`/api/projects/${projectId}`);
            const assigned_to = typeof projectData.assigned_to === 'string' ? JSON.parse(projectData.assigned_to) : (projectData.assigned_to || []);
            const tags = typeof projectData.tags === 'string' ? JSON.parse(projectData.tags) : (projectData.tags || []);
            
            if (assigned_to.length > 0) {
                const staffData = await api.get('/api/users');
                const filteredStaff = staffData.filter((u: any) => assigned_to.includes(u.id) || u.id === projectData.lead_generator_id);
                setProject({ ...projectData, tags, assigned_to, assigned_staff: filteredStaff });
            } else if (projectData.lead_generator_id) {
                const staffData = await api.get('/api/users');
                const filteredStaff = staffData.filter((u: any) => u.id === projectData.lead_generator_id);
                setProject({ ...projectData, tags, assigned_to, assigned_staff: filteredStaff });
            } else {
                setProject({ ...projectData, tags, assigned_to, assigned_staff: [] });
            }

        } catch (error: any) {
             console.error("Error fetching project details:", error.message || error);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    const fetchAllStaff = useCallback(async () => {
        try {
            const staffData = await api.get('/api/users');
            setAllStaff(staffData.filter((u: any) => u.role !== 'Client'));
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        fetchProjectDetails();
        fetchAllStaff();
    }, [fetchProjectDetails, fetchAllStaff]);

    if (loading) return <div className="p-8 text-center">Loading project details...</div>;
    if (!project) return <div className="p-8 text-center text-red-500">Project not found.</div>;

    const isAdmin = currentProfile?.role === 'Admin';
    const isAssignedToMe = currentProfile && project.assigned_to?.includes(currentProfile.id);
    const myAmount = isAssignedToMe && project.assigned_amounts ? project.assigned_amounts[currentProfile.id] : null;

    const handleAssignStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStaffId || !project || !currentProfile) return;
        setIsAssigning(true);
        try {
            const newAssignedTo = [...(project.assigned_to || [])];
            if (!newAssignedTo.includes(selectedStaffId)) {
                newAssignedTo.push(selectedStaffId);
            }
            const newAmounts = { ...(project.assigned_amounts || {}) };
            if (assignAmount) newAmounts[selectedStaffId] = Number(assignAmount);
            
            const newAssignedBy = { ...(project.assigned_by || {}) };
            newAssignedBy[selectedStaffId] = currentProfile.username;

            await api.put(`/api/projects/${project.id}`, {
                ...project,
                assigned_to: newAssignedTo,
                assigned_amounts: newAmounts,
                assigned_by: newAssignedBy
            });
            await fetchProjectDetails();
            setIsAssignModalOpen(false);
            setSelectedStaffId('');
            setAssignAmount('');
        } catch (err: any) {
            alert('Failed to assign project: ' + err.message);
        } finally {
            setIsAssigning(false);
        }
    };

    return (
        <div>
            <button onClick={() => setActivePage('projects')} className="text-primary hover:underline mb-6 inline-block">&larr; Back to All Projects</button>
            
            <div className="bg-white shadow-md rounded-lg p-6">
                <div className="flex justify-between items-start">
                    <h1 className="text-3xl font-bold text-text-primary">{project.name}</h1>
                    {(isAdmin || (currentProfile && project.assigned_to?.includes(currentProfile.id))) ? (
                        <select 
                            value={project.status}
                            onChange={async (e) => {
                                const newStatus = e.target.value;
                                try {
                                    await api.put(`/api/projects/${project.id}`, { ...project, status: newStatus });
                                    setProject({ ...project, status: newStatus as any });
                                } catch (err) { alert('Error updating status'); }
                            }}
                            className={`px-3 py-1 text-sm font-semibold rounded-full border border-gray-200 focus:ring-2 focus:ring-primary cursor-pointer ${statusColors[project.status]}`}
                        >
                            {Object.keys(statusColors).map(s => <option key={s} value={s} className="bg-white text-black">{s}</option>)}
                        </select>
                    ) : (
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusColors[project.status]}`}>
                            {project.status}
                        </span>
                    )}
                </div>
                
                <div className="mt-2 text-sm text-gray-500">
                    Category: <span className="font-medium text-gray-700">{project.category || 'N/A'}</span>
                </div>

                {project.description && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg text-gray-700">
                        <h3 className="font-semibold text-gray-600 mb-1">Description</h3>
                        <p className="whitespace-pre-wrap">{project.description}</p>
                    </div>
                )}

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-t pt-6">
                    <div>
                        <h3 className="font-semibold text-gray-600">Client</h3>
                        <p>{project.client_name || 'No Client'}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-600">Client Mobile</h3>
                        <p>{project.client_mobile || 'N/A'}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-600">Total Cost</h3>
                        <p>{project.total_cost !== undefined && project.total_cost !== null ? `₹${project.total_cost}` : 'N/A'}</p>
                        
                        {/* Custom Percentage Amount Display */}
                        {!isAdmin && myAmount !== null && myAmount !== undefined && (
                             <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
                                 <strong>My Allocated Amount:</strong><br/>
                                 ₹{myAmount}
                                 {project.assigned_by && project.assigned_by[currentProfile.id] && (
                                     <div className="text-xs mt-1 text-green-700 opacity-80">
                                         Assigned By: {project.assigned_by[currentProfile.id]}
                                     </div>
                                 )}
                             </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-600">Start Date</h3>
                        <p>{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-600">End Date</h3>
                        <p>{project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set'}</p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-600">Project Asset</h3>
                        <p>
                          {project.project_asset ? (
                            project.project_asset.startsWith('http') || project.project_asset.startsWith('/') ? (
                              <a href={project.project_asset} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all inline-flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                Open Asset / Folder
                              </a>
                            ) : (
                              project.project_asset
                            )
                          ) : (
                            'N/A'
                          )}
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-600">Tags</h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {(project.tags || []).map(tag => (
                                <span key={tag} className="bg-gray-200 text-gray-800 px-2 py-1 text-xs rounded-full">{tag}</span>
                            ))}
                        </div>
                    </div>
                    {project.lead_generator_id && (
                        <div>
                            <h3 className="font-semibold text-gray-600">Lead Generator</h3>
                            <p>
                                {/* Find user by lead_generator_id from staffList if we had it, but we can just display the ID or fetch it. Actually we don't fetch all users here, let's just show a label, or check if it's assigned staff */}
                                {project.assigned_staff.find(s => s.id === project.lead_generator_id)?.username || project.lead_generator_id}
                            </p>
                            {(isAdmin || currentProfile?.id === project.lead_generator_id) && project.lead_generator_incentive !== null && (
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                                    <strong>Incentive:</strong><br/>
                                    ₹{project.lead_generator_incentive}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-6 border-t pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-600">Assigned Staff</h3>
                        {(isAdmin || isAssignedToMe) && (
                            <button 
                                onClick={() => setIsAssignModalOpen(true)}
                                className="text-sm bg-primary text-white px-3 py-1.5 rounded-md shadow hover:bg-primary-dark transition"
                            >
                                + Redirect / Assign Staff
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            {project.assigned_staff.filter(s => project.assigned_to?.includes(s.id)).map(staff => {
                                const staffAmount = project.assigned_amounts?.[staff.id];
                                return (
                                <div key={staff.id} className="flex items-center p-2 bg-gray-50 border rounded-lg">
                                    <div title={staff.username} className="h-10 w-10 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                        {staff.username.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="ml-3">
                                        <div className="text-sm font-medium">{staff.username}</div>
                                        {isAdmin && staffAmount !== undefined && staffAmount !== null && (
                                            <div className="text-xs text-gray-500">
                                                ₹{staffAmount} 
                                                {project.assigned_by?.[staff.id] && ` (Assigned By: ${project.assigned_by[staff.id]})`}
                                            </div>
                                        )}
                                        {/* For non-admins looking at other staff, they won't see amount, but they could see who assigned them if needed. But for now, only admins see the amount and who assigned them. Wait, CTO can also see staff they assigned. Let's just show Assigned By for everyone */}
                                        {!isAdmin && project.assigned_by?.[staff.id] && (
                                            <div className="text-xs text-gray-500">
                                                Assigned By: {project.assigned_by[staff.id]}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>
                </div>
            </div>

            {/* Redirect / Assign Modal */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Redirect / Assign Project</h2>
                        <form onSubmit={handleAssignStaff}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Developer / Staff</label>
                                <select 
                                    value={selectedStaffId} 
                                    onChange={e => setSelectedStaffId(e.target.value)}
                                    required
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary p-2 border"
                                >
                                    <option value="">-- Select --</option>
                                    {allStaff
                                        .filter(s => s.id !== currentProfile?.id && !project.assigned_to?.includes(s.id))
                                        .map(s => (
                                            <option key={s.id} value={s.id}>{s.username} - {s.role}</option>
                                        ))
                                    }
                                </select>
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fix Amount / Rate (₹)</label>
                                <input 
                                    type="number"
                                    value={assignAmount}
                                    onChange={e => setAssignAmount(e.target.value)}
                                    placeholder="e.g. 500"
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary p-2 border"
                                />
                                <p className="text-xs text-gray-500 mt-1">This will show that you assigned them this project with this rate.</p>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsAssignModalOpen(false)}
                                    className="px-4 py-2 border rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isAssigning || !selectedStaffId}
                                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
                                >
                                    {isAssigning ? 'Assigning...' : 'Assign Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetailPage;