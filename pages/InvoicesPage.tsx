

// src/pages/InvoicesPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { api } from '../apiClient';
import { usePermissions } from '../components/auth/PermissionsContext';
import { Invoice, User, LineItem } from '../types';
import { PlusIcon, DownloadIcon, PencilIcon, TrashIcon, DocumentDuplicateIcon } from '../components/icons/Icons';
import InvoiceModal from '../components/invoices/InvoiceModal';
import InvoiceTemplate from '../components/invoices/InvoiceTemplate';

const statusColors: { [key: string]: string } = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Paid: 'bg-green-100 text-green-800',
  Overdue: 'bg-red-100 text-red-800',
};

export interface InvoiceWithRelations extends Invoice {
    profiles: Pick<User, 'username' | 'address' | 'mobile'> | null;
    invoice_items: LineItem[];
    client_name_override?: string | null;
    client_address?: string | null;
    client_mobile?: string | null;
}

const InvoicesPage: React.FC<{ title: string }> = ({ title }) => {
    const { hasPermission, currentProfile } = usePermissions();
    const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setModalOpen] = useState(false);
    
    const [invoiceToEdit, setInvoiceToEdit] = useState<InvoiceWithRelations | null>(null);
    const [isDuplicate, setIsDuplicate] = useState(false);
    
    const canCreate = hasPermission('invoices', 'create');
    const canDelete = hasPermission('invoices', 'delete');
    const canEdit = hasPermission('invoices', 'edit'); 
    
    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const [invoicesData, profilesData] = await Promise.all([
                api.get('/api/invoices'),
                api.get('/api/users')
            ]);
            const profileMap = new Map<string, User>((profilesData || []).map((p: any) => [p.username.toLowerCase(), p]));
            const mapped = invoicesData
                .filter((inv: any) => {
                    if (currentProfile?.role === 'Client') {
                        return inv.client_name_override && inv.client_name_override.toLowerCase() === currentProfile.username.toLowerCase();
                    }
                    return true;
                })
                .map((inv: any) => {
                    const clientName = inv.client_name_override || '';
                    const profile = profileMap.get(clientName.toLowerCase()) || null;
                    return {
                        ...inv,
                        profiles: profile ? {
                            username: profile.username,
                            address: profile.address || '',
                            mobile: profile.mobile || ''
                        } : null
                    };
                });
            setInvoices(mapped);
        } catch (err) {
            console.error("Error fetching invoices:", err);
            setInvoices([]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const handleDownloadInvoice = async (invoice: InvoiceWithRelations) => {
        const items = invoice.invoice_items;
        const pdfContainer = document.createElement('div');
        pdfContainer.style.position = 'absolute';
        pdfContainer.style.left = '-9999px'; 
        document.body.appendChild(pdfContainer);

        const clientForTemplate = { 
            username: invoice.client_name_override || invoice.profiles?.username || 'N/A', 
            address: invoice.client_address || invoice.profiles?.address || '',
            mobile: invoice.client_mobile || invoice.profiles?.mobile || '',
        };

        const invoiceProps = {
            invoiceNumber: invoice.invoice_number,
            client: clientForTemplate,
            items: items,
            total: invoice.total_amount,
            paid: invoice.paid_amount,
            pending: invoice.total_amount - invoice.paid_amount,
            paymentMethod: invoice.payment_method || 'N/A',
            issueDate: invoice.issue_date,
            notes: invoice.notes || '',
        };
        
        const tempDiv = document.createElement('div');
        pdfContainer.appendChild(tempDiv);
        
        let settings = null;
        try {
            settings = await api.get('/api/settings');
        } catch (e) {
            console.error("Error fetching settings for PDF:", e);
        }
        
        ReactDOM.render(<InvoiceTemplate {...invoiceProps} settings={settings} />, tempDiv, async () => {
             await new Promise(resolve => setTimeout(resolve, 100));

              const canvas = await html2canvas(tempDiv.children[0] as HTMLElement, { 
                 scale: 2,
                 allowTaint: true, 
                 useCORS: true 
              });

              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
              pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
              pdf.save(`${invoice.invoice_number}.pdf`);
              document.body.removeChild(pdfContainer);
         });
    };

    const handleDeleteInvoice = async (invoiceId: number) => {
        if (!window.confirm("Are you sure? This will delete the invoice and all its items.")) return;
        try {
            await api.delete(`/api/invoices/${invoiceId}`);
            fetchInvoices();
        } catch (err: any) {
            alert(`Error deleting invoice: ${err.message || err}`);
        }
    };
    const handleEdit = (invoice: InvoiceWithRelations) => {
        setInvoiceToEdit(invoice);
        setIsDuplicate(false);
        setModalOpen(true);
    };
    const handleDuplicate = (invoice: InvoiceWithRelations) => {
        setInvoiceToEdit(invoice);
        setIsDuplicate(true);
        setModalOpen(true);
    };
    const handleCloseModal = () => {
        setModalOpen(false);
        setInvoiceToEdit(null);
        setIsDuplicate(false);
    };

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
                {canCreate && (
                    <button onClick={() => setModalOpen(true)} className="inline-flex items-center bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark">
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Create New Invoice
                    </button>
                )}
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-10 text-gray-500">Loading invoices...</td></tr>
                            ) : invoices.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-10 text-gray-500">No invoices found. Click "Create New Invoice" to get started.</td></tr>
                            ) : (
                                invoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{inv.invoice_number}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{inv.profiles?.username || inv.client_name_override}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(inv.issue_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{inv.total_amount.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[inv.status]}`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            <button onClick={() => handleDownloadInvoice(inv)} className="p-1 text-gray-400 hover:text-primary" title="Download PDF"><DownloadIcon className="h-5 w-5"/></button>
                                            {canEdit && <button onClick={() => handleEdit(inv)} className="p-1 text-gray-400 hover:text-primary" title="Edit Invoice"><PencilIcon className="h-5 w-5"/></button>}
                                            {canEdit && <button onClick={() => handleDuplicate(inv)} className="p-1 text-gray-400 hover:text-primary" title="Duplicate Invoice"><DocumentDuplicateIcon className="h-5 w-5"/></button>}
                                            {canDelete && <button onClick={() => handleDeleteInvoice(inv.id)} className="p-1 text-red-400 hover:text-red-600" title="Delete Invoice"><TrashIcon className="h-5 w-5"/></button>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <InvoiceModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSaveSuccess={fetchInvoices}
                invoiceToEdit={invoiceToEdit}
                isDuplicate={isDuplicate}
            />
        </>
    );
};

export default InvoicesPage;