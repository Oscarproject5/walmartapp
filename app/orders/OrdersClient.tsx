'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/calculations';

// Define order status type
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'completed' | 'canceled' | 'returned';

// Order interface
interface Order {
  id: string;
  product_id: string;
  product_name: string;
  customer_name?: string;
  quantity: number;
  total_price: number;
  shipping_cost: number;
  platform_fee: number;
  item_cost: number;
  profit: number;
  profit_margin: number;
  order_date: string;
  status: OrderStatus;
  platform: string;
  purchase_order_number?: string;
  ship_by_date?: string;
  order_number?: string;
  fulfilled_by?: string;
  ship_node?: string;
  ship_node_id?: string;
  ship_method?: string;
  carrier_method?: string;
  item_condition?: string;
}

// Replace the SAMPLE_ORDERS array with an empty array
const SAMPLE_ORDERS: Order[] = [];

export default function OrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingSampleData, setUsingSampleData] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  
  // Total metrics
  const [totalMetrics, setTotalMetrics] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    averageProfitMargin: 0
  });

  // Add this state variable with the other state declarations
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Add this state for responsive column visibility
  const [showAllColumns, setShowAllColumns] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  // Filter orders whenever search query or status filter changes
  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, statusFilter]);

  // Add this useEffect to handle clicking outside the menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && !(event.target as Element).closest('.action-menu-container')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  // Update the loadOrders function to not use sample data
  const loadOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('sale_date', { ascending: false });
      
      if (error) throw error;
      
      // Always use real data, even if empty
      setOrders(data || []);
      calculateTotalMetrics(data || []);
      setUsingSampleData(false);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Failed to load orders. Please try again later.');
      setOrders([]);
      calculateTotalMetrics([]);
      setUsingSampleData(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter orders based on search query and status filter
  const filterOrders = () => {
    let filtered = [...orders];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.product_name.toLowerCase().includes(query) ||
        order.id.toLowerCase().includes(query) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(query))
      );
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    setFilteredOrders(filtered);
  };

  // Calculate total metrics
  const calculateTotalMetrics = (ordersData: Order[]) => {
    const totalRevenue = ordersData.reduce((sum, order) => sum + order.total_price, 0);
    const totalProfit = ordersData.reduce((sum, order) => sum + order.profit, 0);
    const averageProfitMargin = totalRevenue > 0 
      ? (totalProfit / totalRevenue) * 100 
      : 0;
    
    setTotalMetrics({
      totalRevenue,
      totalProfit,
      averageProfitMargin
    });
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setIsLoading(true);
      
      if (!usingSampleData) {
        // Update status in database
        const { error } = await supabase
          .from('sales')
          .update({ status: newStatus })
          .eq('id', orderId);
          
        if (error) throw error;
      }
      
      // Update locally
      const updatedOrders = orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      );
      
      setOrders(updatedOrders);
      // The filtered orders will be updated by the useEffect
    } catch (err) {
      console.error('Error updating order status:', err);
      setError('Failed to update order status.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'status-badge status-warning';
      case 'processing':
        return 'status-badge bg-blue-100 text-blue-800 border border-blue-200';
      case 'shipped':
        return 'status-badge bg-purple-100 text-purple-800 border border-purple-200';
      case 'completed':
        return 'status-badge status-success';
      case 'canceled':
        return 'status-badge status-error';
      case 'returned':
        return 'status-badge bg-rose-100 text-rose-800 border border-rose-200';
      default:
        return 'status-badge bg-slate-100 text-slate-800 border border-slate-200';
    }
  };

  // Add this toggle function near the other event handler functions
  const toggleMenu = (id: string) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {usingSampleData && (
        <div className="rounded-lg bg-yellow-50/50 backdrop-blur-sm border-l-4 border-yellow-400 p-3 shadow-sm">
          <p className="text-yellow-700 text-sm">
            <strong>Note:</strong> Using sample data for development. Connect to a real database for production use.
          </p>
        </div>
      )}
      
      {error && (
        <div className="rounded-lg bg-red-50/50 backdrop-blur-sm border-l-4 border-red-400 p-3 shadow-sm">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-medium text-slate-500">Total Revenue</h3>
              <p className="mt-1 text-xl font-semibold text-primary-600">
                {formatCurrency(totalMetrics.totalRevenue)}
              </p>
            </div>
            <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="glass rounded-xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-medium text-slate-500">Total Profit</h3>
              <p className="mt-1 text-xl font-semibold text-secondary-600">
                {formatCurrency(totalMetrics.totalProfit)}
              </p>
            </div>
            <div className="w-8 h-8 bg-secondary-50 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="glass rounded-xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-medium text-slate-500">Avg. Profit Margin</h3>
              <p className="mt-1 text-xl font-semibold text-accent-600">
                {totalMetrics.averageProfitMargin.toFixed(2)}%
              </p>
            </div>
            <div className="w-8 h-8 bg-accent-50 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card">
        <div className="card-header flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="card-title">Order Management</h2>
            <p className="text-xs text-slate-500">Displaying {filteredOrders.length} of {orders.length} orders</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 w-full sm:w-64 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring focus:ring-primary-200 transition-colors"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
              className="px-3 py-2 rounded-lg border border-slate-200 focus:border-primary-500 focus:ring focus:ring-primary-200 transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
              <option value="returned">Returned</option>
            </select>
            <button
              onClick={() => setShowAllColumns(!showAllColumns)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-sm"
            >
              {showAllColumns ? 'Compact View' : 'Show All Fields'}
            </button>
          </div>
        </div>
        <div className="card-content">
          <table className="table-modern w-full">
            <thead>
              <tr>
                <th>Order Info</th>
                <th>Product</th>
                <th>Customer</th>
                <th>Shipping</th>
                {showAllColumns && (
                  <>
                    <th>Fulfilled By</th>
                    <th>Ship Node</th>
                  </>
                )}
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => (
                  <tr key={order.id}>
                    <td>
                      <div className="space-y-1">
                        <div>
                          <span className="font-medium text-slate-800">PO# {order.purchase_order_number || '-'}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Order# {order.order_number || order.id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-slate-500">
                          Date: {new Date(order.order_date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-500">
                          Ship By: {order.ship_by_date ? new Date(order.ship_by_date).toLocaleDateString() : '-'}
                        </div>
                        <div className="text-sm font-medium text-primary-600">
                          {formatCurrency(order.total_price)}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <div className="font-medium">{order.product_name}</div>
                        <div className="text-xs text-slate-500">
                          Condition: {order.item_condition || 'New'}
                        </div>
                        <div className="text-xs text-slate-500">
                          Qty: {order.quantity}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="font-medium">{order.customer_name || 'N/A'}</div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <div className="text-sm">{order.ship_method || 'Standard'}</div>
                        <div className="text-xs text-slate-500">{order.carrier_method || '-'}</div>
                      </div>
                    </td>
                    {showAllColumns && (
                      <>
                        <td>{order.fulfilled_by || 'Self'}</td>
                        <td>
                          <div className="space-y-1">
                            <div>{order.ship_node || '-'}</div>
                            <div className="text-xs text-slate-500">ID: {order.ship_node_id || '-'}</div>
                          </div>
                        </td>
                      </>
                    )}
                    <td>
                      <span className={getStatusBadgeClass(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="relative inline-block text-left action-menu-container">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMenu(order.id);
                          }}
                          className="p-1 rounded-md hover:bg-slate-100 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                          </svg>
                        </button>
                        {openMenuId === order.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border border-slate-200">
                            <div className="py-1">
                              {order.status !== 'processing' && (
                                <button
                                  onClick={() => {
                                    updateOrderStatus(order.id, 'processing');
                                    toggleMenu(order.id);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                >
                                  Mark as Processing
                                </button>
                              )}
                              {order.status !== 'shipped' && (
                                <button
                                  onClick={() => {
                                    updateOrderStatus(order.id, 'shipped');
                                    toggleMenu(order.id);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                >
                                  Mark as Shipped
                                </button>
                              )}
                              {order.status !== 'completed' && (
                                <button
                                  onClick={() => {
                                    updateOrderStatus(order.id, 'completed');
                                    toggleMenu(order.id);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                >
                                  Mark as Completed
                                </button>
                              )}
                              {order.status !== 'canceled' && (
                                <button
                                  onClick={() => {
                                    updateOrderStatus(order.id, 'canceled');
                                    toggleMenu(order.id);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                                >
                                  Cancel Order
                                </button>
                              )}
                              {order.status !== 'returned' && order.status !== 'canceled' && (
                                <button
                                  onClick={() => {
                                    updateOrderStatus(order.id, 'returned');
                                    toggleMenu(order.id);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                                >
                                  Mark as Returned
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={showAllColumns ? 7 : 5} className="text-center py-8 text-slate-500">
                    No orders found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 