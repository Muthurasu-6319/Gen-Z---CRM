// src/pages/MailTemplatePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../apiClient';
import { EmailTemplate } from '../types';
import { PlusIcon, PencilIcon, TrashIcon, XIcon, EyeIcon } from '../components/icons/Icons';

// ─── Default regards footer ──────────────────────────────────────────────────
const DEFAULT_REGARDS = `\n\nWarm Regards,\nGENZ Team`;

// ─── Template Form Modal ─────────────────────────────────────────────────────
interface TemplateFormProps {
  initial?: EmailTemplate | null;
  onSave: (data: { name: string; subject: string; body: string }) => Promise<void>;
  onClose: () => void;
}

const TemplateForm: React.FC<TemplateFormProps> = ({ initial, onSave, onClose }) => {
  const [name, setName] = useState(initial?.name || '');
  const [subject, setSubject] = useState(initial?.subject || '');
  const [body, setBody] = useState(initial?.body || DEFAULT_REGARDS);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      alert('Please fill all fields.'); return;
    }
    setSaving(true);
    await onSave({ name: name.trim(), subject: subject.trim(), body: body.trim() });
    setSaving(false);
  };

  const previewHtml = body.replace(/\n/g, '<br>');

  const insertVariable = (variable: string) => {
    setBody(prev => prev + variable);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', borderRadius: '16px 16px 0 0' }}>
          <h2 style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 18 }}>
            {initial ? '✏️ Edit Template' : '✨ Create Mail Template'}
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#fff', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Template Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Template Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Welcome Email, Follow-Up..."
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          {/* Subject */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Subject *</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject line..."
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
          </div>

          {/* Variable helpers */}
          <div style={{ marginBottom: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0', alignSelf: 'center' }}>Insert variable:</p>
            {['{{username}}', '{{company}}', '{{date}}'].map(v => (
              <button key={v} type="button" onClick={() => insertVariable(v)}
                style={{ fontSize: 12, padding: '4px 10px', background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                {v}
              </button>
            ))}
          </div>

          {/* Body / Preview toggle */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Body *</label>
              <button type="button" onClick={() => setPreviewMode(p => !p)}
                style={{ fontSize: 12, padding: '4px 12px', background: previewMode ? '#6366f1' : '#f3f4f6', color: previewMode ? '#fff' : '#374151', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                {previewMode ? '✏️ Edit' : '👁 Preview'}
              </button>
            </div>
            {previewMode ? (
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 20, minHeight: 220, background: '#f9fafb', fontSize: 14, lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <textarea
                rows={12}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder={`Write your template body...\n\nYou can use HTML or plain text.\nUse {{username}} for personalisation.\n\nWarm Regards,\nGENZ Team`}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14, lineHeight: 1.7, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
              />
            )}
          </div>

          {/* Regards reminder */}
          <div style={{ padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#15803d' }}>
              💡 <strong>Tip:</strong> Make sure your body ends with a <em>"Warm Regards, [Name]"</em> line — this is automatically added when sending if missing.
            </p>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '10px 22px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              style={{ padding: '10px 26px', background: saving ? '#9ca3af' : 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
              {saving ? 'Saving...' : initial ? '💾 Update Template' : '✨ Create Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main MailTemplatePage ────────────────────────────────────────────────────
const MailTemplatePage: React.FC<{ title: string }> = ({ title }) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<EmailTemplate[]>('/api/mailbox/templates');
      setTemplates(data);
    } catch { setTemplates([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleCreate = async (data: { name: string; subject: string; body: string }) => {
    try {
      await api.post('/api/mailbox/templates', data);
      await fetchTemplates();
      setShowForm(false);
    } catch (e) { alert('Failed to create template: ' + (e as Error).message); }
  };

  const handleUpdate = async (data: { name: string; subject: string; body: string }) => {
    if (!editTemplate) return;
    try {
      await api.put(`/api/mailbox/templates/${editTemplate.id}`, data);
      await fetchTemplates();
      setEditTemplate(null);
    } catch (e) { alert('Failed to update template: ' + (e as Error).message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this template?')) return;
    try {
      await api.delete(`/api/mailbox/templates/${id}`);
      await fetchTemplates();
    } catch (e) { alert('Failed to delete: ' + (e as Error).message); }
  };

  // Category badge colors
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];
  const getColor = (i: number) => colors[i % colors.length];

  return (
    <div style={{ background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: 14, padding: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1e1b4b', margin: 0 }}>{title}</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>Create and manage reusable email templates with personalisation variables.</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14, boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>
          <PlusIcon className="h-5 w-5" /> New Template
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
          <p>Loading templates...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && templates.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12, border: '2px dashed #e5e7eb' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>📝</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#374151', margin: '0 0 8px' }}>No templates yet</h3>
          <p style={{ color: '#6b7280', margin: '0 0 20px' }}>Create your first email template to speed up bulk sending.</p>
          <button onClick={() => setShowForm(true)}
            style={{ padding: '10px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
            Create First Template
          </button>
        </div>
      )}

      {/* Templates Grid */}
      {!loading && templates.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 20 }}>
          {templates.map((t, i) => (
            <div key={t.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'transform 0.2s,box-shadow 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}>
              {/* Color bar */}
              <div style={{ height: 6, background: `linear-gradient(90deg,${getColor(i)},${getColor(i + 1)})` }} />
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${getColor(i)}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📧</div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>{t.name}</h3>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>ID #{t.id}</p>
                    </div>
                  </div>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#374151' }}>📌 {t.subject}</p>
                <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.5, maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.body.replace(/<[^>]*>/g, '').substring(0, 120)}...
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
                  <button onClick={() => setPreviewTemplate(t)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    <EyeIcon className="h-4 w-4" /> Preview
                  </button>
                  <button onClick={() => setEditTemplate(t)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    <PencilIcon className="h-4 w-4" /> Edit
                  </button>
                  <button onClick={() => handleDelete(t.id)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                    <TrashIcon className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Form */}
      {showForm && <TemplateForm onSave={handleCreate} onClose={() => setShowForm(false)} />}

      {/* Edit Form */}
      {editTemplate && <TemplateForm initial={editTemplate} onSave={handleUpdate} onClose={() => setEditTemplate(null)} />}

      {/* Preview Modal */}
      {previewTemplate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(135deg,#10b981,#059669)', borderRadius: '16px 16px 0 0' }}>
              <h3 style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: 16 }}>👁 Preview: {previewTemplate.name}</h3>
              <button onClick={() => setPreviewTemplate(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', color: '#fff', fontSize: 18 }}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Subject:</p>
                <p style={{ margin: '4px 0 0', fontWeight: 700, color: '#111827' }}>{previewTemplate.subject}</p>
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 20, fontSize: 14, lineHeight: 1.8, color: '#374151' }}
                dangerouslySetInnerHTML={{ __html: previewTemplate.body.replace(/\n/g, '<br>') }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MailTemplatePage;
