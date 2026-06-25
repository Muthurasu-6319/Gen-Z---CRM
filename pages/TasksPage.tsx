// src/pages/TasksPage.tsx

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { api } from '../apiClient';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '../components/icons/Icons';
import TaskModal from '../components/tasks/TaskModal';
import Modal from '../components/common/Modal'; // View panna thevai padum
import { Task, User } from '../types';
import { usePermissions } from '../components/auth/PermissionsContext';

const priorityColors: { [key: string]: string } = {
  High: 'bg-red-100 text-red-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-green-100 text-green-800',
};

const statusColors: { [key: string]: string } = {
  'To Do': 'bg-gray-200 text-gray-800',
  'In Progress': 'bg-blue-200 text-blue-800',
  Completed: 'bg-green-200 text-green-800',
};

interface TaskWithAssignee extends Task {
    profiles: Pick<User, 'username'> | null;
}

const ViewTaskModal: React.FC<{ isOpen: boolean; onClose: () => void; task: TaskWithAssignee | null; }> = ({ isOpen, onClose, task }) => {
    if (!task) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={task.title}>
            <div className="space-y-4">
                <div><h3 className="font-semibold text-gray-600">Status</h3><p>{task.status}</p></div>
                <div><h3 className="font-semibold text-gray-600">Priority</h3><p>{task.priority}</p></div>
                <div><h3 className="font-semibold text-gray-600">Assigned To</h3><p>{task.profiles?.username || 'Unassigned'}</p></div>
                <div><h3 className="font-semibold text-gray-600">Start Date</h3><p>{task.start_date || 'Not set'}</p></div>
                <div><h3 className="font-semibold text-gray-600">Due Date</h3><p>{task.due_date || 'Not set'}</p></div>
                {task.description && <div><h3 className="font-semibold text-gray-600">Description</h3><p className="whitespace-pre-wrap">{task.description}</p></div>}
            </div>
        </Modal>
    );
};

