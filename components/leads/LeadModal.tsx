// src/components/leads/LeadModal.tsx

import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { Lead } from '../../types';

type LeadFormData = Omit<Lead, 'id' | 'created_at' | 'created_by'>;

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (leadData: LeadFormData) => Promise<void>;
  leadToEdit?: Lead | null;
  isSaving: boolean;
}

const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, onSave, leadToEdit, isSaving }) => {
  const [client_name, setClientName] = useState('');
  const [requirements, setRequirements] = useState('');
  const [mobile_no, setMobileNo] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (leadToEdit && isOpen) {
      setClientName(leadToEdit.client_name);
      setRequirements(leadToEdit.requirements || '');
      setMobileNo(leadToEdit.mobile_no || '');
      setNotes(leadToEdit.notes || '');
      setLocation(leadToEdit.location || '');
    } else {
      setClientName('');
      setRequirements('');
      setMobileNo('');
      setNotes('');
      setLocation('');
    }
  }, [leadToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client_name) {
      alert('Client Name is required.');
      return;
    }
    const leadData: LeadFormData = { client_name, requirements, mobile_no, notes, location };
    onSave(leadData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={leadToEdit ? 'Edit Lead' : 'Create New Lead'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField label="Client Name" value={client_name} onChange={(e) => setClientName(e.target.value)} required />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Mobile Number" value={mobile_no} onChange={(e) => setMobileNo(e.target.value)} />
            <InputField label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        {/* v-- IPPO INGA 'REQUIREMENTS' AND 'NOTES' ODA ORDER AH MAATHROM --v */}
        <TextareaField label="Requirements" rows={3} value={requirements} onChange={(e) => setRequirements(e.target.value)} />
        <TextareaField label="Short Notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        {/* ^-- ORDER MUDINJATHU --^ */}
        
        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm bg-white border rounded-md">Cancel</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm text-white bg-primary rounded-md">
            {isSaving ? 'Saving...' : 'Save Lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <input {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
  </div>
);

const TextareaField: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <textarea {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
    </div>
);

export default LeadModal;