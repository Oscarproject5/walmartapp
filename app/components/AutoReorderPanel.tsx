'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generateReorderRecommendations, shouldTriggerAutoReorder } from '../utils/auto-reorder';

interface AutoReorderPanelProps {
  className?: string;
}

// Define default settings
const DEFAULT_SETTINGS = {
  id: 'default',
  auto_reorder_enabled: false,
  minimum_profit_margin: 25,
  shipping_cost: 175,
  label_cost: 225,
  cancellation_shipping_loss: 400
};

interface RecommendationItem {
  productId: string;
  productName: string;
  currentQuantity: number;
  recommendedQuantity: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedDaysUntilStockout: number;
}

export default function AutoReorderPanel({ className = '' }: AutoReorderPanelProps) {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [settings, setSettings] = useState<any>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecommendations() {
      try {
        setIsLoading(true);
        setError(null);
        let hasError = false;

        // Fetch products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*');

        if (productsError) throw productsError;
        
        // Ensure products is an array
        const products = Array.isArray(productsData) ? productsData : [];

        // Fetch sales
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('*');

        if (salesError) throw salesError;
        
        // Ensure sales is an array
        const sales = Array.isArray(salesData) ? salesData : [];

        // Fetch settings
        let settingsData = DEFAULT_SETTINGS;
        try {
          const { data, error: settingsError } = await supabase
            .from('app_settings')
            .select('*')
            .limit(1);

          if (!settingsError && data && data.length > 0) {
            settingsData = data[0];
          }
        } catch (settingsErr) {
          console.warn('Error fetching settings, using defaults:', settingsErr);
          // Continue with default settings
        }

        setSettings(settingsData);

        // Generate recommendations with proper error handling
        let recs: RecommendationItem[] = [];
        try {
          recs = generateReorderRecommendations(products, sales, {
            minimum_profit_margin: settingsData.minimum_profit_margin || 25
          });
          setRecommendations(recs);
        } catch (recError) {
          console.error('Error generating recommendations:', recError);
          setRecommendations([]);
          setError('Failed to generate recommendations');
          hasError = true;
        }

        // Only proceed with auto-reorder if there was no error
        if (!hasError && Array.isArray(recs) && recs.length > 0 && settingsData) {
          try {
            for (const rec of recs) {
              if (shouldTriggerAutoReorder(rec, {
                auto_reorder_enabled: !!settingsData.auto_reorder_enabled,
                minimum_profit_margin: settingsData.minimum_profit_margin || 25
              })) {
                // Create a notification or trigger the reorder process
                await supabase
                  .from('ai_recommendations')
                  .insert({
                    type: 'reorder',
                    product_id: rec.productId,
                    recommendation: `Reorder ${rec.recommendedQuantity} units of ${rec.productName}`,
                    explanation: rec.reason,
                    suggested_action: 'Place reorder',
                    impact_analysis: {
                      current_profit: 0, // This would need to be calculated
                      projected_profit: 0, // This would need to be calculated
                      confidence_score: 0.95
                    }
                  });
              }
            }
          } catch (triggerError) {
            console.error('Error triggering auto-reorder:', triggerError);
            // Continue execution - don't throw here as we've already got recommendations
          }
        }
      } catch (err) {
        console.error('Error loading reorder recommendations:', err);
        setError('Failed to load reorder recommendations');
        setRecommendations([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadRecommendations();
  }, []);

  if (isLoading) {
    return (
      <div className={`card ${className}`}>
        <div className="card-header">
          <h2 className="card-title">Inventory Reorder Recommendations</h2>
        </div>
        <div className="card-content">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-slate-200 rounded"></div>
              <div className="h-4 bg-slate-200 rounded"></div>
              <div className="h-4 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`card ${className}`}>
        <div className="card-header">
          <h2 className="card-title">Inventory Reorder Recommendations</h2>
        </div>
        <div className="card-content">
          <div className="p-4 border-l-4 border-red-400 bg-red-50 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      <div className="card-header flex justify-between items-center">
        <h2 className="card-title">Inventory Reorder Recommendations</h2>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-slate-500 font-medium">Auto-reorder</span>
          <button
            onClick={async () => {
              try {
                const newSettings = { ...settings, auto_reorder_enabled: !settings.auto_reorder_enabled };
                await supabase
                  .from('app_settings')
                  .update({ auto_reorder_enabled: !settings.auto_reorder_enabled })
                  .eq('id', settings.id);
                setSettings(newSettings);
              } catch (err) {
                console.error('Error updating settings:', err);
                setError('Failed to update auto-reorder setting');
              }
            }}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              settings?.auto_reorder_enabled ? 'bg-primary-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings?.auto_reorder_enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="card-content">
        {recommendations.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-slate-50/50 rounded-lg border border-slate-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-medium">No reorder recommendations at this time.</p>
            <p className="text-sm mt-1">All inventory levels are currently optimal.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map(rec => (
              <div
                key={rec.productId}
                className={`border rounded-xl p-4 transition-all duration-300 hover:shadow-md ${
                  rec.priority === 'high'
                    ? 'border-red-200 bg-gradient-to-br from-red-50 to-white'
                    : rec.priority === 'medium'
                    ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-white'
                    : 'border-slate-200 bg-gradient-to-br from-slate-50 to-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-slate-900">{rec.productName}</h4>
                    <p className="text-sm text-slate-600 mt-1">{rec.reason}</p>
                  </div>
                  {rec.recommendedQuantity > 0 && (
                    <button
                      onClick={() => {
                        // Handle reorder action
                      }}
                      className="btn btn-primary text-sm flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Reorder {rec.recommendedQuantity}
                    </button>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-700">
                    Current: {rec.currentQuantity} units
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    rec.estimatedDaysUntilStockout < 7 
                      ? 'bg-red-100 text-red-800' 
                      : rec.estimatedDaysUntilStockout < 14 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-green-100 text-green-800'
                  }`}>
                    {rec.estimatedDaysUntilStockout} days until stockout
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    rec.priority === 'high' 
                      ? 'bg-red-100 text-red-800' 
                      : rec.priority === 'medium' 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-blue-100 text-blue-800'
                  }`}>
                    {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)} priority
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 