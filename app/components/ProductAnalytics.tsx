'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '../utils/calculations';

interface ProductAnalyticsData {
  id: string;
  name: string;
  totalQuantitySold: number;
  averageQuantityPerOrder: number;
  totalRevenue: number;
  averageRevenue: number;
  profitMargin: number;
  saleDate: string;
}

interface ProductAnalyticsProps {
  products: ProductAnalyticsData[];
}

type DateRange = 'last7' | 'last30' | 'ytd' | 'custom';
type OrderCriteria = 'quantity' | 'revenue' | 'margin';

export default function ProductAnalytics({ products }: ProductAnalyticsProps) {
  console.log('[ProductAnalytics] Component rendered with products count:', products.length);
  console.log('[ProductAnalytics] First product:', products.length > 0 ? products[0] : 'No products');

  const [dateRange, setDateRange] = useState<DateRange>('last30');
  const [orderCriteria, setOrderCriteria] = useState<OrderCriteria>('revenue');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  // Initial processing (without filtering) - replacement for useEffect and filteredProducts state
  console.log('[ProductAnalytics] Initial processing of all products');
  const allProducts = products;
  const sortedProducts = [...allProducts].sort((a, b) => {
    switch (orderCriteria) {
      case 'quantity':
        return b.averageQuantityPerOrder - a.averageQuantityPerOrder;
      case 'revenue':
        return b.averageRevenue - a.averageRevenue;
      case 'margin':
        return b.profitMargin - a.profitMargin;
      default:
        return 0;
    }
  });
  
  const top5Products = sortedProducts.slice(0, Math.min(5, sortedProducts.length));
  const bottom5Products = sortedProducts.slice(-Math.min(5, sortedProducts.length)).reverse();
  
  console.log('[ProductAnalytics] Products count:', products.length);
  console.log('[ProductAnalytics] Top 5 products:', top5Products);
  
  // Filter products by date range - function preserved for later use
  const getFilteredProducts = () => {
    console.log('[ProductAnalytics] Filtering products by date range:', dateRange);
    console.log('[ProductAnalytics] Products before filtering:', products);
    
    if (products.length === 0) {
      return [];
    }

    try {
      const now = new Date();
      let startDate: Date;
      let endDate = now;

      switch (dateRange) {
        case 'last7':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'last30':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
          break;
        case 'ytd':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'custom':
          startDate = customStartDate ? new Date(customStartDate) : new Date('2000-01-01');
          endDate = customEndDate ? new Date(customEndDate) : now;
          break;
        default:
          // Default to a date way in the past to show all data
          startDate = new Date('2000-01-01');
      }
      
      console.log('[ProductAnalytics] Filter dates:', { 
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString() 
      });

      // Initially just return all products to debug
      if (dateRange === 'last30') {
        console.log('[ProductAnalytics] Temporarily disabling date filtering to debug');
        return products;
      }

      const filtered = products.filter(product => {
        try {
          const saleDate = new Date(product.saleDate);
          console.log(`[ProductAnalytics] Checking product date: ${product.name}, date: ${product.saleDate}, parsed: ${saleDate.toISOString()}`);
          return saleDate >= startDate && saleDate <= endDate;
        } catch (e) {
          console.error('[ProductAnalytics] Error parsing date for product:', product);
          return true; // Include products with invalid dates for now
        }
      });

      console.log(`[ProductAnalytics] Filtered from ${products.length} to ${filtered.length} products`);
      return filtered;
    } catch (e) {
      console.error('[ProductAnalytics] Error in getFilteredProducts:', e);
      return products; // Return all products on error
    }
  };

  const formatTooltipValue = (value: number, metric: OrderCriteria) => {
    switch (metric) {
      case 'revenue':
        return formatCurrency(value);
      case 'margin':
        return `${value.toFixed(1)}%`;
      default:
        return `${value.toFixed(1)} units`;
    }
  };

  const getMetricKey = (criteria: OrderCriteria) => {
    switch (criteria) {
      case 'quantity':
        return 'averageQuantityPerOrder';
      case 'revenue':
        return 'averageRevenue';
      case 'margin':
        return 'profitMargin';
    }
  };

  const getMetricName = (criteria: OrderCriteria) => {
    switch (criteria) {
      case 'quantity':
        return 'Avg Quantity/Order';
      case 'revenue':
        return 'Avg Revenue';
      case 'margin':
        return 'Profit Margin';
    }
  };

  if (products.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>No product data available. Please add products or orders to view analytics.</p>
        <p className="mt-2 text-xs">Debug info: Received {products.length} products</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Date Range Filter */}
          <div className="space-y-2">
            <h4 className="text-xs sm:text-sm font-medium text-gray-900">Date Range</h4>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <button
                onClick={() => setDateRange('last7')}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${
                  dateRange === 'last7'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setDateRange('last30')}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${
                  dateRange === 'last30'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setDateRange('ytd')}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${
                  dateRange === 'ytd'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Year to Date
              </button>
              <button
                onClick={() => setDateRange('custom')}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${
                  dateRange === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Custom
              </button>
            </div>
            {dateRange === 'custom' && (
              <div className="flex gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs text-gray-700">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-700">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs sm:text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Order Criteria Filter */}
          <div className="space-y-2">
            <h4 className="text-xs sm:text-sm font-medium text-gray-900">Sort By</h4>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <button
                onClick={() => setOrderCriteria('quantity')}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${
                  orderCriteria === 'quantity'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Quantity
              </button>
              <button
                onClick={() => setOrderCriteria('revenue')}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${
                  orderCriteria === 'revenue'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Revenue
              </button>
              <button
                onClick={() => setOrderCriteria('margin')}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${
                  orderCriteria === 'margin'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Profit Margin
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Charts Section */}
        {top5Products.length > 0 ? (
          <>
            {/* Top 5 Products */}
            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Top 5 Products by {getMetricName(orderCriteria)}
              </h4>
              <div className="h-[200px] sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={top5Products}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => formatTooltipValue(value, orderCriteria)} />
                    <YAxis 
                      dataKey="name" 
                      type="category"
                      width={75}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
                    />
                    <Tooltip 
                      formatter={(value, name) => [formatTooltipValue(Number(value), orderCriteria), getMetricName(orderCriteria)]}
                      labelFormatter={(label) => `Product: ${label}`}
                    />
                    <Legend />
                    <Bar 
                      dataKey={getMetricKey(orderCriteria)} 
                      fill="#4F46E5" 
                      name={getMetricName(orderCriteria)} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom 5 Products */}
            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Bottom 5 Products by {getMetricName(orderCriteria)}
              </h4>
              <div className="h-[200px] sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={bottom5Products}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => formatTooltipValue(value, orderCriteria)} />
                    <YAxis 
                      dataKey="name" 
                      type="category"
                      width={75}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
                    />
                    <Tooltip 
                      formatter={(value, name) => [formatTooltipValue(Number(value), orderCriteria), getMetricName(orderCriteria)]}
                      labelFormatter={(label) => `Product: ${label}`}
                    />
                    <Legend />
                    <Bar 
                      dataKey={getMetricKey(orderCriteria)} 
                      fill="#EF4444" 
                      name={getMetricName(orderCriteria)} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <div className="col-span-2 bg-white rounded-lg shadow p-6 text-center text-gray-500">
            No product data available for the selected date range.
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <h4 className="p-4 text-sm font-medium text-gray-900 border-b">Product Details</h4>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Qty</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Qty/Order</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Revenue</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit Margin</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Last Sale</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {allProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-sm text-gray-500">No products found for the selected filters.</td>
              </tr>
            ) : (
              allProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-500">{product.totalQuantitySold}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-500">{product.averageQuantityPerOrder.toFixed(1)}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(product.totalRevenue)}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(product.averageRevenue)}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-medium text-green-600">{product.profitMargin.toFixed(1)}%</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-500">{new Date(product.saleDate).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 