import { Sale, CanceledOrder } from './calculations';

interface ProfitData {
  date: string;
  revenue: number;
  profit: number;
  losses: number;
  netProfit: number;
  orders: number;
}

interface Totals {
  totalRevenue: number;
  totalProfit: number;
  totalLosses: number;
  netProfit: number;
  totalOrders: number;
  profitMargin: number;
}

export function processSalesData(
  sales: Sale[],
  canceledOrders: CanceledOrder[],
  timeframe: 'daily' | 'monthly' = 'daily'
): { data: ProfitData[]; totals: Totals } {
  console.log('Processing sales data:', {
    salesCount: sales?.length || 0,
    canceledOrdersCount: canceledOrders?.length || 0,
    timeframe
  });

  // Create a map of canceled orders by sale_id for quick lookup
  const canceledOrdersMap = new Map(
    canceledOrders.map(order => [order.sale_id, order])
  );
  console.log('Canceled orders map created with', canceledOrdersMap.size, 'entries');

  // Group sales by date, also track unique order numbers per date
  const salesByDate = new Map<string, { sales: Sale[]; orderNumbers: Set<string> }>();
  const lossesbyDate = new Map<string, number>();

  sales.forEach(sale => {
    const date = new Date(sale.sale_date);
    const dateKey = timeframe === 'daily'
      ? date.toISOString().split('T')[0]
      : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const dateEntry = salesByDate.get(dateKey) || { sales: [], orderNumbers: new Set() };
    dateEntry.sales.push(sale);
    // Use order_number, fallback if missing
    const orderNum = sale.order_number || `unknown_sale_${sale.id}`; 
    dateEntry.orderNumbers.add(orderNum);
    salesByDate.set(dateKey, dateEntry);

    // Add losses if the sale was canceled
    const canceledOrder = canceledOrdersMap.get(sale.id);
    if (canceledOrder) {
      const currentLoss = lossesbyDate.get(dateKey) || 0;
      lossesbyDate.set(dateKey, currentLoss + canceledOrder.total_loss);
    }
  });

  console.log('Sales grouped by date:', {
    uniqueDates: salesByDate.size,
    datesWithLosses: lossesbyDate.size
  });

  // Convert to array, calculate metrics, and sort by date
  const data: ProfitData[] = Array.from(salesByDate.entries())
    .map(([date, dateEntry]) => {
      const revenue = dateEntry.sales.reduce((sum, sale) => sum + sale.total_revenue, 0);
      const profit = dateEntry.sales.reduce((sum, sale) => sum + sale.net_profit, 0);
      const losses = lossesbyDate.get(date) || 0;
      const netProfit = profit - losses;
      const orders = dateEntry.orderNumbers.size;

      return {
        date,
        revenue,
        profit,
        losses,
        netProfit,
        orders,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  console.log('Processed data array created:', {
    dataPoints: data.length,
    dateRange: data.length > 0 ? `${data[0].date} to ${data[data.length - 1].date}` : 'No data'
  });

  // Calculate totals, including totalOrders
  const totals = data.reduce(
    (acc, day) => ({
      totalRevenue: acc.totalRevenue + day.revenue,
      totalProfit: acc.totalProfit + day.profit,
      totalLosses: acc.totalLosses + day.losses,
      netProfit: acc.netProfit + day.netProfit,
      totalOrders: acc.totalOrders + day.orders,
      profitMargin: 0, // Will be calculated after reduction
    }),
    { totalRevenue: 0, totalProfit: 0, totalLosses: 0, netProfit: 0, totalOrders: 0, profitMargin: 0 }
  );
  
  // Calculate profit margin
  totals.profitMargin = totals.totalRevenue > 0 ? (totals.netProfit / totals.totalRevenue) * 100 : 0;

  console.log('Totals calculated:', totals);

  return { data, totals };
}

export function aggregateMonthlyData(dailyData: ProfitData[]): ProfitData[] {
  console.log('Aggregating monthly data from', dailyData.length, 'daily records');

  const monthlyMap = new Map<string, ProfitData>();

  dailyData.forEach(day => {
    const [year, month] = day.date.split('-');
    const monthKey = `${year}-${month}`;
    
    const existing = monthlyMap.get(monthKey) || {
      date: `${monthKey}-01`,
      revenue: 0,
      profit: 0,
      losses: 0,
      netProfit: 0,
      orders: 0,
    };

    monthlyMap.set(monthKey, {
      ...existing,
      revenue: existing.revenue + day.revenue,
      profit: existing.profit + day.profit,
      losses: existing.losses + day.losses,
      netProfit: existing.netProfit + day.netProfit,
      orders: existing.orders + day.orders,
    });
  });

  const result = Array.from(monthlyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  console.log('Monthly aggregation complete:', {
    monthlyRecords: result.length,
    dateRange: result.length > 0 ? `${result[0].date} to ${result[result.length - 1].date}` : 'No data'
  });

  return result;
} 