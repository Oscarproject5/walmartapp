'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { formatCurrency } from '../utils/calculations';
import Link from 'next/link';

interface ProductPerformance {
  sku: string;
  name: string;
  totalQuantity: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  roi: number;
  salesOnlyRoi: number;
  lastOrderDate: string;
  orderCount: number;
  avgQuantityPerOrder: number;
}

export default function ProductPerformanceClient() {
  const [products, setProducts] = useState<ProductPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  
  // Independent sort states for each table
  const [mainSortField, setMainSortField] = useState<keyof ProductPerformance>('totalQuantity');
  const [mainSortDirection, setMainSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const [bestSortField, setBestSortField] = useState<keyof ProductPerformance>('totalQuantity');
  const [bestSortDirection, setBestSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const [worstSortField, setWorstSortField] = useState<keyof ProductPerformance>('totalQuantity');
  const [worstSortDirection, setWorstSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const [selectedProduct, setSelectedProduct] = useState<ProductPerformance | null>(null);
  const [showInsights, setShowInsights] = useState(false);

  useEffect(() => {
    if (userId) {
      console.log('ProductPerformanceClient: User ID available, fetching data...');
      fetchProductPerformance();
    }
  }, [userId]);

  const fetchProductPerformance = async () => {
    try {
      setIsLoading(true);
      console.log('ProductPerformanceClient: Fetching order data...');
      
      // Direct SQL query to get product performance from orders table
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('order_date', { ascending: false });
        
      if (orderError) throw orderError;
      
      console.log(`ProductPerformanceClient: Found ${orderData?.length || 0} orders in database`);
      
      if (!orderData || orderData.length === 0) {
        // If no orders are found, display an error
        setError('No orders found in the database. Please add some orders first.');
        setProducts([]);
        return;
      }
      
      // Group and calculate metrics by product SKU
      const productMap = new Map<string, ProductPerformance>();
      
      orderData.forEach(order => {
        const sku = order.sku;
        if (!sku) return;
        
        const existingProduct = productMap.get(sku);
        
        if (existingProduct) {
          // Update existing product data
          existingProduct.totalQuantity += Number(order.order_quantity) || 0;
          existingProduct.totalRevenue += Number(order.total_revenue) || 0;
          existingProduct.totalProfit += Number(order.net_profit) || 0;
          existingProduct.orderCount += 1;
          
          // Update lastOrderDate if this order is more recent
          const currentDate = new Date(existingProduct.lastOrderDate);
          const orderDate = new Date(order.order_date);
          if (orderDate > currentDate) {
            existingProduct.lastOrderDate = order.order_date;
          }
        } else {
          // Create new product entry
          productMap.set(sku, {
            sku,
            name: order.product_name || sku,
            totalQuantity: Number(order.order_quantity) || 0,
            totalRevenue: Number(order.total_revenue) || 0,
            totalProfit: Number(order.net_profit) || 0,
            profitMargin: 0, // Will calculate below
            roi: Number(order.roi) || 0,
            salesOnlyRoi: 0, // Will calculate below
            lastOrderDate: order.order_date,
            orderCount: 1,
            avgQuantityPerOrder: 0 // Will calculate below
          });
        }
      });
      
      // Calculate profit margins and convert to array
      const productsArray: ProductPerformance[] = Array.from(productMap.values()).map(product => {
        // Calculate profit margin as percentage
        product.profitMargin = product.totalRevenue > 0 ? 
          (product.totalProfit / product.totalRevenue) * 100 : 0;
        
        // Calculate average quantity per order
        product.avgQuantityPerOrder = product.orderCount > 0 ?
          product.totalQuantity / product.orderCount : 0;
          
        // Calculate Sales-Only ROI
        const costOfSoldUnits = product.totalRevenue - product.totalProfit;
        product.salesOnlyRoi = costOfSoldUnits > 0 ?
          (product.totalProfit / costOfSoldUnits) * 100 : 0;
          
        return product;
      });
      
      setProducts(productsArray);
      
    } catch (err: any) {
      console.error('Error fetching product performance:', err);
      setError(`Failed to load product performance data: ${err.message || 'Unknown error'}`);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Create sorting functions for each table
  const handleMainSort = (field: keyof ProductPerformance) => {
    if (field === mainSortField) {
      setMainSortDirection(mainSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setMainSortField(field);
      setMainSortDirection('desc');
    }
  };

  const handleBestSort = (field: keyof ProductPerformance) => {
    if (field === bestSortField) {
      setBestSortDirection(bestSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setBestSortField(field);
      setBestSortDirection('desc');
    }
  };

  const handleWorstSort = (field: keyof ProductPerformance) => {
    if (field === worstSortField) {
      setWorstSortDirection(worstSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setWorstSortField(field);
      setWorstSortDirection('desc');
    }
  };

  // Sort products for each table independently
  const sortProducts = (prods: ProductPerformance[], field: keyof ProductPerformance, direction: 'asc' | 'desc') => {
    return [...prods].sort((a, b) => {
      const fieldA = a[field];
      const fieldB = b[field];
      
      // Handle string vs number comparison
      if (typeof fieldA === 'string' && typeof fieldB === 'string') {
        return direction === 'asc' ? 
          fieldA.localeCompare(fieldB) : 
          fieldB.localeCompare(fieldA);
      } else {
        // Treat as numbers
        const numA = typeof fieldA === 'number' ? fieldA : 0;
        const numB = typeof fieldB === 'number' ? fieldB : 0;
        return direction === 'asc' ? numA - numB : numB - numA;
      }
    });
  };

  // Determine which sort direction represents "better" performance for a field
  const getBestDirection = (field: keyof ProductPerformance): 'asc' | 'desc' => {
    // For these metrics, higher values are better
    const higherIsBetter = [
      'totalRevenue', 
      'totalProfit', 
      'profitMargin', 
      'roi', 
      'avgQuantityPerOrder'
    ];
    // For these metrics, lower might be better
    const lowerMightBeBetter = [
      'lastOrderDate' // More recent date is better
    ];
    
    if (higherIsBetter.includes(field as string)) {
      return 'desc'; // Higher values = better performance
    } else if (lowerMightBeBetter.includes(field as string)) {
      return 'asc'; // Lower values = better performance
    } else if (field === 'name' || field === 'sku') {
      return 'asc'; // Alphabetical for text fields
    } else {
      // For most quantity metrics, higher is typically better
      return 'desc';
    }
  };

  // Apply sorting for each table
  const sortedAllProducts = sortProducts(products, mainSortField, mainSortDirection);
  
  // For best performers, always use the direction that represents "better" performance
  const bestDirection = bestSortDirection;
  const sortedBestProducts = sortProducts(products, bestSortField, bestDirection);
  
  // For worst performers, always use the opposite direction that represents "worse" performance
  const worstDirection = worstSortDirection;
  const sortedWorstProducts = sortProducts(products, worstSortField, worstDirection);
  
  // Get top 5 best performers (always the best regardless of sort direction)
  const bestPerformers = [...products]
    .sort((a, b) => {
      const fieldA = a[bestSortField];
      const fieldB = b[bestSortField];
      
      // String comparison
      if (typeof fieldA === 'string' && typeof fieldB === 'string') {
        const bestDir = getBestDirection(bestSortField);
        return bestDir === 'asc' ? 
          fieldA.localeCompare(fieldB) : 
          fieldB.localeCompare(fieldA);
      } 
      // Number comparison
      else {
        const numA = typeof fieldA === 'number' ? fieldA : 0;
        const numB = typeof fieldB === 'number' ? fieldB : 0;
        const bestDir = getBestDirection(bestSortField);
        return bestDir === 'asc' ? numA - numB : numB - numA;
      }
    })
    .slice(0, 5);
  
  // Get top 5 worst performers (always the worst regardless of sort direction)
  const worstPerformers = [...products]
    .sort((a, b) => {
      const fieldA = a[worstSortField];
      const fieldB = b[worstSortField];
      
      // String comparison
      if (typeof fieldA === 'string' && typeof fieldB === 'string') {
        const bestDir = getBestDirection(worstSortField);
        return bestDir === 'asc' ? 
          fieldB.localeCompare(fieldA) : 
          fieldA.localeCompare(fieldB);
      } 
      // Number comparison
      else {
        const numA = typeof fieldA === 'number' ? fieldA : 0;
        const numB = typeof fieldB === 'number' ? fieldB : 0;
        const bestDir = getBestDirection(worstSortField);
        return bestDir === 'asc' ? numB - numA : numA - numB;
      }
    })
    .slice(0, 5);

  // Add handler for product row click
  const handleProductClick = (product: ProductPerformance) => {
    setSelectedProduct(product);
    setShowInsights(true);
  };

  // Function to generate pricing recommendations
  const generatePricingRecommendations = (product: ProductPerformance) => {
    const recommendations = [];
    
    // Low margin recommendation
    if (product.profitMargin < 15) {
      const suggestedIncrease = Math.min(10, (15 - product.profitMargin));
      const suggestedPrice = (product.totalRevenue / product.totalQuantity) * (1 + suggestedIncrease / 100);
      
      recommendations.push({
        type: 'price_increase',
        title: 'Increase Price',
        description: `Consider increasing price by ${suggestedIncrease.toFixed(1)}% to improve margins.`,
        impact: `A ${suggestedIncrease.toFixed(1)}% price increase could improve profit margin to approximately ${(product.profitMargin + suggestedIncrease).toFixed(1)}%.`,
        action: `New suggested price: ${formatCurrency(suggestedPrice)}/unit`
      });
    }
    
    // High volume, low avg quantity recommendation
    if (product.totalQuantity > 20 && product.avgQuantityPerOrder < 2) {
      recommendations.push({
        type: 'bundle',
        title: 'Create Bundle Offers',
        description: 'This product sells frequently but in small quantities.',
        impact: 'Bundle pricing could increase average order size and reduce shipping costs per unit.',
        action: 'Consider "Buy 2, get 15% off" or similar bundle offers.'
      });
    }
    
    // Low volume, high margin recommendation
    if (product.totalQuantity < 10 && product.profitMargin > 25) {
      recommendations.push({
        type: 'marketing',
        title: 'Increase Marketing',
        description: 'This is a high-margin product with low sales volume.',
        impact: 'Increasing visibility could significantly boost overall profits.',
        action: 'Consider featuring this product prominently or running targeted promotions.'
      });
    }
    
    // High volume, high margin - protect pricing
    if (product.totalQuantity > 20 && product.profitMargin > 25) {
      recommendations.push({
        type: 'protect',
        title: 'Protect Market Position',
        description: 'This is a star performer with high volume and margins.',
        impact: 'Maintaining this performance is critical to overall profits.',
        action: 'Monitor competitor pricing and ensure product quality and availability.'
      });
    }
    
    // Return default recommendation if none apply
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'monitor',
        title: 'Monitor Performance',
        description: 'This product has average performance metrics.',
        impact: 'Continue tracking to identify trends.',
        action: 'No immediate action needed.'
      });
    }
    
    return recommendations;
  };

  // First, let's add a utility function for truncating long text
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Add this CSV export function after the truncateText function
  const exportTableToCSV = (data: ProductPerformance[], filename: string) => {
    // Define headers for the CSV
    const headers = [
      'Product Name',
      'SKU',
      'Quantity Sold',
      'Total Revenue',
      'Total Profit',
      'Profit Margin (%)',
      'ROI (%)',
      'Sales-Only ROI (%)',
      'Last Order Date',
      'Order Count',
      'Avg Quantity Per Order'
    ];
    
    // Create rows from product data
    const rows = data.map(product => [
      `"${product.name.replace(/"/g, '""')}"`, // Escape double quotes in CSV
      `"${product.sku}"`,
      product.totalQuantity,
      product.totalRevenue.toFixed(2),
      product.totalProfit.toFixed(2),
      product.profitMargin.toFixed(1),
      product.roi.toFixed(1),
      product.salesOnlyRoi.toFixed(1),
      new Date(product.lastOrderDate).toLocaleDateString(),
      product.orderCount,
      product.avgQuantityPerOrder.toFixed(1)
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create a blob and initiate download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Insights modal component
  const InsightsModal = () => {
    if (!selectedProduct) return null;
    
    const recommendations = generatePricingRecommendations(selectedProduct);
    const avgPrice = selectedProduct.totalRevenue / selectedProduct.totalQuantity;
    const avgProfit = selectedProduct.totalProfit / selectedProduct.totalQuantity;
    
    return (
      <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">
              Product Performance Insights: {selectedProduct.name}
            </h3>
            <button 
              onClick={() => setShowInsights(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-6">
            {/* Key metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-800">Pricing</p>
                <p className="mt-1 text-2xl font-semibold text-blue-900">{formatCurrency(avgPrice)}</p>
                <p className="text-sm text-blue-700">Average price per unit</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-green-800">Profit Per Unit</p>
                <p className="mt-1 text-2xl font-semibold text-green-900">{formatCurrency(avgProfit)}</p>
                <p className="text-sm text-green-700">Average profit per unit</p>
              </div>
              
              <div className={`p-4 rounded-lg ${selectedProduct.profitMargin >= 20 ? 'bg-green-50' : selectedProduct.profitMargin >= 10 ? 'bg-yellow-50' : 'bg-red-50'}`}>
                <p className={`text-sm font-medium ${selectedProduct.profitMargin >= 20 ? 'text-green-800' : selectedProduct.profitMargin >= 10 ? 'text-yellow-800' : 'text-red-800'}`}>Profit Margin</p>
                <p className={`mt-1 text-2xl font-semibold ${selectedProduct.profitMargin >= 20 ? 'text-green-900' : selectedProduct.profitMargin >= 10 ? 'text-yellow-900' : 'text-red-900'}`}>{selectedProduct.profitMargin.toFixed(1)}%</p>
                <p className={`text-sm ${selectedProduct.profitMargin >= 20 ? 'text-green-700' : selectedProduct.profitMargin >= 10 ? 'text-yellow-700' : 'text-red-700'}`}>
                  {selectedProduct.profitMargin >= 20 ? 'Healthy margin' : selectedProduct.profitMargin >= 10 ? 'Moderate margin' : 'Low margin'}
                </p>
              </div>
            </div>
            
            {/* Order statistics */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Order Statistics</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-gray-500">Total Orders</p>
                  <p className="mt-1 text-lg font-medium text-gray-900">{selectedProduct.orderCount}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-gray-500">Total Quantity</p>
                  <p className="mt-1 text-lg font-medium text-gray-900">{selectedProduct.totalQuantity}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-gray-500">Avg Qty per Order</p>
                  <p className="mt-1 text-lg font-medium text-gray-900">{selectedProduct.avgQuantityPerOrder.toFixed(1)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-gray-500">Last Order</p>
                  <p className="mt-1 text-lg font-medium text-gray-900">{new Date(selectedProduct.lastOrderDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            
            {/* Recommendations */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Improvement Recommendations</h4>
              <div className="space-y-4">
                {recommendations.map((rec, index) => (
                  <div key={index} className={`border-l-4 p-4 rounded-r-lg ${
                    rec.type === 'price_increase' ? 'border-red-400 bg-red-50' :
                    rec.type === 'bundle' ? 'border-blue-400 bg-blue-50' :
                    rec.type === 'marketing' ? 'border-purple-400 bg-purple-50' :
                    rec.type === 'protect' ? 'border-green-400 bg-green-50' :
                    'border-gray-400 bg-gray-50'
                  }`}>
                    <h5 className="text-sm font-medium text-gray-900">{rec.title}</h5>
                    <p className="mt-1 text-sm text-gray-600">{rec.description}</p>
                    <p className="mt-2 text-sm font-medium text-gray-800">Potential Impact: {rec.impact}</p>
                    <p className="mt-1 text-sm text-gray-600">Recommended Action: {rec.action}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Financial summary */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Financial Summary</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Total Revenue</p>
                    <p className="mt-1 text-lg font-medium text-gray-900">{formatCurrency(selectedProduct.totalRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Total Profit</p>
                    <p className="mt-1 text-lg font-medium text-gray-900">{formatCurrency(selectedProduct.totalProfit)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Return on Investment</p>
                    <p className="mt-1 text-lg font-medium text-gray-900">{selectedProduct.roi.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Profit per Order</p>
                    <p className="mt-1 text-lg font-medium text-gray-900">
                      {formatCurrency(selectedProduct.totalProfit / selectedProduct.orderCount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Sales-Only ROI</p>
                    <p className="mt-1 text-lg font-medium text-gray-900">
                      {selectedProduct.salesOnlyRoi.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">Based only on sold units</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Cost of Sold Units</p>
                    <p className="mt-1 text-lg font-medium text-gray-900">
                      {formatCurrency(selectedProduct.totalRevenue - selectedProduct.totalProfit)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
            <Link
              href={`/inventory?product=${encodeURIComponent(selectedProduct.sku)}`}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              View in Inventory
            </Link>
            <button
              onClick={() => setShowInsights(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Performance Report</h1>
        <div className="flex space-x-2">
          <Link 
            href="/orders"
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded"
          >
            View Orders
          </Link>
          <button
            onClick={() => exportTableToCSV(products, 'all-products-performance')}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={fetchProductPerformance}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <div className="mb-4">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <p className="text-blue-700">
            <strong>Sort by:</strong> You can click on any column header to sort by that metric.
            Each table can be sorted independently.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Best Performers */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-5 border-b border-gray-200 bg-green-50 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Top 5 Best Performing Products
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Based on {bestSortField === 'profitMargin' ? 'profit margin' : bestSortField}
              </p>
            </div>
            <button
              onClick={() => exportTableToCSV(bestPerformers, 'best-performers')}
              className="bg-green-600 hover:bg-green-700 text-white rounded p-1 inline-flex items-center text-sm"
              title="Export to CSV"
            >
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="ml-1">CSV</span>
            </button>
          </div>
          
          <div className="overflow-visible">
            <table className="min-w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    onClick={() => handleBestSort('name')} 
                    className="w-[35%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Product {bestSortField === 'name' && (bestSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleBestSort('totalQuantity')} 
                    className="w-[10%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Qty Sold {bestSortField === 'totalQuantity' && (bestSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleBestSort('totalRevenue')} 
                    className="w-[10%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Revenue {bestSortField === 'totalRevenue' && (bestSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleBestSort('profitMargin')} 
                    className="w-[10%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Margin {bestSortField === 'profitMargin' && (bestSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleBestSort('roi')} 
                    className="w-[10%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    ROI {bestSortField === 'roi' && (bestSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleBestSort('salesOnlyRoi')} 
                    className="w-[10%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Sales ROI {bestSortField === 'salesOnlyRoi' && (bestSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleBestSort('totalProfit')} 
                    className="w-[10%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Profit {bestSortField === 'totalProfit' && (bestSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleBestSort('avgQuantityPerOrder')} 
                    className="w-[10%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Avg Qty {bestSortField === 'avgQuantityPerOrder' && (bestSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bestPerformers.length > 0 ? (
                  bestPerformers.map(product => (
                    <tr 
                      key={product.sku} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleProductClick(product)}
                    >
                      <td className="px-2 py-3 text-sm font-medium text-gray-900 truncate" title={product.name}>
                        {truncateText(product.name, 30)}
                      </td>
                      <td className="px-2 py-3 text-sm text-right text-gray-500">{product.totalQuantity}</td>
                      <td className="px-2 py-3 text-sm text-right text-gray-900">{formatCurrency(product.totalRevenue)}</td>
                      <td className="px-2 py-3 text-sm text-right font-medium">
                        <span className={product.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {product.profitMargin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-2 py-3 text-sm text-right text-gray-900">{product.roi.toFixed(1)}%</td>
                      <td className="px-2 py-3 text-sm text-right text-gray-900">{product.salesOnlyRoi.toFixed(1)}%</td>
                      <td className="px-2 py-3 text-sm text-right text-gray-900">{formatCurrency(product.totalProfit)}</td>
                      <td className="px-2 py-3 text-sm text-right text-gray-500">{product.avgQuantityPerOrder.toFixed(1)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-2 py-4 text-center text-sm text-gray-500">No products found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Worst Performers */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-5 border-b border-gray-200 bg-red-50 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Top 5 Worst Performing Products
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Based on {worstSortField === 'profitMargin' ? 'profit margin' : worstSortField}
              </p>
            </div>
            <button
              onClick={() => exportTableToCSV(worstPerformers, 'worst-performers')}
              className="bg-red-600 hover:bg-red-700 text-white rounded p-1 inline-flex items-center text-sm"
              title="Export to CSV"
            >
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="ml-1">CSV</span>
            </button>
          </div>
          
          <div className="overflow-visible">
            <table className="min-w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    onClick={() => handleWorstSort('name')} 
                    className="w-[35%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Product {worstSortField === 'name' && (worstSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleWorstSort('totalQuantity')} 
                    className="w-[10%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Qty Sold {worstSortField === 'totalQuantity' && (worstSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleWorstSort('totalRevenue')} 
                    className="w-[10%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Revenue {worstSortField === 'totalRevenue' && (worstSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleWorstSort('profitMargin')} 
                    className="w-[10%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Margin {worstSortField === 'profitMargin' && (worstSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleWorstSort('roi')} 
                    className="w-[10%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    ROI {worstSortField === 'roi' && (worstSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleWorstSort('salesOnlyRoi')} 
                    className="w-[10%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Sales ROI {worstSortField === 'salesOnlyRoi' && (worstSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleWorstSort('totalProfit')} 
                    className="w-[10%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Profit {worstSortField === 'totalProfit' && (worstSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleWorstSort('avgQuantityPerOrder')} 
                    className="w-[10%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Avg Qty {worstSortField === 'avgQuantityPerOrder' && (worstSortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {worstPerformers.length > 0 ? (
                  worstPerformers.map(product => (
                    <tr 
                      key={product.sku} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleProductClick(product)}
                    >
                      <td className="px-2 py-3 text-sm font-medium text-gray-900 truncate" title={product.name}>
                        {truncateText(product.name, 30)}
                      </td>
                      <td className="px-2 py-3 text-sm text-right text-gray-500">{product.totalQuantity}</td>
                      <td className="px-2 py-3 text-sm text-right text-gray-900">{formatCurrency(product.totalRevenue)}</td>
                      <td className="px-2 py-3 text-sm text-right font-medium">
                        <span className={product.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {product.profitMargin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-2 py-3 text-sm text-right text-gray-900">{product.roi.toFixed(1)}%</td>
                      <td className="px-2 py-3 text-sm text-right text-gray-900">{product.salesOnlyRoi.toFixed(1)}%</td>
                      <td className="px-2 py-3 text-sm text-right text-gray-900">{formatCurrency(product.totalProfit)}</td>
                      <td className="px-2 py-3 text-sm text-right text-gray-500">{product.avgQuantityPerOrder.toFixed(1)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-2 py-4 text-center text-sm text-gray-500">No products found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* All Products */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              All Products Performance
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Complete list of all products and their performance metrics
            </p>
          </div>
          <button
            onClick={() => exportTableToCSV(sortedAllProducts, 'all-products')}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded p-1 inline-flex items-center text-sm"
            title="Export to CSV"
          >
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span className="ml-1">CSV</span>
          </button>
        </div>
        
        <div className="overflow-visible">
          <table className="min-w-full table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  onClick={() => handleMainSort('name')} 
                  className="w-[25%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Product {mainSortField === 'name' && (mainSortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleMainSort('sku')} 
                  className="w-[10%] px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  SKU {mainSortField === 'sku' && (mainSortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleMainSort('totalQuantity')} 
                  className="w-[9%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Qty {mainSortField === 'totalQuantity' && (mainSortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleMainSort('totalRevenue')} 
                  className="w-[9%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Revenue {mainSortField === 'totalRevenue' && (mainSortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleMainSort('totalProfit')} 
                  className="w-[9%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Profit {mainSortField === 'totalProfit' && (mainSortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleMainSort('profitMargin')} 
                  className="w-[9%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Margin {mainSortField === 'profitMargin' && (mainSortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleMainSort('roi')} 
                  className="w-[8%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  ROI {mainSortField === 'roi' && (mainSortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="w-[8%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleMainSort('salesOnlyRoi')}
                >
                  Sales ROI {mainSortField === 'salesOnlyRoi' && (mainSortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleMainSort('lastOrderDate')} 
                  className="w-[13%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Last Order {mainSortField === 'lastOrderDate' && (mainSortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleMainSort('avgQuantityPerOrder')} 
                  className="w-[8%] px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Avg Qty {mainSortField === 'avgQuantityPerOrder' && (mainSortDirection === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAllProducts.length > 0 ? (
                sortedAllProducts.map(product => (
                  <tr 
                    key={product.sku} 
                    className="hover:bg-gray-50 cursor-pointer" 
                    onClick={() => handleProductClick(product)}
                  >
                    <td className="px-2 py-3 text-sm font-medium text-gray-900 truncate" title={product.name}>
                      {truncateText(product.name, 30)}
                    </td>
                    <td className="px-2 py-3 text-sm text-gray-500 truncate" title={product.sku}>{truncateText(product.sku, 12)}</td>
                    <td className="px-2 py-3 text-sm text-right text-gray-500">{product.totalQuantity}</td>
                    <td className="px-2 py-3 text-sm text-right text-gray-900">{formatCurrency(product.totalRevenue)}</td>
                    <td className="px-2 py-3 text-sm text-right text-gray-900">{formatCurrency(product.totalProfit)}</td>
                    <td className="px-2 py-3 text-sm text-right font-medium">
                      <span className={product.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {product.profitMargin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-2 py-3 text-sm text-right text-gray-900">{product.roi.toFixed(1)}%</td>
                    <td className="px-2 py-3 text-sm text-right text-gray-900">
                      {product.salesOnlyRoi.toFixed(1)}%
                    </td>
                    <td className="px-2 py-3 text-sm text-right text-gray-500">
                      {new Date(product.lastOrderDate).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-3 text-sm text-right text-gray-500">{product.avgQuantityPerOrder.toFixed(1)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-2 py-4 text-center text-sm text-gray-500">No products found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Render insights modal when product is selected */}
      {showInsights && <InsightsModal />}
    </div>
  );
} 