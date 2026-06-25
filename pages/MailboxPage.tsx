// src/pages/MailboxPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../apiClient';
import { User, EmailTemplate } from '../types';
import { PaperAirplaneIcon } from '../components/icons/Icons';

const MailboxPage: React.FC<{ title: string }> = ({ title }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  const fetchData = useCallback(async () => {
    try {
      // Fetch staff/admin users from /api/users
      const usersData = await api.get<User[]>('/api/users');
      setUsers(usersData);

      // Fetch email templates from /api/mailbox/templates
      try {
        const templatesData = await api.get<EmailTemplate[]>('/api/mailbox/templates');
        setTemplates(templatesData);
      } catch {
        // Templates endpoint may not exist yet — silently ignore
        setTemplates([]);
      }
    } catch (err) {
      console.error('Error fetching mailbox data:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id.toString() === templateId);
    if (template) {
        setSubject(template.subject);
        setBody(template.body);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !subject || !body) {
        return alert("Please select a recipient, and fill in the subject and body.");
    }
    
    setIsLoading(true);
    setStatusMessage('');

    try {
        const recipientProfile = users.find(u => u.email === selectedUser);
        const finalHtmlBody = body
          .replace(/{{username}}/g, recipientProfile?.username || 'there')
          .replace(/\n/g, '<br>');

        // Send email via Express API
        await api.post('/api/mailbox/send', {
          to: selectedUser,
          subject: subject,
          html: finalHtmlBody,
          recipient_id: recipientProfile?.id,
        });

        setStatusMessage('Email sent successfully!');
        setSubject('');
        setBody('');
        setSelectedUser('');
    } catch (error) {
        console.error('Error sending email:', error);
        setStatusMessage(`Failed to send email: ${(error as Error).message}`);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h1 className="text-3xl font-bold text-text-primary mb-6">{title}</h1>
      <form onSubmit={handleSendEmail} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="recipient" className="block text-sm font-medium text-gray-700">To:</label>
              <select id="recipient" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm" required>
                <option value="" disabled>Select a user...</option>
                {users.map(user => (<option key={user.id} value={user.email}>{user.username} ({user.email})</option>))}
              </select>
            </div>
            <div>
              <label htmlFor="template" className="block text-sm font-medium text-gray-700">Use Template:</label>
              <select id="template" onChange={(e) => handleTemplateChange(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm">
                <option value="">No Template</option>
                {templates.map(template => (<option key={template.id} value={template.id}>{template.name}</option>))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Subject:</label>
            <input type="text" id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required/>
          </div>
          <div>
            <label htmlFor="body" className="block text-sm font-medium text-gray-700">Message:</label>
            <textarea id="body" rows={10} value={body} onChange={(e) => setBody(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required/>
          </div>
          <div className="flex items-center justify-end space-x-4">
             {statusMessage && <p className={`text-sm ${statusMessage.includes('Failed') || statusMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{statusMessage}</p>}
             <button type="submit" disabled={isLoading} className="inline-flex items-center bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
                <PaperAirplaneIcon className="h-5 w-5 mr-2" />
                {isLoading ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </form>
    </div>
  );
};

export default MailboxPage;