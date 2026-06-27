// pages/MailboxPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../apiClient';
import { User, EmailTemplate } from '../types';
import { PaperAirplaneIcon, MailIcon, TrashIcon } from '../components/icons/Icons';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Mail {
  id: number; sender_id: string; recipient_id: string;
  subject: string; body: string; is_read: number;
  folder: string; created_at: string;
  sender_name?: string; recipient_name?: string;
}
interface Asset { id: string; url: string; label: string; }

// ── Asset Panel ───────────────────────────────────────────────────────────────
const AssetPanel: React.FC<{ assets: Asset[]; onAdd: (u:string,l:string)=>void; onRemove:(id:string)=>void; onInsert:(u:string)=>void; }> = ({ assets, onAdd, onRemove, onInsert }) => {
  const [url, setUrl] = useState(''); const [label, setLabel] = useState('');
  return (
    <div style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:16, background:'#f9fafb', marginBottom:16 }}>
      <p style={{ fontWeight:700, fontSize:13, color:'#374151', marginBottom:8 }}>🖼️ Assets (Image Links)</p>
      <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        <input type="url" placeholder="Paste image URL..." value={url} onChange={e=>setUrl(e.target.value)}
          style={{ flex:2, minWidth:180, padding:'6px 10px', border:'1px solid #d1d5db', borderRadius:6, fontSize:13 }} />
        <input type="text" placeholder="Label" value={label} onChange={e=>setLabel(e.target.value)}
          style={{ flex:1, minWidth:100, padding:'6px 10px', border:'1px solid #d1d5db', borderRadius:6, fontSize:13 }} />
        <button onClick={()=>{ if(url.trim()){onAdd(url.trim(),label||'Asset');setUrl('');setLabel('');} }}
          style={{ padding:'6px 14px', background:'#6366f1', color:'#fff', borderRadius:6, fontWeight:600, cursor:'pointer', border:'none', fontSize:13 }}>+ Add</button>
      </div>
      {url && <img src={url} alt="preview" style={{ maxHeight:70, maxWidth:160, borderRadius:6, marginBottom:8, border:'1px solid #e5e7eb' }} onError={e=>(e.currentTarget.style.display='none')} />}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        {assets.map(a => (
          <div key={a.id} style={{ border:'1px solid #e5e7eb', borderRadius:8, padding:6, background:'#fff', textAlign:'center', width:95 }}>
            <img src={a.url} alt={a.label} style={{ width:76, height:54, objectFit:'cover', borderRadius:4 }} onError={e=>(e.currentTarget.src='https://via.placeholder.com/76x54?text=IMG')} />
            <p style={{ fontSize:11, color:'#374151', margin:'4px 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.label}</p>
            <div style={{ display:'flex', gap:4, justifyContent:'center' }}>
              <button onClick={()=>onInsert(a.url)} style={{ fontSize:11, padding:'2px 6px', background:'#10b981', color:'#fff', border:'none', borderRadius:4, cursor:'pointer' }}>Insert</button>
              <button onClick={()=>onRemove(a.id)} style={{ fontSize:11, padding:'2px 6px', background:'#ef4444', color:'#fff', border:'none', borderRadius:4, cursor:'pointer' }}>✕</button>
            </div>
          </div>
        ))}
        {assets.length===0 && <p style={{ fontSize:12, color:'#9ca3af' }}>No assets yet.</p>}
      </div>
    </div>
  );
};

