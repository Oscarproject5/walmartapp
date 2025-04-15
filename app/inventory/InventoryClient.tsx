'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/calculations';
import Link from 'next/link';

// Replace the SAMPLE_INVENTORY array with an empty array
const SAMPLE_INVENTORY: Product[] = [];

interface Product {
  id: string;
  name: string;
  quantity: number;
  cost_per_item: number;
  purchase_date: string;
  source: 'amazon' | 'walmart' | 'sams_club';
  created_at: string;
  status?: string;
  sales_qty?: number;
}

export default function InventoryClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({
    name: '',
    quantity: 0,
    cost_per_item: 0,
    purchase_date: new Date().toISOString().split('T')[0],
    source: 'amazon'
  });

  // Load inventory data on component mount
  useEffect(() => {
    loadInventory();
  }, []);

  // Helper function to update product status based on available quantity
  const updateInventoryStatus = async (products: any[]) => {
    const updatedProducts = [];
    
    for (const product of products) {
      // Calculate available quantity (quantity - sales_qty)
      const availableQty = (product.quantity || 0) - (product.sales_qty || 0);
      let status = product.status || 'active';
      
      // Update status based on available quantity
      if (availableQty <= 0) {
        status = 'out_of_stock';
      } else if (availableQty < 5) { // Threshold for low stock
        status = 'low_stock';
      } else {
        status = 'active';
      }
      
      // Only update if status has changed
      if (status !== product.status) {
        try {
          const { error } = await supabase
            .from('products')
            .update({ status })
            .eq('id', product.id);
            
          if (error) {
            console.error(`Error updating status for product ${product.id}:`, error);
          } else {
            console.log(`Updated status for ${product.name} to ${status} (available: ${availableQty})`);
          }
        } catch (err) {
          console.error(`Exception updating status for product ${product.id}:`, err);
        }
        
        // Return product with updated status for local state
        updatedProducts.push({ ...product, status });
      } else {
        updatedProducts.push(product);
      }
    }
    
    return updatedProducts;
  };

  // Update the loadInventory function to not use sample data
  const loadInventory = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Update status based on available quantity
      if (data && data.length > 0) {
        const updatedProducts = await updateInventoryStatus(data);
        setProducts(updatedProducts);
      } else {
        setProducts([]);
      }
      
      setUsingSampleData(false);
    } catch (err) {
      console.error('Error loading inventory:', err);
      setProducts([]);
      setUsingSampleData(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter products based on search query
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate inventory value
  const totalInventoryValue = filteredProducts.reduce(
    (sum, product) => sum + (product.quantity * product.cost_per_item),
    0
  );

  // Sort inventory by different criteria
  const sortInventory = (criteria: 'name' | 'quantity' | 'value' | 'date') => {
    const sortedProducts = [...products];
    switch (criteria) {
      case 'name':
        sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'quantity':
        sortedProducts.sort((a, b) => b.quantity - a.quantity);
        break;
      case 'value':
        sortedProducts.sort((a, b) => 
          (b.quantity * b.cost_per_item) - (a.quantity * a.cost_per_item)
        );
        break;
      case 'date':
        sortedProducts.sort((a, b) => 
          new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
        );
        break;
    }
    setProducts(sortedProducts);
  };

  // Handle input changes for the form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentProduct(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'cost_per_item' 
        ? parseInt(value) || 0 
        : value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentProduct.name || !currentProduct.quantity || !currentProduct.cost_per_item) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      
      if (usingSampleData) {
        // If using sample data, just update the local state
        if (currentProduct.id) {
          // Edit existing product
          setProducts(prev => 
            prev.map(p => p.id === currentProduct.id ? { ...p, ...currentProduct } as Product : p)
          );
        } else {
          // Add new product
          const newProduct = {
            ...currentProduct,
            id: `prod${products.length + 1}`,
            created_at: new Date().toISOString()
          } as Product;
          setProducts(prev => [newProduct, ...prev]);
        }
      } else {
        // If connected to database, update the database
        if (currentProduct.id) {
          // Edit existing product
          const { error } = await supabase
            .from('products')
            .update(currentProduct)
            .eq('id', currentProduct.id);
            
          if (error) throw error;
        } else {
          // Add new product
          const { error } = await supabase
            .from('products')
            .insert([{
              ...currentProduct,
              created_at: new Date().toISOString()
            }]);
            
          if (error) throw error;
        }
        
        // Reload inventory after changes
        await loadInventory();
      }
      
      // Reset form and hide it
      setCurrentProduct({
        name: '',
        quantity: 0,
        cost_per_item: 0,
        purchase_date: new Date().toISOString().split('T')[0],
        source: 'amazon'
      });
      setShowForm(false);
      setError(null);
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Failed to save product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Edit a product
  const handleEdit = (product: Product) => {
    setCurrentProduct(product);
    setShowForm(true);
  };

  // Delete a product
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      setIsLoading(true);
      
      if (usingSampleData) {
        // If using sample data, just update the local state
        setProducts(prev => prev.filter(p => p.id !== id));
      } else {
        // If connected to database, update the database
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        
        // Reload inventory after changes
        await loadInventory();
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Failed to delete product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <div className="flex space-x-3">
          <Link 
            href="/inventory/upload" 
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Upload Inventory
          </Link>
          <button 
            onClick={() => {
              setCurrentProduct({
                name: '',
                quantity: 0,
                cost_per_item: 0,
                purchase_date: new Date().toISOString().split('T')[0],
                source: 'amazon'
              });
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Add Product
          </button>
        </div>
      </div>

      {usingSampleData && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-yellow-700">
            <strong>Note:</strong> Using sample inventory data. Connect to a real database for production use.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Product Form */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">
              {currentProduct.id ? 'Edit Product' : 'Add New Product'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                  Product Name*
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={currentProduct.name}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="quantity">
                  Quantity*
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  value={currentProduct.quantity}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="cost_per_item">
                  Cost Per Item (in cents)*
                </label>
                <input
                  id="cost_per_item"
                  name="cost_per_item"
                  type="number"
                  min="0"
                  value={currentProduct.cost_per_item}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="purchase_date">
                  Purchase Date*
                </label>
                <input
                  id="purchase_date"
                  name="purchase_date"
                  type="date"
                  value={currentProduct.purchase_date}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="source">
                  Source*
                </label>
                <select
                  id="source"
                  name="source"
                  value={currentProduct.source}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  <option value="amazon">Amazon</option>
                  <option value="walmart">Walmart</option>
                  <option value="sams_club">Sam's Club</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  {currentProduct.id ? 'Update' : 'Add'} Product
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      

      {/* Search and Sort */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="md:flex md:justify-between mb-4">
          <div className="mb-4 md:mb-0 md:w-1/3">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="search">
              Search Products
            </label>
            <input
              id="search"
              type="text"
              placeholder="Search by name or source..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Sort By
            </label>
            <div className="flex space-x-2">
              <button 
                onClick={() => sortInventory('name')}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
              >
                Name
              </button>
              <button 
                onClick={() => sortInventory('quantity')}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
              >
                Quantity
              </button>
              <button 
                onClick={() => sortInventory('value')}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
              >
                Value
              </button>
              <button 
                onClick={() => sortInventory('date')}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
              >
                Date
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost Per Item
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No products found. Add some to get started.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">{new Date(product.purchase_date).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${product.source === 'amazon' ? 'bg-orange-100 text-orange-800' : 
                          product.source === 'walmart' ? 'bg-blue-100 text-blue-800' : 
                          'bg-green-100 text-green-800'}`}>
                        {product.source === 'amazon' ? 'Amazon' : 
                         product.source === 'walmart' ? 'Walmart' : 
                         'Sam\'s Club'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                      {product.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                      {formatCurrency(product.cost_per_item)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                      {formatCurrency(product.quantity * product.cost_per_item)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 