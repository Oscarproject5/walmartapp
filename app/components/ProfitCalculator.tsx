'use client';

import { ProfitBreakdown, formatCurrency, formatPercentage } from '../utils/calculations';

interface ProfitCalculatorProps {
  breakdown: ProfitBreakdown;
  showFormulas?: boolean;
}

export default function ProfitCalculator({ breakdown, showFormulas = true }: ProfitCalculatorProps) {
  const formulas = {
    revenue: 'walmart_price_per_unit × quantity',
    shippingIncome: 'shipping_fee_per_unit × quantity',
    totalRevenue: 'revenue + shipping_income',
    walmartFee: 'total_revenue × 0.08',
    costOfProduct: 'cost_per_unit × quantity',
    netProfit: 'total_revenue - walmart_fee - cost_of_product - additional_costs',
    profitMargin: '(net_profit / total_revenue) × 100',
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Profit Breakdown</h3>
      
      <div className="space-y-4">
        {/* Revenue */}
        <div className="border-b border-gray-200 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Revenue</h4>
              {showFormulas && (
                <p className="text-xs text-gray-400 mt-1 font-mono">{formulas.revenue}</p>
              )}
            </div>
            <span className="text-lg font-medium text-gray-900">{formatCurrency(breakdown.revenue)}</span>
          </div>
        </div>

        {/* Shipping Income */}
        <div className="border-b border-gray-200 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Shipping Income</h4>
              {showFormulas && (
                <p className="text-xs text-gray-400 mt-1 font-mono">{formulas.shippingIncome}</p>
              )}
            </div>
            <span className="text-lg font-medium text-gray-900">{formatCurrency(breakdown.shippingIncome)}</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="border-b border-gray-200 pb-4 bg-gray-50 -mx-6 px-6">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Total Revenue</h4>
              {showFormulas && (
                <p className="text-xs text-gray-400 mt-1 font-mono">{formulas.totalRevenue}</p>
              )}
            </div>
            <span className="text-lg font-bold text-gray-900">{formatCurrency(breakdown.totalRevenue)}</span>
          </div>
        </div>

        {/* Costs Section */}
        <div className="space-y-3">
          {/* Walmart Fee */}
          <div className="flex justify-between items-start text-red-600">
            <div>
              <h4 className="text-sm font-medium">Walmart Fee</h4>
              {showFormulas && (
                <p className="text-xs text-gray-400 mt-1 font-mono">{formulas.walmartFee}</p>
              )}
            </div>
            <span className="text-lg font-medium">-{formatCurrency(breakdown.walmartFee)}</span>
          </div>

          {/* Cost of Product */}
          <div className="flex justify-between items-start text-red-600">
            <div>
              <h4 className="text-sm font-medium">Cost of Product</h4>
              {showFormulas && (
                <p className="text-xs text-gray-400 mt-1 font-mono">{formulas.costOfProduct}</p>
              )}
            </div>
            <span className="text-lg font-medium">-{formatCurrency(breakdown.costOfProduct)}</span>
          </div>

          {/* Additional Costs */}
          <div className="flex justify-between items-start text-red-600">
            <div>
              <h4 className="text-sm font-medium">Additional Costs</h4>
              <p className="text-xs text-gray-400">Shipping & handling</p>
            </div>
            <span className="text-lg font-medium">-{formatCurrency(breakdown.additionalCosts)}</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Net Profit</h4>
              {showFormulas && (
                <p className="text-xs text-gray-400 mt-1 font-mono">{formulas.netProfit}</p>
              )}
            </div>
            <span className={`text-xl font-bold ${
              breakdown.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(breakdown.netProfit)}
            </span>
          </div>
        </div>

        {/* Profit Margin */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Profit Margin</h4>
              {showFormulas && (
                <p className="text-xs text-gray-400 mt-1 font-mono">{formulas.profitMargin}</p>
              )}
            </div>
            <span className={`text-lg font-medium ${
              breakdown.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatPercentage(breakdown.profitMargin)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 