// src/components/invoices/InvoiceTemplate.tsx

import React from 'react';
import { User } from '../../types';

// Define the shape of the settings object we expect as a prop
interface CompanySettings {
  company_name?: string | null;
  logo_url?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  watermark_url?: string | null;
  terms_and_conditions?: string | null;
  logo_height?: string | null;
}

// Update the props interface to include settings
interface InvoiceTemplateProps {
    invoiceNumber: string;
    client: Partial<User>;
    items: { description: string; quantity: number; price: number }[];
    total: number;
    paid: number;
    pending: number;
    paymentMethod: string;
    issueDate: string;
    notes?: string;
    settings: CompanySettings | null;
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({
    invoiceNumber,
    client,
    items,
    total,
    paid,
    pending,
    paymentMethod,
    notes,
    settings
}) => {
    return (
        <div style={{ position: 'relative', width: '210mm', minHeight: '297mm', padding: '15mm', fontFamily: 'Arial, sans-serif', backgroundColor: 'white', color: '#333', display: 'flex', flexDirection: 'column', zIndex: 1 }}>
            
            {/* Watermark Section */}
            {settings?.watermark_url && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.1, zIndex: -1, pointerEvents: 'none' }}>
                    <img src={settings.watermark_url} alt="Watermark" style={{ width: '400px', height: 'auto', objectFit: 'contain' }} />
                </div>
            )}

            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                {/* Check if logo_url exists before rendering the img tag */}
                {settings?.logo_url ? (
                    <img src={settings.logo_url} alt="Company Logo" style={{ height: settings?.logo_height ? `${settings.logo_height}px` : '100px', maxWidth: '300px', objectFit: 'contain' }} />
                ) : (
                    // Fallback if no logo is set
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0b2a5c' }}>{settings?.company_name || 'Your Company'}</div>
                )}
                <div style={{ textAlign: 'right' }}>
                    <h1 style={{ color: '#0b2a5c', fontSize: '36px', margin: 0, fontWeight: 'bold' }}>INVOICE</h1>
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#555' }}>Invoice #: {invoiceNumber}</p>
                </div>
            </div>

            {/* Addresses Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', fontSize: '12px', lineHeight: '1.6' }}>
                <div>
                    <h3 style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Office Address</h3>
                    <p style={{ margin: 0, whiteSpace: 'pre-line' }}>
                        {settings?.address || 'Company Address Not Set'}<br/>
                        {settings?.phone}
                    </p>
                </div>
                <div style={{ maxWidth: '50%', textAlign: 'left' }}>
                    <h3 style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>To:</h3>
                    <p style={{ margin: 0, whiteSpace: 'pre-line' }}>
                        <strong>{client.username}</strong><br/>
                        {client.address || 'Address not provided'}<br/>
                    </p>
                </div>
            </div>

            {/* Items Table */}
            <div style={{ marginTop: '30px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#0b2a5c', color: 'white' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>ITEM DESCRIPTION</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>PRICE</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>QTY</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px' }}>{item.description}</td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>₹{item.price.toLocaleString()}</td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>{item.quantity}</td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>₹{(item.price * item.quantity).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals Section */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', fontSize: '14px' }}>
                <div style={{ width: '280px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                        <span>PAID</span>
                        <span>: ₹{paid.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                        <span>PENDING</span>
                        <span>: ₹{pending.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#0b2a5c', color: 'white', padding: '12px', fontWeight: 'bold' }}>
                        <span>TOTAL</span>
                        <span>: ₹{total.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Notes Section */}
            <div style={{ marginTop: '30px', fontSize: '12px' }}>
                {notes && (
                    <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f9fafb', borderLeft: '3px solid #0b2a5c' }}>
                        <p style={{ margin: 0, fontWeight: 'bold', color: '#0b2a5c' }}>Extra Note:</p>
                        <p style={{ margin: '5px 0 0 0', whiteSpace: 'pre-line' }}>{notes}</p>
                    </div>
                )}
                <p style={{ margin: '0 0 10px 0' }}><strong>Terms & Conditions:</strong> {settings?.terms_and_conditions || 'Default terms and conditions apply.'}</p>
                <p><strong>Thanks for Your Business With Us.</strong></p>
            </div>
            
            {/* Footer Section */}
            <div style={{ flexGrow: 1 }}></div>
            <div style={{ borderTop: '2px solid #f9ca24', paddingTop: '15px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', lineHeight: '1.6' }}>
                 <div>
                    <strong>Questions?</strong><br/>
                    Call Us: {settings?.phone}<br/>
                    Write us: {settings?.email}
                </div>
                <div>
                    <strong>Payment Method:</strong><br/>
                    {paymentMethod}
                </div>
                <div style={{ maxWidth: '40%' }}>
                    <strong>Terms & Conditions:</strong><br/>
                    {settings?.terms_and_conditions}
                </div>
            </div>
        </div>
    );
};

export default InvoiceTemplate;