// ── Mail Viewer Modal ─────────────────────────────────────────────────────────
const MailViewer: React.FC<{ mail: Mail; onClose:()=>void; onDelete:(id:number)=>void; }> = ({ mail, onClose, onDelete }) => (
  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
    <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:680, maxHeight:'85vh', overflow:'auto', boxShadow:'0 25px 60px rgba(0,0,0,0.25)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 24px', borderBottom:'1px solid #e5e7eb', background:'linear-gradient(135deg,#6366f1,#4f46e5)', borderRadius:'16px 16px 0 0' }}>
        <h3 style={{ margin:0, color:'#fff', fontWeight:700, fontSize:16, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:480 }}>{mail.subject}</h3>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>{ onDelete(mail.id); onClose(); }} style={{ background:'rgba(255,0,0,0.3)', border:'none', borderRadius:8, padding:'5px 10px', cursor:'pointer', color:'#fff', fontSize:13, fontWeight:600 }}>🗑 Delete</button>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:8, padding:'5px 10px', cursor:'pointer', color:'#fff', fontSize:18 }}>✕</button>
        </div>
      </div>
      <div style={{ padding:24 }}>
        <div style={{ display:'flex', gap:16, marginBottom:16, flexWrap:'wrap' }}>
          <div style={{ background:'#f3f4f6', borderRadius:8, padding:'8px 14px', fontSize:13 }}><span style={{ color:'#6b7280' }}>From: </span><strong>{mail.sender_name || mail.sender_id}</strong></div>
          <div style={{ background:'#f3f4f6', borderRadius:8, padding:'8px 14px', fontSize:13 }}><span style={{ color:'#6b7280' }}>To: </span><strong>{mail.recipient_name || mail.recipient_id}</strong></div>
          <div style={{ background:'#f3f4f6', borderRadius:8, padding:'8px 14px', fontSize:13 }}><span style={{ color:'#6b7280' }}>Date: </span>{new Date(mail.created_at).toLocaleString()}</div>
        </div>
        <div style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:20, lineHeight:1.8, color:'#374151' }}
          dangerouslySetInnerHTML={{ __html: mail.body }} />
      </div>
    </div>
  </div>
);

// ── Main MailboxPage ──────────────────────────────────────────────────────────
const MailboxPage: React.FC<{ title: string; defaultTab?: string }> = ({ title, defaultTab }) => {
  const [tab, setTab] = useState<'inbox'|'compose'>(defaultTab === 'inbox' ? 'inbox' : 'compose');
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [inbox, setInbox] = useState<Mail[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedMail, setSelectedMail] = useState<Mail|null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [regardsName, setRegardsName] = useState('GENZ Team');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [showAssets, setShowAssets] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch data ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const usersData = await api.get<User[]>('/api/users');
      setUsers(usersData);
      try { const t = await api.get<EmailTemplate[]>('/api/mailbox/templates'); setTemplates(t); } catch { setTemplates([]); }
    } catch(e) { console.error(e); }
  }, []);

  const fetchInbox = useCallback(async () => {
    try {
      const mails = await api.get<Mail[]>('/api/mailbox?folder=inbox');
      setInbox(mails);
      setUnreadCount(mails.filter(m => !m.is_read).length);
    } catch { setInbox([]); }
  }, []);

  useEffect(() => { fetchData(); fetchInbox(); }, [fetchData, fetchInbox]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleTemplateChange = (id: string) => {
    const t = templates.find(t => t.id.toString() === id);
    if (t) { setSubject(t.subject); setBody(t.body); }
  };
  const toggleUser = (email: string) =>
    setSelectedUsers(prev => prev.includes(email) ? prev.filter(e=>e!==email) : [...prev, email]);
  const toggleAll = () => { setSelectAll(p=>!p); setSelectedUsers(!selectAll ? users.map(u=>u.email) : []); };

  const handleAddAsset = (url:string, label:string) => setAssets(prev=>[...prev,{id:Date.now().toString(),url,label}]);
  const handleRemoveAsset = (id:string) => setAssets(prev=>prev.filter(a=>a.id!==id));
  const handleInsertAsset = (url:string) => { setBody(prev=>prev+`\n<img src="${url}" alt="asset" style="max-width:100%;border-radius:8px;margin:8px 0;" />\n`); bodyRef.current?.focus(); };

  const openMail = async (mail: Mail) => {
    setSelectedMail(mail);
    if (!mail.is_read) {
      try { await api.put(`/api/mailbox/${mail.id}/read`, {}); fetchInbox(); } catch {}
    }
  };

  const deleteMail = async (id: number) => {
    try { await api.delete(`/api/mailbox/${id}`); fetchInbox(); } catch {}
  };

  const buildHtml = (u: User) => {
    const processed = body.replace(/{{username}}/g, u.username||'there').replace(/\n/g,'<br>');
    return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;border-radius:12px;">
      <div style="background:#fff;padding:28px;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        ${processed}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="color:#374151;font-size:14px;margin:0;">Warm Regards,</p>
        <p style="color:#4f46e5;font-weight:700;font-size:15px;margin:4px 0 0;">${regardsName}</p>
      </div></div>`;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUsers.length || !subject || !body) return alert('Select recipient(s), subject and message.');
    setIsLoading(true); setStatusMsg('');
    let ok=0, fail=0;
    for (const email of selectedUsers) {
      const u = users.find(u=>u.email===email)!;
      try { await api.post('/api/mailbox/send', { to:email, subject, html:buildHtml(u), recipient_id:u.id }); ok++; }
      catch { fail++; }
    }
    setIsLoading(false);
    if (!fail) { setStatusMsg(`✅ Sent to ${ok} recipient(s)!`); setSubject(''); setBody(''); setSelectedUsers([]); setSelectAll(false); fetchInbox(); }
    else setStatusMsg(`⚠️ Sent: ${ok}, Failed: ${fail}`);
  };

  // ── Tab styles ──────────────────────────────────────────────────────────
  const tabStyle = (active:boolean): React.CSSProperties => ({
    padding:'10px 24px', fontWeight:700, fontSize:14, cursor:'pointer', border:'none', borderRadius:'10px 10px 0 0',
    background: active ? '#fff' : 'transparent',
    color: active ? '#4f46e5' : '#6b7280',
    borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
    transition:'all 0.2s',
  });

  return (
    <div style={{ background:'#fff', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', borderRadius:14, padding:28 }}>
      <h1 style={{ fontSize:26, fontWeight:800, color:'#1e1b4b', marginBottom:20 }}>{title}</h1>

      {/* Tabs — only show when NOT in inbox-only mode */}
      {defaultTab !== 'inbox' && (
        <div style={{ display:'flex', gap:4, borderBottom:'2px solid #e5e7eb', marginBottom:24 }}>
          <button style={tabStyle(tab==='compose')} onClick={()=>setTab('compose')}>✉️ Compose</button>
          <button style={tabStyle(tab==='inbox')} onClick={()=>{ setTab('inbox'); fetchInbox(); }}>
            📥 Inbox {unreadCount>0 && <span style={{ background:'#ef4444', color:'#fff', borderRadius:99, padding:'1px 8px', fontSize:12, marginLeft:6 }}>{unreadCount}</span>}
          </button>
        </div>
      )}

      {/* ── INBOX TAB ── */}
      {tab==='inbox' && (
        <div>
          {inbox.length===0 && (
            <div style={{ textAlign:'center', padding:60, background:'#f9fafb', borderRadius:12, border:'2px dashed #e5e7eb' }}>
              <div style={{ fontSize:56, marginBottom:12 }}>📭</div>
              <h3 style={{ color:'#374151', margin:'0 0 8px' }}>Inbox is empty</h3>
              <p style={{ color:'#9ca3af' }}>No mails received yet.</p>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {inbox.map(mail => (
              <div key={mail.id} onClick={()=>openMail(mail)}
                style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 18px', borderRadius:10, cursor:'pointer',
                  background: mail.is_read ? '#fff' : '#eef2ff',
                  border: mail.is_read ? '1px solid #e5e7eb' : '1px solid #c7d2fe',
                  boxShadow: mail.is_read ? 'none' : '0 2px 8px rgba(99,102,241,0.12)',
                  transition:'all 0.2s' }}
                onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.transform='translateX(4px)'}
                onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.transform='none'}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#4f46e5)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:18, flexShrink:0 }}>
                  {(mail.sender_name||'?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <p style={{ margin:0, fontWeight: mail.is_read ? 600 : 800, color:'#111827', fontSize:14 }}>{mail.sender_name || 'Unknown'}</p>
                    <p style={{ margin:0, fontSize:12, color:'#9ca3af', flexShrink:0, marginLeft:12 }}>{new Date(mail.created_at).toLocaleString()}</p>
                  </div>
                  <p style={{ margin:'2px 0 0', fontSize:13, color: mail.is_read ? '#6b7280' : '#4f46e5', fontWeight: mail.is_read ? 400 : 600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{mail.subject}</p>
                </div>
                {!mail.is_read && <span style={{ width:10, height:10, borderRadius:'50%', background:'#6366f1', flexShrink:0 }}></span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── COMPOSE TAB ── */}
      {tab==='compose' && (
        <form onSubmit={handleSend}>
          {/* Template & Subject */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Use Template</label>
              <select onChange={e=>handleTemplateChange(e.target.value)} style={{ width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:14, background:'#fff' }}>
                <option value="">— No Template —</option>
                {templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Subject *</label>
              <input type="text" value={subject} onChange={e=>setSubject(e.target.value)} required placeholder="Email subject..."
                style={{ width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
            </div>
          </div>

          {/* Recipients */}
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <label style={{ fontSize:13, fontWeight:600, color:'#374151' }}>To: <span style={{ color:'#6366f1' }}>({selectedUsers.length} selected)</span></label>
              <button type="button" onClick={toggleAll} style={{ fontSize:12, padding:'4px 12px', background:selectAll?'#ef4444':'#6366f1', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontWeight:600 }}>
                {selectAll?'Deselect All':'Select All'}
              </button>
            </div>
            <div style={{ border:'1px solid #e5e7eb', borderRadius:10, maxHeight:180, overflowY:'auto', padding:8, background:'#f9fafb' }}>
              {users.map(u=>(
                <label key={u.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 8px', borderRadius:6, cursor:'pointer', background:selectedUsers.includes(u.email)?'#eef2ff':'transparent', marginBottom:2 }}>
                  <input type="checkbox" checked={selectedUsers.includes(u.email)} onChange={()=>toggleUser(u.email)} style={{ accentColor:'#6366f1', width:16, height:16 }} />
                  <div style={{ width:30, height:30, borderRadius:'50%', background:'#6366f1', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13 }}>{u.username.charAt(0).toUpperCase()}</div>
                  <div>
                    <p style={{ margin:0, fontSize:14, fontWeight:600, color:'#111827' }}>{u.username}</p>
                    <p style={{ margin:0, fontSize:12, color:'#6b7280' }}>{u.email} · {u.role}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Assets */}
          <button type="button" onClick={()=>setShowAssets(p=>!p)} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, padding:'6px 14px', background:'#f3f4f6', border:'1px solid #e5e7eb', borderRadius:8, cursor:'pointer', fontWeight:600, color:'#374151', marginBottom:16 }}>
            🖼️ {showAssets?'Hide':'Show'} Assets Panel
          </button>
          {showAssets && <AssetPanel assets={assets} onAdd={handleAddAsset} onRemove={handleRemoveAsset} onInsert={handleInsertAsset} />}

          {/* Body */}
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Message * <span style={{ color:'#9ca3af', fontWeight:400 }}>(use {'{{username}}'} for personalisation)</span></label>
            <textarea ref={bodyRef} rows={10} value={body} onChange={e=>setBody(e.target.value)} required
              placeholder="Write your message here..."
              style={{ width:'100%', padding:'10px 14px', border:'1px solid #d1d5db', borderRadius:10, fontSize:14, lineHeight:1.6, fontFamily:'inherit', resize:'vertical', boxSizing:'border-box' }} />
          </div>

          {/* Regards */}
          <div style={{ marginBottom:20, padding:14, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10 }}>
            <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#15803d', marginBottom:6 }}>✍️ Regards Signature</label>
            <input type="text" value={regardsName} onChange={e=>setRegardsName(e.target.value)}
              style={{ width:'100%', padding:'8px 12px', border:'1px solid #bbf7d0', borderRadius:8, fontSize:14, background:'#fff', boxSizing:'border-box' }} />
            <p style={{ margin:'6px 0 0', fontSize:12, color:'#16a34a' }}>Preview: <em>"Warm Regards, <strong>{regardsName}</strong>"</em></p>
          </div>

          {/* Submit */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
            {statusMsg && <p style={{ fontSize:14, fontWeight:600, color:statusMsg.includes('✅')?'#15803d':'#b45309', margin:0 }}>{statusMsg}</p>}
            <button type="submit" disabled={isLoading} style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8, padding:'10px 24px', background:isLoading?'#9ca3af':'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:15, cursor:isLoading?'not-allowed':'pointer', boxShadow:'0 4px 12px rgba(99,102,241,0.35)' }}>
              <PaperAirplaneIcon className="h-5 w-5" />
              {isLoading ? `Sending...` : `Send to ${selectedUsers.length} Recipient(s)`}
            </button>
          </div>
        </form>
      )}

      {/* Mail Viewer */}
      {selectedMail && <MailViewer mail={selectedMail} onClose={()=>setSelectedMail(null)} onDelete={deleteMail} />}
    </div>
  );
};

export default MailboxPage;