// src/components/users/CreateUserModal.tsx

import React, { useState, useCallback } from 'react';
import { api } from '../../apiClient';

// --- MOCK/HELPER COMPONENTS AND TYPES (Adjust these imports as needed) ---
import { EyeIcon, EyeSlashIcon } from '../icons/Icons';

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

const InputField = ({ label, id, rightElement, ...props }: any) => ( <div> <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label> <div className="relative mt-1 rounded-md shadow-sm"> <input id={id} {...props} className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow" /> {rightElement && <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer">{rightElement}</div>} </div> </div> );
const SelectField = ({ label, id, options, ...props }: any) => ( <div> <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label> <select id={id} {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"> <option value="" disabled>Select a {label}</option> {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)} </select> </div> );
const CheckboxField = ({ label, id, ...props }) => ( <div className="flex items-center"> <input type="checkbox" id={id} {...props} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" /> <label htmlFor={id} className="ml-2 block text-sm text-gray-900">{label}</label> </div> );
const TextareaField = ({ label, ...props }) => ( <div> <label htmlFor={props.id} className="block text-sm font-medium text-gray-700">{label}</label> <textarea {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow" /> </div> );

// --- MAIN COMPONENT ---

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateUser: (user: Omit<User, 'id' | 'user_id'>) => void;
    defaultRole?: string;
}

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const availableServices = ['Web Development', 'App Development', 'Digital Marketing', 'SEO', 'Custom Software'];

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onCreateUser, defaultRole }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [mobile, setMobile] = useState('');
    const [empId, setEmpId] = useState('');
    const [requirements, setRequirements] = useState('');
    const [location, setLocation] = useState('');
    const [notes, setNotes] = useState('');
    const [role, setRole] = useState(defaultRole || ''); 
    const [roles, setRoles] = useState<{id: string, name: string, permissions?: any}[]>([]);

    React.useEffect(() => {
        api.get('/api/roles').then((data: any) => {
            const fetchedRoles = data || [];
            setRoles(fetchedRoles);
        }).catch(() => {});
    }, []);

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const resetForm = useCallback(() => {
        setUsername(''); setEmail(''); setPassword(''); setMobile(''); setEmpId('');
        setRequirements(''); setLocation(''); setNotes('');
        setRole(''); setError(null);
    }, []);

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (role !== 'Client' && !password) {
            return setError("Error: Password is required to create a new staff member.");
        }
        if (role !== 'Client' && !email) {
            return setError("Error: Email is required to create a new staff member.");
        }
        if (!role) {
            return setError("Error: Please select a Role.");
        }
        
        setIsSubmitting(true);

        const selectedRoleObj = roles.find(r => r.name === role);
        const permissionsToSave = selectedRoleObj ? selectedRoleObj.permissions : null;

        const newUser: any = {
            username: username.trim(), 
            email: email.trim(), 
            password, 
            mobile: mobile.trim(), 
            emp_id: empId.trim(),
            requirements: requirements.trim(),
            location: location.trim(),
            notes: notes.trim(),
            designation: '', address: '', gpay: '', bankDetails: '', bloodGroup: '',
            role, services: [],
            permissions: permissionsToSave
        };
        
        onCreateUser(newUser);

        setIsSubmitting(false);

    }, [username, email, password, mobile, empId, role, roles, onCreateUser]);

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Create New User">
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                
                {error && (
                    <div className="p-3 mb-4 text-sm text-red-800 rounded-lg bg-red-50 border border-red-200" role="alert">
                        {error}
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Name" id="username" value={username} onChange={(e: any) => setUsername(e.target.value)} required />
                    <InputField label="Mobile Number" id="mobile" type="tel" value={mobile} onChange={(e: any) => setMobile(e.target.value)} required />
                </div>
                <div className={`grid grid-cols-1 ${role !== 'Client' ? 'md:grid-cols-2' : ''} gap-4`}>
                    {role !== 'Client' && (
                        <InputField label="Emp ID" id="empId" value={empId} onChange={(e: any) => setEmpId(e.target.value)} autoComplete="off" />
                    )}
                    <InputField label="Gmail ID" id="email" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} autoComplete="new-password" required={role !== 'Client'} />
                </div>
                {role !== 'Client' && (
                <>
                <hr className="my-4"/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField 
                        label="Password" 
                        id="password" 
                        type={showPassword ? "text" : "password"} 
                        value={password} 
                        onChange={(e: any) => setPassword(e.target.value)} 
                        autoComplete="new-password"
                        required={role !== 'Client'} 
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
                    {!defaultRole ? (
                        <SelectField label="Role" id="role" value={role} onChange={(e: any) => setRole(e.target.value)} options={Array.from(new Set(['Admin', ...roles.map(r => r.name)]))} />
                    ) : (
                        <input type="hidden" value={role} />
                    )}
                </div>
                )}

                {role === 'Client' && (
                    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md space-y-4">
                        <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">Client Details</h4>
                        <div className="grid grid-cols-1 gap-4">
                            <InputField label="Location" id="location" value={location} onChange={(e: any) => setLocation(e.target.value)} />
                            <TextareaField label="Requirements" id="requirements" rows={3} value={requirements} onChange={(e: any) => setRequirements(e.target.value)} />
                            <TextareaField label="Short Notes" id="notes" rows={3} value={notes} onChange={(e: any) => setNotes(e.target.value)} />
                        </div>
                    </div>
                )}

                {role !== 'Client' && roles.find(r => r.name === role) && (
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