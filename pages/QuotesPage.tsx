// src/pages/QuotesPage.tsx

import React, { useState, useCallback, useEffect } from 'react';
import { api } from '../apiClient';
import { PlusIcon, PencilIcon, TrashIcon, LinkIcon } from '../components/icons/Icons';
import QuoteModal from '../components/quotes/QuoteModal';
import { Quote } from '../types';
import { usePermissions } from '../components/auth/PermissionsContext';

const QuotesPage: React.FC<{ title: string }> = ({ title }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [quoteToEdit, setQuoteToEdit] = useState<Quote | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const { hasPermission, currentProfile } = usePermissions();
  const canCreate = hasPermission('quotes', 'create');
  const canEdit = hasPermission('quotes', 'edit');
  const canDelete = hasPermission('quotes', 'delete');

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/quotes');
      let filtered = data || [];
      if (currentProfile?.role === 'Client') {
          filtered = filtered.filter((q: Quote) => q.client_id === currentProfile.id);
      }
      setQuotes(filtered);
    } catch (err: any) {
      console.error("Error fetching quotes:", err.message || err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const handleSaveQuote = async (quoteData: Omit<Quote, 'id' | 'created_at' | 'created_by'>) => {
    setIsSaving(true);
    try {
      if (quoteToEdit) {
          await api.put(`/api/quotes/${quoteToEdit.id}`, quoteData);
      } else {
          const finalData = { ...quoteData, created_by: currentProfile?.id };
          await api.post('/api/quotes', finalData);
      }
      setModalOpen(false);
      setQuoteToEdit(null);
      fetchQuotes();
    } catch (err: any) {
      alert(`Error saving quote: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuote = async (quoteId: number) => {
    if (window.confirm('Are you sure you want to delete this quote?')) {
        try {
            await api.delete(`/api/quotes/${quoteId}`);
            fetchQuotes();
        } catch (err: any) {
            alert(`Error deleting quote: ${err.message || err}`);
        }
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
        {canCreate && (<button onClick={() => { setQuoteToEdit(null); setModalOpen(true); }} className="inline-flex items-center bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark"><PlusIcon className="h-5 w-5 mr-2" /> Create Quote</button>)}
      </div>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created On</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (<tr><td colSpan={4} className="p-8 text-center text-gray-500">Loading...</td></tr>) : 
               quotes.length === 0 ? (<tr><td colSpan={4} className="p-8 text-center text-gray-500">No quotes found.</td></tr>) : 
               (quotes.map((quote) => (
                  <tr key={quote.id}>
                    <td className="px-6 py-4 font-medium">{quote.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-sm truncate" title={quote.description || ''}>{quote.description}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(quote.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {quote.document_url && (<a href={quote.document_url} target="_blank" rel="noopener noreferrer" className="p-1 inline-block text-gray-400 hover:text-primary" title="View Document"><LinkIcon className="h-5 w-5"/></a>)}
                      {canEdit && <button onClick={() => { setQuoteToEdit(quote); setModalOpen(true); }} className="p-1 text-gray-400 hover:text-primary" title="Edit Quote"><PencilIcon className="h-5 w-5"/></button>}
                      {canDelete && <button onClick={() => handleDeleteQuote(quote.id)} className="p-1 text-red-400 hover:text-red-600" title="Delete Quote"><TrashIcon className="h-5 w-5"/></button>}
                    </td>
                  </tr>
                )))}
            </tbody>
          </table>
        </div>
      </div>
      <QuoteModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSave={handleSaveQuote} quoteToEdit={quoteToEdit} isSaving={isSaving} />
    </>
  );
};

export default QuotesPage;