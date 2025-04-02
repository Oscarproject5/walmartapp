'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/calculations';
import Link from 'next/link';

interface ProductSummary {
  totalProducts: number;
  totalSold: number;
  topPerformers: {
    name: string;
    totalRevenue: number;
    profitMargin: number;
  }[];
  lowPerformers: {
    name: string;
    totalRevenue: number;
    profitMargin: number;
  }[];
}

export default function ProductPerformanceSummary() {
  const [summary, setSummary] = useState<ProductSummary>({
    totalProducts: 0,
    totalSold: 0,
    topPerformers: [],
    lowPerformers: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProductSummary();
  }, []);

  const fetchProductSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch order data from the database
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*');

      if (orderError) throw orderError;

      if (!orderData || orderData.length === 0) {
        setIsLoading(false);
        return;
      }

      // Create a map to hold product performance data
      const productMap = new Map();
      
      // Process order data
      orderData.forEach(order => {
        const sku = order.sku;
        if (!sku) return;
        
        const existingProduct = productMap.get(sku);
        
        if (existingProduct) {
          // Update existing product data
          existingProduct.totalQuantity += Number(order.order_quantity) || 0;
          existingProduct.totalRevenue += Number(order.total_revenue) || 0;
          existingProduct.totalProfit += Number(order.net_profit) || 0;
        } else {
          // Create new product entry
          productMap.set(sku, {
            sku,
            name: order.product_name || sku,
            totalQuantity: Number(order.order_quantity) || 0,
            totalRevenue: Number(order.total_revenue) || 0,
            totalProfit: Number(order.net_profit) || 0,
            profitMargin: 0, // Will calculate below
          });
        }
      });
      
      // Calculate profit margins and convert to array
      const productsArray = Array.from(productMap.values()).map(product => {
        // Calculate profit margin as percentage
        product.profitMargin = product.totalRevenue > 0 ? 
          (product.totalProfit / product.totalRevenue) * 100 : 0;
        return product;
      });
      
      // Sort by total revenue (descending) for top performers
      const byRevenue = [...productsArray].sort((a, b) => b.totalRevenue - a.totalRevenue);
      
      // Sort by profit margin (descending) for top performers by margin
      const byMargin = [...productsArray].sort((a, b) => b.profitMargin - a.profitMargin);
      
      // Create summary
      const summaryData = {
        totalProducts: productsArray.length,
        totalSold: productsArray.reduce((sum, product) => sum + product.totalQuantity, 0),
        topPerformers: byRevenue.slice(0, 3).map(p => ({
          name: p.name,
          totalRevenue: p.totalRevenue,
          profitMargin: p.profitMargin
        })),
        lowPerformers: byMargin.slice(-3).sort((a, b) => a.profitMargin - b.profitMargin).map(p => ({
          name: p.name,
          totalRevenue: p.totalRevenue,
          profitMargin: p.profitMargin
        }))
      };
      
      setSummary(summaryData);
    } catch (err) {
      console.error('Error fetching product summary:', err);
      setError('Could not load product performance data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 bg-white/60 rounded-lg shadow-sm">
        <p className="font-medium text-red-600">{error}</p>
      </div>
    );
  }

  if (summary.totalProducts === 0) {
    return (
      <div className="text-center py-8 bg-white/60 rounded-lg shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="font-medium text-slate-700">No product data available</p>
        <p className="text-sm mt-1 text-slate-500">Start selling products to see performance data.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-md font-semibold text-slate-800 mb-2">Overview</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-600">Total Products</span>
            <span className="font-medium">{summary.totalProducts}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Total Units Sold</span>
            <span className="font-medium">{summary.totalSold}</span>
          </div>
        </div>
        
        <Link href="/product-performance" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
          <h3 className="text-md font-semibold text-slate-800 mb-2 flex justify-between">
            <span>Performance Details</span>
            <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </h3>
          <p className="text-sm text-slate-600">View detailed performance metrics for all products</p>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-green-50 px-4 py-2 border-b border-green-100">
            <h3 className="text-sm font-medium text-green-800">Top Revenue Performers</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {summary.topPerformers.map((product, index) => (
              <li key={index} className="px-4 py-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-800 truncate max-w-[180px]" title={product.name}>
                    {product.name}
                  </span>
                  <span className="text-sm font-medium text-slate-800">{formatCurrency(product.totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-slate-500">Profit Margin</span>
                  <span className={`text-xs ${product.profitMargin >= 20 ? 'text-green-600' : product.profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {product.profitMargin.toFixed(1)}%
                  </span>
                </div>
              </li>
            ))}
            {summary.topPerformers.length === 0 && (
              <li className="px-4 py-3 text-center text-sm text-slate-500">
                No data available
              </li>
            )}
          </ul>
        </div>
        
        {/* Low Performers */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-100">
            <h3 className="text-sm font-medium text-yellow-800">Products Needing Attention</h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {summary.lowPerformers.map((product, index) => (
              <li key={index} className="px-4 py-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-800 truncate max-w-[180px]" title={product.name}>
                    {product.name}
                  </span>
                  <span className="text-xs text-red-600 font-medium">{product.profitMargin.toFixed(1)}% margin</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-slate-500">Revenue</span>
                  <span className="text-xs text-slate-700">{formatCurrency(product.totalRevenue)}</span>
                </div>
              </li>
            ))}
            {summary.lowPerformers.length === 0 && (
              <li className="px-4 py-3 text-center text-sm text-slate-500">
                No data available
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
} 