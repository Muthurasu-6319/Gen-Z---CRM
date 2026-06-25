// src/components/accounting/TransactionModal.tsx

import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../apiClient';
import { AccountingTransaction, User } from '../../types';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (formData: FormData) => Promise<void>;
    transactionToEdit: AccountingTransaction | null;
    isSaving: boolean;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, transactionToEdit, isSaving }) => {
    const [type, setType] = useState<'Income' | 'Expense' | 'Salary'>('Expense');
    const [staffList, setStaffList] = useState<User[]>([]);
    
    useEffect(() => {
        const fetchStaff = async () => {
            try {
                const data = await api.get('/api/users');
                setStaffList(data.filter((u: any) => u.role === 'Staff' || u.role === 'Admin') as User[]);
            } catch (err) {
                console.error("Error fetching staff:", err);
            }
        };
        fetchStaff();
    }, []);

    useEffect(() => {
        if (transactionToEdit) {
            setType(transactionToEdit.type);
        } else {
            setType('Expense');
        }
    }, [transactionToEdit]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        onSave(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={transactionToEdit ? "Edit Transaction" : "Add New Transaction"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SelectField name="type" label="Transaction Type" value={type} onChange={e => setType(e.target.value as any)} required>
                        <option value="Income">Income</option>
                        <option value="Expense">Expense</option>
                        <option value="Salary">Salary</option>
                    </SelectField>
                    <InputField name="transaction_date" label="Date" type="date" defaultValue={transactionToEdit?.transaction_date || new Date().toISOString().slice(0, 10)} required />
                </div>

                {type === 'Salary' ? (
                    <SelectField name="related_profile_id" label="Staff Member" defaultValue={transactionToEdit?.related_profile_id || ''} required>
                        <option value="" disabled>Select Staff</option>
                        {staffList.map(s => <option key={s.id} value={s.id}>{s.username}</option>)}
                    </SelectField>
                ) : (
                    <InputField name="category" label={type === 'Income' ? 'Source' : 'Category'} defaultValue={transactionToEdit?.category || ''} required />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField name="amount" label="Amount (₹)" type="number" step="0.01" defaultValue={transactionToEdit?.amount || ''} required />
                    
                    <SelectField name="payment_mode" label="Payment Mode" defaultValue={transactionToEdit?.payment_mode || 'GPay'} required>
                        <option value="GPay">GPay</option>
                        <option value="Bank">Bank</option>
                        <option value="Cash in Hand">Cash in Hand</option>
                    </SelectField>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea name="description" rows={3} defaultValue={transactionToEdit?.description || ''} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm bg-white border rounded-md">Cancel</button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm text-white bg-primary rounded-md">
                        {isSaving ? 'Saving...' : 'Save Transaction'}
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
const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <select {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm">
        {children}
      </select>
    </div>
);

export default TransactionModal;