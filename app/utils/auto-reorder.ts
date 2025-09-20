import { Database } from '../lib/supabase';

type Product = Database['public']['Tables']['products']['Row'];
type Sale = Database['public']['Tables']['sales']['Row'];

interface ReorderRecommendation {
  productId: string;
  productName: string;
  currentQuantity: number;
  recommendedQuantity: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedDaysUntilStockout: number;
}

interface SalesVelocity {
  dailyAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export function calculateSalesVelocity(sales: Sale[], productId: string): SalesVelocity {
  const productSales = sales.filter(sale => sale.product_id === productId);
  
  if (productSales.length === 0) {
    return {
      dailyAverage: 0,
      weeklyAverage: 0,
      monthlyAverage: 0,
      trend: 'stable'
    };
  }

  // Sort sales by date
  const sortedSales = [...productSales].sort((a, b) => 
    new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime()
  );

  // Calculate date ranges
  const lastSaleDate = new Date(sortedSales[sortedSales.length - 1].sale_date);
  const firstSaleDate = new Date(sortedSales[0].sale_date);
  const totalDays = Math.max(1, Math.ceil((lastSaleDate.getTime() - firstSaleDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Calculate total quantity sold
  const totalQuantity = sortedSales.reduce((sum, sale) => sum + sale.quantity_sold, 0);

  // Calculate averages
  const dailyAverage = totalQuantity / totalDays;
  const weeklyAverage = dailyAverage * 7;
  const monthlyAverage = dailyAverage * 30;

  // Calculate trend
  const recentSales = sortedSales.slice(-14); // Last 14 days
  const olderSales = sortedSales.slice(-28, -14); // 14 days before that

  const recentAverage = recentSales.reduce((sum, sale) => sum + sale.quantity_sold, 0) / 14;
  const olderAverage = olderSales.reduce((sum, sale) => sum + sale.quantity_sold, 0) / 14;

  let trend: 'increasing' | 'stable' | 'decreasing';
  const trendThreshold = 0.1; // 10% change threshold

  if (recentAverage > olderAverage * (1 + trendThreshold)) {
    trend = 'increasing';
  } else if (recentAverage < olderAverage * (1 - trendThreshold)) {
    trend = 'decreasing';
  } else {
    trend = 'stable';
  }

  return {
    dailyAverage,
    weeklyAverage,
    monthlyAverage,
    trend
  };
}

export function generateReorderRecommendations(
  products: Product[],
  sales: Sale[],
  settings: { minimum_profit_margin: number }
): ReorderRecommendation[] {
  return products.map(product => {
    const velocity = calculateSalesVelocity(sales, product.id);
    const daysUntilStockout = product.quantity / Math.max(velocity.dailyAverage, 0.01);
    
    // Calculate recommended quantity based on sales velocity and trend
    let recommendedQuantity = Math.ceil(velocity.monthlyAverage * 1.5); // 1.5 months of stock
    if (velocity.trend === 'increasing') {
      recommendedQuantity = Math.ceil(recommendedQuantity * 1.2); // Add 20% for increasing trend
    } else if (velocity.trend === 'decreasing') {
      recommendedQuantity = Math.ceil(recommendedQuantity * 0.8); // Reduce by 20% for decreasing trend
    }

    // Determine priority based on days until stockout
    let priority: 'high' | 'medium' | 'low';
    let reason: string;

    if (daysUntilStockout <= 7) {
      priority = 'high';
      reason = `Critical inventory level: Only ${Math.ceil(daysUntilStockout)} days of stock remaining`;
    } else if (daysUntilStockout <= 14) {
      priority = 'medium';
      reason = `Low inventory: ${Math.ceil(daysUntilStockout)} days of stock remaining`;
    } else {
      priority = 'low';
      reason = `Adequate inventory: ${Math.ceil(daysUntilStockout)} days of stock remaining`;
    }

    // Adjust recommendation based on minimum profit margin
    const recentSales = sales
      .filter(sale => sale.product_id === product.id)
      .slice(-30); // Last 30 days

    const averageProfitMargin = recentSales.reduce((sum, sale) => sum + sale.profit_margin, 0) / recentSales.length;

    if (averageProfitMargin < settings.minimum_profit_margin) {
      priority = 'low';
      reason = `Below minimum profit margin of ${settings.minimum_profit_margin}%. Review pricing before reordering.`;
      recommendedQuantity = 0;
    }

    return {
      productId: product.id,
      productName: product.name,
      currentQuantity: product.quantity,
      recommendedQuantity,
      reason,
      priority,
      estimatedDaysUntilStockout: Math.ceil(daysUntilStockout)
    };
  });
}

export function shouldTriggerAutoReorder(
  recommendation: ReorderRecommendation,
  settings: { auto_reorder_enabled: boolean; minimum_profit_margin: number }
): boolean {
  if (!settings.auto_reorder_enabled) return false;

  return (
    recommendation.priority === 'high' &&
    recommendation.estimatedDaysUntilStockout <= 7 &&
    recommendation.recommendedQuantity > 0
  );
} 