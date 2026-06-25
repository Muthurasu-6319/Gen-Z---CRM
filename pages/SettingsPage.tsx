// src/pages/SettingsPage.tsx

import React, { useState, useEffect } from 'react';
import { api } from '../apiClient';
import { useSettings } from '../components/auth/SettingsContext';
import { usePermissions } from '../components/auth/PermissionsContext';
import AccessDeniedPage from './AccessDeniedPage';

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <input {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
    </div>
);
const TextareaField: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <textarea {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
    </div>
);

const SettingsPage: React.FC<{ title: string }> = ({ title }) => {
    const { settings, loading: settingsLoading, refetchSettings } = useSettings();
    const { hasPermission } = usePermissions();

    const [company_name, setCompanyName] = useState('');
    const [logo_url, setLogoUrl] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [invoice_prefix, setInvoicePrefix] = useState('');
    const [terms_and_conditions, setTerms] = useState('');
    
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (settings) {
            setCompanyName(settings.company_name || '');
            setLogoUrl(settings.logo_url || '');
            setAddress(settings.address || '');
            setPhone(settings.phone || '');
            setEmail(settings.email || '');
            setInvoicePrefix(settings.invoice_prefix || '');
            setTerms(settings.terms_and_conditions || '');
        }
    }, [settings]);

    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const updates = { company_name, logo_url, address, phone, email, invoice_prefix, terms_and_conditions };
        try {
            await api.put('/api/settings', updates);
            alert('Settings saved successfully!');
            if (refetchSettings) refetchSettings();
        } catch (err) {
            alert(`Error saving settings: ${(err as Error).message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (!hasPermission('settings', 'view')) return <AccessDeniedPage />;
    if (settingsLoading) return <div className="text-center p-8">Loading settings...</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-primary mb-6">{title}</h1>
            <div className="bg-white shadow-md rounded-lg p-6">
                <form onSubmit={handleSaveChanges} className="space-y-6">
                    <InputField label="Company Name" value={company_name} onChange={e => setCompanyName(e.target.value)} />
                    
                    {/* Company Logo URL */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <InputField 
                            label="Company Logo URL" 
                            value={logo_url} 
                            onChange={e => setLogoUrl(e.target.value)}
                            placeholder="https://example.com/logo.png"
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Logo Preview</label>
                            <div className="mt-1 flex items-center justify-center h-20 w-40 border rounded-md p-1 bg-gray-50">
                                {logo_url ? 
                                    <img src={logo_url} alt="Logo Preview" className="h-full w-full object-contain" /> :
                                    <span className="text-xs text-gray-400">No Logo URL</span>
                                }
                            </div>
                        </div>
                    </div>
                    
                    <TextareaField label="Company Address" rows={3} value={address} onChange={e => setAddress(e.target.value)} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField label="Contact Phone" value={phone} onChange={e => setPhone(e.target.value)} />
                        <InputField label="Contact Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="border-t pt-6"><h2 className="text-lg font-semibold">Invoice Settings</h2></div>
                    <InputField label="Invoice Prefix" placeholder="e.g., GENZ_" value={invoice_prefix} onChange={e => setInvoicePrefix(e.target.value)} />
                    <TextareaField label="Terms & Conditions" rows={5} placeholder="Enter terms line by line..." value={terms_and_conditions} onChange={e => setTerms(e.target.value)} />

                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={isSaving} className="inline-flex items-center bg-primary text-white px-6 py-2 rounded-md font-medium hover:bg-primary-dark transition-colors disabled:opacity-50">
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettingsPage;