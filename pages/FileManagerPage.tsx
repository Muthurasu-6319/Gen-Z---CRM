// src/pages/FileManagerPage.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api, uploadFile, getFileUrl, API_BASE } from '../apiClient';
import { usePermissions } from '../components/auth/PermissionsContext';
import Modal from '../components/common/Modal';
import { 
    FolderIcon, DocumentTextIcon, LinkIcon, UploadIcon, TrashIcon, DownloadIcon, 
    MenuIcon, CubeIcon 
} from '../components/icons/Icons';

// Helper to format file size
const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

interface FileItem {
    id: string;
    name: string;
    original_name: string;
    mime_type: string | null;
    size: number | null;
    path: string;
    folder: string;
    uploaded_by: string;
    uploader: string;
    url: string | null;
    created_at: string;
}

const FileManagerPage: React.FC<{ title: string }> = ({ title }) => {
    const { hasPermission } = usePermissions();
    const [items, setItems] = useState<FileItem[]>([]);

    const getQueryFolder = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('folder') || 'root';
    };

    const initialFolder = getQueryFolder();
    const [currentFolder, setCurrentFolder] = useState<string>(initialFolder);
    const [folderPath, setFolderPath] = useState<string[]>(
        initialFolder === 'root' ? [] : initialFolder.split('/')
    );

    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [newFolderInput, setNewFolderInput] = useState('');
    const [linkUrlInput, setLinkUrlInput] = useState('');
    const [linkNameInput, setLinkNameInput] = useState('');

    const canCreate = hasPermission('file-manager', 'create');
    const canDelete = hasPermission('file-manager', 'delete');

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get<FileItem[]>(`/api/files?folder=${encodeURIComponent(currentFolder)}`);
            setItems(data || []);
        } catch (error) {
            console.error("Error fetching files:", (error as Error).message);
        } finally {
            setLoading(false);
        }
    }, [currentFolder]);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const updateUrl = (folder: string) => {
        const url = new URL(window.location.href);
        url.searchParams.set('page', 'file-manager');
        url.searchParams.set('folder', folder);
        window.history.pushState({}, '', url.toString());
    };

    const handleCopyFolderLink = (folderStr: string = currentFolder) => {
        const shareUrl = `${window.location.origin}${window.location.pathname}?page=file-manager&folder=${encodeURIComponent(folderStr)}`;
        navigator.clipboard.writeText(shareUrl)
            .then(() => alert('Folder link copied to clipboard!'))
            .catch(err => alert('Failed to copy link: ' + err));
    };

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canCreate || !newFolderInput.trim()) return;
        
        setLoading(true);
        try {
            await api.post('/api/files/folder', { folder: currentFolder, name: newFolderInput.trim() });
            setNewFolderInput('');
            setIsFolderModalOpen(false);
            await fetchItems();
        } catch (error) {
            alert(`Failed to create folder: ${(error as Error).message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (canCreate) setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (canCreate && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setUploading(true);
            try {
                await Promise.all(Array.from(e.dataTransfer.files).map(file => handleFileUpload(file)));
                await fetchItems();
            } catch (error) {
                alert(`An error occurred during upload: ${(error as Error).message}`);
            } finally {
                setUploading(false);
            }
            e.dataTransfer.clearData();
        }
    };

    const handleFileUpload = async (file: File) => {
        if (!file || !canCreate) return;
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', currentFolder);
            await uploadFile('/api/files/upload', formData);
        } catch (error) {
            console.error(`Upload failed for ${file.name}:`, error);
            throw new Error(`Upload failed for ${file.name}: ${(error as Error).message}`);
        }
    };

    const handleImportLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canCreate || !linkUrlInput.trim() || !linkNameInput.trim()) return;

        let mime = 'link';
        if (linkUrlInput.trim().match(/\.(jpeg|jpg|gif|png|webp)/i)) {
            mime = 'image/link';
        }

        try {
            await api.post('/api/files/link', {
                name: linkNameInput.trim(),
                url: linkUrlInput.trim(),
                folder: currentFolder,
                mime_type: mime,
            });
            setLinkUrlInput('');
            setLinkNameInput('');
            setIsLinkModalOpen(false);
            await fetchItems();
        } catch (error) {
            alert(`Failed to import link: ${(error as Error).message}`);
        }
    };

    const handleDelete = async (item: FileItem) => {
        if (!canDelete || !window.confirm(`Are you sure you want to delete '${item.original_name || item.name}'?`)) return;
        
        try {
            await api.delete(`/api/files/${item.id}`);
            await fetchItems();
        } catch (error) {
            alert(`Failed to delete: ${(error as Error).message}`);
        }
    };

    const navigateToFolder = (folderName: string) => {
        const newPath = [...folderPath, folderName];
        setFolderPath(newPath);
        const folderStr = newPath.join('/');
        setCurrentFolder(folderStr);
        updateUrl(folderStr);
    };

    const navigateToBreadcrumb = (index: number) => {
        let folderStr = 'root';
        if (index < 0) {
            setFolderPath([]);
            setCurrentFolder('root');
        } else {
            const newPath = folderPath.slice(0, index + 1);
            setFolderPath(newPath);
            folderStr = newPath.join('/');
            setCurrentFolder(folderStr);
        }
        updateUrl(folderStr);
    };

    const filteredItems = useMemo(() => items.filter(item => 
        (item.original_name || item.name).toLowerCase().includes(searchTerm.toLowerCase())
    ), [items, searchTerm]);

    const getFileUrl = (item: FileItem): string => {
        if (item.url) return item.url;
        if (item.path) return `${API_BASE}/uploads/${item.name}`;
        return '';
    };

    const isFolder = (item: FileItem) => item.mime_type === 'folder';
    const isImage = (item: FileItem) => item.mime_type?.startsWith('image/') && item.mime_type !== 'image/link';
    const isLink = (item: FileItem) => item.mime_type === 'image/link' || item.mime_type === 'link';

    const renderIcon = (item: FileItem, sizeClass = "w-12 h-12") => {
        if (isFolder(item)) return <FolderIcon className={`${sizeClass} text-yellow-500`} />;
        if (item.mime_type === 'image/link') return <img src={item.url!} alt={item.original_name || item.name} className={`${sizeClass} object-cover rounded-md border`} />;
        if (item.mime_type === 'link') return <LinkIcon className={`${sizeClass} text-indigo-500`} />;
        if (isImage(item)) return <img src={getFileUrl(item)} alt={item.original_name || item.name} className={`${sizeClass} object-cover rounded-md`} />;
        return <DocumentTextIcon className={`${sizeClass} text-gray-500`} />;
    };

    const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setUploading(true);
            try {
                await Promise.all(Array.from(event.target.files).map(file => handleFileUpload(file)));
                await fetchItems();
            } catch (error) {
                alert(`An error occurred during upload: ${(error as Error).message}`);
            } finally {
                setUploading(false);
            }
        }
    };

    return (
        <div className="flex flex-col h-full" onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
            {isDragging && (
                <div className="absolute inset-0 bg-primary bg-opacity-50 z-50 flex items-center justify-center text-white text-2xl font-bold border-4 border-dashed border-white rounded-lg">
                    Drop to Upload
                </div>
            )}
            {uploading && (
                   <div className="absolute inset-0 bg-gray-800 bg-opacity-70 z-50 flex flex-col items-center justify-center text-white text-xl font-bold">
                        <svg className="animate-spin h-8 w-8 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                       Uploading...
                   </div>
            )}

            <header className="flex-shrink-0 flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
                    <div className="text-sm text-gray-500 mt-1">
                        <span onClick={() => navigateToBreadcrumb(-1)} className="cursor-pointer hover:underline text-primary">Root</span>
                        {folderPath.map((p, i) => (
                            <span key={i}> / <span onClick={() => navigateToBreadcrumb(i)} className="cursor-pointer hover:underline">{p}</span></span>
                        ))}
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <input type="search" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="px-3 py-1.5 border rounded-md shadow-sm focus:ring-primary focus:border-primary"/>
                    <div className="flex bg-gray-200 rounded-md p-0.5">
                        <button onClick={() => setView('grid')} className={`p-1.5 rounded-md ${view === 'grid' ? 'bg-white shadow-sm' : ''}`}><CubeIcon className="h-5 w-5"/></button>
                        <button onClick={() => setView('list')} className={`p-1.5 rounded-md ${view === 'list' ? 'bg-white shadow-sm' : ''}`}><MenuIcon className="h-5 w-5"/></button>
                    </div>
                    {canCreate && (
                        <>
                            <button onClick={() => handleCopyFolderLink()} title="Copy Current Folder Link" className="p-2 bg-white border rounded-md hover:bg-gray-50 text-indigo-600 font-medium text-xs flex items-center gap-1">
                                <LinkIcon className="h-4 w-4" /> Copy Folder Link
                            </button>
                            <button onClick={() => setIsFolderModalOpen(true)} title="New Folder" className="p-2 bg-white border rounded-md hover:bg-gray-50"><FolderIcon className="h-5 w-5"/></button>
                            <button onClick={() => setIsLinkModalOpen(true)} title="Import Link from URL" className="p-2 bg-white border rounded-md hover:bg-gray-50"><LinkIcon className="h-5 w-5"/></button>
                            <label title="Upload File" className="p-2 bg-primary text-white rounded-md hover:bg-primary-dark cursor-pointer">
                                <UploadIcon className="h-5 w-5" />
                                <input type="file" multiple className="hidden" onChange={handleFileInputChange} />
                            </label>
                        </>
                    )}
                </div>
            </header>
            
            <main className="flex-1 bg-white p-4 rounded-lg shadow-md overflow-y-auto">
                    {!filteredItems.length ? (
                        <div className="text-center py-10">
                            <p className="text-gray-500">{loading ? 'Loading...' : 'This folder is empty.'}</p>
                        </div>
                    ) : view === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                            {filteredItems.map(item => (
                                <div key={item.id} onDoubleClick={() => {
                                        if (isFolder(item)) {
                                            navigateToFolder(item.original_name || item.name);
                                        } else if (isLink(item)) {
                                            window.open(getFileUrl(item), '_blank');
                                        }
                                    }}
                                    className="relative group p-4 border rounded-lg text-center flex flex-col items-center bg-white hover:shadow-lg hover:border-primary transition-all cursor-pointer">
                                    <div className="h-16 flex items-center justify-center">{renderIcon(item)}</div>
                                    <p className="mt-2 text-sm font-medium truncate w-full" title={item.original_name || item.name}>{item.original_name || item.name}</p>
                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex space-x-1 bg-white/50 backdrop-blur-sm rounded-full p-0.5">
                                        {isFolder(item) && (
                                            <button onClick={(e) => { e.stopPropagation(); handleCopyFolderLink(folderPath.concat(item.original_name || item.name).join('/')); }} className="p-1 text-gray-500 hover:text-indigo-600" title="Copy Folder Link">
                                                <LinkIcon className="h-4 w-4"/>
                                            </button>
                                        )}
                                        {!isFolder(item) && getFileUrl(item) && <a href={getFileUrl(item)} download={item.original_name || item.name} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-500 hover:text-blue-600"><DownloadIcon className="h-4 w-4"/></a>}
                                        {canDelete && <button onClick={() => handleDelete(item)} className="p-1 text-gray-500 hover:text-red-600"><TrashIcon className="h-4 w-4"/></button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <table className="min-w-full">
                            <thead><tr className="border-b"><th className="py-2 px-4 text-left text-xs font-medium uppercase">Name</th><th className="py-2 px-4 text-left text-xs font-medium uppercase">Size</th><th className="py-2 px-4 text-left text-xs font-medium uppercase">Last Modified</th><th></th></tr></thead>
                            <tbody>
                                {filteredItems.map(item => (
                                    <tr key={item.id} onDoubleClick={() => {
                                            if (isFolder(item)) {
                                                navigateToFolder(item.original_name || item.name);
                                            } else if (isLink(item)) {
                                                window.open(getFileUrl(item), '_blank');
                                            }
                                        }} className="border-b hover:bg-gray-50 cursor-pointer group">
                                        <td className="py-2 px-4 flex items-center">{renderIcon(item, "w-6 h-6 mr-3")}<span className="text-sm">{item.original_name || item.name}</span></td>
                                        <td className="py-2 px-4 text-sm">{!isFolder(item) ? formatBytes(item.size ?? 0) : '—'}</td>
                                        <td className="py-2 px-4 text-sm">{new Date(item.created_at).toLocaleDateString()}</td>
                                        <td className="py-2 px-4 text-right">
                                            <div className="opacity-0 group-hover:opacity-100 flex justify-end">
                                                {isFolder(item) && (
                                                    <button onClick={(e) => { e.stopPropagation(); handleCopyFolderLink(folderPath.concat(item.original_name || item.name).join('/')); }} className="p-1 hover:text-indigo-600" title="Copy Folder Link">
                                                        <LinkIcon className="h-5 w-5"/>
                                                    </button>
                                                )}
                                                {!isFolder(item) && getFileUrl(item) && <a href={getFileUrl(item)} download={item.original_name || item.name} target="_blank" rel="noopener noreferrer" className="p-1 hover:text-blue-600"><DownloadIcon className="h-5 w-5"/></a>}
                                                {canDelete && <button onClick={() => handleDelete(item)} className="p-1 hover:text-red-600"><TrashIcon className="h-5 w-5"/></button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
            </main>

            {/* Create Folder Modal */}
            <Modal isOpen={isFolderModalOpen} onClose={() => setIsFolderModalOpen(false)} title="Create New Folder">
                <form onSubmit={handleCreateFolder} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Folder Name</label>
                        <input
                            type="text"
                            required
                            value={newFolderInput}
                            onChange={e => setNewFolderInput(e.target.value)}
                            placeholder="e.g. Design Documents"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button type="button" onClick={() => setIsFolderModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark">Create</button>
                    </div>
                </form>
            </Modal>

            {/* Import Link Modal */}
            <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} title="Import Link">
                <form onSubmit={handleImportLink} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Link Name / Title</label>
                        <input
                            type="text"
                            required
                            value={linkNameInput}
                            onChange={e => setLinkNameInput(e.target.value)}
                            placeholder="e.g. Project Specs"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Link URL</label>
                        <input
                            type="url"
                            required
                            value={linkUrlInput}
                            onChange={e => setLinkUrlInput(e.target.value)}
                            placeholder="https://example.com"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button type="button" onClick={() => setIsLinkModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark">Import</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default FileManagerPage;