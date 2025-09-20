'use client';

import React, { useState, useEffect } from 'react';

// Define the structure of the product data expected by this component
interface ProductPerformanceData {
  id: string;
  name: string;
  sku: string;
  quantity_sold: number;
  order_count: number;
  total_revenue: number;
  total_profit: number;
  last_sale_date: string;
  avg_quantity_per_order: number;
  avg_revenue: number;
  profit_margin: number;
  // Optional trend data
  profit_margin_trend?: number;
  quantity_trend?: number;
}

interface WorstProductPlanProps {
  products: ProductPerformanceData[];
}

// Define a storage key for localStorage
const PLAN_STORAGE_KEY = 'walmart_worst_product_plan';

export default function WorstProductPlan({ products }: WorstProductPlanProps) {
  const [plan, setPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productDetails, setProductDetails] = useState<{
    name: string;
    sku: string;
    profitMargin: number;
    totalProfit: number;
  }[] | null>(null);

  // Load saved plan from localStorage on component mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(PLAN_STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setPlan(parsedData.plan);
        setProductDetails(parsedData.productDetails);
      }
    } catch (err) {
      console.error('Error loading saved plan:', err);
      localStorage.removeItem(PLAN_STORAGE_KEY);
    }
  }, []);

  // Function to download the plan as a text file
  const downloadPlan = () => {
    if (!plan) return;
    
    // Create a blob with the text content
    const blob = new Blob([plan], { type: 'text/plain' });
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'worst-products-action-plan.txt';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const fetchPlan = async () => {
    setIsLoading(true);
    setError(null);
    setPlan(null);
    setProductDetails(null);

    try {
      const response = await fetch('/api/worst-product-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ products }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch product plan');
      }

      // Save plan and product details to state and localStorage
      setPlan(data.plan);
      setProductDetails(data.productDetails);
      localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify({
        plan: data.plan,
        productDetails: data.productDetails
      }));
    } catch (err: any) {
      console.error('[WorstProductPlan] Error fetching plan:', err);
      setError(`Error: ${err.message || 'Could not retrieve product plan.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to clear saved plan
  const clearPlan = () => {
    setPlan(null);
    setProductDetails(null);
    localStorage.removeItem(PLAN_STORAGE_KEY);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Worst-Performing Products Analysis</h2>
      <p className="text-sm text-gray-600 mb-4">
        Generate detailed action plans for your worst-performing products, including pricing strategies, 
        shipping optimizations, and clear discontinuation timelines.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={fetchPlan}
          disabled={isLoading || products.length === 0}
          className={`bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded inline-flex items-center transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed ${isLoading ? 'animate-pulse' : ''}`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Plans...
            </>
          ) : (
            'Generate Action Plans'
          )}
        </button>
        
        {plan && (
          <>
            <button
              onClick={downloadPlan}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded inline-flex items-center transition duration-150 ease-in-out"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              Download as Text
            </button>
            
            <button
              onClick={clearPlan}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded inline-flex items-center transition duration-150 ease-in-out"
            >
              Clear
            </button>
          </>
        )}
      </div>
      
      {products.length === 0 && !isLoading && (
        <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded border border-yellow-200">
          Load product data first to generate action plans.
        </p>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {plan && !isLoading && productDetails && productDetails.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="font-medium text-gray-800 mb-2">Analysis Complete for {productDetails.length} Products</p>
          <p className="text-sm text-gray-600">
            Successfully analyzed the {productDetails.length} worst-performing products. 
            Click "Download as Text" to save the detailed action plans as a text document.
          </p>
        </div>
      )}
    </div>
  );
} 