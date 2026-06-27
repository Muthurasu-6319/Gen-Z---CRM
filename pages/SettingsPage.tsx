// src/pages/SettingsPage.tsx

import React, { useState, useEffect } from 'react';
import { api } from '../apiClient';
import { useSettings } from '../components/auth/SettingsContext';
import { usePermissions } from '../components/auth/PermissionsContext';
import AccessDeniedPage from './AccessDeniedPage';
import RolesManagement from '../components/settings/RolesManagement';

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
    const [logo_height, setLogoHeight] = useState('100'); // Default height in pixels
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [invoice_prefix, setInvoicePrefix] = useState('');
    const [watermark_url, setWatermarkUrl] = useState('');
    const [terms_and_conditions, setTerms] = useState('');
    
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (settings) {
            setCompanyName(settings.company_name || '');
            setLogoUrl(settings.logo_url || '');
            setLogoHeight(settings.logo_height || '100');
            setAddress(settings.address || '');
            setPhone(settings.phone || '');
            setEmail(settings.email || '');
            setInvoicePrefix(settings.invoice_prefix || '');
            setWatermarkUrl(settings.watermark_url || '');
            setTerms(settings.terms_and_conditions || '');
        }
    }, [settings]);

    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const updates = { company_name, logo_url, logo_height, address, phone, email, invoice_prefix, watermark_url, terms_and_conditions };
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
                        <div className="space-y-4">
                            <InputField 
                                label="Company Logo URL" 
                                value={logo_url} 
                                onChange={e => setLogoUrl(e.target.value)}
                                placeholder="https://example.com/logo.png"
                            />
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Logo Size (Height in px)</label>
                                <div className="flex items-center space-x-4 mt-1">
                                    <input type="range" min="30" max="250" value={logo_height} onChange={e => setLogoHeight(e.target.value)} className="w-full accent-primary" />
                                    <span className="text-sm font-medium text-gray-700 w-12">{logo_height}px</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Logo Preview</label>
                            <div className="mt-1 flex items-center justify-center h-20 w-40 border rounded-md p-1 bg-gray-50">
                                {logo_url ? 
                                    <img src={logo_url} alt="Logo Preview" style={{ height: `${Math.min(parseInt(logo_height) || 100, 150)}px` }} className="max-w-full object-contain" /> :
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
                    <InputField label="Invoice Prefix (e.g. GNX-INV-)" value={invoice_prefix} onChange={e => setInvoicePrefix(e.target.value)} />
                    <InputField label="Watermark Image URL (Optional)" placeholder="https://example.com/watermark.png" value={watermark_url} onChange={e => setWatermarkUrl(e.target.value)} />
                    <TextareaField label="Terms & Conditions" rows={5} placeholder="Enter terms line by line..." value={terms_and_conditions} onChange={e => setTerms(e.target.value)} />

                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={isSaving} className="inline-flex items-center bg-primary text-white px-6 py-2 rounded-md font-medium hover:bg-primary-dark transition-colors disabled:opacity-50">
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
            
            <RolesManagement />
        </div>
    );
};

export default SettingsPage;