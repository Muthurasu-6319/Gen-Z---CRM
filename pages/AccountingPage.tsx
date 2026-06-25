// src/pages/AccountingPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../apiClient';
import { usePermissions } from '../components/auth/PermissionsContext';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon, DownloadIcon } from '../components/icons/Icons';
import TransactionModal from '../components/accounting/TransactionModal';
import { AccountingTransaction, User } from '../types';

interface MonthlySummary {
    total_income: number;
    total_expense: number;
}

const paymentModeColors: { [key: string]: string } = {
  GPay: 'bg-blue-100 text-blue-800',
  Bank: 'bg-indigo-100 text-indigo-800',
  'Cash in Hand': 'bg-gray-100 text-gray-800',
};

const AccountingPage: React.FC<{ title: string }> = ({ title }) => {
    const { hasPermission } = usePermissions();
    const [transactions, setTransactions] = useState<AccountingTransaction[]>([]);
    const [summary, setSummary] = useState<MonthlySummary>({ total_income: 0, total_expense: 0 });
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setModalOpen] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<AccountingTransaction | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const canCreate = hasPermission('accounting', 'create');
    const canEdit = hasPermission('accounting', 'edit');
    const canDelete = hasPermission('accounting', 'delete');

    const fetchDataForMonth = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get('/api/accounting');
            // Filter by month
            const filtered = data.filter((t: any) => {
                return t.transaction_date && t.transaction_date.slice(0, 7) === selectedMonth;
            });
            setTransactions(filtered);
            
            // Compute summary
            let total_income = 0;
            let total_expense = 0;
            filtered.forEach((t: any) => {
                if (t.type === 'Income') total_income += Number(t.amount || 0);
                else total_expense += Number(t.amount || 0); // Expense and Salary are expenses
            });
            setSummary({ total_income, total_expense });
        } catch (error: any) {
            console.error("Error fetching accounting data:", error.message || error);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth]);

    useEffect(() => {
        fetchDataForMonth();
    }, [fetchDataForMonth]);

    const handleSaveTransaction = async (formData: FormData) => {
        setIsSaving(true);
        try {
            const transactionData = {
                date: formData.get('transaction_date'), // MySQL backend expects "date"
                type: formData.get('type'),
                category: formData.get('category'),
                amount: Number(formData.get('amount')),
                description: formData.get('description'),
                related_profile_id: formData.get('related_profile_id') || null,
                payment_mode: formData.get('payment_mode'),
            };

            if (transactionToEdit) {
                await api.put(`/api/accounting/${transactionToEdit.id}`, transactionData);
            } else {
                await api.post('/api/accounting', transactionData);
            }

            await fetchDataForMonth();
            setModalOpen(false);
            setTransactionToEdit(null);
        } catch (error: any) {
            alert(`Error saving transaction: ${error.message || error}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTransaction = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this transaction?")) return;
        try {
            await api.delete(`/api/accounting/${id}`);
            await fetchDataForMonth();
        } catch (error: any) {
            alert(`Error: ${error.message || error}`);
        }
    };

    const profit = summary.total_income - summary.total_expense;

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
                <div className="flex items-center space-x-4">
                    <input 
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    />
                    {canCreate && (
                        <button 
                            onClick={() => { setTransactionToEdit(null); setModalOpen(true); }}
                            className="inline-flex items-center bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark"
                        >
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Add Transaction
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <SummaryCard title="Total Income" amount={summary.total_income} color="text-green-600" />
                <SummaryCard title="Total Expense" amount={summary.total_expense} color="text-red-600" />
                <SummaryCard title="Profit / Loss" amount={profit} color={profit >= 0 ? 'text-blue-600' : 'text-red-600'} />
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category / To</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center">Loading...</td></tr>
                            ) : transactions.map(t => (
                                <tr key={t.id}>
                                    <td className="px-6 py-4 text-sm">{t.transaction_date}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                            t.type === 'Income' ? 'bg-green-100 text-green-800' :
                                            t.type === 'Expense' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>{t.type}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm">{t.type === 'Salary' ? t.profile?.username : t.category}</td>
                                    <td className="px-6 py-4 text-sm">
                                        {t.payment_mode && (
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${paymentModeColors[t.payment_mode] || 'bg-gray-100 text-gray-800'}`}>
                                                {t.payment_mode}
                                            </span>
                                        )}
                                    </td>
                                    <td className={`px-6 py-4 text-sm text-right font-medium ${t.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {t.type === 'Income' ? '+' : '-'} ₹{t.amount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        {canEdit && <button onClick={() => { setTransactionToEdit(t); setModalOpen(true); }} className="p-1 text-gray-400 hover:text-primary"><PencilIcon className="h-5 w-5"/></button>}
                                        {canDelete && <button onClick={() => handleDeleteTransaction(t.id)} className="p-1 text-red-400 hover:text-red-600"><TrashIcon className="h-5 w-5"/></button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveTransaction}
                transactionToEdit={transactionToEdit}
                isSaving={isSaving}
            />
        </>
    );
};

const SummaryCard: React.FC<{ title: string; amount: number; color: string }> = ({ title, amount, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-sm font-medium text-text-secondary">{title}</p>
        <p className={`text-3xl font-bold ${color}`}>₹{amount.toLocaleString()}</p>
    </div>
);

export default AccountingPage;