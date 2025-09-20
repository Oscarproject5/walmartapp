import { Database } from '../lib/supabase';

export type Sale = Database['public']['Tables']['sales']['Row'];
export type CanceledOrder = Database['public']['Tables']['canceled_orders']['Row'];

export interface ProfitBreakdown {
  revenue: number;
  shippingIncome: number;
  totalRevenue: number;
  walmartFee: number;
  costOfProduct: number;
  additionalCosts: number;
  netProfit: number;
  profitMargin: number;
}

export function calculateProfitBreakdown(
  sales: Sale[]
): ProfitBreakdown {
  // Group sales by order_number to correctly sum costs once per order
  const ordersMap = new Map<string, {
    revenue: number;
    shippingIncome: number;
    totalRevenue: number;
    walmartFee: number;
    costOfProduct: number;
    additionalCosts: number; // Fulfillment cost added once per order
  }>();

  sales.forEach(sale => {
    // Use order_number for grouping, provide a fallback if null/undefined
    const orderNumber = sale.order_number || `unknown_sale_${sale.id}`;

    const revenue = sale.sale_price * sale.quantity_sold;
    const shippingIncome = sale.shipping_fee_per_unit * sale.quantity_sold;
    const totalRevenue = revenue + shippingIncome;
    const walmartFee = totalRevenue * 0.08; // 8% Walmart fee
    const costOfProduct = sale.cost_per_unit * sale.quantity_sold;
    // IMPORTANT: Assuming sale.additional_costs holds the PER-ORDER fulfillment cost
    const fulfillmentCostForOrder = sale.additional_costs || 0;

    if (!ordersMap.has(orderNumber)) {
      ordersMap.set(orderNumber, {
        revenue: 0,
        shippingIncome: 0,
        totalRevenue: 0,
        walmartFee: 0,
        costOfProduct: 0,
        additionalCosts: fulfillmentCostForOrder, // Add cost ONCE for the new order
      });
    }

    const orderTotals = ordersMap.get(orderNumber)!;
    orderTotals.revenue += revenue;
    orderTotals.shippingIncome += shippingIncome;
    orderTotals.totalRevenue += totalRevenue;
    orderTotals.walmartFee += walmartFee;
    orderTotals.costOfProduct += costOfProduct;
    // Note: additionalCosts (fulfillment) is already set when the order was first seen
  });

  // Sum up the totals from the grouped orders
  const totals = {
    revenue: 0,
    shippingIncome: 0,
    totalRevenue: 0,
    walmartFee: 0,
    costOfProduct: 0,
    additionalCosts: 0,
  };

  for (const orderTotal of ordersMap.values()) {
    totals.revenue += orderTotal.revenue;
    totals.shippingIncome += orderTotal.shippingIncome;
    totals.totalRevenue += orderTotal.totalRevenue;
    totals.walmartFee += orderTotal.walmartFee;
    totals.costOfProduct += orderTotal.costOfProduct;
    totals.additionalCosts += orderTotal.additionalCosts;
  }

  // Calculate final netProfit and profitMargin using the correctly summed totals
  const netProfit = totals.totalRevenue - totals.walmartFee - totals.costOfProduct - totals.additionalCosts;
  const profitMargin = totals.totalRevenue > 0 ? (netProfit / totals.totalRevenue) * 100 : 0;

  return {
    ...totals,
    netProfit,
    profitMargin,
  };
}

export function calculateTotalProfits(
  sales: Sale[]
): number {
  const breakdown = calculateProfitBreakdown(sales);
  return breakdown.netProfit;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export interface ShippingSettings {
  base_shipping_cost: number;
  label_cost: number;
  cancellation_shipping_loss: number;
}

// Manually defined interfaces for use in UI components that match the database types
export interface UIShippingSettings {
  base_shipping_cost: number;
  label_cost: number;
  cancellation_shipping_loss: number;
}

export interface UICanceledOrder {
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

export function calculateCancellationLoss(order: UICanceledOrder, shippingSettings: ShippingSettings): number {
  let loss = order.refund_amount;
  
  if (order.shipping_status === 'after_shipping') {
    loss += shippingSettings.label_cost || 2.25;
    loss += shippingSettings.base_shipping_cost || 1.75;
  }
  
  return loss;
}

export function calculateTotalCancellationLosses(orders: UICanceledOrder[], shippingSettings: ShippingSettings): {
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
    const loss = calculateCancellationLoss(order, shippingSettings);
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