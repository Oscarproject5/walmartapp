import { Sale } from './calculations';

interface Product {
  id: string;
  name: string;
  quantity: number;
  cost_per_unit: number;
}

export interface ProductAnalyticsData {
  id: string;
  name: string;
  totalQuantitySold: number;
  averageQuantityPerOrder: number;
  totalRevenue: number;
  averageRevenue: number;
  profitMargin: number;
  saleDate: string;
}

interface ProductSalesData {
  totalQuantity: number;
  totalOrders: number;
  totalRevenue: number;
  totalCost: number;
  lastSaleDate: string;
}

export function calculateProductAnalytics(
  products: Product[],
  sales: Sale[]
): ProductAnalyticsData[] {
  // Create a map to aggregate sales data by product
  const productSalesMap = new Map<string, ProductSalesData>();

  // Initialize product sales data
  products.forEach(product => {
    productSalesMap.set(product.id, {
      totalQuantity: 0,
      totalOrders: 0,
      totalRevenue: 0,
      totalCost: 0,
      lastSaleDate: '',
    });
  });

  // Aggregate sales data
  sales.forEach(sale => {
    const productData = productSalesMap.get(sale.product_id);
    if (productData) {
      productData.totalQuantity += sale.quantity_sold;
      productData.totalOrders += 1;
      productData.totalRevenue += sale.total_revenue;
      productData.totalCost += sale.cost_per_unit * sale.quantity_sold;
      
      // Update last sale date if this sale is more recent
      if (!productData.lastSaleDate || new Date(sale.sale_date) > new Date(productData.lastSaleDate)) {
        productData.lastSaleDate = sale.sale_date;
      }
    }
  });

  // Calculate analytics for each product
  return products.map(product => {
    const salesData = productSalesMap.get(product.id) || {
      totalQuantity: 0,
      totalOrders: 0,
      totalRevenue: 0,
      totalCost: 0,
      lastSaleDate: '',
    };

    const averageQuantityPerOrder = salesData.totalOrders > 0
      ? salesData.totalQuantity / salesData.totalOrders
      : 0;

    const averageRevenue = salesData.totalOrders > 0
      ? salesData.totalRevenue / salesData.totalOrders
      : 0;

    const profitMargin = salesData.totalRevenue > 0
      ? ((salesData.totalRevenue - salesData.totalCost) / salesData.totalRevenue) * 100
      : 0;

    return {
      id: product.id,
      name: product.name,
      totalQuantitySold: salesData.totalQuantity,
      averageQuantityPerOrder,
      totalRevenue: salesData.totalRevenue,
      averageRevenue,
      profitMargin,
      saleDate: salesData.lastSaleDate,
    };
  });
} 