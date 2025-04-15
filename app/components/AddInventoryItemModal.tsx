'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/supabase';

interface AddInventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemAdded: () => void;
}

export default function AddInventoryItemModal({ isOpen, onClose, onItemAdded }: AddInventoryItemModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    product_name: '',
    product_sku: '',
    quantity: 0,
    cost_per_item: 0,
    purchase_date: new Date().toISOString().split('T')[0],
    supplier: '',
    source: 'walmart',
    status: 'active',
    product_link: '',
    remarks: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'cost_per_item' 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const resetForm = () => {
    setFormData({
      product_name: '',
      product_sku: '',
      quantity: 0,
      cost_per_item: 0,
      purchase_date: new Date().toISOString().split('T')[0],
      supplier: '',
      source: 'walmart',
      status: 'active',
      product_link: '',
      remarks: '',
    });
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (success || isLoading) {
      return;
    }
    
    setError(null);
    setSuccess(false);
    
    // Validation
    if (!formData.product_name || !formData.product_sku) {
      setError('Product name and SKU are required');
      return;
    }

    if (formData.quantity < 0 || formData.cost_per_item < 0) {
      setError('Quantity and cost must be positive values');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Get current user ID
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // First check if the product with the same SKU already exists for this user
      const { data: existingProduct, error: lookupError } = await supabase
        .from('products')
        .select('id, product_sku')
        .eq('product_sku', formData.product_sku)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (lookupError) throw lookupError;
      
      let productId: string;
      
      if (existingProduct) {
        // Product already exists, use its ID
        productId = existingProduct.id;
        
        // Optionally update the product details
        const { error: updateError } = await supabase
          .from('products')
          .update({
            product_name: formData.product_name,
            name: formData.product_name,
            source: formData.source,
            supplier: formData.supplier,
            product_link: formData.product_link,
            remarks: formData.remarks,
            status: formData.status,
            // Note: We don't update quantity, cost_per_item, etc. here as those are 
            // calculated automatically by triggers based on batches
          })
          .eq('id', productId)
          .eq('user_id', userId);
        
        if (updateError) throw updateError;
        
      } else {
        // Product doesn't exist, create it first
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert([{
            name: formData.product_name,
            product_name: formData.product_name,
            product_sku: formData.product_sku,
            source: formData.source,
            supplier: formData.supplier,
            product_link: formData.product_link,
            remarks: formData.remarks,
            status: formData.status,
            quantity: 0, // Will be updated by trigger based on batch
            available_qty: 0, // Will be updated by trigger based on batch
            cost_per_item: 0, // Will be updated by trigger based on batch
            stock_value: 0, // Will be updated by trigger based on batch
            purchase_date: formData.purchase_date,
            user_id: userId
          }])
          .select();
        
        if (insertError) throw insertError;
        if (!newProduct || newProduct.length === 0) {
          throw new Error('Failed to create product record');
        }
        
        productId = newProduct[0].id;
      }
      
      // Now create a batch entry for this product
      const { error: batchError } = await supabase
        .from('product_batches')
        .insert([{
          product_id: productId,
          purchase_date: formData.purchase_date,
          quantity_purchased: formData.quantity,
          quantity_available: formData.quantity, // Initially all purchased inventory is available
          cost_per_item: formData.cost_per_item,
          user_id: userId
        }]);
      
      if (batchError) throw batchError;
      
      setSuccess(true);
      
      // Show success message then close modal after delay
      setTimeout(() => {
        handleClose();
        onItemAdded();
      }, 1500);
      
    } catch (err) {
      console.error('Error adding inventory item:', err);
      setError(err instanceof Error ? err.message : 'Failed to add inventory item');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Add Inventory Item</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="sr-only">Close</span>
            </button>
          </div>

          {success && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4">
              <p className="text-green-700">Item added successfully!</p>
            </div>
          )}
          
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="product_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name*
                </label>
                <input
                  type="text"
                  id="product_name"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="product_sku" className="block text-sm font-medium text-gray-700 mb-1">
                  Product SKU*
                </label>
                <input
                  type="text"
                  id="product_sku"
                  name="product_sku"
                  value={formData.product_sku}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Note: If a product with this SKU already exists, a new batch will be added to it.
                </p>
              </div>
              
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity*
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  min="0"
                  step="1"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="cost_per_item" className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Per Item ($)*
                </label>
                <input
                  type="number"
                  id="cost_per_item"
                  name="cost_per_item"
                  value={formData.cost_per_item}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="purchase_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date*
                </label>
                <input
                  type="date"
                  id="purchase_date"
                  name="purchase_date"
                  value={formData.purchase_date}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <input
                  type="text"
                  id="supplier"
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
                  Source*
                </label>
                <select
                  id="source"
                  name="source"
                  value={formData.source}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                >
                  <option value="walmart">Walmart</option>
                  <option value="amazon">Amazon</option>
                  <option value="sams_club">Sam's Club</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status*
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="product_link" className="block text-sm font-medium text-gray-700 mb-1">
                Product Link
              </label>
              <input
                type="url"
                id="product_link"
                name="product_link"
                value={formData.product_link}
                onChange={handleInputChange}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                id="remarks"
                name="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                rows={3}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || success}
                className={`px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  (isLoading || success) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Adding...' : success ? 'Added!' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 