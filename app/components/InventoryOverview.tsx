'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { formatCurrency } from '../utils/calculations';
import logger from '../utils/logger';

interface InventoryOverviewProps {
  className?: string;
}

export default function InventoryOverview({ className = '' }: InventoryOverviewProps) {
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    activeItems: 0,
    totalSuppliers: 0
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
      logger.info('InventoryOverview: User ID available, fetching data...');
      fetchInventoryMetrics();
    }
  }, [userId]);

  async function fetchInventoryMetrics() {
    try {
      setIsLoading(true);
      
      // Fetch products for the current user
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      if (products) {
        logger.info(`InventoryOverview: Retrieved ${products.length} products from database`);
        
        // Calculate metrics
        const totalProducts = products.length;
        const totalValue = products.reduce((sum, product) => 
          sum + (product.stock_value || (product.quantity * product.cost_per_item)), 0);
          
        // Count by status
        const lowStockItems = products.filter(p => p.status === 'low_stock').length;
        const outOfStockItems = products.filter(p => p.status === 'out_of_stock').length;
        const activeItems = products.filter(p => p.status === 'active' || !p.status).length;
        
        // Count unique suppliers
        const suppliers = new Set();
        products.forEach(p => {
          suppliers.add(p.supplier || p.source);
        });
        
        setMetrics({
          totalProducts,
          totalValue,
          lowStockItems,
          outOfStockItems,
          activeItems,
          totalSuppliers: suppliers.size
        });
      } else {
        // Reset metrics if no products found
        setMetrics({
          totalProducts: 0,
          totalValue: 0,
          lowStockItems: 0,
          outOfStockItems: 0,
          activeItems: 0,
          totalSuppliers: 0
        });
      }
    } catch (error) {
      logger.error('Error fetching inventory metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
              <div className="h-6 bg-slate-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard 
          title="Total Products" 
          value={metrics.totalProducts.toString()} 
          icon="box" 
          color="blue"
        />
        <MetricCard 
          title="Inventory Value" 
          value={formatCurrency(metrics.totalValue)} 
          icon="dollar" 
          color="green"
        />
        <MetricCard 
          title="Active Items" 
          value={metrics.activeItems.toString()} 
          icon="check" 
          color="green"
        />
        <MetricCard 
          title="Low Stock" 
          value={metrics.lowStockItems.toString()} 
          icon="alert" 
          color="orange"
        />
        <MetricCard 
          title="Out of Stock" 
          value={metrics.outOfStockItems.toString()} 
          icon="x" 
          color="red"
        />
        <MetricCard 
          title="Suppliers" 
          value={metrics.totalSuppliers.toString()} 
          icon="truck" 
          color="purple"
        />
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: 'box' | 'dollar' | 'check' | 'alert' | 'x' | 'truck';
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple';
}

function MetricCard({ title, value, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700'
  };

  const renderIcon = () => {
    switch (icon) {
      case 'box':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
          </svg>
        );
      case 'dollar':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      case 'check':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      case 'alert':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        );
      case 'x':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      case 'truck':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
          </svg>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-2 rounded-full ${colorClasses[color]}`}>
          {renderIcon()}
        </div>
      </div>
    </div>
  );
} 