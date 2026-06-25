// src/pages/ProductsPage.tsx

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { api } from '../apiClient';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/icons/Icons';
import ProductModal from '../components/products/ProductModal';
import { Product, User } from '../types';
import { usePermissions } from '../components/auth/PermissionsContext';

const statusColors: { [key: string]: string } = {
  Started: 'bg-blue-100 text-blue-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  'On Hold': 'bg-gray-100 text-gray-800',
  Cancelled: 'bg-red-100 text-red-800',
  Completed: 'bg-green-100 text-green-800',
};

interface ProductWithCollaborators extends Product {
    collaborator_users: Pick<User, 'id' | 'username'>[];
}

const ProductsPage: React.FC<{ title: string }> = ({ title }) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [products, setProducts] = useState<ProductWithCollaborators[]>([]);
    const [loading, setLoading] = useState(true);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const { hasPermission, currentProfile } = usePermissions();
    const canCreate = hasPermission('products', 'create');
    const canEdit = hasPermission('products', 'edit');
    const canDelete = hasPermission('products', 'delete');
    
    const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [collaboratorFilter, setCollaboratorFilter] = useState<boolean>(false);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const [productsData, profilesData] = await Promise.all([
                api.get('/api/products'),
                api.get('/api/users')
            ]);

            const profileMap = new Map((profilesData || []).map((p: any) => [p.id, p]));
            const formattedData = (productsData || []).map((p: any) => {
                const collaborators = typeof p.collaborators === 'string' ? JSON.parse(p.collaborators) : (p.collaborators || []);
                const tags = typeof p.tags === 'string' ? JSON.parse(p.tags) : (p.tags || []);
                const staffDetails = collaborators.map((id: string) => profileMap.get(id)).filter(Boolean);
                return { ...p, tags, collaborators, collaborator_users: staffDetails };
            });
            setProducts(formattedData as ProductWithCollaborators[]);
        } catch (error: any) {
            console.error("Error fetching products:", error.message || error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleSaveProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'created_by'>) => {
        setIsSaving(true);
        try {
            if (productToEdit) {
                await api.put(`/api/products/${productToEdit.id}`, productData);
            } else {
                const finalData = { ...productData, created_by: currentProfile?.id };
                await api.post('/api/products', finalData);
            }
            setModalOpen(false);
            setProductToEdit(null);
            fetchProducts();
        } catch (err: any) {
            alert(`Error saving product: ${err.message || err}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedProducts.size === 0) return;
        if (window.confirm(`Are you sure you want to delete ${selectedProducts.size} selected product(s)?`)) {
            const idsToDelete = Array.from(selectedProducts);
            try {
                await Promise.all(idsToDelete.map(id => api.delete(`/api/products/${id}`)));
                setProducts(prev => prev.filter(p => !idsToDelete.includes(p.id)));
                setSelectedProducts(new Set());
            } catch (err: any) {
                alert(`Error deleting products: ${err.message || err}`);
            }
        }
    };

    const handleDeleteProduct = async (productId: number) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await api.delete(`/api/products/${productId}`);
                fetchProducts();
            } catch (err: any) {
                alert(`Error deleting product: ${err.message || err}`);
            }
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
        } else {
            setSelectedProducts(new Set());
        }
    };

    const handleSelectOne = (productId: number, checked: boolean) => {
        const newSet = new Set(selectedProducts);
        if (checked) newSet.add(productId);
        else newSet.delete(productId);
        setSelectedProducts(newSet);
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const statusMatch = statusFilter === 'All' || p.status === statusFilter;
            const collaboratorMatch = !collaboratorFilter || (currentProfile && p.collaborators?.includes(currentProfile.id));
            return statusMatch && collaboratorMatch;
        });
    }, [products, statusFilter, collaboratorFilter, currentProfile]);

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
                {canCreate && (
                    <button onClick={() => { setProductToEdit(null); setModalOpen(true); }} className="inline-flex items-center bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark">
                        <PlusIcon className="h-5 w-5 mr-2" /> Create Product
                    </button>
                )}
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="p-2 border rounded-md bg-white">
                        <option value="All">All Statuses</option>
                        {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="flex items-center">
                        <input type="checkbox" id="collaborator-filter" checked={collaboratorFilter} onChange={e => setCollaboratorFilter(e.target.checked)} className="h-4 w-4 rounded text-primary focus:ring-primary"/>
                        <label htmlFor="collaborator-filter" className="ml-2 text-sm font-medium">Involving Me</label>
                    </div>
                </div>
                {selectedProducts.size > 0 && canDelete && (
                    <button onClick={handleDeleteSelected} className="px-3 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700">
                        Delete ({selectedProducts.size})
                    </button>
                )}
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input type="checkbox" onChange={handleSelectAll} checked={filteredProducts.length > 0 && selectedProducts.size === filteredProducts.length} className="h-4 w-4 rounded text-primary focus:ring-primary"/>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collaborators</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">Loading...</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No products found.</td></tr>
                            ) : (
                                filteredProducts.map((product) => {
                                    const isInvolvingMe = currentProfile && product.collaborators?.includes(currentProfile.id);
                                    return (
                                        <tr key={product.id} className={`${isInvolvingMe ? 'bg-blue-50' : ''} ${selectedProducts.has(product.id) ? 'bg-indigo-100' : ''} hover:bg-gray-100`}>
                                            <td className="px-4 py-4">
                                                <input type="checkbox" checked={selectedProducts.has(product.id)} onChange={e => handleSelectOne(product.id, e.target.checked)} className="h-4 w-4 rounded text-primary focus:ring-primary"/>
                                            </td>
                                            <td className="px-6 py-4 font-medium">{product.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center -space-x-2">
                                                    {(product.collaborator_users || []).map(staff => (
                                                        <div key={staff.id} title={staff.username} className="h-8 w-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-white">
                                                            {staff.username.substring(0, 2).toUpperCase()}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{product.tags?.join(', ')}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{product.end_date}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[product.status]}`}>
                                                    {product.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                {canEdit && <button onClick={() => { setProductToEdit(product); setModalOpen(true); }} className="p-1 text-gray-400 hover:text-primary" title="Edit Product"><PencilIcon className="h-5 w-5" /></button>}
                                                {canDelete && <button onClick={() => handleDeleteProduct(product.id)} className="p-1 text-red-400 hover:text-red-600" title="Delete Product"><TrashIcon className="h-5 w-5" /></button>}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ProductModal
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveProduct}
                productToEdit={productToEdit}
                isSaving={isSaving}
            />
        </>
    );
};

export default ProductsPage;