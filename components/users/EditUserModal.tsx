// src/components/users/EditUserModal.tsx

import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { api } from '../../apiClient';
import { User, StaffPermissions, PageId } from '../../types';
import { STAFF_PERMISSION_PAGES } from '../../config/pages';

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, ...props }) => ( <div> <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label> <input id={id} {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/> </div> );
const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: string[] }> = ({ label, id, options, ...props }) => ( <div> <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label> <select id={id} {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"> {options.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select> </div> );
const CheckboxField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, ...props }) => ( <div className="flex items-center"> <input type="checkbox" id={id} {...props} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" /> <label htmlFor={id} className="ml-2 block text-sm text-gray-900">{label}</label> </div> );
const TextareaField: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => ( <div> <label htmlFor={props.id} className="block text-sm font-medium text-gray-700">{label}</label> <textarea {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" /> </div> );

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserUpdated: () => void;
}

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const availableServices = ['Web Development', 'App Development', 'Digital Marketing', 'SEO', 'Custom Software'];

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onUserUpdated }) => {
  // Local state for all form fields
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [designation, setDesignation] = useState('');
  const [gpay, setGpay] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [totalPaid, setTotalPaid] = useState<number>(0);
  const [totalPending, setTotalPending] = useState<number>(0);
  const [bloodGroup, setBloodGroup] = useState(bloodGroups[0]);
  const [role, setRole] = useState<'Admin' | 'Staff' | 'Client' | string>('Client');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  const [roles, setRoles] = useState<{id: string, name: string}[]>([]);
  useEffect(() => {
    api.get('/api/roles').then((data: any) => setRoles(data || [])).catch(() => {});
  }, []);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setUsername(user.username || '');
      setMobile(user.mobile || '');
      setDesignation(user.designation || '');
      setGpay(user.gpay || '');
      // Ensure we're reading from the correct snake_case property
      setBankDetails(user.bank_details || '');
      setTotalPaid(user.total_paid || 0);
      setTotalPending(user.total_pending || 0);
      setBloodGroup(user.blood_group || bloodGroups[0]);
      setRole(user.role || 'Client');
      setSelectedServices(user.services || []);
    }
  }, [user, isOpen]);
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    
    const updatedProfileData = {
      username: username,
      email: user.email,
      mobile: mobile,
      designation: designation,
      gpay: gpay,
      bankDetails: bankDetails,
      bloodGroup: bloodGroup,
      role: role,
      total_paid: totalPaid,
      total_pending: totalPending,
      services: selectedServices
    };

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
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit User: ${user.username}`}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {/* Form fields remain the same */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Username" id="username" value={username} onChange={e => setUsername(e.target.value)} required />
          <InputField label="Email Address" id="email" type="email" value={user.email} disabled />
        </div>
        <hr/>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Mobile Number" id="mobile" type="tel" value={mobile} onChange={e => setMobile(e.target.value)} required />
          <InputField label="Designation" id="designation" placeholder="e.g., Web Developer" value={designation} onChange={e => setDesignation(e.target.value)} />
        </div>
        <InputField label="GPay Number" id="gpay" type="tel" value={gpay} onChange={e => setGpay(e.target.value)} />
        <TextareaField label="Bank Details" id="bankDetails" value={bankDetails} onChange={e => setBankDetails(e.target.value)} rows={3} />
        <hr/>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Total Paid (₹)" id="totalPaid" type="number" value={totalPaid} onChange={e => setTotalPaid(Number(e.target.value))} />
          <InputField label="Total Pending (₹)" id="totalPending" type="number" value={totalPending} onChange={e => setTotalPending(Number(e.target.value))} />
        </div>
        <hr/>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="Blood Group" id="bloodGroup" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} options={bloodGroups} />
          <SelectField label="Role" id="role" value={role} onChange={e => setRole(e.target.value as any)} options={['Admin', 'Client', ...roles.map(r => r.name)]} />
        </div>
        {role === 'Client' && (
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Services</label>
              <div className="grid grid-cols-2 gap-2">
                  {availableServices.map(service => (
                      <div key={service} className="flex items-center">
                          <input
                              type="checkbox"
                              id={`edit-service-${service}`}
                              checked={selectedServices.includes(service)}
                              onChange={(e) => {
                                  if (e.target.checked) {
                                      setSelectedServices([...selectedServices, service]);
                                  } else {
                                      setSelectedServices(selectedServices.filter(s => s !== service));
                                  }
                              }}
                              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          <label htmlFor={`edit-service-${service}`} className="ml-2 block text-sm text-gray-900">{service}</label>
                      </div>
                  ))}
              </div>
          </div>
        )}
        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm bg-white border rounded-md">Cancel</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm text-white bg-primary rounded-md">{isSaving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>
    </Modal>
  );
};

export default EditUserModal;