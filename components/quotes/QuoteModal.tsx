// src/components/quotes/QuoteModal.tsx

import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { Quote } from '../../types';

type QuoteFormData = Omit<Quote, 'id' | 'created_at' | 'created_by'>;

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quoteData: QuoteFormData) => Promise<void>;
  quoteToEdit?: Quote | null;
  isSaving: boolean;
}

const QuoteModal: React.FC<QuoteModalProps> = ({ isOpen, onClose, onSave, quoteToEdit, isSaving }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientList, setClientList] = useState<any[]>([]);

  useEffect(() => {
      const fetchClients = async () => {
          try {
              const data = await require('../../apiClient').api.get('/api/users');
              setClientList(data.filter((u: any) => u.role === 'Client'));
          } catch (e) {}
      };
      fetchClients();
  }, []);

  useEffect(() => {
    if (quoteToEdit && isOpen) {
      setTitle(quoteToEdit.title);
      setDescription(quoteToEdit.description || '');
      setDocumentUrl(quoteToEdit.document_url || '');
      setClientId(quoteToEdit.client_id || '');
    } else {
      setTitle('');
      setDescription('');
      setDocumentUrl('');
      setClientId('');
    }
  }, [quoteToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      alert('Quote Title is required.');
      return;
    }
    const quoteData: QuoteFormData = {
      title,
      description,
      document_url: documentUrl,
      client_id: clientId || null,
    };
    onSave(quoteData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={quoteToEdit ? 'Edit Quote' : 'Create New Quote'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-gray-700">Assign to Client (Optional)</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary">
                <option value="">-- No Client --</option>
                {clientList.map(c => <option key={c.id} value={c.id}>{c.username}</option>)}
            </select>
        </div>
        <InputField label="Quote Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        
        <TextareaField 
          label="Description" 
          rows={4} 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
        />

        <InputField 
            label="Document URL" 
            placeholder="https://example.com/document.pdf" 
            value={documentUrl} 
            onChange={(e) => setDocumentUrl(e.target.value)} 
        />
        
        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm bg-white border rounded-md">Cancel</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm text-white bg-primary rounded-md">
            {isSaving ? 'Saving...' : 'Save Quote'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// Reusable form field components
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

export default QuoteModal;