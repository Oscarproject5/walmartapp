'use client';

import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import ProfitCalculator from './components/ProfitCalculator';
import CanceledOrdersStats from './components/CanceledOrdersStats';
import ProfitReports from './components/ProfitReports';
import ProductPerformanceSummary from './components/ProductPerformanceSummary';
import InventoryManagement from './components/InventoryManagement';
import { calculateProfitBreakdown, ProfitBreakdown, Sale, CanceledOrder, formatCurrency } from './utils/calculations';
import { processSalesData, aggregateMonthlyData } from './utils/reports';

// Replace all sample data arrays with empty arrays
const SAMPLE_SALES: Sale[] = [];
const SAMPLE_PRODUCTS: Product[] = [];
const SAMPLE_CANCELED_ORDERS: CanceledOrder[] = [];
const SAMPLE_SETTINGS = {
  shipping_base_cost: 599,
  label_cost: 199,
  cancellation_shipping_loss: 799,
  minimum_profit_margin: 15,
  auto_reorder_enabled: false,
  auto_price_adjustment_enabled: false
};

// Add the Product type definition
interface Product {
  id: string;
  name: string;
  quantity: number;
  cost_per_item: number;
  purchase_date: string;
  source: string;
  created_at: string;
}

export default function Dashboard() {
  const [profitBreakdown, setProfitBreakdown] = useState<ProfitBreakdown | null>(null);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [inventorySummary, setInventorySummary] = useState({
    totalProducts: 0,
    totalQuantity: 0,
    totalValue: 0
  });

  // Update the fetchDashboardData function to not use sample data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      let salesData = [];
      let productsData = [];
      let canceledData = [];
      let settings = SAMPLE_SETTINGS;

      // Get sales data
      const { data: salesResult, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .order('sale_date', { ascending: false });

      if (salesError) throw salesError;
      
      // Get products data
      const { data: productsResult, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;
      
      // Get canceled orders data
      const { data: canceledResult, error: canceledError } = await supabase
        .from('canceled_orders')
        .select('*')
        .order('cancellation_date', { ascending: false });

      if (canceledError) throw canceledError;
      
      // Get settings data
      const { data: settingsData, error: settingsError } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1);

      if (settingsError) throw settingsError;
      
      // Use actual data or empty arrays
      salesData = salesResult || [];
      productsData = productsResult || [];
      canceledData = canceledResult || [];
      settings = settingsData && settingsData.length > 0 ? settingsData[0] : SAMPLE_SETTINGS;
      
      // Avoid using sample data
      setUsingSampleData(false);
      
      return { salesData, productsData, canceledData, settings };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // Return empty data instead of sample data
      setUsingSampleData(false);
      return { 
        salesData: [], 
        productsData: [], 
        canceledData: [], 
        settings: SAMPLE_SETTINGS 
      };
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setIsLoading(true);
        setError(null);

        let salesData, productsData, canceledData, settings;
        let useBackupData = false;

        try {
          // Fetch sales data
          const { data, error: salesError } = await supabase
            .from('sales')
            .select('*')
            .order('sale_date', { ascending: true });

          if (salesError) throw salesError;
          salesData = data || [];

          // Fetch products data
          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*');

          if (productsError) throw productsError;
          productsData = products || [];

          // Fetch canceled orders
          const { data: canceled, error: canceledError } = await supabase
            .from('canceled_orders')
            .select('*');

          if (canceledError) throw canceledError;
          canceledData = canceled || [];

          // Fetch shipping settings
          const { data: settingsData, error: settingsError } = await supabase
            .from('app_settings')
            .select('*')
            .single();

          if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
          settings = settingsData || SAMPLE_SETTINGS;

          // Fetch orders data
          const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .order('order_date', { ascending: true });

          if (ordersError) throw ordersError;
          
          // Convert orders to sales format for the dashboard processing
          const salesFromOrders = (ordersData || []).map(order => ({
            id: order.order_id,
            product_id: order.sku, // Using sku as product reference
            quantity_sold: order.order_quantity,
            sale_price: order.walmart_price_per_unit,
            shipping_fee_per_unit: order.walmart_shipping_fee_per_unit,
            walmart_fee: order.walmart_fee,
            sale_date: order.order_date,
            platform: 'walmart',
            shipping_cost: order.walmart_shipping_fee_per_unit * order.order_quantity, // This is customer shipping fee, not seller cost
            label_cost: 0, // Label cost isn't directly on the order, fulfillment_cost covers it
            cost_per_unit: order.product_cost_per_unit,
            additional_costs: order.fulfillment_cost, // Use the actual fulfillment_cost from the order
            total_revenue: order.total_revenue,
            net_profit: order.net_profit,
            profit_margin: order.roi,
            status: order.status === 'active' ? 'active' : 'canceled_before_shipping',
            order_number: order.order_id // Ensure order_number is available for grouping
          }));
          
          // Use orders data if sales table is empty
          if (salesData.length === 0 && ordersData && ordersData.length > 0) {
            console.log(`Using ${ordersData.length} orders as sales data`);
            salesData = salesFromOrders;
          }
          
        } catch (dbError) {
          console.warn('Database connection failed, using sample data:', dbError);
          useBackupData = true;
          setUsingSampleData(true);
        }

        // If database connection failed, use sample data
        if (useBackupData) {
          salesData = SAMPLE_SALES;
          productsData = SAMPLE_PRODUCTS;
          canceledData = SAMPLE_CANCELED_ORDERS;
          settings = SAMPLE_SETTINGS;
        }

        // Process sales data for reports
        const sales = salesData as Sale[];
        const canceledOrders = canceledData as CanceledOrder[];
        
        // Calculate daily data and totals
        const { data: daily, totals: reportTotals } = processSalesData(sales, canceledOrders, 'daily');
        const monthly = aggregateMonthlyData(daily);

        // Calculate current profit breakdown
        const breakdown = calculateProfitBreakdown(sales);

        // Calculate inventory summary
        if (Array.isArray(productsData) && productsData.length > 0) {
          const totalQuantity = productsData.reduce((sum, product) => sum + (product.quantity || 0), 0);
          const totalValue = productsData.reduce((sum, product) => 
            sum + ((product.quantity || 0) * (product.cost_per_item || 0)), 0);
            
          setInventorySummary({
            totalProducts: productsData.length,
            totalQuantity,
            totalValue
          });
        }

        setDailyData(daily || []);
        setMonthlyData(monthly || []);
        setTotals(reportTotals || {
          totalRevenue: 0,
          totalProfit: 0,
          totalLosses: 0,
          netProfit: 0,
          totalOrders: 0,
          profitMargin: 0
        });
        setProfitBreakdown(breakdown || null);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        
        // Set default values for all state variables to prevent undefined errors
        setDailyData([]);
        setMonthlyData([]);
        setTotals({
          totalRevenue: 0,
          totalProfit: 0,
          totalLosses: 0,
          netProfit: 0,
          totalOrders: 0,
          profitMargin: 0
        });
        setProfitBreakdown(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-7xl">
      {/* Notification Banners */}
      {usingSampleData && (
        <div className="mb-4 rounded-lg bg-yellow-50/50 backdrop-blur-sm border-l-4 border-yellow-400 p-3 shadow-sm">
          <p className="text-yellow-700 text-sm">
            <strong>Note:</strong> Using sample data for development. Connect to a real database for production use.
          </p>
        </div>
      )}
      
      {error && (
        <div className="mb-4 rounded-lg bg-red-50/50 backdrop-blur-sm border-l-4 border-red-400 p-3 shadow-sm">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      
      {/* Financial Performance Section */}
      {totals && Object.keys(totals).length > 0 && (
        <section className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-slate-800">Financial Performance</h2>
            <a href="/analytics" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View full reports</a>
          </div>
          <p className="text-sm text-slate-600 mb-4">Monitor your daily and monthly revenue, profit, and loss trends.</p>
          
          <ProfitReports
            dailyData={dailyData || []}
            monthlyData={monthlyData || []}
            totals={totals}
          />
        </section>
      )}
      
      {/* Dashboard Overview Section */}
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Business Performance at a Glance</h2>
          <p className="text-sm text-slate-600 mb-4">Key metrics from your business to help you make informed decisions.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Revenue & Profit Card */}
            <a href="/analytics" className="card hover:translate-y-[-2px] transition-all duration-300 bg-gradient-to-br from-primary-50 to-white">
              <div className="card-header border-b border-primary-100">
                <h2 className="card-title flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Financial Overview
                </h2>
              </div>
              <div className="card-content space-y-2">
                <div className="flex justify-between items-center">
                  <span className="stat-label">Total Revenue</span>
                  <span className="stat-value text-lg">{formatCurrency(totals?.totalRevenue || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="stat-label">Total Profit</span>
                  <span className="stat-value text-lg text-secondary-600">{formatCurrency(totals?.totalProfit || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="stat-label">Profit Margin</span>
                  <span className="stat-value text-lg text-accent-600">{(totals?.profitMargin || 0).toFixed(2)}%</span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200">
                  <span className="text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center text-sm transition-colors">
                    View Detailed Analytics
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </span>
                </div>
              </div>
            </a>
            
            {/* Inventory Overview Card */}
            <a href="/inventory" className="card hover:translate-y-[-2px] transition-all duration-300 bg-gradient-to-br from-secondary-50 to-white">
              <div className="card-header border-b border-secondary-100">
                <h2 className="card-title flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-secondary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Inventory Status
                </h2>
              </div>
              <div className="card-content space-y-2">
                <div className="flex justify-between items-center">
                  <span className="stat-label">Total Products</span>
                  <span className="stat-value text-lg">{inventorySummary?.totalProducts || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="stat-label">Total Quantity</span>
                  <span className="stat-value text-lg">{inventorySummary?.totalQuantity || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="stat-label">Total Value</span>
                  <span className="stat-value text-lg text-secondary-600">
                    {formatCurrency(inventorySummary?.totalValue || 0)}
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200">
                  <span className="text-secondary-600 hover:text-secondary-700 font-medium flex items-center justify-center text-sm transition-colors">
                    Manage Inventory
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </span>
                </div>
              </div>
            </a>
            
            {/* Orders Quick View */}
            <a href="/orders" className="card hover:translate-y-[-2px] transition-all duration-300 bg-gradient-to-br from-accent-50 to-white">
              <div className="card-header border-b border-accent-100">
                <h2 className="card-title flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Order Summary
                </h2>
              </div>
              <div className="card-content space-y-2">
                <div className="flex justify-between items-center">
                  <span className="stat-label">Total Orders</span>
                  <span className="stat-value text-lg">{totals?.totalOrders || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="stat-label">Recent Orders</span>
                  <span className="stat-value text-lg">{Array.isArray(dailyData) && dailyData.length ? dailyData[dailyData.length - 1]?.orders || 0 : 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="stat-label">Pending Shipments</span>
                  <span className="stat-value text-lg">0</span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200">
                  <span className="text-accent-600 hover:text-accent-700 font-medium flex items-center justify-center text-sm transition-colors">
                    View Orders
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </span>
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Product Performance Section */}
      <section className="bg-gradient-to-r from-slate-50 to-blue-50/30 p-4 sm:p-6 rounded-xl mb-8 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-slate-800">Product Performance</h2>
          <a href="/product-performance" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View details</a>
        </div>
        <p className="text-sm text-slate-600 mb-4">Identify your top and bottom performing products. Use this data to optimize your inventory and focus on profitable items.</p>
        
        <ProductPerformanceSummary />
      </section>

      {/* Operations Management Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Inventory Management Section - UPDATED */}
        <section>
          <div className="mb-2">
            <h2 className="text-xl font-bold text-slate-800">Inventory Management</h2>
            <p className="text-sm text-slate-600 mb-4">Monitor your inventory health and manage your products efficiently.</p>
          </div>
          <InventoryManagement limit={5} />
        </section>

        {/* Profit Analysis */}
        <section>
          <div className="mb-2">
            <h2 className="text-xl font-bold text-slate-800">Profit Analysis</h2>
            <p className="text-sm text-slate-600 mb-4">Understand your profit breakdown and identify areas for improvement.</p>
          </div>
          {profitBreakdown ? (
            <ProfitCalculator breakdown={profitBreakdown} />
          ) : (
            <div className="text-center py-8 bg-white rounded-lg shadow-sm border border-slate-100">
              <p className="font-medium text-slate-700">No profit data available</p>
              <p className="text-sm mt-1 text-slate-500">Complete sales to see profit analysis.</p>
            </div>
          )}
        </section>
      </div>
      
      {/* Risk Management Section */}
      <section className="mb-4">
        <div className="mb-2">
          <h2 className="text-xl font-bold text-slate-800">Risk Management</h2>
          <p className="text-sm text-slate-600 mb-4">Monitor canceled orders and potential losses to minimize financial impact.</p>
        </div>
        <CanceledOrdersStats />
      </section>
    </div>
  );
} 