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

  useEffect(() => {
    if (quoteToEdit && isOpen) {
      setTitle(quoteToEdit.title);
      setDescription(quoteToEdit.description || '');
      setDocumentUrl(quoteToEdit.document_url || '');
    } else {
      setTitle('');
      setDescription('');
      setDocumentUrl('');
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
    };
    onSave(quoteData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={quoteToEdit ? 'Edit Quote' : 'Create New Quote'}>
      <form onSubmit={handleSubmit} className="space-y-4">
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