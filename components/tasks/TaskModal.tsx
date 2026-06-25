// src/components/tasks/TaskModal.tsx

import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../apiClient';
import { Task, User } from '../../types';

type TaskFormData = Omit<Task, 'id' | 'created_at'>;

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: TaskFormData) => Promise<void>;
  taskToEdit?: Task | null;
  isSaving: boolean;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, taskToEdit, isSaving }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [status, setStatus] = useState<Task['status']>('To Do');

  const [staff, setStaff] = useState<User[]>([]);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const data = await api.get('/api/users');
        setStaff(data.filter((u: any) => ['Admin', 'Staff'].includes(u.role)));
      } catch (err) {
        console.error("Error fetching staff:", err);
      }
    };
    if (isOpen) {
      fetchStaff();
    }
  }, [isOpen]);

  useEffect(() => {
    if (taskToEdit && isOpen) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setAssigneeId(taskToEdit.assignee_id || null);
      setStartDate(taskToEdit.start_date || '');
      setDueDate(taskToEdit.due_date || '');
      setPriority(taskToEdit.priority);
      setStatus(taskToEdit.status);
    } else {
      setTitle('');
      setDescription('');
      setAssigneeId(null);
      setStartDate('');
      setDueDate('');
      setPriority('Medium');
      setStatus('To Do');
    }
  }, [taskToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      alert('Title is required.');
      return;
    }
    const taskData: TaskFormData = {
      title,
      description,
      assignee_id: assigneeId,
      start_date: startDate || null,
      due_date: dueDate || null,
      priority,
      status,
    };
    onSave(taskData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={taskToEdit ? 'Edit Task' : 'Create New Task'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField label="Assign To" value={assigneeId || ''} onChange={e => setAssigneeId(e.target.value || null)} options={staff} defaultOption="Unassigned" />
          <InputField label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <InputField label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField label="Priority" value={priority} onChange={e => setPriority(e.target.value as any)} options={['Low', 'Medium', 'High']} />
            <SelectField label="Status" value={status} onChange={e => setStatus(e.target.value as any)} options={['To Do', 'In Progress', 'Completed']} />
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={isSaving} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:bg-indigo-400">
            {isSaving ? 'Saving...' : (taskToEdit ? 'Save Changes' : 'Create Task')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
    <input id={id} {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
  </div>
);

const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: any[]; defaultOption?: string }> = ({ label, id, options, defaultOption, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <select id={id} {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
            {defaultOption && <option value="">{defaultOption}</option>}
            {Array.isArray(options) && options[0]?.username ? 
                options.map(opt => <option key={opt.id} value={opt.id}>{opt.username}</option>) :
                options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)
            }
        </select>
    </div>
);

export default TaskModal;