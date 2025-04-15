'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { formatCurrency } from '../utils/calculations';

interface Product {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  cost_per_item: number;
  purchase_date: string | null; // Assuming it can be null
  created_at: string;
  source: string;
  supplier?: string; // Assuming supplier is optional
  healthStatus: 'good' | 'warning' | 'critical' | 'overstocked';
  daysRemaining: number;
}

interface InventoryManagementProps {
  className?: string;
  refresh?: number;
}

export default function InventoryManagement({ className = '', refresh = 0 }: InventoryManagementProps) {
  const [inventory, setInventory] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClientComponentClient();
  
  // Get the current user's ID
  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    getUserId();
  }, [supabase]);

  const fetchInventory = useCallback(async () => {
    if (!userId) return; // Guard clause if userId is not yet available

    try {
      setIsLoading(true);
      setError(null);
      console.log('InventoryManagement: Fetching inventory data from database...');
      
      // Fetch products for the current user
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      if (data) {
        console.log(`InventoryManagement: Retrieved ${data.length} products from database`);
        
        // Add health status for each product (example logic - you can adjust as needed)
        const productsWithHealth = data.map(product => {
          let healthStatus = 'good';
          let daysRemaining = 30; // Default value
          
          if (product.quantity <= 0) {
            healthStatus = 'critical';
            daysRemaining = 0;
          } else if (product.quantity < 5) {
            healthStatus = 'warning';
            daysRemaining = 7;
          } else if (product.quantity > 50) {
            healthStatus = 'overstocked';
            daysRemaining = 90;
          }
          
          return {
            ...product,
            healthStatus,
            daysRemaining
          };
        });
        
        setInventory(productsWithHealth);
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Failed to load inventory data');
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    if (userId) {
      console.log('InventoryManagement: User ID available, fetching data...');
      fetchInventory();
    }
  }, [refresh, userId, fetchInventory]);

  // Helper function for status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-50 text-red-700 border-red-200';
      case 'warning': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'good': return 'bg-green-50 text-green-700 border-green-200';
      case 'overstocked': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Sorting function
  const sortByField = (a: Product, b: Product, field: string): number => {
    if (field === 'name') {
      return sortOrder === 'asc' 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    
    if (field === 'quantity') {
      return sortOrder === 'asc' 
        ? a.quantity - b.quantity
        : b.quantity - a.quantity;
    }
    
    if (field === 'value') {
      const valueA = a.quantity * a.cost_per_item;
      const valueB = b.quantity * b.cost_per_item;
      return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
    }
    
    if (field === 'date') {
      const dateA = new Date(a.purchase_date || a.created_at).getTime();
      const dateB = new Date(b.purchase_date || b.created_at).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }
    
    return 0;
  };
  
  // Handle sort button clicks
  const handleSortClick = (field: string) => {
    if (sortBy === field) {
      // If already sorting by this field, toggle order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // If sorting by a new field, set it and default to ascending
      setSortBy(field);
      setSortOrder('asc');
    }
  };
  
  // Filter and sort the inventory items
  const displayItems = inventory
    .filter(item => {
      if (!searchQuery) return true;
      
      const searchLower = searchQuery.toLowerCase();
      return (
        (item.name && item.name.toLowerCase().includes(searchLower)) ||
        (item.source && item.source.toLowerCase().includes(searchLower)) ||
        (item.supplier && item.supplier.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => sortByField(a, b, sortBy))
    .slice(0, 10); // Limit to 10 items

  if (isLoading) {
    return (
      <div className={`card ${className}`}>
        <div className="card-header">
          <h2 className="card-title">Inventory Management</h2>
        </div>
        <div className="card-content">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-slate-200 rounded"></div>
              <div className="h-4 bg-slate-200 rounded"></div>
              <div className="h-4 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`card ${className}`}>
        <div className="card-header">
          <h2 className="card-title">Inventory Management</h2>
        </div>
        <div className="card-content">
          <div className="p-4 border-l-4 border-red-400 bg-red-50 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      <div className="card-header flex justify-between items-center">
        <h2 className="card-title">Inventory Management</h2>
        <Link href="/inventory" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center">
          View All
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </Link>
      </div>

      <div className="card-content">
        {/* Health Overview Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Total Products</p>
            <p className="text-2xl font-semibold text-slate-800">{inventory.length}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Total Value</p>
            <p className="text-2xl font-semibold text-primary-600">{formatCurrency(inventory.reduce((sum, product) => sum + (product.quantity * product.cost_per_item), 0))}</p>
          </div>
          <div 
            className="bg-gradient-to-r from-red-50 to-white rounded-lg p-3 border border-red-100 shadow-sm"
            title="Products requiring immediate reorder"
          >
            <p className="text-sm text-red-500 mb-1">Critical Items</p>
            <p className="text-2xl font-semibold text-red-600">{inventory.filter(item => item.healthStatus === 'critical').length}</p>
          </div>
          <div 
            className="bg-gradient-to-r from-orange-50 to-white rounded-lg p-3 border border-orange-100 shadow-sm"
            title="Products to monitor closely"
          >
            <p className="text-sm text-orange-500 mb-1">Warning Items</p>
            <p className="text-2xl font-semibold text-orange-500">{inventory.filter(item => item.healthStatus === 'warning').length}</p>
          </div>
        </div>

        {/* Search and Sort Controls */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
          <div className="relative w-full sm:w-auto">
            <input 
              type="text" 
              placeholder="Search by name or source..." 
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          
          <div className="flex gap-2 text-sm">
            <span className="text-slate-500 font-medium mr-1 pt-1.5">Sort By</span>
            <button 
              onClick={() => handleSortClick('name')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                sortBy === 'name' 
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'hover:bg-slate-100'
              }`}
            >
              Name
              {sortBy === 'name' && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
            <button 
              onClick={() => handleSortClick('quantity')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                sortBy === 'quantity' 
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'hover:bg-slate-100'
              }`}
            >
              Quantity
              {sortBy === 'quantity' && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
            <button 
              onClick={() => handleSortClick('value')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                sortBy === 'value' 
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'hover:bg-slate-100'
              }`}
            >
              Value
              {sortBy === 'value' && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
            <button 
              onClick={() => handleSortClick('date')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                sortBy === 'date' 
                  ? 'bg-primary-100 text-primary-700 font-medium'
                  : 'hover:bg-slate-100'
              }`}
            >
              Date
              {sortBy === 'date' && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Product
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Source
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Cost Per Item
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {displayItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-sm text-slate-500">
                    No inventory items found. Add products to get started.
                  </td>
                </tr>
              ) : (
                displayItems.map((item) => {
                  // Format the date for display
                  const purchaseDate = new Date(item.purchase_date || item.created_at);
                  const formattedDate = purchaseDate.toLocaleDateString('en-US', {
                    month: 'numeric',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  // Calculate total value
                  const totalValue = item.quantity * item.cost_per_item;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-slate-900">{item.name}</div>
                          <div className="text-xs text-slate-500">{formattedDate}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${
                          item.source === 'walmart' 
                            ? 'bg-blue-50 text-blue-700' 
                            : item.source === 'amazon'
                            ? 'bg-orange-50 text-orange-700'
                            : 'bg-green-50 text-green-700'
                        }`}>
                          {item.source === 'walmart' 
                            ? 'Walmart' 
                            : item.source === 'amazon' 
                            ? 'Amazon' 
                            : "Sam's Club"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm text-slate-900">{item.quantity}</span>
                          <span className={`ml-2 px-2 py-0.5 inline-flex text-xs leading-5 font-medium rounded-full ${getStatusColor(item.healthStatus)}`}>
                            {item.daysRemaining} days
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                        {formatCurrency(item.cost_per_item)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                        {formatCurrency(totalValue)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <Link 
                          href={`/inventory?edit=${item.id}`} 
                          className="text-primary-600 hover:text-primary-900 mr-3"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* View all button for mobile */}
        <div className="mt-4 text-center sm:hidden">
          <Link href="/inventory" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
            View All Inventory Items
          </Link>
        </div>
      </div>
    </div>
  );
} 