// src/components/users/CreateUserModal.tsx

import React, { useState, useCallback } from 'react';
import { api } from '../../apiClient';

// --- MOCK/HELPER COMPONENTS AND TYPES (Adjust these imports as needed) ---

import { STAFF_PERMISSION_PAGES } from '../../config/pages';

// This structure MUST match your database types (profiles table structure)
interface StaffPermissions { /* ... your permission structure ... */ }
type PageId = 'dashboard' | 'users' | 'projects' | 'tasks' | 'settings' | string; // Made it more flexible

interface User {
    id: string;
    username: string;
    email: string;
    password?: string;
    mobile: string;
    designation: string;
    gpay: string;
    bankDetails: string;
    bloodGroup: string;
    role: 'Admin' | 'Staff' | 'Client';
    permissions?: StaffPermissions;
    address?: string; 
    user_id?: string;
}

// Mock Modal Component (Assuming it exists elsewhere)
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-auto p-6 transform transition-all">
                <div className="flex justify-between items-start border-b pb-3 mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

// All helper components (InputField, etc.) are assumed to be here or imported

const InputField = ({ label, id, ...props }) => ( <div> <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label> <input id={id} {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow" /> </div> );
const SelectField = ({ label, id, options, ...props }) => ( <div> <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label> <select id={id} {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"> {options.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select> </div> );
const CheckboxField = ({ label, id, ...props }) => ( <div className="flex items-center"> <input type="checkbox" id={id} {...props} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" /> <label htmlFor={id} className="ml-2 block text-sm text-gray-900">{label}</label> </div> );
const TextareaField = ({ label, ...props }) => ( <div> <label htmlFor={props.id} className="block text-sm font-medium text-gray-700">{label}</label> <textarea {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow" /> </div> );

// --- MAIN COMPONENT ---

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateUser: (user: Omit<User, 'id' | 'user_id'>) => void;
}

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const availableServices = ['Web Development', 'App Development', 'Digital Marketing', 'SEO', 'Custom Software'];

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onCreateUser }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [mobile, setMobile] = useState('');
    const [designation, setDesignation] = useState('');
    const [address, setAddress] = useState(''); 
    const [gpay, setGpay] = useState('');
    const [bankDetails, setBankDetails] = useState('');
    const [bloodGroup, setBloodGroup] = useState(bloodGroups[0]);
    const [role, setRole] = useState<'Admin' | 'Staff' | 'Client'>('Client');
    const [roles, setRoles] = useState<{id: string, name: string}[]>([]);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);

    React.useEffect(() => {
        api.get('/api/roles').then((data: any) => setRoles(data || [])).catch(() => {});
    }, []);

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const resetForm = useCallback(() => {
        setUsername(''); setEmail(''); setPassword(''); setConfirmPassword(''); setMobile('');
        setDesignation(''); setAddress(''); setGpay(''); setBankDetails(''); setBloodGroup(bloodGroups[0]);
        setRole('Client'); setSelectedServices([]); setError(null);
    }, []);

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            return setError("Error: Passwords do not match. Please check your entries.");
        }
        if (!password) {
            return setError("Error: Password is required to create a new user.");
        }
        
        setIsSubmitting(true);

        const selectedRoleObj = roles.find(r => r.name === role);
        const permissionsToSave = selectedRoleObj ? selectedRoleObj.permissions : null;

        const newUser: any = {
            username, email, password, mobile, designation, address,
            gpay, bankDetails, bloodGroup, role, services: selectedServices,
            permissions: permissionsToSave
        };
        
        onCreateUser(newUser);

        setIsSubmitting(false);

    }, [username, email, password, confirmPassword, mobile, designation, address, gpay, bankDetails, bloodGroup, role, selectedServices, onCreateUser]);

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Create New User">
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                
                {error && (
                    <div className="p-3 mb-4 text-sm text-red-800 rounded-lg bg-red-50 border border-red-200" role="alert">
                        {error}
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Username" id="username" value={username} onChange={e => setUsername(e.target.value)} required />
                    <InputField label="Email Address" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                    <InputField label="Confirm Password" id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
                <hr className="my-4"/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Mobile Number" id="mobile" type="tel" value={mobile} onChange={e => setMobile(e.target.value)} required />
                    <InputField label="Designation" id="designation" placeholder="e.g., Web Developer" value={designation} onChange={e => setDesignation(e.target.value)} />
                </div>
                <TextareaField label="Address" id="address" value={address} onChange={e => setAddress(e.target.value)} rows={2} />
                <InputField label="GPay Number" id="gpay" type="tel" value={gpay} onChange={e => setGpay(e.target.value)} />
                <TextareaField label="Bank Details" id="bankDetails" value={bankDetails} onChange={e => setBankDetails(e.target.value)} rows={3} />
                <hr className="my-4"/>
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
                                        id={`service-${service}`}
                                        checked={selectedServices.includes(service)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedServices([...selectedServices, service]);
                                            } else {
                                                setSelectedServices(selectedServices.filter(s => s !== service));
                                            }
                                        }}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor={`service-${service}`} className="ml-2 block text-sm text-gray-900">{service}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {role !== 'Admin' && role !== 'Client' && roles.find(r => r.name === role) && (
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Permissions for {role}</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-600">
                            {Object.entries((roles.find(r => r.name === role) as any).permissions || {}).map(([page, actions]: any) => (
                                <div key={page} className="border p-2 bg-white rounded">
                                    <div className="font-semibold text-blue-600 capitalize mb-1 border-b pb-1">{page.replace('-', ' ')}</div>
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
                        <p className="text-xs text-gray-500 mt-2 italic">*These permissions will be assigned to this user automatically.</p>
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-6">
                    <button type="button" onClick={handleClose} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-colors"> Cancel </button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50"> {isSubmitting ? 'Creating...' : 'Create User'} </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateUserModal;