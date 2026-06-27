// src/components/invoices/InvoiceModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { api } from '../../apiClient';
import { User, LineItem } from '../../types';
import { TrashIcon, PlusIcon } from '../icons/Icons';
import { useSettings } from '../auth/SettingsContext';
import { InvoiceWithRelations } from '../../pages/InvoicesPage';

interface InvoiceClientDetails {
    username: string;
    address: string;
    mobile: string;
    id?: string;
}

interface InvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    invoiceToEdit?: InvoiceWithRelations | null;
    isDuplicate?: boolean;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, onSaveSuccess, invoiceToEdit, isDuplicate }) => {
    const { settings } = useSettings();
    const [clients, setClients] = useState<User[]>([]);
    const [clientDetails, setClientDetails] = useState<InvoiceClientDetails>({ username: '', address: '', mobile: '', id: undefined });
    const [paidAmount, setPaidAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('GPay');
    const [notes, setNotes] = useState('');
    const [lineItems, setLineItems] = useState<Omit<LineItem, 'id' | 'invoice_id'>[]>([{ description: '', quantity: 1, price: 0 }]);
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        if (isOpen) {
            const fetchClients = async () => {
                try {
                    const data = await api.get('/api/users');
                    setClients(data.filter((u: any) => u.role === 'Client') as User[]);
                } catch (err) {
                    console.error("Error fetching clients:", err);
                }
            };
            fetchClients();

            if (invoiceToEdit) {
                const client = invoiceToEdit.profiles;
                setClientDetails({
                    username: invoiceToEdit.client_name_override || client?.username || '',
                    address: invoiceToEdit.client_address || client?.address || '',
                    mobile: invoiceToEdit.client_mobile || client?.mobile || '',
                    id: (client as any)?.id,
                });
                setPaidAmount(isDuplicate ? 0 : invoiceToEdit.paid_amount);
                setPaymentMethod(invoiceToEdit.payment_method || 'GPay');
                setNotes(invoiceToEdit.notes || '');
                setLineItems(invoiceToEdit.invoice_items.map(({ description, quantity, price }) => ({ description, quantity, price })));
            } else {
                setClientDetails({ username: '', address: '', mobile: '', id: undefined });
                setPaidAmount(0);
                setPaymentMethod('GPay');
                setNotes('');
                setLineItems([{ description: '', quantity: 1, price: 0 }]);
            }
        }
    }, [isOpen, invoiceToEdit, isDuplicate]);
    
    const handleClientNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newUsername = e.target.value;
        setClientDetails(prev => ({ ...prev, username: newUsername, id: undefined, address: '', mobile: '' })); // Reset details on name change
        const matchingClient = clients.find(c => c.username.toLowerCase() === newUsername.toLowerCase());
        if (matchingClient) {
            setClientDetails({
                username: matchingClient.username,
                address: (matchingClient.address as string) || '',
                mobile: (matchingClient.mobile as string) || '',
                id: matchingClient.id,
            });
        }
    };

    const handleItemChange = (index: number, field: keyof Omit<LineItem, 'id' | 'invoice_id'>, value: string | number) => {
        const updatedItems = [...lineItems];
        if (field === 'quantity') updatedItems[index].quantity = parseInt(value as string) || 0;
        else if (field === 'price') updatedItems[index].price = parseFloat(value as string) || 0;
        else (updatedItems[index] as any)[field] = value;
        setLineItems(updatedItems);
    };

    const addItem = () => setLineItems([...lineItems, { description: '', quantity: 1, price: 0 }]);
    const removeItem = (index: number) => setLineItems(lineItems.filter((_, i) => i !== index));

    const total = useMemo(() => lineItems.reduce((sum, item) => sum + item.quantity * item.price, 0), [lineItems]);
    const pending = useMemo(() => total - paidAmount, [total, paidAmount]);

    const handleSave = async () => {
        if (!clientDetails.username) return alert("Please enter a client name.");
        
        setIsSaving(true);
        try {
            const invoiceData: any = {
                client_name: clientDetails.username,
                client_address: clientDetails.address,
                client_mobile: clientDetails.mobile,
                total_amount: total,
                paid_amount: paidAmount,
                payment_method: paymentMethod,
                notes: notes,
                status: pending <= 0 ? 'Paid' : 'Pending',
                line_items: lineItems.filter(item => item.description),
            };

            if (invoiceToEdit && !isDuplicate) {
                // UPDATE LOGIC
                invoiceData.invoice_no = invoiceToEdit.invoice_number;
                invoiceData.issue_date = invoiceToEdit.issue_date;
                invoiceData.due_date = invoiceToEdit.due_date;
                
                await api.put(`/api/invoices/${invoiceToEdit.id}`, invoiceData);
            } else {
                // CREATE or DUPLICATE LOGIC
                const invoicePrefix = settings?.invoice_prefix || 'INV_';
                
                // Get existing invoices to increment invoice number
                const invoicesList = await api.get('/api/invoices');
                let nextNum = 1001;
                const numbers = invoicesList
                    .map((inv: any) => {
                        const numStr = inv.invoice_number || inv.invoice_no || '';
                        const match = numStr.match(/\d+$/);
                        return match ? parseInt(match[0], 10) : null;
                    })
                    .filter((n: any) => n !== null);
                if (numbers.length > 0) {
                    nextNum = Math.max(...numbers) + 1;
                }
                const invoiceNumber = `${invoicePrefix}${nextNum}`;

                invoiceData.invoice_no = invoiceNumber;
                invoiceData.issue_date = new Date().toISOString().slice(0, 10);
                invoiceData.due_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 30 days due
                
                await api.post('/api/invoices', invoiceData);
            }
            
            onSaveSuccess();
            onClose();

        } catch (error: any) {
            alert(`Error saving invoice: ${error.message || error}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={invoiceToEdit ? (isDuplicate ? "Duplicate Invoice" : "Edit Invoice") : "Create New Invoice"}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Client Name</label>
                    <select value={clientDetails.username} onChange={handleClientNameChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" required>
                        <option value="">-- Select Client --</option>
                        {clients.map(client => <option key={client.id} value={client.username}>{client.username}</option>)}
                    </select>
                </div>
                
                {/* These fields are now only for the PDF, not for creating a new user */}
                <InputField label="Client Address (for PDF)" type="text" value={clientDetails.address} onChange={e => setClientDetails(prev => ({ ...prev, address: e.target.value }))} placeholder="Enter client address" />
                <InputField label="Client Mobile (for PDF)" type="text" value={clientDetails.mobile} onChange={e => setClientDetails(prev => ({ ...prev, mobile: e.target.value }))} placeholder="Enter client mobile"/>
                
                <hr/>
                <h3 className="font-semibold">Line Items</h3>
                {lineItems.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                        <input type="text" placeholder="Item Description" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} className="flex-grow p-2 border rounded-md" />
                        <input type="number" placeholder="Qty" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="w-16 p-2 border rounded-md" />
                        <input type="number" placeholder="Price" value={item.price} onChange={e => handleItemChange(index, 'price', e.target.value)} className="w-24 p-2 border rounded-md" />
                        <button onClick={() => removeItem(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon className="h-5 w-5"/></button>
                    </div>
                ))}
                <button onClick={addItem} className="text-sm text-primary flex items-center"><PlusIcon className="h-4 w-4 mr-1"/> Add Item</button>
                <hr/>
                <div className="grid grid-cols-2 gap-4">
                    <InputField label="Paid Amount (₹)" type="number" value={paidAmount} onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)} />
                    <SelectField label="Payment Method" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                        <option value="GPay">GPay</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash in Hand">Cash in Hand</option>
                    </SelectField>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Extra Note (Optional)</label>
                    <textarea rows={3} placeholder="Add a custom note to this invoice..." value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                <div className="pt-4 text-right space-y-2 font-medium">
                    <p>Total: ₹{total.toLocaleString()}</p>
                    <p>Pending: ₹{pending.toLocaleString()}</p>
                </div>
            </div>
            <div className="flex justify-end pt-6">
                <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm text-white bg-primary rounded-md">
                    {isSaving ? 'Saving...' : 'Save Invoice'}
                </button>
            </div>
        </Modal>
    );
};

const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
    <div><label className="block text-sm font-medium text-gray-700">{label}</label><select {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm">{children}</select></div>
);
const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div><label className="block text-sm font-medium text-gray-700">{label}</label><input {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/></div>
);

export default InvoiceModal;