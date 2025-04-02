'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/calculations';
import AIProductSuggestions from '../components/AIProductSuggestions';
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

// Define proper types for analytics data
interface SalesDataItem {
  month: string;
  revenue: number;
  profit: number;
}

interface PlatformDataItem {
  platform: string;
  orders: number;
  revenue: number;
  profit: number;
}

// Define type for product data, now including trend fields
interface ProductPerformanceData {
  id: string;
  name: string;
  sku: string;
  quantity_sold: number; // Current period
  order_count: number;   // Current period
  total_revenue: number; // Current period
  total_profit: number;  // Current period
  last_sale_date: string;
  avg_quantity_per_order: number; // Current period
  avg_revenue: number;   // Current period
  profit_margin: number; // Current period
  // Optional trend data
  profit_margin_trend?: number; // Percentage change from previous period
  quantity_trend?: number; // Percentage change from previous period
}

// Replace the sample data arrays with empty arrays
const SAMPLE_SALES_DATA: SalesDataItem[] = [];
const SAMPLE_PLATFORM_DATA: PlatformDataItem[] = [];

// Helper function to calculate date ranges for current and previous periods
function getComparisonDateRange(timeRange: 'week' | 'month' | 'quarter' | 'year'): {
  current_start: string;
  current_end: string;
  previous_start: string;
  previous_end: string;
} {
  const now = new Date();
  const current_end_date = new Date(now);
  const current_start_date = new Date(now);
  const previous_end_date = new Date(now);
  const previous_start_date = new Date(now);

  switch (timeRange) {
    case 'week':
      current_start_date.setDate(now.getDate() - 6); // 7 days inclusive
      previous_end_date.setDate(now.getDate() - 7);
      previous_start_date.setDate(now.getDate() - 13);
      break;
    case 'month': // Assuming last 30 days
      current_start_date.setDate(now.getDate() - 29); // 30 days inclusive
      previous_end_date.setDate(now.getDate() - 30);
      previous_start_date.setDate(now.getDate() - 59);
      break;
    case 'quarter': // Assuming last 90 days
      current_start_date.setDate(now.getDate() - 89); // 90 days inclusive
      previous_end_date.setDate(now.getDate() - 90);
      previous_start_date.setDate(now.getDate() - 179);
      break;
    case 'year': // Assuming last 365 days
      current_start_date.setDate(now.getDate() - 364); // 365 days inclusive
      previous_end_date.setDate(now.getDate() - 365);
      previous_start_date.setDate(now.getDate() - 729);
      break;
  }

  const toISODate = (date: Date) => date.toISOString().split('T')[0];

  return {
    current_start: toISODate(current_start_date),
    current_end: toISODate(current_end_date),
    previous_start: toISODate(previous_start_date),
    previous_end: toISODate(previous_end_date),
  };
}

