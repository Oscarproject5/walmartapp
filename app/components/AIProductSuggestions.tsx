'use client';

import React, { useState, useEffect } from 'react';

// Define the structure of the product data expected by this component
// This should match the ProductPerformanceData interface in AnalyticsClient.tsx
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
}

interface AIProductSuggestionsProps {
  products: ProductPerformanceData[];
}

// Define a storage key for localStorage
const SUGGESTIONS_STORAGE_KEY = 'walmart_ai_suggestions';

export default function AIProductSuggestions({ products }: AIProductSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved suggestions from localStorage on component mount
  useEffect(() => {
    const savedSuggestions = localStorage.getItem(SUGGESTIONS_STORAGE_KEY);
    if (savedSuggestions) {
      setSuggestions(savedSuggestions);
    }
  }, []);

  // Function to format the AI suggestions with better styling
  const formatSuggestions = (text: string) => {
    // Split the text into lines
    const lines = text.split('\n');
    
    // Structure to hold our processed suggestions
    const formattedSuggestions: React.ReactNode[] = [];
    
    // Current suggestion block being built
    let currentSuggestion: {
      product?: string;
      action?: string;
      reasoning?: string;
      details: string[];
    } | null = null;
    
    // Process each line
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return; // Skip empty lines
      
      // Remove bullet points and numbering
      const cleanLine = trimmedLine.replace(/^-\s+/, '').replace(/^\d+\.\s+/, '');
      
      // Check for product pattern
      const productMatch = cleanLine.match(/^(\*\*)?Product:(.+?)(\*\*)?$/i);
      if (productMatch || cleanLine.match(/^\*\*.*?:\*\*$/) && index === 0) {
        // If we have a previous suggestion, add it to results
        if (currentSuggestion) {
          formattedSuggestions.push(renderSuggestion(currentSuggestion, formattedSuggestions.length));
        }
        
        // Start a new suggestion
        currentSuggestion = {
          product: productMatch ? productMatch[2].trim() : cleanLine,
          details: []
        };
        return;
      }
      
      // If no current suggestion, start one
      if (!currentSuggestion) {
        currentSuggestion = { details: [] };
      }
      
      // Check for action pattern
      const actionMatch = cleanLine.match(/^(\*\*)?Action:(\*\*)?\s*(.+)$/i);
      if (actionMatch) {
        currentSuggestion.action = actionMatch[3].trim();
        return;
      }
      
      // Check for reasoning pattern
      const reasoningMatch = cleanLine.match(/^(\*\*)?Reasoning:(\*\*)?\s*(.+)$/i);
      if (reasoningMatch) {
        currentSuggestion.reasoning = reasoningMatch[3].trim();
        return;
      }
      
      // Any other line is added to details
      currentSuggestion.details.push(cleanLine);
    });
    
    // Add the last suggestion if there is one
    if (currentSuggestion) {
      formattedSuggestions.push(renderSuggestion(currentSuggestion, formattedSuggestions.length));
    }
    
    return formattedSuggestions;
  };
  
  // Helper to render a single suggestion
  const renderSuggestion = (suggestion: {
    product?: string;
    action?: string;
    reasoning?: string;
    details: string[];
  }, index: number) => {
    return (
      <div key={index} className="recommendation-item border-l-4 border-indigo-500 pl-3 py-2 bg-white rounded shadow-sm">
        {suggestion.product && (
          <p className="font-bold text-gray-800">{suggestion.product}</p>
        )}
        
        {suggestion.action && (
          <p className="text-sm font-medium text-indigo-600 mt-1">
            <span className="font-semibold">Action:</span> {suggestion.action}
          </p>
        )}
        
        {suggestion.reasoning && (
          <p className="text-sm text-gray-600 mt-1 italic">
            <span className="font-semibold not-italic">Reasoning:</span> {suggestion.reasoning}
          </p>
        )}
        
        {suggestion.details.length > 0 && !suggestion.product && !suggestion.action && !suggestion.reasoning && (
          <p className="text-sm text-gray-700">{suggestion.details.join(' ')}</p>
        )}
        
        {suggestion.details.length > 0 && (suggestion.product || suggestion.action || suggestion.reasoning) && (
          <div className="text-sm text-gray-700 mt-1">
            {suggestion.details.map((detail, i) => (
              <p key={i} className="mt-0.5">{detail}</p>
            ))}
          </div>
        )}
      </div>
    );
  };

  const fetchSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    setSuggestions(null);

    try {
      const response = await fetch('/api/ai-product-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ products }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch suggestions');
      }

      // Save suggestions to state and localStorage
      setSuggestions(data.suggestion);
      localStorage.setItem(SUGGESTIONS_STORAGE_KEY, data.suggestion);
    } catch (err: any) {
      console.error('[AIProductSuggestions] Error fetching suggestions:', err);
      setError(`Error: ${err.message || 'Could not retrieve suggestions.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to clear saved suggestions
  const clearSuggestions = () => {
    setSuggestions(null);
    localStorage.removeItem(SUGGESTIONS_STORAGE_KEY);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">AI-Powered Suggestions</h2>
      <p className="text-sm text-gray-600 mb-4">
        Get AI recommendations to improve profit margins based on current product performance. 
        Suggestions may include discontinuing products, adjusting prices, or reviewing costs.
      </p>

      <div className="flex space-x-2">
        <button
          onClick={fetchSuggestions}
          disabled={isLoading || products.length === 0}
          className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded inline-flex items-center transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed ${isLoading ? 'animate-pulse' : ''}`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Getting Suggestions...
            </>
          ) : (
            'Get AI Suggestions'
          )}
        </button>
        
        {suggestions && (
          <button
            onClick={clearSuggestions}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded inline-flex items-center transition duration-150 ease-in-out"
          >
            Clear
          </button>
        )}
      </div>
      
      {products.length === 0 && !isLoading && (
        <p className="mt-4 text-sm text-yellow-700 bg-yellow-50 p-3 rounded border border-yellow-200">
          Load product data first to get suggestions.
        </p>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {suggestions && !isLoading && (
        <div className="mt-6 bg-gray-50 p-4 rounded border border-gray-200">
          <h3 className="text-md font-semibold text-gray-800 mb-3">Recommendations:</h3>
          <div className="space-y-4">
            {/* Parse and format the AI suggestions */}
            {formatSuggestions(suggestions)}
          </div>
        </div>
      )}
    </div>
  );
} 