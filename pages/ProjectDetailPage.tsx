// src/pages/ProjectDetailPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
// useParams and Link ah remove pannitom, because namma ippo props use panrom
// import { useParams, Link } from 'react-router-dom';
import { api } from '../apiClient';
import { Project, User } from '../types';

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

// v-- IPPO PROPS IPDI IRUKKUM --v
interface ProjectDetailPageProps {
    title: string;
    projectId: string;
    setActivePage: (page: string) => void;
}

const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ title, projectId, setActivePage }) => {
    // useParams ku pathila props use panrom
    // const { projectId } = useParams<{ projectId: string }>();
    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProjectDetails = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);

        // Namma 'assigned_staff' nu oru alias create panni, atha vechi fetch panna try pannom. Athu work aagaathu.
        // So, namma correct aana 'profiles' table la irunthu join pannanum.
        // Aana namma last fix panna maathiri, client-side laye join panradhu better.
        // So ingayum athe logic use panrom.

        try {
            const projectData = await api.get(`/api/projects/${projectId}`);
            const assigned_to = typeof projectData.assigned_to === 'string' ? JSON.parse(projectData.assigned_to) : (projectData.assigned_to || []);
            const tags = typeof projectData.tags === 'string' ? JSON.parse(projectData.tags) : (projectData.tags || []);
            
            if (assigned_to.length > 0) {
                const staffData = await api.get('/api/users');
                const filteredStaff = staffData.filter((u: any) => assigned_to.includes(u.id));
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

    useEffect(() => {
        fetchProjectDetails();
    }, [fetchProjectDetails]);

    if (loading) return <div className="p-8 text-center">Loading project details...</div>;
    if (!project) return <div className="p-8 text-center text-red-500">Project not found.</div>;

    return (
        <div>
            {/* Link ku pathila button use panrom */}
            <button onClick={() => setActivePage('projects')} className="text-primary hover:underline mb-6 inline-block">&larr; Back to All Projects</button>
            
            <div className="bg-white shadow-md rounded-lg p-6">
                <div className="flex justify-between items-start">
                    <h1 className="text-3xl font-bold text-text-primary">{project.name}</h1>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusColors[project.status]}`}>
                        {project.status}
                    </span>
                </div>
                
                <div className="mt-2 text-sm text-gray-500">
                    Category: <span className="font-medium text-gray-700">{project.category || 'N/A'}</span>
                </div>

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
                        <p>{project.total_cost !== undefined && project.total_cost !== null ? `$${project.total_cost}` : 'N/A'}</p>
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
                            project.project_asset.startsWith('http') ? (
                              <a href={project.project_asset} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                                {project.project_asset}
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
                </div>

                <div className="mt-6 border-t pt-6">
                    <h3 className="font-semibold text-gray-600 mb-2">Assigned Staff</h3>
                    <div className="flex items-center space-x-2">
                        {project.assigned_staff.map(staff => (
                            <div key={staff.id} title={staff.username} className="h-10 w-10 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                {staff.username.substring(0, 2).toUpperCase()}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailPage;