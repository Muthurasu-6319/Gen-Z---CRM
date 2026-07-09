// src/components/products/ProductModal.tsx

import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../apiClient';
import { Product, User } from '../../types';
import Select from 'react-select';

type SelectOption = { value: string; label: string; };
type ProductFormData = Omit<Product, 'id' | 'created_at' | 'created_by'>;

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: ProductFormData) => Promise<void>;
  productToEdit?: Product | null;
  isSaving: boolean;
}

const statusOptions: Product['status'][] = ['Started', 'In Progress', 'On Hold', 'Cancelled', 'Completed'];

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, productToEdit, isSaving }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [endDate, setEndDate] = useState('');
  const [collaborators, setCollaborators] = useState<SelectOption[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Product['status']>('Started');

  const [staffOptions, setStaffOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const data = await api.get('/api/users');
        const staff = data.filter((u: any) => u.role !== 'Client');
        setStaffOptions(staff.map((s: any) => ({ value: s.id, label: s.username })));
      } catch (err) {
        console.error("Error fetching staff:", err);
      }
    };
    if (isOpen) fetchStaff();
  }, [isOpen]);

  useEffect(() => {
    if (productToEdit && isOpen) {
        setName(productToEdit.name);
        setCategory(productToEdit.category || '');
        setTags(productToEdit.tags?.join(', ') || '');
        setEndDate(productToEdit.end_date || '');
        setNotes(productToEdit.notes || '');
        setStatus(productToEdit.status);
        if (productToEdit.collaborators && staffOptions.length > 0) {
            const selectedStaff = staffOptions.filter(opt => productToEdit.collaborators!.includes(opt.value));
            setCollaborators(selectedStaff);
        } else {
            setCollaborators([]);
        }
    } else {
        // Reset form for new product
        setName('');
        setCategory('');
        setTags('');
        setEndDate('');
        setCollaborators([]);
        setNotes('');
        setStatus('Started');
    }
  }, [productToEdit, isOpen, staffOptions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const productData: ProductFormData = {
      name,
      category,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      end_date: endDate || null,
      collaborators: collaborators.map(opt => opt.value),
      notes,
      status,
    };
    onSave(productData);
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={productToEdit ? "Edit Product" : "Create New Product"}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <InputField label="Product Name" value={name} onChange={e => setName(e.target.value)} required />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Category" value={category} onChange={e => setCategory(e.target.value)} />
            <InputField label="Languages/Tags (comma-separated)" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g., React, Node, SQL" />
        </div>
        <InputField label="End Date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        
        <div>
            <label className="block text-sm font-medium text-gray-700">Collaborate With</label>
            <Select isMulti options={staffOptions} value={collaborators} onChange={(opts) => setCollaborators(opts as SelectOption[])} className="mt-1" />
        </div>

        <TextareaField label="Short Notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />

        <SelectField label="Status" value={status} onChange={e => setStatus(e.target.value as Product['status'])} options={statusOptions} />
        
        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm bg-white border rounded-md">Cancel</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm text-white bg-primary rounded-md">
            {isSaving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// Reusable form fields
const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (<div><label className="block text-sm font-medium text-gray-700">{label}</label><input {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/></div>);
const TextareaField: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => (<div><label className="block text-sm font-medium text-gray-700">{label}</label><textarea {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /></div>);
const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: string[] }> = ({ label, options, ...props }) => (<div><label className="block text-sm font-medium text-gray-700">{label}</label><select {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm">{options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>);

export default ProductModal;