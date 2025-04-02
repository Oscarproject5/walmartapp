'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { calculateSalesVelocity } from '../utils/auto-reorder';
import { formatCurrency } from '../utils/calculations';
import Link from 'next/link';
import EditInventoryItemModal from './EditInventoryItemModal';

interface InventoryManagementProps {
  className?: string;
  limit?: number;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  cost_per_item: number;
  purchase_date: string;
  source: string;
  daysRemaining: number;
  velocityTrend: 'increasing' | 'stable' | 'decreasing';
  healthStatus: 'critical' | 'warning' | 'good' | 'overstocked';
}

interface InventoryMetrics {
  totalItems: number;
  totalValue: number;
  criticalItems: number;
  warningItems: number;
  healthyItems: number;
  overstockedItems: number;
  averageDaysRemaining: number;
}

export default function InventoryManagement({ className = '', limit = 5 }: InventoryManagementProps) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [metrics, setMetrics] = useState<InventoryMetrics>({
    totalItems: 0,
    totalValue: 0,
    criticalItems: 0,
    warningItems: 0,
    healthyItems: 0,
    overstockedItems: 0,
    averageDaysRemaining: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'value' | 'date'>('quantity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);

  useEffect(() => {
    loadInventoryData();
  }, [limit]);

  async function loadInventoryData() {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*');

      if (productsError) throw productsError;
      
      // Ensure products is an array
      const products = Array.isArray(productsData) ? productsData : [];

      // Fetch sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*');

      if (salesError) throw salesError;
      
      // Ensure sales is an array
      const sales = Array.isArray(salesData) ? salesData : [];

      // Calculate inventory health metrics
      const inventoryWithHealth: InventoryItem[] = products.map(product => {
        const velocity = calculateSalesVelocity(sales, product.id);
        const daysRemaining = product.quantity / Math.max(velocity.dailyAverage, 0.01);
        
        let healthStatus: 'critical' | 'warning' | 'good' | 'overstocked';
        if (daysRemaining <= 7) {
          healthStatus = 'critical';
        } else if (daysRemaining <= 14) {
          healthStatus = 'warning';
        } else if (daysRemaining <= 60) {
          healthStatus = 'good';
        } else {
          healthStatus = 'overstocked';
        }

        return {
          id: product.id,
          name: product.name,
          quantity: product.quantity,
          cost_per_item: product.cost_per_item,
          purchase_date: product.purchase_date,
          source: product.source,
          daysRemaining: Math.ceil(daysRemaining),
          velocityTrend: velocity.trend,
          healthStatus
        };
      });

      // Calculate aggregated metrics
      const metrics: InventoryMetrics = {
        totalItems: products.length,
        totalValue: products.reduce((sum, product) => sum + (product.quantity * product.cost_per_item), 0),
        criticalItems: inventoryWithHealth.filter(item => item.healthStatus === 'critical').length,
        warningItems: inventoryWithHealth.filter(item => item.healthStatus === 'warning').length,
        healthyItems: inventoryWithHealth.filter(item => item.healthStatus === 'good').length,
        overstockedItems: inventoryWithHealth.filter(item => item.healthStatus === 'overstocked').length,
        averageDaysRemaining: inventoryWithHealth.reduce((sum, item) => sum + item.daysRemaining, 0) / 
          (inventoryWithHealth.length || 1)
      };

      // Apply sorting
      sortInventoryItems(inventoryWithHealth);

      setInventoryItems(inventoryWithHealth);
      setMetrics(metrics);
    } catch (err) {
      console.error('Error loading inventory data:', err);
      setError('Failed to load inventory data');
    } finally {
      setIsLoading(false);
    }
  }

  // Function to sort inventory items
  const sortInventoryItems = (items: InventoryItem[]) => {
    const sorted = [...items].sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortBy === 'quantity') {
        return sortOrder === 'asc'
          ? a.quantity - b.quantity
          : b.quantity - a.quantity;
      } else if (sortBy === 'value') {
        const aValue = a.quantity * a.cost_per_item;
        const bValue = b.quantity * b.cost_per_item;
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      } else if (sortBy === 'date') {
        return sortOrder === 'asc'
          ? new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime()
          : new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime();
      }
      // Default sort by health status (critical first)
      const statusOrder = { 'critical': 0, 'warning': 1, 'good': 2, 'overstocked': 3 };
      return statusOrder[a.healthStatus] - statusOrder[b.healthStatus];
    });
    
    return sorted;
  };

  // Handle sort click
  const handleSortClick = (column: 'name' | 'quantity' | 'value' | 'date') => {
    if (sortBy === column) {
      // Toggle order if same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column with default desc order
      setSortBy(column);
      setSortOrder('desc');
    }
    
    // Apply sort to current items
    const sorted = sortInventoryItems(inventoryItems);
    setInventoryItems(sorted);
  };

  // Filter items by search query
  const filteredItems = searchQuery
    ? inventoryItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.source.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : inventoryItems;

  // Get limited items for display
  const displayItems = filteredItems.slice(0, limit);

  // Add function to handle edit button click
  const handleEditClick = (id: string) => {
    setEditItemId(id);
    setShowEditModal(true);
  };
  
  // Add function to refresh data after edit
  const handleItemUpdated = () => {
    loadInventoryData();
  };

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
            <p className="text-2xl font-semibold text-slate-800">{metrics.totalItems}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">Total Value</p>
            <p className="text-2xl font-semibold text-primary-600">{formatCurrency(metrics.totalValue)}</p>
          </div>
          <div 
            className="bg-gradient-to-r from-red-50 to-white rounded-lg p-3 border border-red-100 shadow-sm"
            title="Products requiring immediate reorder"
          >
            <p className="text-sm text-red-500 mb-1">Critical Items</p>
            <p className="text-2xl font-semibold text-red-600">{metrics.criticalItems}</p>
          </div>
          <div 
            className="bg-gradient-to-r from-orange-50 to-white rounded-lg p-3 border border-orange-100 shadow-sm"
            title="Products to monitor closely"
          >
            <p className="text-sm text-orange-500 mb-1">Warning Items</p>
            <p className="text-2xl font-semibold text-orange-500">{metrics.warningItems}</p>
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
                  const purchaseDate = new Date(item.purchase_date);
                  const formattedDate = purchaseDate.toLocaleDateString('en-US', {
                    month: 'numeric',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  // Calculate total value
                  const totalValue = item.quantity * item.cost_per_item;

                  // Get color based on health status
                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'critical': return 'bg-red-50 text-red-700 border-red-200';
                      case 'warning': return 'bg-orange-50 text-orange-700 border-orange-200';
                      case 'good': return 'bg-green-50 text-green-700 border-green-200';
                      case 'overstocked': return 'bg-blue-50 text-blue-700 border-blue-200';
                      default: return 'bg-slate-50 text-slate-700 border-slate-200';
                    }
                  };

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
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                        {formatCurrency(totalValue)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => handleEditClick(item.id)}
                          className="text-primary-600 hover:text-primary-900 mr-3"
                        >
                          Edit
                        </button>
                        <Link href={`/inventory?delete=${item.id}`} className="text-red-600 hover:text-red-900">
                          Delete
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

      {/* Edit Item Modal */}
      <EditInventoryItemModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onItemUpdated={handleItemUpdated}
        itemId={editItemId}
      />
    </div>
  );
} 