export default function AnalyticsClient() {
  const [salesData, setSalesData] = useState<SalesDataItem[]>([]);
  const [platformData, setPlatformData] = useState<PlatformDataItem[]>([]);
  const [productsData, setProductsData] = useState<ProductPerformanceData[]>([]);
  
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingSampleData, setUsingSampleData] = useState(false);

  // Top level metrics (Consider adding growth metrics from data)
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalOrders: 0,
    averageProfitMargin: 0,
    revenueGrowth: 0, // These could be updated based on comparison
    profitGrowth: 0   // These could be updated based on comparison
  });

  useEffect(() => {
    fetchData();
    // Count check is less critical now, removed for brevity
  }, [timeRange]);

  const fetchData = async () => {
    console.log('[AnalyticsClient] Starting fetchData for timeRange:', timeRange);
    try {
      setIsLoading(true);
      setError(null);

      // Get date ranges for current and previous periods
      const { current_start, current_end, previous_start, previous_end } = getComparisonDateRange(timeRange);
      console.log(`[AnalyticsClient] Fetching orders from ${previous_start} to ${current_end}`);

      // Fetch orders covering both periods - Select only necessary columns
      const { data: fetchedOrdersData, error: ordersError } = await supabase
        .from('orders')
        .select('order_date, total_revenue, net_profit, sku, product_name, order_quantity')
        .gte('order_date', previous_start) // Greater than or equal to start of previous period
        .lte('order_date', current_end)     // Less than or equal to end of current period
        .order('order_date', { ascending: false });
      
      console.log('[AnalyticsClient] Fetched orders data count (both periods):', fetchedOrdersData?.length || 0);
      
      if (ordersError) throw ordersError;
      
      if (!fetchedOrdersData || fetchedOrdersData.length === 0) {
        console.log('[AnalyticsClient] No orders found in the relevant date range.');
        setError('No orders found for the selected or previous period.');
        setUsingSampleData(false);
        setSalesData([]);
        setPlatformData([]);
        setProductsData([]);
        setMetrics({ /* Reset metrics */ 
            totalRevenue: 0, totalProfit: 0, totalOrders: 0, averageProfitMargin: 0,
            revenueGrowth: 0, profitGrowth: 0
        });
        setIsLoading(false);
        return;
      }
      
      // Separate orders into current and previous periods for accurate chart/metric calculation
      const currentPeriodOrders = fetchedOrdersData.filter(order => 
          order.order_date >= current_start && order.order_date <= current_end
      );
      // const previousPeriodOrders = fetchedOrdersData.filter(order => 
      //     order.order_date >= previous_start && order.order_date <= previous_end
      // ); // We'll use this filtering inside processProductData
      
      console.log('[AnalyticsClient] Current period orders count:', currentPeriodOrders.length);

      // Process products data first, including trend analysis
      const productData = processProductData(fetchedOrdersData, current_start, current_end, previous_start, previous_end);
      console.log('[AnalyticsClient] Processed product data with trends count:', productData.length);
      setProductsData(productData);

      // Process data for charts using only CURRENT period data
      console.log('[AnalyticsClient] Processing chart data for current period...');
      const formattedSalesData = processSalesData(currentPeriodOrders); // Pass only current orders
      const formattedPlatformData = processPlatformData(currentPeriodOrders); // Pass only current orders
      console.log('[AnalyticsClient] Processed chart data:', { formattedSalesData, formattedPlatformData });
      
      setSalesData(formattedSalesData);
      setPlatformData(formattedPlatformData);
      
      // Calculate metrics using only CURRENT period data
      const totalRevenue = currentPeriodOrders.reduce((sum, item) => sum + (Number(item.total_revenue) || 0), 0);
      const totalProfit = currentPeriodOrders.reduce((sum, item) => sum + (Number(item.net_profit) || 0), 0);
      const totalOrders = currentPeriodOrders.length;
      
      // --- Optional: Calculate overall growth metrics ---
      const prevRevenue = fetchedOrdersData
        .filter(o => o.order_date >= previous_start && o.order_date <= previous_end)
        .reduce((sum, item) => sum + (Number(item.total_revenue) || 0), 0);
      const prevProfit = fetchedOrdersData
        .filter(o => o.order_date >= previous_start && o.order_date <= previous_end)
        .reduce((sum, item) => sum + (Number(item.net_profit) || 0), 0);
        
      const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? Infinity : 0; // Handle division by zero
        return ((current - previous) / previous) * 100;
      };
      const revenueGrowth = calculateGrowth(totalRevenue, prevRevenue);
      const profitGrowth = calculateGrowth(totalProfit, prevProfit);
      // --- End Optional Growth Metrics --- 
      
      const newMetrics = {
        totalRevenue,
        totalProfit,
        totalOrders,
        averageProfitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        revenueGrowth: isFinite(revenueGrowth) ? revenueGrowth : 0, // Update with calculated growth
        profitGrowth: isFinite(profitGrowth) ? profitGrowth : 0,     // Update with calculated growth
      };
      console.log('[AnalyticsClient] Calculated metrics (current period):', newMetrics);
      setMetrics(newMetrics);

    } catch (err: any) {
      console.error('[AnalyticsClient] Error fetching or processing analytics data:', err);
      setError(`Failed to load analytics data: ${err.message || 'Unknown error'}`);
      // Reset states
      setUsingSampleData(false);
      setSalesData([]);
      setPlatformData([]);
      setProductsData([]);
      setMetrics({ /* Reset metrics */ 
          totalRevenue: 0, totalProfit: 0, totalOrders: 0, averageProfitMargin: 0,
          revenueGrowth: 0, profitGrowth: 0
      });
    } finally {
      console.log('[AnalyticsClient] Setting isLoading to false.');
      setIsLoading(false);
    }
  };

  // getTimeRangeLimit is no longer needed for Supabase query, but might be useful elsewhere
  // const getTimeRangeLimit = () => { ... };

  // Process sales data for time-based charts (expects only current period data)
  const processSalesData = (data: any[]) => {
    console.log('[AnalyticsClient] processSalesData called with data count (current period):', data.length);
    const groupedByDate: Record<string, { revenue: number, profit: number, count: number, label: string }> = {};
    
    data.forEach(order => {
      const date = new Date(order.order_date);
      let key;
      let sortKey = '';
      
      // Adjust grouping logic based on the overall timeRange state if needed 
      // for accurate chart labels (e.g., show days for 'week', days for 'month')
      if (timeRange === 'week' || timeRange === 'month') { 
        const dayNum = date.getDate();
        const monthShort = date.toLocaleDateString('en-US', { month: 'short' });
        key = `${monthShort} ${dayNum}`;
        sortKey = date.toISOString().split('T')[0]; // Use ISO date for sorting
      } else { // quarter, year
        const monthIndex = date.getMonth() + 1; 
        key = date.toLocaleDateString('en-US', { month: 'short' });
        sortKey = `${date.getFullYear()}-${monthIndex < 10 ? '0' + monthIndex : monthIndex}`;
      }
      
      if (!groupedByDate[sortKey]) {
        groupedByDate[sortKey] = { revenue: 0, profit: 0, count: 0, label: key };
      }
      
      groupedByDate[sortKey].revenue += Number(order.total_revenue) || 0;
      groupedByDate[sortKey].profit += Number(order.net_profit) || 0;
      groupedByDate[sortKey].count += 1;
    });
    
    const result = Object.entries(groupedByDate)
      .map(([sortKey, values]) => ({
        sortKey,
        month: values.label, // Use the generated label directly
        revenue: values.revenue,
        profit: values.profit,
        orderCount: values.count
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ sortKey, ...rest }) => rest); 
      
    console.log('[AnalyticsClient] processSalesData result:', result);
    return result as SalesDataItem[]; 
  };

  // Process sales data for platform-based charts (expects only current period data)
  const processPlatformData = (data: any[]) => {
    console.log('[AnalyticsClient] processPlatformData called with data count (current period):', data.length);
    const groupedByPlatform: Record<string, { orders: number, revenue: number, profit: number }> = {};
    const defaultPlatform = 'Walmart';
    data.forEach(order => {
      const platform = defaultPlatform;
      if (!groupedByPlatform[platform]) {
        groupedByPlatform[platform] = { orders: 0, revenue: 0, profit: 0 };
      }
      groupedByPlatform[platform].orders += 1;
      groupedByPlatform[platform].revenue += Number(order.total_revenue) || 0;
      groupedByPlatform[platform].profit += Number(order.net_profit) || 0;
    });
    const result = Object.entries(groupedByPlatform).map(([platform, values]) => ({
      platform,
      orders: values.orders,
      revenue: values.revenue,
      profit: values.profit
    }));
    console.log('[AnalyticsClient] processPlatformData result:', result);
    return result as PlatformDataItem[];
  };

  // Enhanced function to process product data for both periods and calculate trends
  const processProductData = (
    allOrders: any[], 
    current_start: string, 
    current_end: string, 
    previous_start: string, 
    previous_end: string
  ): ProductPerformanceData[] => {
    console.log('[AnalyticsClient] processProductData called for trend analysis.');

    const calculateProductMetrics = (orders: any[]) => {
      const grouped: Record<string, {
        id: string, name: string, sku: string, quantity_sold: number,
        order_count: number, total_revenue: number, total_profit: number,
        last_sale_date: string
      }> = {};

      orders.forEach(order => {
        if (!order.sku) return;
        const sku = order.sku;
        if (!grouped[sku]) {
          grouped[sku] = {
            id: sku, name: order.product_name || sku, sku: sku,
            quantity_sold: 0, order_count: 0, total_revenue: 0, total_profit: 0,
            last_sale_date: order.order_date || ''
          };
        }
        grouped[sku].quantity_sold += Number(order.order_quantity) || 0;
        grouped[sku].order_count += 1;
        grouped[sku].total_revenue += Number(order.total_revenue) || 0;
        grouped[sku].total_profit += Number(order.net_profit) || 0;
        if (order.order_date && (!grouped[sku].last_sale_date || order.order_date > grouped[sku].last_sale_date)) {
          grouped[sku].last_sale_date = order.order_date;
        }
      });
      
      return Object.values(grouped).map(p => ({
        ...p,
        avg_quantity_per_order: p.order_count > 0 ? p.quantity_sold / p.order_count : 0,
        avg_revenue: p.order_count > 0 ? p.total_revenue / p.order_count : 0,
        profit_margin: p.total_revenue > 0 ? (p.total_profit / p.total_revenue) * 100 : 0,
      }));
    };

    // Filter orders for each period
    const currentOrders = allOrders.filter(o => o.order_date >= current_start && o.order_date <= current_end);
    const previousOrders = allOrders.filter(o => o.order_date >= previous_start && o.order_date <= previous_end);

    console.log(`[AnalyticsClient] Current period orders for product processing: ${currentOrders.length}`);
    console.log(`[AnalyticsClient] Previous period orders for product processing: ${previousOrders.length}`);

    // Calculate metrics for both periods
    const currentMetrics = calculateProductMetrics(currentOrders);
    const previousMetricsMap = calculateProductMetrics(previousOrders).reduce((map, p) => {
      map[p.sku] = p;
      return map;
    }, {} as Record<string, any>); // Use any temporarily for simplicity

    // Combine and calculate trends
    const finalProductData = currentMetrics.map(currentP => {
      const previousP = previousMetricsMap[currentP.sku];
      let profit_margin_trend: number | undefined = undefined;
      let quantity_trend: number | undefined = undefined;

      if (previousP) {
        const calcTrend = (current: number, previous: number) => {
          if (previous === 0) return current > 0 ? Infinity : 0;
          return ((current - previous) / Math.abs(previous)) * 100; // Use Math.abs for stable % change
        };
        
        profit_margin_trend = calcTrend(currentP.profit_margin, previousP.profit_margin);
        quantity_trend = calcTrend(currentP.quantity_sold, previousP.quantity_sold);

        // Set trends to undefined if they are not finite numbers
        if (!isFinite(profit_margin_trend)) profit_margin_trend = undefined;
        if (!isFinite(quantity_trend)) quantity_trend = undefined;
      }
      
      return {
        ...currentP,
        profit_margin_trend: profit_margin_trend,
        quantity_trend: quantity_trend,
      };
    });

    console.log('[AnalyticsClient] Product analytics data with trends processed:', finalProductData.length);
    if (finalProductData.length > 0) {
        console.log('[AnalyticsClient] Sample processed product with trends:', finalProductData[0]);
    }
    
    // Sort by current period's total revenue (descending)
    return finalProductData.sort((a, b) => b.total_revenue - a.total_revenue);
  };

  if (isLoading) { // Simplified loading state check
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  console.log('[AnalyticsClient] Rendering component with state:', { isLoading, error, salesData, platformData, productsData, metrics });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="flex space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'quarter' | 'year')}
            className="bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
            <option value="year">Last 365 Days</option>
          </select>
          <button
            onClick={() => fetchData()}
            disabled={isLoading} // Disable button when loading
            className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center disabled:opacity-50 ${isLoading ? 'cursor-not-allowed' : ''}`}
          >
            <svg className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                {isLoading ? 
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm4.146-9.854a.5.5 0 01.708 0l.707.707a.5.5 0 010 .708l-3.5 3.5a.5.5 0 01-.708 0l-1.5-1.5a.5.5 0 11.708-.708L10 12.793l2.646-2.647z" clipRule="evenodd" /> // Spinner icon 
                    : <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /> // Refresh icon
                }
            </svg>
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {usingSampleData && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-yellow-700">
            <strong>Note:</strong> Using sample analytics data. Connect to a real database for production use.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 truncate">Total Revenue</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{formatCurrency(metrics.totalRevenue)}</p>
              <p className={`text-sm ${metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {isFinite(metrics.revenueGrowth) ? 
                  (metrics.revenueGrowth >= 0 ? '↑' : '↓') + ` ${Math.abs(metrics.revenueGrowth).toFixed(1)}%` : 
                  'N/A'} from previous period
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 truncate">Total Profit</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{formatCurrency(metrics.totalProfit)}</p>
               <p className={`text-sm ${metrics.profitGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {isFinite(metrics.profitGrowth) ? 
                  (metrics.profitGrowth >= 0 ? '↑' : '↓') + ` ${Math.abs(metrics.profitGrowth).toFixed(1)}%` : 
                  'N/A'} from previous period
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 truncate">Total Orders</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{metrics.totalOrders}</p>
              <p className="text-sm text-gray-600">
                Avg. Profit Margin: {metrics.averageProfitMargin.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Sales Trends Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Sales Trends - {timeRange === 'week' ? 'Last 7 Days' : 
              timeRange === 'month' ? 'Last 30 Days' : 
              timeRange === 'quarter' ? 'Last 90 Days' : 'Last 365 Days'}
          </h2>
          <div className="h-80">
            {salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salesData}
                  margin={{ top: 10, right: 30, left: 20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)} 
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={{ stroke: '#E5E7EB' }}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      return [
                        formatCurrency(Number(value)), 
                        typeof name === 'string' ? name.charAt(0).toUpperCase() + name.slice(1) : name
                      ]; 
                    }}
                    labelFormatter={(label) => `${label}`}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderColor: '#E5E7EB',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    itemStyle={{ color: '#111827', fontSize: '12px', padding: '2px 0' }}
                    cursor={{ fill: 'rgba(236, 253, 245, 0.4)' }}
                  />
                  <Legend 
                    iconType="circle" 
                    iconSize={8}
                    wrapperStyle={{ paddingTop: 10 }}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="#3B82F6" 
                    name="Revenue" 
                    radius={[4, 4, 0, 0]}
                    barSize={timeRange === 'year' ? 16 : timeRange === 'quarter' ? 20 : 24}
                  />
                  <Bar 
                    dataKey="profit" 
                    fill="#10B981" 
                    name="Profit" 
                    radius={[4, 4, 0, 0]}
                    barSize={timeRange === 'year' ? 16 : timeRange === 'quarter' ? 20 : 24}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p>No sales data available for the selected period.</p>
                <button onClick={() => fetchData()} className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Refresh Data
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Platform Performance */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Performance</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {platformData.map((platform, index) => {
                  const margin = platform.revenue > 0 ? (platform.profit / platform.revenue) * 100 : 0;
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{platform.platform}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">{platform.orders}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(platform.revenue)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-green-600">{formatCurrency(platform.profit)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">{margin.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AI Product Suggestions Component */}
      <div className="mt-8">
        <AIProductSuggestions products={productsData} />
      </div>

    </div>
  );
} 