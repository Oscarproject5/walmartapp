'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { formatCurrency } from '../utils/calculations';

interface InventoryDetailedOverviewProps {
  className?: string;
  refresh?: number;
}

export default function InventoryDetailedOverview({ className = '', refresh = 0 }: InventoryDetailedOverviewProps) {
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    totalQuantity: 0,
    totalValue: 0,
    activeItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    soldStockValue: 0
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
    console.log(`InventoryDetailedOverview: Refreshing metrics (refresh counter: ${refresh})`);
    if (userId) {
      fetchInventoryMetrics();
    }
  }, [refresh, userId]);

  async function fetchInventoryMetrics() {
    try {
      setIsLoading(true);
      console.log('InventoryDetailedOverview: Fetching metrics from the database...');
      console.log(`InventoryDetailedOverview: Using user_id: ${userId}`);
      
      // Fetch products for the current user
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      if (products) {
        console.log(`InventoryDetailedOverview: Retrieved ${products.length} products from database`);
        
        // Calculate metrics
        const totalProducts = products.length;
        const totalQuantity = products.reduce((sum, product) => sum + (product.quantity || 0), 0);
        const totalValue = products.reduce((sum, product) => 
          sum + (product.stock_value || (product.quantity * product.cost_per_item)), 0);
        
        // Get sold stock value from database, fall back to calculation if necessary
        const soldStockValue = products.reduce((sum, product) => 
          sum + (product.sold_stock_value || ((product.sales_qty || 0) * product.cost_per_item)), 0);
        
        // Count by status
        const activeItems = products.filter(p => p.status === 'active' || !p.status).length;
        const lowStockItems = products.filter(p => p.status === 'low_stock').length;
        const outOfStockItems = products.filter(p => p.status === 'out_of_stock').length;
        
        const newMetrics = {
          totalProducts,
          totalQuantity,
          totalValue,
          activeItems,
          lowStockItems,
          outOfStockItems,
          soldStockValue
        };
        
        console.log('InventoryDetailedOverview: Updated metrics:', newMetrics);
        setMetrics(newMetrics);
      }
    } catch (error) {
      console.error('Error fetching inventory metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-white rounded shadow-sm">
          <div className="grid grid-cols-6 gap-1 p-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-1">
                <div className="h-2 bg-slate-200 rounded w-1/2 mb-1"></div>
                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="grid grid-cols-6 md:grid-cols-7 gap-2 p-2">
          <MetricCard 
            title="Total Products" 
            value={metrics.totalProducts.toString()} 
            color="blue"
            icon="cube"
          />
          <MetricCard 
            title="Total Quantity" 
            value={metrics.totalQuantity.toString()} 
            color="indigo"
            icon="stack"
          />
          <MetricCard 
            title="Total Value" 
            value={formatCurrency(metrics.totalValue)} 
            color="purple"
            icon="dollar"
          />
          <MetricCard 
            title="Sold Value" 
            value={formatCurrency(metrics.soldStockValue)} 
            color="emerald"
            icon="chart"
          />
          <MetricCard 
            title="Active Items" 
            value={metrics.activeItems.toString()} 
            color="teal"
            icon="check"
          />
          <MetricCard 
            title="Low Stock" 
            value={metrics.lowStockItems.toString()} 
            color="amber"
            icon="warning"
          />
          <MetricCard 
            title="Out of Stock" 
            value={metrics.outOfStockItems.toString()} 
            color="red"
            icon="x"
          />
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  color: 'blue' | 'indigo' | 'purple' | 'teal' | 'amber' | 'red' | 'emerald';
  icon: 'cube' | 'stack' | 'dollar' | 'check' | 'warning' | 'x' | 'chart';
}

function MetricCard({ title, value, color, icon }: MetricCardProps) {
  const colorClasses = {
    blue: 'border-blue-300 text-blue-700 bg-blue-50',
    indigo: 'border-indigo-300 text-indigo-700 bg-indigo-50',
    purple: 'border-purple-300 text-purple-700 bg-purple-50',
    teal: 'border-teal-300 text-teal-700 bg-teal-50',
    amber: 'border-amber-300 text-amber-700 bg-amber-50',
    red: 'border-red-300 text-red-700 bg-red-50',
    emerald: 'border-emerald-300 text-emerald-700 bg-emerald-50'
  };

  const renderIcon = () => {
    switch (icon) {
      case 'cube':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'stack':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'dollar':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'check':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'x':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'chart':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`py-2 px-3 rounded-lg shadow-sm border ${colorClasses[color]}`}>
      <div className="flex items-center gap-1 mb-1">
        <div className="w-4 h-4 flex items-center justify-center">
          {renderIcon()}
        </div>
        <p className="text-xs font-medium">{title}</p>
      </div>
      <p className="text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
} 