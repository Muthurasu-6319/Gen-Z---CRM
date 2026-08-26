import React, { useState, useEffect } from 'react';
import { usePermissions } from '../components/auth/PermissionsContext';
import { api, uploadFile, API_BASE } from '../apiClient';
import { CameraIcon, EyeIcon, EyeSlashIcon } from '../components/icons/Icons';

const ProfilePage: React.FC<{ title?: string }> = ({ title = 'My Profile' }) => {
    const { currentProfile, refetchProfile } = usePermissions();
    
    const [isEditing, setIsEditing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        username: currentProfile?.username || '',
        email: currentProfile?.email || '',
        mobile: currentProfile?.mobile || '',
        empId: currentProfile?.emp_id || '',
        password: currentProfile?.password || ''
    });
    const [profilePicUrl, setProfilePicUrl] = useState(currentProfile?.profile_picture || '');
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (currentProfile?.profile_picture) {
            setProfilePicUrl(currentProfile.profile_picture);
        }
    }, [currentProfile]);

    if (!currentProfile) {
        return <div className="p-8 text-center text-gray-500">Loading Profile...</div>;
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (overrideData?: any) => {
        // // setLoading(true) removed for zero-loading UI removed for zero-loading UI
        setMessage({ type: '', text: '' });
        try {
            const dataToSave: any = overrideData || {
                username: formData.username,
                email: formData.email,
                mobile: formData.mobile,
                emp_id: formData.empId,
                profile_picture: profilePicUrl
            };
            
            if (formData.password) {
                dataToSave.password = formData.password;
            }
            
            await api.put(`/api/users/${currentProfile.id}`, dataToSave);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setIsEditing(false);
            refetchProfile();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        
        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'profiles');
            
            const uploaded = await uploadFile('/api/files/upload', formData);
            if (uploaded && uploaded.name) {
                const url = uploaded.name; 
                setProfilePicUrl(url);
                // Removed handleSave here so it doesn't save instantly
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Failed to upload image: ' + error.message });
        } finally {
            setUploadingImage(false);
        }
    };

    const handleRequestPermission = () => {
        alert("Permission request feature will notify admin soon!");
    };

    const DEFAULT_AVATARS = [
        'default_avatar_1.png',
        'default_avatar_2.png',
        'default_avatar_3.png'
    ];

    const handleSelectDefaultAvatar = async (url: string) => {
        setProfilePicUrl(url);
        // Removed handleSave here so it doesn't save instantly
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
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 text-3xl font-bold border-4 border-white shadow-sm overflow-hidden">
                            {profilePicUrl ? (
                                <img src={profilePicUrl.startsWith('http') ? profilePicUrl : `${API_BASE}/uploads/${profilePicUrl}`} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                currentProfile.username.charAt(0).toUpperCase()
                            )}
                        </div>
                        {isEditing && (
                            <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                {uploadingImage ? (
                                    <span className="text-xs font-semibold">Uploading...</span>
                                ) : (
                                    <CameraIcon className="w-8 h-8" />
                                )}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                            </label>
                        )}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{currentProfile.username}</h2>
                        <p className="text-gray-500 font-medium">{currentProfile.role}</p>
                        <p className="text-sm text-gray-400 mt-1 mb-4">{currentProfile.email}</p>
                        
                        {/* Default Avatars Section */}
                        {isEditing && (
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Or Choose Default Avatar</span>
                                <div className="flex items-center space-x-4">
                                    <div className="flex space-x-2">
                                        {DEFAULT_AVATARS.map((avatar, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSelectDefaultAvatar(avatar)}
                                                className="w-12 h-12 rounded-full bg-white border-2 border-transparent hover:border-primary focus:outline-none focus:border-primary shadow-sm hover:shadow-md transition-all p-0.5"
                                                title="Select Avatar"
                                            >
                                                <img src={avatar.startsWith('http') ? avatar : `${API_BASE}/uploads/${avatar}`} alt={`Avatar ${idx+1}`} className="w-full h-full rounded-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                    {profilePicUrl && (
                                        <button
                                            onClick={() => setProfilePicUrl('')}
                                            className="text-sm font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-md transition-colors"
                                            title="Remove Profile Picture"
                                        >
                                            Remove Picture
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Name</label>
                        {isEditing ? (
                            <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary" />
                        ) : (
                            <p className="text-gray-800 p-2 bg-gray-50 rounded border border-transparent">{currentProfile.username || '-'}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Gmail ID</label>
                        {isEditing ? (
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary" />
                        ) : (
                            <p className="text-gray-800 p-2 bg-gray-50 rounded border border-transparent">{currentProfile.email || '-'}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Mobile Number</label>
                        {isEditing ? (
                            <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary" />
                        ) : (
                            <p className="text-gray-800 p-2 bg-gray-50 rounded border border-transparent">{currentProfile.mobile || '-'}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Emp ID</label>
                        {isEditing ? (
                            <input type="text" name="empId" value={formData.empId} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary" />
                        ) : (
                            <p className="text-gray-800 p-2 bg-gray-50 rounded border border-transparent">{currentProfile.emp_id || '-'}</p>
                        )}
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Password</label>
                        <div className="relative">
                            {isEditing ? (
                                <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-primary focus:border-primary pr-10" />
                            ) : (
                                <p className="text-gray-800 p-2 bg-gray-50 rounded border border-transparent font-mono pr-10">{showPassword ? (currentProfile.password || '******') : '******'}</p>
                            )}
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
                                {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {isEditing && (
                    <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-white transition-colors" disabled={loading}>Cancel</button>
                        <button onClick={() => handleSave()} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                )}
            </div>
            
            {currentProfile.role?.toLowerCase() !== 'admin' && (
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Request Additional Access</h3>
                    <p className="text-gray-600 mb-4 text-sm">Need access to a specific module or feature? You can send a request to the system administrator directly from here.</p>
                    <button onClick={handleRequestPermission} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">
                        Request Permission
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
