'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/calculations';
import type { Database } from '../lib/supabase';

type DBCanceledOrder = Database['public']['Tables']['canceled_orders']['Row'];
type AppSettings = Database['public']['Tables']['app_settings']['Row'];

// Define UI interface locally to avoid type conflicts
interface UICanceledOrder {
  id: string;
  order_number: string;
  product_id: string;
  product_name: string;
  quantity: number;
  canceled_date: string;
  reason: string;
  shipping_status: 'before_shipping' | 'after_shipping';
  refund_amount: number;
  shipping_loss: number;
}

// Manual implementation of calculation function since type issues are preventing import
function calculateTotalCancellationLosses(orders: UICanceledOrder[], appSettings: AppSettings): {
  totalLoss: number;
  beforeShippingLoss: number;
  afterShippingLoss: number;
  totalOrders: number;
  beforeShippingOrders: number;
  afterShippingOrders: number;
} {
  const result = {
    totalLoss: 0,
    beforeShippingLoss: 0,
    afterShippingLoss: 0,
    totalOrders: orders.length,
    beforeShippingOrders: 0,
    afterShippingOrders: 0
  };
  
  orders.forEach(order => {
    let loss = order.refund_amount;
    
    if (order.shipping_status === 'after_shipping') {
      loss += appSettings.label_cost || 0;
      loss += appSettings.shipping_base_cost || 0;
    }
    
    result.totalLoss += loss;
    
    if (order.shipping_status === 'before_shipping') {
      result.beforeShippingLoss += loss;
      result.beforeShippingOrders++;
    } else {
      result.afterShippingLoss += loss;
      result.afterShippingOrders++;
    }
  });
  
  return result;
}

// Function to convert DB canceled orders to UI format
const convertToUICanceledOrders = (orders: DBCanceledOrder[]): UICanceledOrder[] => {
  return orders.map(order => ({
    id: order.id,
    order_number: order.sale_id || '',  // Using sale_id as order_number
    product_id: order.sale_id || '',    // Using sale_id as product_id
    product_name: 'Product', // Placeholder since we don't have the actual name
    quantity: 1, // Default value since we don't have the actual quantity
    canceled_date: order.cancellation_date,
    reason: order.notes || '',
    shipping_status: order.cancellation_type as 'before_shipping' | 'after_shipping',
    refund_amount: order.product_cost_loss || 0,
    shipping_loss: order.shipping_cost_loss || 0
  }));
};

export default function CanceledOrdersStats() {
  const [canceledOrders, setCanceledOrders] = useState<DBCanceledOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    loadCanceledOrders();
    loadAppSettings();
  }, []);

  const loadAppSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setAppSettings(data);
      } else {
        // @ts-ignore - Adding user_id in the object below
        setAppSettings({
          id: '',
          shipping_base_cost: 5.00,
          label_cost: 1.00,
          cancellation_shipping_loss: 5.00,
          minimum_profit_margin: 10.00,
          auto_reorder_enabled: false,
          auto_price_adjustment_enabled: false,
          openrouter_api_key: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: '',
        });
      }
    } catch (err) {
      console.error('Error loading app settings:', err);
      setError('Failed to load application settings.');
      // @ts-ignore - Adding user_id in the object below
      setAppSettings({
        id: '',
        shipping_base_cost: 5.00,
        label_cost: 1.00,
        cancellation_shipping_loss: 5.00,
        minimum_profit_margin: 10.00,
        auto_reorder_enabled: false,
        auto_price_adjustment_enabled: false,
        openrouter_api_key: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: '',
      });
    }
  };

  const loadCanceledOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('canceled_orders')
        .select('*')
        .order('cancellation_date', { ascending: false });

      if (error) throw error;
      setCanceledOrders(data || []);
    } catch (err) {
      console.error('Error loading canceled orders:', err);
      setError('Failed to load canceled orders');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !appSettings) {
    return <div className="text-center py-4">Loading canceled orders stats...</div>;
  }

  if (error) {
    return <div className="text-red-600 py-4">{error}</div>;
  }

  const uiCanceledOrders = convertToUICanceledOrders(canceledOrders);
  const stats = calculateTotalCancellationLosses(uiCanceledOrders, appSettings);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Canceled Orders Summary</h2>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Cancellations Card */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cancellations</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalOrders}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Before Shipping: {stats.beforeShippingOrders}</p>
              <p className="text-xs text-gray-500">After Shipping: {stats.afterShippingOrders}</p>
            </div>
          </div>
        </div>

        {/* Total Losses Card */}
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Total Losses</p>
              <p className="mt-1 text-2xl font-semibold text-red-700">
                {formatCurrency(stats.totalLoss)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-red-600">
                Before Shipping: {formatCurrency(stats.beforeShippingLoss)}
              </p>
              <p className="text-xs text-red-600">
                After Shipping: {formatCurrency(stats.afterShippingLoss)}
              </p>
            </div>
          </div>
        </div>

        {/* Average Loss per Cancellation */}
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Avg. Loss per Cancellation</p>
              <p className="mt-1 text-2xl font-semibold text-orange-700">
                {formatCurrency(stats.totalOrders ? stats.totalLoss / stats.totalOrders : 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Cancellations Table */}
      <div className="mt-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">Recent Cancellations</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loss
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {canceledOrders.slice(0, 5).map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(order.cancellation_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.cancellation_type === 'before_shipping' ? 'Before Shipping' : 'After Shipping'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                    {formatCurrency(order.total_loss)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 