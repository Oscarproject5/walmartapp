'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { formatCurrency } from '../utils/calculations';
import Link from 'next/link';

interface ProductPerformanceSummaryProps {
  className?: string;
  refresh?: number;
}

interface Product {
  id: string;
  name: string;
  quantity: number;
  cost_per_item: number;
  sales_qty?: number;
  per_qty_price?: number;
  status: string;
  salesRate?: number;
  salesValue?: number;
}

interface ProductMetrics {
  totalProducts: number;
  activeProducts: number;
  topPerforming: Product[];
  underPerforming: Product[];
  totalSalesValue: number;
  averageSalesRate: number;
  totalUnitsSold: number;
}

export default function ProductPerformanceSummary({ className = '', refresh = 0 }: ProductPerformanceSummaryProps) {
  const [metrics, setMetrics] = useState<ProductMetrics>({
    totalProducts: 0,
    activeProducts: 0,
    topPerforming: [] as Product[],
    underPerforming: [] as Product[],
    totalSalesValue: 0,
    averageSalesRate: 0,
    totalUnitsSold: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
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
  }, []);

  useEffect(() => {
    if (userId) {
      console.log('ProductPerformanceSummary: User ID available, fetching data...');
      fetchPerformanceData();
    }
  }, [refresh, userId]);

  async function fetchPerformanceData() {
    try {
      setIsLoading(true);
      console.log('ProductPerformanceSummary: Fetching product data from database...');
      
      // Fetch products for the current user
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      if (products && products.length > 0) {
        console.log(`ProductPerformanceSummary: Retrieved ${products.length} products from database`);
        
        // Calculate performance metrics
        const totalProducts = products.length;
        const activeProducts = products.filter(p => p.status === 'active').length;
        
        // Calculate total units sold (not sales value)
        const totalUnitsSold = products.reduce((sum, product) => 
          sum + (product.sales_qty || 0), 0);
        
        // Calculate total sales value (revenue)
        const totalSalesValue = products.reduce((sum, product) => 
          sum + ((product.sales_qty || 0) * (product.per_qty_price || product.cost_per_item || 0)), 0);
        
        // Calculate average sales rate (items sold per product)
        const averageSalesRate = totalProducts > 0 ? Math.round((totalUnitsSold / totalProducts) * 100) / 100 : 0;
        
        // Find top and under performing products
        const productsWithSales = products
          .filter(p => p.quantity > 0 || (p.sales_qty && p.sales_qty > 0))
          .map(p => ({
            ...p,
            salesRate: p.quantity > 0 ? (p.sales_qty || 0) / p.quantity : 0,
            salesValue: (p.sales_qty || 0) * (p.per_qty_price || p.cost_per_item || 0)
          }));
        
        // Sort by sales value (higher is better) for top performers
        const sortedBySalesValue = [...productsWithSales]
          .filter(p => (p.salesValue || 0) > 0)
          .sort((a, b) => (b.salesValue || 0) - (a.salesValue || 0));
        
        // Get top 5 performing products
        const topPerforming = sortedBySalesValue.slice(0, 5);
        
        // Get bottom 5 performing products (with sales > 0, sorted by lowest sales rate)
        const withSales = productsWithSales.filter(p => (p.sales_qty || 0) > 0);
        const underPerforming = [...withSales]
          .sort((a, b) => {
            const rateA = a.salesRate || 0;
            const rateB = b.salesRate || 0;
            return rateA - rateB;
          })
          .slice(0, 5);
        
        setMetrics({
          totalProducts,
          activeProducts,
          topPerforming,
          underPerforming,
          totalSalesValue,
          averageSalesRate,
          totalUnitsSold
        });
      } else {
        console.log('ProductPerformanceSummary: No products found for user');
        setMetrics({
          totalProducts: 0,
          activeProducts: 0,
          topPerforming: [],
          underPerforming: [],
          totalSalesValue: 0,
          averageSalesRate: 0,
          totalUnitsSold: 0
        });
      }
    } catch (error) {
      console.error('Error fetching product performance data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (metrics.totalProducts === 0) {
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
            <span className="font-medium">{metrics.totalProducts}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Total Units Sold</span>
            <span className="font-medium">{Math.round(metrics.totalUnitsSold)}</span>
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
            {metrics.topPerforming.map((product, index) => (
              <li key={index} className="px-4 py-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-800 truncate max-w-[180px]" title={product.name}>
                    {product.name}
                  </span>
                  <span className="text-sm font-medium text-slate-800">{formatCurrency(Number(product.salesValue || 0))}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-slate-500">Sales Rate</span>
                  <span className={`text-xs ${(product.salesRate || 0) >= 0.5 ? 'text-green-600' : (product.salesRate || 0) >= 0.25 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {(product.salesRate || 0).toFixed(2)}
                  </span>
                </div>
              </li>
            ))}
            {metrics.topPerforming.length === 0 && (
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
            {metrics.underPerforming.map((product, index) => (
              <li key={index} className="px-4 py-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-800 truncate max-w-[180px]" title={product.name}>
                    {product.name}
                  </span>
                  <span className="text-xs text-red-600 font-medium">{(product.salesRate || 0).toFixed(2)} sales rate</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-slate-500">Sales Value</span>
                  <span className="text-xs text-slate-700">{formatCurrency(Number(product.salesValue || 0))}</span>
                </div>
              </li>
            ))}
            {metrics.underPerforming.length === 0 && (
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