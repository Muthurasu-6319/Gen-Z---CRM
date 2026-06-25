// src/pages/ProjectsPage.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../apiClient';
import { usePermissions } from '../components/auth/PermissionsContext';
import { Project, User } from '../types'; 
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon } from '../components/icons/Icons';
import ProjectModal from '../components/projects/ProjectModal';

const statusColors: { [key: string]: string } = {
  Started: 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  'On Hold': 'bg-gray-100 text-gray-800',
  Cancelled: 'bg-red-100 text-red-800',
  Completed: 'bg-green-100 text-green-800',
};

const ProjectsPage: React.FC<{ title: string; setActivePage: (page: string) => void; }> = ({ title, setActivePage }) => {
    const { hasPermission, currentProfile } = usePermissions();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // v-- PUDHU STATES FOR FILTERS & BULK ACTIONS --v
    const [selectedProjects, setSelectedProjects] = useState<Set<number>>(new Set());
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [assignedFilter, setAssignedFilter] = useState<boolean>(false);
    // ^-- PUDHU STATES MUDINJATHU --^

    const canCreate = hasPermission('projects', 'create');
    const canEdit = hasPermission('projects', 'edit');
    const canDelete = hasPermission('projects', 'delete');

    const fetchProjects = useCallback(async () => {
        if (!currentProfile) return;
        setLoading(true);

        try {
            const [projectsData, profilesData] = await Promise.all([
                api.get('/api/projects'),
                api.get('/api/users')
            ]);

            const profileMap = new Map((profilesData || []).map((p: any) => [p.id, p]));
            const formattedData = (projectsData || []).map((p: any) => {
                const assigned_to = typeof p.assigned_to === 'string' ? JSON.parse(p.assigned_to) : (p.assigned_to || []);
                const tags = typeof p.tags === 'string' ? JSON.parse(p.tags) : (p.tags || []);
                const staffDetails = assigned_to.map((id: string) => profileMap.get(id)).filter(Boolean);
                return { ...p, tags, assigned_to, assigned_users: staffDetails };
            });
            setProjects(formattedData);
        } catch (error: any) {
            console.error("Error fetching projects:", error.message || error);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    }, [currentProfile]);

    useEffect(() => {
        if (currentProfile) fetchProjects();
    }, [fetchProjects, currentProfile]);
    
    const handleSaveProject = async (projectData: any) => {
        setIsSaving(true);
        let finalData: any = { ...projectData };
        if (!projectToEdit && currentProfile) {
            finalData.created_by = currentProfile.id;
        }
        
        try {
            if (projectToEdit) {
                await api.put(`/api/projects/${projectToEdit.id}`, finalData);
            } else {
                await api.post('/api/projects', finalData);
            }
            fetchProjects();
            setModalOpen(false);
            setProjectToEdit(null);
        } catch (err: any) {
            alert(`Error saving project: ${err.message || err}`);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteSelected = async () => {
        if (selectedProjects.size === 0) return;
        if (window.confirm(`Are you sure you want to delete ${selectedProjects.size} selected project(s)?`)) {
            const idsToDelete = Array.from(selectedProjects);
            try {
                await Promise.all(idsToDelete.map(id => api.delete(`/api/projects/${id}`)));
                setProjects(prev => prev.filter(p => !idsToDelete.includes(p.id)));
                setSelectedProjects(new Set());
            } catch (err: any) {
                alert(`Error deleting projects: ${err.message || err}`);
            }
        }
    };

    const handleDeleteProject = async (projectId: number) => {
        if (window.confirm('Are you sure you want to delete this project?')) {
            try {
                await api.delete(`/api/projects/${projectId}`);
                setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
            } catch (err: any) {
                alert(`Error deleting project: ${err.message || err}`);
            }
        }
    };
    
    // v-- PUDHU BULK SELECT LOGIC --v
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedProjects(new Set(filteredProjects.map(p => p.id)));
        } else {
            setSelectedProjects(new Set());
        }
    };

    const handleSelectOne = (projectId: number, checked: boolean) => {
        const newSet = new Set(selectedProjects);
        if (checked) {
            newSet.add(projectId);
        } else {
            newSet.delete(projectId);
        }
        setSelectedProjects(newSet);
    };
    // ^-- LOGIC MUDINJATHU --^
    
    // v-- PUDHU FILTER LOGIC --v
    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const statusMatch = statusFilter === 'All' || p.status === statusFilter;
            const assignedMatch = !assignedFilter || (currentProfile && p.assigned_to?.includes(currentProfile.id));
            return statusMatch && assignedMatch;
        });
    }, [projects, statusFilter, assignedFilter, currentProfile]);
    // ^-- LOGIC MUDINJATHU --^

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
                {canCreate && (
                    <button 
                        onClick={() => { setProjectToEdit(null); setModalOpen(true); }} 
                        className="inline-flex items-center bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        New Project
                    </button>
                )}
            </div>
            
            {/* v-- IPPO INGA FILTERS and BULK ACTIONS BUTTONS VARUM --v */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="p-2 border rounded-md bg-white">
                        <option value="All">All Statuses</option>
                        {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="flex items-center">
                        <input type="checkbox" id="assigned-filter" checked={assignedFilter} onChange={e => setAssignedFilter(e.target.checked)} className="h-4 w-4 rounded text-primary focus:ring-primary"/>
                        <label htmlFor="assigned-filter" className="ml-2 text-sm font-medium">Assigned to Me</label>
                    </div>
                </div>
                {selectedProjects.size > 0 && canDelete && (
                    <button onClick={handleDeleteSelected} className="px-3 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700">
                        Delete ({selectedProjects.size})
                    </button>
                )}
            </div>
            {/* ^-- UI MUDINJATHU --^ */}

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input type="checkbox" onChange={handleSelectAll} checked={filteredProjects.length > 0 && selectedProjects.size === filteredProjects.length} className="h-4 w-4 rounded text-primary focus:ring-primary"/>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">Loading projects...</td></tr>
                            ) : filteredProjects.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No projects found.</td></tr>
                            ) : (
                                filteredProjects.map(p => {
                                    const isAssignedToMe = currentProfile && p.assigned_to?.includes(currentProfile.id);
                                    return (
                                        <tr key={p.id} className={`${isAssignedToMe ? 'bg-blue-50' : ''} ${selectedProjects.has(p.id) ? 'bg-indigo-100' : ''} hover:bg-gray-100`}>
                                            <td className="px-4 py-4">
                                                <input type="checkbox" checked={selectedProjects.has(p.id)} onChange={e => handleSelectOne(p.id, e.target.checked)} className="h-4 w-4 rounded text-primary focus:ring-primary"/>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex flex-wrap gap-1">
                                                    {(p.tags || []).slice(0, 2).map(tag => ( <span key={tag} className="bg-gray-200 text-gray-800 px-2 py-0.5 text-xs rounded-full">{tag}</span> ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center -space-x-2">
                                                    {(p.assigned_users || []).map(staff => ( <div key={staff.id} title={staff.username} className="h-8 w-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-white"> {staff.username.substring(0, 2).toUpperCase()} </div> ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.start_date || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.end_date || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[p.status]}`}> {p.status} </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <button onClick={() => setActivePage(`projects/${p.id}`)} className="p-1 text-gray-400 hover:text-primary"><EyeIcon className="h-5 w-5"/></button>
                                                {canEdit && <button onClick={() => { setProjectToEdit(p); setModalOpen(true); }} className="p-1 text-gray-400 hover:text-primary"><PencilIcon className="h-5 w-5"/></button>}
                                                {canDelete && <button onClick={() => handleDeleteProject(p.id)} className="p-1 text-red-400 hover:text-red-600"><TrashIcon className="h-5 w-5"/></button>}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <ProjectModal 
                isOpen={isModalOpen} 
                onClose={() => setModalOpen(false)}
                onSave={handleSaveProject}
                projectToEdit={projectToEdit}
                isSaving={isSaving}
            />
        </>
    );
};

export default ProjectsPage;