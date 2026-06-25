// src/components/calendar/EventModal.tsx

import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../apiClient';
import { User } from '../../types';
import Select from 'react-select';

type SelectOption = { value: string; label: string; };

export interface EventFormData {
  id?: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  assigned_to: string[];
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: EventFormData) => Promise<void>;
  eventToEdit?: Partial<EventFormData> | null;
  isSaving: boolean;
}

// Helper function to format a date string or Date object into YYYY-MM-DDTHH:mm
const formatDateTimeForInput = (date: string | Date | undefined | null): string => {
    if (!date) return '';
    try {
        // Create a new Date object to handle both string and Date types
        const d = new Date(date);
        // Check if the date is valid
        if (isNaN(d.getTime())) return '';
        // Convert to local timezone and format
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
        return '';
    }
};

const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave, eventToEdit, isSaving }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [assignedTo, setAssignedTo] = useState<SelectOption[]>([]);
  
  const [staffOptions, setStaffOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const data = await api.get('/api/users');
        const staff = data.filter((u: any) => u.role === 'Staff' || u.role === 'Admin');
        setStaffOptions(staff.map((s: any) => ({ value: s.id, label: s.username })));
      } catch (err) {
        console.error("Error fetching staff:", err);
      }
    };
    if (isOpen) fetchStaff();
  }, [isOpen]);

  useEffect(() => {
    if (eventToEdit && isOpen) {
      setTitle(eventToEdit.title || '');
      setDescription(eventToEdit.description || '');
      
      // THIS IS THE FIX: Use the robust helper function for formatting
      setStart(formatDateTimeForInput(eventToEdit.start_time));
      setEnd(formatDateTimeForInput(eventToEdit.end_time));

      if (eventToEdit.assigned_to && staffOptions.length > 0) {
        const selectedStaff = staffOptions.filter(opt => eventToEdit.assigned_to!.includes(opt.value));
        setAssignedTo(selectedStaff);
      } else {
        setAssignedTo([]);
      }
    } else {
      // Reset form
      setTitle('');
      setDescription('');
      setStart('');
      setEnd('');
      setAssignedTo([]);
    }
  }, [eventToEdit, isOpen, staffOptions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const eventData: EventFormData = {
      ...(eventToEdit?.id && { id: eventToEdit.id }),
      title,
      description,
      // Convert local datetime-local string back to a full ISO string for the database
      start_time: new Date(start).toISOString(), 
      end_time: new Date(end).toISOString(),
      assigned_to: assignedTo.map(opt => opt.value),
    };
    onSave(eventData);
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={eventToEdit?.id ? "Edit Event" : "Create New Event"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField label="Event Title" value={title} onChange={e => setTitle(e.target.value)} required />
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Start Time" type="datetime-local" value={start} onChange={e => setStart(e.target.value)} required />
          <InputField label="End Time" type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} required />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">Assigned To</label>
            <Select isMulti options={staffOptions} value={assignedTo} onChange={(opts) => setAssignedTo(opts as SelectOption[])} className="mt-1" classNamePrefix="react-select" />
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={isSaving} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow-sm hover:bg-primary-dark">
            {isSaving ? 'Saving...' : 'Save Event'}
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

export default EventModal;