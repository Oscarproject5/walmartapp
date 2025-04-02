'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface EditInventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemUpdated: () => void;
  itemId: string | null;
}

export default function EditInventoryItemModal({ isOpen, onClose, onItemUpdated, itemId }: EditInventoryItemModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  
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

  useEffect(() => {
    if (isOpen && itemId) {
      fetchItemData();
    }
  }, [isOpen, itemId]);

  const fetchItemData = async () => {
    if (!itemId) return;

    setIsFetching(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', itemId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          product_name: data.name || data.product_name || '',
          product_sku: data.product_sku || '',
          quantity: data.quantity || 0,
          cost_per_item: data.cost_per_item || 0,
          purchase_date: data.purchase_date ? new Date(data.purchase_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          supplier: data.supplier || '',
          source: data.source || 'walmart',
          status: data.status || 'active',
          product_link: data.product_link || '',
          remarks: data.remarks || '',
        });
      }
    } catch (err) {
      console.error('Error fetching item data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load item data');
    } finally {
      setIsFetching(false);
    }
  };

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
    setError(null);
    setSuccess(false);
    
    if (!itemId) {
      setError('No item selected for editing');
      return;
    }
    
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
      
      // Calculate stock value
      const stockValue = formData.quantity * formData.cost_per_item;
      
      // Update existing inventory item
      const { data, error } = await supabase
        .from('products')
        .update({
          name: formData.product_name,
          product_name: formData.product_name,
          product_sku: formData.product_sku,
          quantity: formData.quantity,
          cost_per_item: formData.cost_per_item,
          purchase_date: formData.purchase_date,
          supplier: formData.supplier,
          source: formData.source,
          status: formData.status,
          product_link: formData.product_link,
          remarks: formData.remarks,
          available_qty: formData.quantity,
          stock_value: stockValue,
          per_qty_price: formData.cost_per_item,
          purchase_price: formData.cost_per_item * formData.quantity,
        })
        .eq('id', itemId)
        .select();
      
      if (error) throw error;
      
      setSuccess(true);
      
      // Show success message then close modal after delay
      setTimeout(() => {
        handleClose();
        onItemUpdated();
      }, 1500);
      
    } catch (err) {
      console.error('Error updating inventory item:', err);
      setError(err instanceof Error ? err.message : 'Failed to update inventory item');
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
            <h2 className="text-xl font-bold text-gray-900">Edit Inventory Item</h2>
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
              <p className="text-green-700">Item updated successfully!</p>
            </div>
          )}
          
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          {isFetching ? (
            <div className="flex justify-center items-center py-12">
              <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-2 text-gray-600">Loading item data...</span>
            </div>
          ) : (
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
                    <option value="other">Other</option>
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
                    <option value="discontinued">Discontinued</option>
                  </select>
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
                    placeholder="https://"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks
                  </label>
                  <textarea
                    id="remarks"
                    name="remarks"
                    rows={3}
                    value={formData.remarks}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  ></textarea>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                    isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : 'Update Item'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 