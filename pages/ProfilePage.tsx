import React, { useState } from 'react';
import { usePermissions } from '../components/auth/PermissionsContext';
import { api } from '../apiClient';

const ProfilePage: React.FC<{ title?: string }> = ({ title = 'My Profile' }) => {
    const { currentProfile, refetchProfile } = usePermissions();
    
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        mobile: currentProfile?.mobile || '',
        designation: currentProfile?.designation || '',
        gpay: currentProfile?.gpay || '',
        bankDetails: currentProfile?.bankDetails || currentProfile?.bank_details || '',
        bloodGroup: currentProfile?.bloodGroup || currentProfile?.blood_group || '',
        address: currentProfile?.address || ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    if (!currentProfile) {
        return <div className="p-8 text-center text-gray-500">Loading Profile...</div>;
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            await api.put(`/api/users/${currentProfile.id}`, formData);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setIsEditing(false);
            refetchProfile();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    const handleRequestPermission = () => {
        alert("Permission request feature will notify admin soon!");
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
                {!isEditing && (
                    <button 
                        onClick={() => setIsEditing(true)} 
                        className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
                    >
                        Edit Profile
                    </button>
                )}
            </header>

            {message.text && (
                <div className={`p-4 rounded-md mb-4 ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                    {message.text}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center space-x-6 bg-gray-50">
                    <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 text-3xl font-bold border-4 border-white shadow-sm">
                        {currentProfile.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{currentProfile.username}</h2>
                        <p className="text-gray-500 font-medium">{currentProfile.role} {currentProfile.designation ? `- ${currentProfile.designation}` : ''}</p>
                        <p className="text-sm text-gray-400 mt-1">{currentProfile.email}</p>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Mobile Number</label>
                        {isEditing ? (
                            <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary" />
                        ) : (
                            <p className="text-gray-800 p-2 bg-gray-50 rounded border border-transparent">{currentProfile.mobile || '-'}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Blood Group</label>
                        {isEditing ? (
                            <input type="text" name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary" />
                        ) : (
                            <p className="text-gray-800 p-2 bg-gray-50 rounded border border-transparent">{currentProfile.bloodGroup || currentProfile.blood_group || '-'}</p>
                        )}
                    </div>
                    
                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Address</label>
                        {isEditing ? (
                            <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="w-full p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary" />
                        ) : (
                            <p className="text-gray-800 p-2 bg-gray-50 rounded border border-transparent min-h-[2.5rem]">{currentProfile.address || '-'}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Google Pay Number</label>
                        {isEditing ? (
                            <input type="text" name="gpay" value={formData.gpay} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary" />
                        ) : (
                            <p className="text-gray-800 p-2 bg-gray-50 rounded border border-transparent">{currentProfile.gpay || '-'}</p>
                        )}
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Bank Details</label>
                        {isEditing ? (
                            <textarea name="bankDetails" value={formData.bankDetails} onChange={handleChange} rows={3} className="w-full p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary" />
                        ) : (
                            <p className="text-gray-800 p-2 bg-gray-50 rounded border border-transparent min-h-[3rem] whitespace-pre-wrap">{currentProfile.bankDetails || currentProfile.bank_details || '-'}</p>
                        )}
                    </div>
                </div>

                {isEditing && (
                    <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-white transition-colors" disabled={loading}>Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                )}
            </div>
            
            <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Request Additional Access</h3>
                <p className="text-gray-600 mb-4 text-sm">Need access to a specific module or feature? You can send a request to the system administrator directly from here.</p>
                <button onClick={handleRequestPermission} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">
                    Request Permission
                </button>
            </div>
        </div>
    );
};

export default ProfilePage;
