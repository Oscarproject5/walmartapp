'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

// Mock data for analytics
const salesData = [
  { month: 'Jan', sales: 12000 },
  { month: 'Feb', sales: 19000 },
  { month: 'Mar', sales: 15000 },
  { month: 'Apr', sales: 22000 },
  { month: 'May', sales: 28000 },
  { month: 'Jun', sales: 26000 },
  { month: 'Jul', sales: 32000 },
  { month: 'Aug', sales: 34000 },
  { month: 'Sep', sales: 29000 },
  { month: 'Oct', sales: 31000 },
  { month: 'Nov', sales: 38000 },
  { month: 'Dec', sales: 42000 },
];

const topProducts = [
  { id: 1, name: 'Wireless Headphones', sales: 1243, revenue: 74580 },
  { id: 2, name: 'Smart Watch', sales: 986, revenue: 148900 },
  { id: 3, name: 'Laptop Stand', sales: 879, revenue: 26370 },
  { id: 4, name: 'Phone Charger', sales: 754, revenue: 15080 },
  { id: 5, name: 'Bluetooth Speaker', sales: 651, revenue: 52080 },
];

const userStats = {
  totalUsers: 5842,
  newUsersToday: 37,
  activeUsers: 2104,
  averageSessionDuration: '8m 15s',
};

const orderStats = {
  totalOrders: 18962,
  ordersToday: 143,
  averageOrderValue: '$67.42',
  conversionRate: '3.2%',
};

const inventoryStats = {
  totalProducts: 1254,
  lowStockItems: 28,
  outOfStock: 12,
  averageTurnover: '24 days',
};

const revenueByCategory = [
  { category: 'Electronics', revenue: 284000 },
  { category: 'Clothing', revenue: 175000 },
  { category: 'Home Goods', revenue: 143000 },
  { category: 'Beauty', revenue: 118000 },
  { category: 'Sports', revenue: 95000 },
  { category: 'Books', revenue: 67000 },
];

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

export default function AdminAnalytics() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }
      
      // Check if user is an admin
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();
      
      if (error || !profile?.is_admin) {
        setError('You do not have permission to access this page');
        setIsAdmin(false);
        setTimeout(() => router.push('/dashboard'), 3000);
        return;
      }
      
      setIsAdmin(true);
      loadAnalytics();
    };
    
    checkAdminStatus();
  }, [router, supabase]);
  
  const loadAnalytics = async () => {
    // In a real implementation, this would fetch analytics data from your database
    // based on the selected time range
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    setIsLoading(false);
  };
  
  // Handles changing the time range for analytics
  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    setIsLoading(true);
    loadAnalytics();
  };
  
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-700">{error || 'Checking permissions...'}</p>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Analytics Dashboard</h1>
        <div className="flex space-x-2">
          {(['7d', '30d', '90d', '1y', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => handleTimeRangeChange(range)}
              className={`px-3 py-1 rounded-md text-sm ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {range === '7d' && '7 Days'}
              {range === '30d' && '30 Days'}
              {range === '90d' && '90 Days'}
              {range === '1y' && '1 Year'}
              {range === 'all' && 'All Time'}
            </button>
          ))}
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Revenue</h3>
          <p className="text-3xl font-bold text-blue-600 mb-2">$329,432</p>
          <div className="flex items-center">
            <span className="text-green-500 text-sm font-medium flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"></path>
              </svg>
              +12.5%
            </span>
            <span className="text-gray-500 text-sm ml-2">vs previous period</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Orders</h3>
          <p className="text-3xl font-bold text-blue-600 mb-2">{orderStats.totalOrders.toLocaleString()}</p>
          <div className="flex items-center">
            <span className="text-sm text-gray-500">
              <span className="font-medium text-blue-600">{orderStats.ordersToday}</span> today
            </span>
            <span className="mx-2 text-gray-300">|</span>
            <span className="text-sm text-gray-500">
              Avg <span className="font-medium text-blue-600">{orderStats.averageOrderValue}</span>
            </span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Users</h3>
          <p className="text-3xl font-bold text-blue-600 mb-2">{userStats.totalUsers.toLocaleString()}</p>
          <div className="flex items-center">
            <span className="text-sm text-gray-500">
              <span className="font-medium text-blue-600">{userStats.newUsersToday}</span> new today
            </span>
            <span className="mx-2 text-gray-300">|</span>
            <span className="text-sm text-gray-500">
              <span className="font-medium text-blue-600">{userStats.activeUsers}</span> active
            </span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Inventory</h3>
          <p className="text-3xl font-bold text-blue-600 mb-2">{inventoryStats.totalProducts.toLocaleString()}</p>
          <div className="flex items-center">
            <span className="text-sm text-gray-500">
              <span className="font-medium text-red-600">{inventoryStats.lowStockItems}</span> low stock
            </span>
            <span className="mx-2 text-gray-300">|</span>
            <span className="text-sm text-gray-500">
              <span className="font-medium text-red-600">{inventoryStats.outOfStock}</span> out of stock
            </span>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Monthly Sales</h3>
          
          {/* Sales Chart - In a real implementation, you'd use a chart library like Chart.js or Recharts */}
          <div className="h-72 relative">
            <div className="absolute inset-0 flex items-end">
              {salesData.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-5/6 bg-blue-500 rounded-t-sm transition-all duration-300 hover:bg-blue-600"
                    style={{ height: `${(item.sales / 45000) * 100}%` }}
                  ></div>
                  <span className="text-xs font-medium text-gray-500 mt-2">{item.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Revenue by Category</h3>
          
          {/* Category Chart - In a real implementation, you'd use a chart library like Chart.js or Recharts */}
          <div className="space-y-4 mt-6">
            {revenueByCategory.map((category, index) => (
              <div key={index}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{category.category}</span>
                  <span className="text-sm font-medium text-gray-700">${(category.revenue / 1000).toFixed(1)}k</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${(category.revenue / 300000) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Top Products */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Top Performing Products</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.sales.toLocaleString()} units
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${product.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="w-20 h-6">
                      <svg viewBox="0 0 100 20" className="w-full h-full">
                        <path
                          fill="none"
                          stroke={product.id % 2 === 0 ? "#16a34a" : "#2563eb"}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d={`M0,${10 + (Math.random() * 10 - 5)} ${Array.from({ length: 10 }, (_, i) => 
                            `L${i * 10},${10 + (Math.random() * 10 - 5)}`
                          ).join(' ')}`}
                        />
                      </svg>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* User Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">User Acquisition</h3>
          
          {/* User Acquisition Chart placeholder */}
          <div className="h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p>User acquisition chart</p>
              <p className="text-sm">New users over time</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">User Engagement</h3>
          
          {/* User Engagement Chart placeholder */}
          <div className="h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>User engagement metrics</p>
              <p className="text-sm">Session duration, page views, etc.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Implementation Note */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
        <h3 className="text-blue-800 font-medium">Implementation Note</h3>
        <p className="text-blue-700 mt-1">
          In a production environment, you should connect this dashboard to real analytics data from your database.
          Consider using a charting library like Chart.js, Recharts, or D3.js for interactive visualizations.
          For real-time updates, WebSockets or polling can be implemented.
        </p>
      </div>
    </div>
  );
} 