const TasksPage: React.FC<{ title: string }> = ({ title }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [assignedFilter, setAssignedFilter] = useState<boolean>(false);
  const [viewingTask, setViewingTask] = useState<TaskWithAssignee | null>(null);

  const { hasPermission, currentProfile } = usePermissions();
  const canCreate = hasPermission('tasks', 'create');
  const canEdit = hasPermission('tasks', 'edit');
  const canDelete = hasPermission('tasks', 'delete');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/tasks');
      // Map assignee_name to profiles to keep compatibility with UI
      const mapped = data.map((t: any) => ({
        ...t,
        profiles: t.assignee_name ? { username: t.assignee_name } : null
      }));
      setTasks(mapped);
    } catch (err: any) {
      console.error("Error fetching tasks:", err.message || err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'created_at'>) => {
    setIsSaving(true);
    let savedTask: Task | null = null;
    let notificationMessage = '';
    
    try {
      if (taskToEdit) {
          savedTask = await api.put(`/api/tasks/${taskToEdit.id}`, taskData);
          notificationMessage = `${currentProfile?.username || 'Someone'} updated the task: "${taskData.title}"`;
      } else {
          savedTask = await api.post('/api/tasks', taskData);
          notificationMessage = `${currentProfile?.username || 'Someone'} assigned you a new task: "${taskData.title}"`;
      }

      if (taskData.assignee_id && savedTask) {
          await api.post('/api/notifications', {
              recipient_profile_id: taskData.assignee_id,
              message: notificationMessage,
              related_item_type: 'task',
              related_item_id: savedTask.id.toString(),
          });
      }
      
      fetchTasks();
      setModalOpen(false);
      setTaskToEdit(null);
    } catch (err: any) {
      alert(`Error saving task: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteSelected = async () => {
      if (selectedTasks.size === 0) return;
      if (window.confirm(`Are you sure you want to delete ${selectedTasks.size} selected task(s)?`)) {
          const idsToDelete = Array.from(selectedTasks);
          try {
              await Promise.all(idsToDelete.map(id => api.delete(`/api/tasks/${id}`)));
              setTasks(prev => prev.filter(t => !idsToDelete.includes(t.id)));
              setSelectedTasks(new Set());
          } catch (err: any) {
              alert(`Error deleting tasks: ${err.message || err}`);
          }
      }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
        try {
            await api.delete(`/api/tasks/${taskId}`);
            fetchTasks();
        } catch (err: any) {
            alert(`Error deleting task: ${err.message || err}`);
        }
    }
  };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
        } else {
            setSelectedTasks(new Set());
        }
    };

    const handleSelectOne = (taskId: number, checked: boolean) => {
        const newSet = new Set(selectedTasks);
        if (checked) newSet.add(taskId);
        else newSet.delete(taskId);
        setSelectedTasks(newSet);
    };
    
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const statusMatch = statusFilter === 'All' || t.status === statusFilter;
            const priorityMatch = priorityFilter === 'All' || t.priority === priorityFilter;
            const assignedMatch = !assignedFilter || (currentProfile && t.assignee_id === currentProfile.id);
            return statusMatch && priorityMatch && assignedMatch;
        });
    }, [tasks, statusFilter, priorityFilter, assignedFilter, currentProfile]);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
        {canCreate && (
          <button onClick={() => { setTaskToEdit(null); setModalOpen(true); }} className="inline-flex items-center bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark">
            <PlusIcon className="h-5 w-5 mr-2" /> Create Task
          </button>
        )}
      </div>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-4">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="p-2 border rounded-md bg-white">
                    <option value="All">All Statuses</option>
                    {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="p-2 border rounded-md bg-white">
                    <option value="All">All Priorities</option>
                    {Object.keys(priorityColors).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <div className="flex items-center">
                    <input type="checkbox" id="assigned-filter-task" checked={assignedFilter} onChange={e => setAssignedFilter(e.target.checked)} className="h-4 w-4 rounded text-primary focus:ring-primary"/>
                    <label htmlFor="assigned-filter-task" className="ml-2 text-sm font-medium">Assigned to Me</label>
                </div>
            </div>
            {selectedTasks.size > 0 && canDelete && (
                <button onClick={handleDeleteSelected} className="px-3 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700">
                    Delete ({selectedTasks.size})
                </button>
            )}
        </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left"><input type="checkbox" onChange={handleSelectAll} checked={filteredTasks.length > 0 && selectedTasks.size === filteredTasks.length} className="h-4 w-4 rounded text-primary focus:ring-primary"/></th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? ( <tr><td colSpan={8} className="p-8 text-center text-gray-500">Loading...</td></tr>
                    ) : filteredTasks.length === 0 ? ( <tr><td colSpan={8} className="p-8 text-center text-gray-500">No tasks found.</td></tr>
                    ) : ( filteredTasks.map((task) => {
                        const isAssignedToMe = currentProfile && task.assignee_id === currentProfile.id;
                        return (
                            <tr key={task.id} className={`${isAssignedToMe ? 'bg-blue-50' : ''} ${selectedTasks.has(task.id) ? 'bg-indigo-100' : ''} hover:bg-gray-100`}>
                                <td className="px-4 py-4"><input type="checkbox" checked={selectedTasks.has(task.id)} onChange={e => handleSelectOne(task.id, e.target.checked)} className="h-4 w-4 rounded text-primary focus:ring-primary"/></td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{task.title}</div>
                                    <div className="text-sm text-gray-500 max-w-xs truncate">{task.description}</div>
                                </td>
                                
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {task.profiles ? (
                                        <div className="flex items-center">
                                            <div title={task.profiles.username} className="h-8 w-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-white">
                                                {task.profiles.username.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="ml-2 hidden lg:block">{task.profiles.username}</span>
                                        </div>
                                    ) : (
                                        'Unassigned'
                                    )}
                                </td>
                                
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.start_date || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.due_date || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityColors[task.priority]}`}>{task.priority}</span></td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[task.status]}`}>{task.status}</span></td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    <button onClick={() => setViewingTask(task)} className="p-1 text-gray-400 hover:text-primary"><EyeIcon className="h-5 w-5"/></button>
                                    {canEdit && <button onClick={() => { setTaskToEdit(task); setModalOpen(true); }} className="p-1 text-gray-400 hover:text-primary"><PencilIcon className="h-5 w-5"/></button>}
                                    {canDelete && <button onClick={() => handleDeleteTask(task.id)} className="p-1 text-red-400 hover:text-red-600"><TrashIcon className="h-5 w-5"/></button>}
                                </td>
                            </tr>
                        )
                    }))}
                </tbody>
            </table>
        </div>
      </div>
      
      <TaskModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSaveTask} taskToEdit={taskToEdit} isSaving={isSaving} />
      <ViewTaskModal isOpen={!!viewingTask} onClose={() => setViewingTask(null)} task={viewingTask} />
    </>
  );
};

export default TasksPage;