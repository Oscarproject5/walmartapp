'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { formatCurrency } from '../utils/calculations';
import { XMarkIcon, PencilIcon, PlusIcon, TrashIcon, CheckIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface ProductBatch {
  id: string;
  purchase_date: string;
  quantity_purchased: number;
  quantity_available: number;
  cost_per_item: number;
  batch_reference?: string;
}

interface ProductBatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string | null;
  onBatchesChanged?: () => void;
}

interface BatchEditFormData {
  id?: string;
  purchase_date: string;
  quantity_purchased: number;
  quantity_available: number; 
  cost_per_item: number;
  batch_reference: string;
}

export default function ProductBatchDetailModal({
  isOpen,
  onClose,
  productId,
  onBatchesChanged
}: ProductBatchDetailModalProps) {
  const [product, setProduct] = useState<any | null>(null);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Edit mode states
  const [editMode, setEditMode] = useState<'none' | 'edit' | 'add'>('none');
  const [editBatchId, setEditBatchId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<BatchEditFormData>({
    purchase_date: new Date().toISOString().split('T')[0],
    quantity_purchased: 0,
    quantity_available: 0,
    cost_per_item: 0,
    batch_reference: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    if (isOpen && productId) {
      fetchProductAndBatches();
    }
  }, [isOpen, productId]);
  
  useEffect(() => {
    // Reset edit mode when modal closes
    if (!isOpen) {
      setEditMode('none');
      setEditBatchId(null);
    }
  }, [isOpen]);
  
  const fetchProductAndBatches = async () => {
    if (!productId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch the product details
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      
      if (productError) throw productError;
      if (productData) setProduct(productData);
      
      // Fetch the product batches ordered by purchase date (FIFO)
      const { data: batchesData, error: batchesError } = await supabase
        .from('product_batches')
        .select('*')
        .eq('product_id', productId)
        .order('purchase_date', { ascending: true });
      
      if (batchesError) throw batchesError;
      
      // Check if there are any batches
      if (batchesData && batchesData.length === 0 && productData) {
        // No batches found, automatically create one
        await createInitialBatchFromProduct(productData);
      } else if (batchesData) {
        // Batches found, set them in state
        setBatches(batchesData);
      }
      
    } catch (err: any) {
      console.error('Error fetching product data:', err);
      setError(err.message || 'Failed to load product data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Modified function to accept product data directly
  const createInitialBatchFromProduct = async (productData: any) => {
    try {
      // Create a batch entry using the product's data
      const { error } = await supabase
        .from('product_batches')
        .insert([{
          product_id: productData.id,
          purchase_date: productData.purchase_date || new Date().toISOString(),
          quantity_purchased: productData.quantity || 0,
          quantity_available: productData.available_qty || 0,
          cost_per_item: productData.cost_per_item || 0,
          batch_reference: 'Initial Batch',
          user_id: productData.user_id
        }]);
      
      if (error) throw error;
      
      // Fetch the newly created batch to update the UI
      const { data: updatedBatches, error: fetchError } = await supabase
        .from('product_batches')
        .select('*')
        .eq('product_id', productData.id)
        .order('purchase_date', { ascending: true });
      
      if (fetchError) throw fetchError;
      if (updatedBatches) setBatches(updatedBatches);
      
    } catch (err: any) {
      console.error('Error creating initial batch:', err);
      setError(`Failed to create initial batch: ${err.message}`);
    }
  };
  
  // Keep the original function for the button (in case it's needed)
  const createInitialBatch = async () => {
    if (!product || batches.length > 0) return;
    
    setIsLoading(true);
    try {
      await createInitialBatchFromProduct(product);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };
  
  // Calculate batch value
  const getBatchValue = (batch: ProductBatch) => {
    return batch.quantity_available * batch.cost_per_item;
  };
  
  // Determine which batch will be consumed next
  const getNextFifoBatch = () => {
    return batches.find(batch => batch.quantity_available > 0)?.id || null;
  };
  
  // Count how many batches have been fully depleted
  const getDepletedBatchesCount = () => {
    return batches.filter(batch => batch.quantity_available === 0).length;
  };
  
  // Count how many batches still have available quantity
  const getActiveBatchesCount = () => {
    return batches.filter(batch => batch.quantity_available > 0).length;
  };
  
  // Edit handlers
  const handleEditBatch = (batch: ProductBatch) => {
    setEditMode('edit');
    setEditBatchId(batch.id);
    setEditFormData({
      id: batch.id,
      purchase_date: new Date(batch.purchase_date).toISOString().split('T')[0],
      quantity_purchased: batch.quantity_purchased,
      quantity_available: batch.quantity_available,
      cost_per_item: batch.cost_per_item,
      batch_reference: batch.batch_reference || ''
    });
  };
  
  const handleAddBatch = () => {
    setEditMode('add');
    setEditBatchId(null);
    setEditFormData({
      purchase_date: new Date().toISOString().split('T')[0],
      quantity_purchased: 0,
      quantity_available: 0,
      cost_per_item: product?.cost_per_item || 0,
      batch_reference: `Batch-${new Date().toISOString().substring(0, 10).replace(/-/g, '-')}`
    });
  };
  
  const handleCancelEdit = () => {
    setEditMode('none');
    setEditBatchId(null);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value
    }));
  };
  
  const handleSaveBatch = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Validate inputs
      if (editFormData.quantity_purchased < 0 || editFormData.quantity_available < 0 || editFormData.cost_per_item < 0) {
        throw new Error('Quantities and cost must be positive values');
      }
      
      if (editFormData.quantity_available > editFormData.quantity_purchased) {
        throw new Error('Available quantity cannot exceed purchased quantity');
      }
      
      if (editMode === 'edit' && editBatchId) {
        // Call the update_product_batch function using RPC
        const { data, error } = await supabase.rpc('update_product_batch', {
          p_batch_id: editBatchId,
          p_purchase_date: editFormData.purchase_date,
          p_quantity_purchased: editFormData.quantity_purchased,
          p_quantity_available: editFormData.quantity_available,
          p_cost_per_item: editFormData.cost_per_item,
          p_batch_reference: editFormData.batch_reference,
          p_user_id: product.user_id
        });
        
        if (error) throw error;
        
        toast.success('Batch updated successfully');
      } else if (editMode === 'add') {
        // Call the add_product_batch function using RPC
        const { data, error } = await supabase.rpc('add_product_batch', {
          p_product_id: productId,
          p_purchase_date: editFormData.purchase_date,
          p_quantity_purchased: editFormData.quantity_purchased,
          p_quantity_available: editFormData.quantity_available,
          p_cost_per_item: editFormData.cost_per_item,
          p_user_id: product.user_id,
          p_batch_reference: editFormData.batch_reference
        });
        
        if (error) throw error;
        
        toast.success('New batch added successfully');
      }
      
      // Reset edit mode and refresh data
      setEditMode('none');
      setEditBatchId(null);
      fetchProductAndBatches();
      
      // Notify parent component that batches have been changed
      if (onBatchesChanged) {
        onBatchesChanged();
      }
      
    } catch (err: any) {
      console.error('Error saving batch:', err);
      setError(err.message || 'Failed to save batch');
      toast.error(err.message || 'Failed to save batch');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteBatch = async (batchId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Call the delete_product_batch function using RPC
      const { data, error } = await supabase.rpc('delete_product_batch', {
        p_batch_id: batchId,
        p_user_id: product.user_id
      });
      
      if (error) throw error;
      
      toast.success('Batch deleted successfully');
      fetchProductAndBatches();
      
      // Notify parent component that batches have been changed
      if (onBatchesChanged) {
        onBatchesChanged();
      }
      
    } catch (err: any) {
      console.error('Error deleting batch:', err);
      
      // Try to extract a more specific error message
      let errorMessage = 'Failed to delete batch';
      if (err && err.message) {
        // Check if it's the specific exception from the function
        if (err.message.includes('Cannot delete batch')) {
          errorMessage = err.message; // Use the specific message
        } else if (err.message.includes('Batch with ID')) {
            errorMessage = err.message; // Use the specific message
        }
      } else if (err && err.details) {
          errorMessage = err.details; // Fallback to details if message is generic
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check if a batch has been consumed (partially or fully)
  const isBatchConsumed = (batch: ProductBatch) => {
    return batch.quantity_available < batch.quantity_purchased;
  };
  
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-start">
                  <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                    FIFO Inventory Details
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                
                {isLoading ? (
                  <div className="mt-4 animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="space-y-2 mt-4">
                      {[...Array(3)].map((_, index) => (
                        <div key={index} className="h-12 bg-gray-200 rounded w-full"></div>
                      ))}
                    </div>
                  </div>
                ) : error ? (
                  <div className="mt-4 text-red-600">{error}</div>
                ) : product ? (
                  <div className="mt-4">
                    <h2 className="text-xl font-bold">{product.product_name || product.name}</h2>
                    <p className="text-gray-600 mt-1">
                      SKU: {product.product_sku} | Total Quantity: {product.quantity} | Available: {product.available_qty}
                    </p>
                    
                    <div className="mt-4 bg-blue-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-blue-900">FIFO Inventory Batches</h3>
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                            {getActiveBatchesCount()} Active Batches, {getDepletedBatchesCount()} Depleted
                          </span>
                          
                          {editMode === 'none' && (
                            <button
                              onClick={handleAddBatch}
                              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none"
                            >
                              <PlusIcon className="h-4 w-4 mr-1" />
                              Add Batch
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-blue-700 mt-1">
                        Items are sold in FIFO order (oldest batches first). This affects your cost basis for profit calculations.
                      </p>
                    </div>
                    
                    <div className="mt-4">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Purchase Date
                            </th>
                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Batch Reference
                            </th>
                            <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Original Qty
                            </th>
                            <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Remaining
                            </th>
                            <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Cost Per Item
                            </th>
                            <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Batch Value
                            </th>
                            <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {editMode === 'add' && (
                            <tr className="bg-green-50">
                              <td className="px-3 py-2 whitespace-nowrap">
                                <input 
                                  type="date" 
                                  name="purchase_date"
                                  value={editFormData.purchase_date}
                                  onChange={handleInputChange}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <input 
                                  type="text" 
                                  name="batch_reference"
                                  value={editFormData.batch_reference}
                                  onChange={handleInputChange}
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                  placeholder="Batch reference"
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-right">
                                <input 
                                  type="number" 
                                  name="quantity_purchased"
                                  value={editFormData.quantity_purchased}
                                  onChange={handleInputChange}
                                  min="0"
                                  step="1"
                                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-right">
                                <input 
                                  type="number" 
                                  name="quantity_available"
                                  value={editFormData.quantity_available}
                                  onChange={handleInputChange}
                                  min="0"
                                  max={editFormData.quantity_purchased}
                                  step="1"
                                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-right">
                                <input 
                                  type="number" 
                                  name="cost_per_item"
                                  value={editFormData.cost_per_item}
                                  onChange={handleInputChange}
                                  min="0"
                                  step="0.01"
                                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-right font-medium">
                                {formatCurrency(editFormData.quantity_available * editFormData.cost_per_item)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-center">
                                <div className="flex justify-center space-x-2">
                                  <button
                                    onClick={handleSaveBatch}
                                    disabled={isSaving}
                                    className="text-white bg-green-600 rounded-md p-1 hover:bg-green-700"
                                  >
                                    <CheckIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="text-white bg-gray-500 rounded-md p-1 hover:bg-gray-600"
                                  >
                                    <XCircleIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                          
                          {batches.length > 0 ? (
                            batches.map((batch, index) => (
                              editMode === 'edit' && editBatchId === batch.id ? (
                                <tr key={batch.id} className="bg-blue-50">
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    <input 
                                      type="date" 
                                      name="purchase_date"
                                      value={editFormData.purchase_date}
                                      onChange={handleInputChange}
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                    />
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    <input 
                                      type="text" 
                                      name="batch_reference"
                                      value={editFormData.batch_reference}
                                      onChange={handleInputChange}
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                    />
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-right">
                                    <input 
                                      type="number" 
                                      name="quantity_purchased"
                                      value={editFormData.quantity_purchased}
                                      onChange={handleInputChange}
                                      min={batch.quantity_purchased - batch.quantity_available} // Can't be less than consumed
                                      step="1"
                                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                                    />
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-right">
                                    <input 
                                      type="number" 
                                      name="quantity_available"
                                      value={editFormData.quantity_available}
                                      onChange={handleInputChange}
                                      min="0"
                                      max={editFormData.quantity_purchased}
                                      step="1"
                                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                                    />
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-right">
                                    <input 
                                      type="number" 
                                      name="cost_per_item"
                                      value={editFormData.cost_per_item}
                                      onChange={handleInputChange}
                                      min="0"
                                      step="0.01"
                                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                                    />
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-right font-medium">
                                    {formatCurrency(editFormData.quantity_available * editFormData.cost_per_item)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-center">
                                    <div className="flex justify-center space-x-2">
                                      <button
                                        onClick={handleSaveBatch}
                                        disabled={isSaving}
                                        className="text-white bg-green-600 rounded-md p-1 hover:bg-green-700"
                                      >
                                        <CheckIcon className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        className="text-white bg-gray-500 rounded-md p-1 hover:bg-gray-600"
                                      >
                                        <XCircleIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                <tr 
                                  key={batch.id} 
                                  className={
                                    batch.id === getNextFifoBatch() 
                                      ? 'bg-green-50' 
                                      : batch.quantity_available === 0 
                                        ? 'bg-gray-50 text-gray-500' 
                                        : ''
                                  }
                                >
                                  <td className="px-3 py-4 whitespace-nowrap text-sm">
                                    {batch.id === getNextFifoBatch() && (
                                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-2">
                                        NEXT FIFO
                                      </span>
                                    )}
                                    {formatDate(batch.purchase_date)}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm">
                                    {batch.batch_reference || `Batch-${formatDate(batch.purchase_date)}`}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                                    {batch.quantity_purchased}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                                    {batch.quantity_available}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                                    {formatCurrency(batch.cost_per_item)}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-medium">
                                    {formatCurrency(getBatchValue(batch))}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                                    {editMode === 'none' && (
                                      <div className="flex justify-center space-x-2">
                                        <button
                                          onClick={() => handleEditBatch(batch)}
                                          className="text-blue-600 hover:text-blue-900"
                                          title="Edit batch"
                                        >
                                          <PencilIcon className="h-4 w-4" />
                                        </button>
                                        
                                        <button
                                          onClick={() => handleDeleteBatch(batch.id)}
                                          className="text-red-600 hover:text-red-900"
                                          title="Delete batch"
                                        >
                                          <TrashIcon className="h-4 w-4" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="px-3 py-4 text-center text-sm text-gray-500">
                                <div className="flex flex-col items-center">
                                  <p className="mb-2">Creating initial FIFO batch record from product data...</p>
                                  <div className="animate-pulse mt-2">
                                    <div className="h-6 w-48 bg-blue-200 rounded mx-auto"></div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
                
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 