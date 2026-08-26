// src/components/users/EditUserModal.tsx

import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../apiClient';
import { User, StaffPermissions, PageId } from '../../types';
import { STAFF_PERMISSION_PAGES } from '../../config/pages';
import { EyeIcon, EyeSlashIcon } from '../icons/Icons';

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string, rightElement?: React.ReactNode }> = ({ label, id, rightElement, ...props }) => ( <div> <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label> <div className="relative mt-1 rounded-md shadow-sm"> <input id={id} {...props} className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/> {rightElement && <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer">{rightElement}</div>} </div> </div> );
const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: string[] }> = ({ label, id, options, ...props }) => ( <div> <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label> <select id={id} {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"> {options.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select> </div> );
const CheckboxField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, ...props }) => ( <div className="flex items-center"> <input type="checkbox" id={id} {...props} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" /> <label htmlFor={id} className="ml-2 block text-sm text-gray-900">{label}</label> </div> );
const TextareaField: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => ( <div> <label htmlFor={props.id} className="block text-sm font-medium text-gray-700">{label}</label> <textarea {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /> </div> );

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserUpdated: () => void;
  readOnly?: boolean;
}

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const availableServices = ['Web Development', 'App Development', 'Digital Marketing', 'SEO', 'Custom Software'];

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onUserUpdated, readOnly = false }) => {
  // Local state for all form fields
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [empId, setEmpId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [requirements, setRequirements] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [role, setRole] = useState<'Admin' | 'Staff' | 'Client' | string>('Client');
  
  const [roles, setRoles] = useState<{id: string, name: string, permissions?: any}[]>([]);
  useEffect(() => {
    api.get('/api/roles').then((data: any) => setRoles(data || [])).catch(() => {});
  }, []);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setUsername(user.username || '');
      setMobile(user.mobile || '');
      setEmpId(user.emp_id || '');
      setEmail(user.email || '');
      setPassword(user.password || '');
      setRequirements(user.requirements || '');
      setLocation(user.location || '');
      setNotes(user.notes || '');
      setRole(user.role || 'Client');
    }
  }, [user, isOpen]);
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    
    const selectedRoleObj = roles.find(r => r.name === role);
    const updatedProfileData: any = {
      username: username,
      email: email,
      mobile: mobile,
      emp_id: empId,
      requirements: requirements,
      location: location,
      notes: notes,
      role: role
    };

    if (password) {
      updatedProfileData.password = password;
    }

    if (selectedRoleObj) {
        updatedProfileData.permissions = selectedRoleObj.permissions;
    }

    try {
      await api.put(`/api/users/${user.id}`, updatedProfileData);
      alert('User updated successfully!');
      onUserUpdated(); // Parent component la user list ah refresh pannuthu.
      onClose();       // Modal ah close pannuthu.
    } catch (err: any) {
      alert(`Failed to update user: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${readOnly ? 'View' : 'Edit'} User: ${user.username}`}>
      <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {/* Form fields remain the same */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Name" id="username" value={username} onChange={e => setUsername(e.target.value)} disabled={readOnly} required />
          <InputField label="Mobile Number" id="mobile" type="tel" value={mobile} onChange={e => setMobile(e.target.value)} disabled={readOnly} required />
        </div>
        <div className={`grid grid-cols-1 ${role !== 'Client' ? 'md:grid-cols-2' : ''} gap-4`}>
          {role !== 'Client' && (
             <InputField label="Emp ID" id="empId" value={empId} onChange={e => setEmpId(e.target.value)} disabled={readOnly} autoComplete="off" />
          )}
          <InputField label="Gmail ID" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={readOnly} autoComplete="new-password" />
        </div>
        {role !== 'Client' && (
        <>
        <hr/>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField 
            label="Password" 
            id="password" 
            type={showPassword ? "text" : "password"} 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            disabled={readOnly}
            autoComplete="new-password"
            rightElement={
                <div onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </div>
            }
          />
        </div>
        </>
        )}
        {role !== 'Client' && (
        <div className="mt-4">
          <SelectField label="Role" id="role" value={role} onChange={e => setRole(e.target.value as any)} options={roles.map(r => r.name)} disabled={readOnly} />
        </div>
        )}

        {role === 'Client' && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">Client Details</h4>
                <div className="grid grid-cols-1 gap-4">
                    <InputField label="Location" id="location" value={location} onChange={e => setLocation(e.target.value)} disabled={readOnly} />
                    <TextareaField label="Requirements" id="requirements" rows={3} value={requirements} onChange={e => setRequirements(e.target.value)} disabled={readOnly} />
                    <TextareaField label="Short Notes" id="notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} disabled={readOnly} />
                </div>
            </div>
        )}

        {role !== 'Client' && roles.find(r => r.name === role) && (
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions for {role}</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-600">
                    {Object.entries((roles.find(r => r.name === role) as any).permissions || {}).map(([page, actions]: any) => (
                        <div key={page} className="border p-2 bg-white rounded">
                            <div className="font-semibold text-primary capitalize mb-1 border-b pb-1">{page.replace('-', ' ')}</div>
                            <div className="flex space-x-2 mt-1">
                                {['view', 'create', 'edit', 'delete'].map(act => (
                                    <span key={act} className={actions[act] ? 'text-green-600 font-bold' : 'text-gray-300 line-through'}>
                                        {act.charAt(0).toUpperCase()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">{readOnly ? '*These are the permissions for this role.' : '*Saving will apply these permissions.'}</p>
            </div>
        )}
        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm bg-white border rounded-md">{readOnly ? 'Close' : 'Cancel'}</button>
          {!readOnly && (
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm text-white bg-primary rounded-md">{isSaving ? 'Saving...' : 'Save Changes'}</button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default EditUserModal;