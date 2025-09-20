'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceLine,
  Label
} from 'recharts';
import { formatCurrency } from '../utils/calculations';

interface ProfitData {
  date: string;
  revenue: number;
  profit: number;
  losses: number;
  netProfit: number;
}

interface ProfitReportsProps {
  dailyData: ProfitData[];
  monthlyData: ProfitData[];
  totals: {
    totalRevenue: number;
    totalProfit: number;
    totalLosses: number;
    netProfit: number;
  };
}

export default function ProfitReports({ dailyData, monthlyData, totals }: ProfitReportsProps) {
  const [timeframe, setTimeframe] = useState<'daily' | 'monthly'>('daily');
  
  console.log('ProfitReports rendered with:', {
    dailyDataLength: dailyData?.length || 0,
    monthlyDataLength: monthlyData?.length || 0,
    totals,
    timeframe
  });

  // Log data when timeframe changes
  useEffect(() => {
    console.log('Timeframe changed to:', timeframe);
    console.log('Current data:', timeframe === 'daily' ? dailyData : monthlyData);
  }, [timeframe, dailyData, monthlyData]);

  return (
    <div className="card overflow-visible">
      <div className="card-header">
        <h2 className="card-title">Profit Reports</h2>
      </div>
      <div className="card-content space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <SummaryCard
            title="Total Revenue"
            amount={totals.totalRevenue}
            color="primary"
            icon="📈"
          />
          <SummaryCard
            title="Total Profit"
            amount={totals.totalProfit}
            color="secondary"
            icon="💰"
          />
          <SummaryCard
            title="Total Losses"
            amount={totals.totalLosses}
            color="error"
            icon="📉"
          />
          <SummaryCard
            title="Net Profit"
            amount={totals.netProfit}
            color={totals.netProfit >= 0 ? 'secondary' : 'error'}
            icon="💵"
          />
        </div>

        {/* Graph Controls */}
        <div className="flex justify-between items-center">
          <h3 className="text-base font-medium text-slate-800">Profit Trends</h3>
          <div className="flex p-0.5 bg-slate-100 rounded-lg shadow-sm">
            <button
              onClick={() => {
                console.log('Switching to daily view');
                setTimeframe('daily');
              }}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                timeframe === 'daily'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-slate-600 hover:text-primary-600'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => {
                console.log('Switching to monthly view');
                setTimeframe('monthly');
              }}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                timeframe === 'monthly'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-slate-600 hover:text-primary-600'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Enhanced Profit Chart */}
        <div className="glass rounded-xl p-4 h-[350px] md:h-[400px] shadow-sm">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={timeframe === 'daily' ? dailyData : monthlyData}
              margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorLosses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorNetProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return timeframe === 'daily'
                    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }}
                tick={{ fontSize: 11, fill: '#64748b' }}
                stroke="#cbd5e1"
                axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                tickLine={{ stroke: '#cbd5e1' }}
              />
              
              <YAxis 
                tickFormatter={(value) => `$${(value/100).toFixed(0)}`} 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                stroke="#cbd5e1"
                axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                tickLine={{ stroke: '#cbd5e1' }}
              />
              
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return timeframe === 'daily'
                    ? date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                    : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                }}
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                  padding: '10px 14px'
                }}
                itemStyle={{ fontSize: '12px' }}
                labelStyle={{ fontWeight: 'bold', marginBottom: '5px' }}
              />
              
              <Legend 
                iconSize={10} 
                wrapperStyle={{ 
                  fontSize: '12px',
                  paddingTop: '8px'
                }} 
                align="center"
                verticalAlign="bottom"
                layout="horizontal"
              />
              
              <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3">
                <Label value="Break Even" position="insideBottomRight" fill="#94a3b8" fontSize={10} />
              </ReferenceLine>
              
              <Area 
                type="monotone" 
                dataKey="revenue" 
                fill="url(#colorRevenue)" 
                stroke="#4F46E5" 
                name="Revenue" 
                strokeWidth={2}
                activeDot={{ r: 6, strokeWidth: 0 }}
                dot={{ r: 1, strokeWidth: 0 }}
                isAnimationActive={true}
                animationDuration={1000}
              />
              
              <Area 
                type="monotone" 
                dataKey="profit" 
                fill="url(#colorProfit)" 
                stroke="#10B981" 
                name="Profit" 
                strokeWidth={2}
                activeDot={{ r: 6, strokeWidth: 0 }}
                dot={{ r: 1, strokeWidth: 0 }}
                isAnimationActive={true}
                animationDuration={1000}
              />
              
              <Area 
                type="monotone" 
                dataKey="losses" 
                fill="url(#colorLosses)" 
                stroke="#F43F5E" 
                name="Losses" 
                strokeWidth={2}
                activeDot={{ r: 6, strokeWidth: 0 }}
                dot={{ r: 1, strokeWidth: 0 }}
                isAnimationActive={true}
                animationDuration={1000}
              />
              
              <Line 
                type="monotone" 
                dataKey="netProfit" 
                stroke="#8B5CF6" 
                strokeWidth={3}
                name="Net Profit" 
                activeDot={{ r: 8, strokeWidth: 1, stroke: '#fff' }}
                dot={{ r: 0 }}
                isAnimationActive={true}
                animationDuration={1000}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, amount, color, icon }: { title: string; amount: number; color: string; icon: string }) {
  const colorClasses = {
    primary: 'text-primary-600',
    secondary: 'text-secondary-600',
    accent: 'text-accent-600',
    error: 'text-red-600',
  };

  const bgColorClasses = {
    primary: 'bg-primary-50',
    secondary: 'bg-secondary-50',
    accent: 'bg-accent-50',
    error: 'bg-red-50',
  };

  return (
    <div className="glass rounded-xl p-4 hover:shadow-lg transition-all duration-300">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xs font-medium text-slate-500">{title}</h3>
          <p className={`mt-1 text-xl font-semibold ${colorClasses[color as keyof typeof colorClasses]}`}>
            {formatCurrency(amount)}
          </p>
        </div>
        <div className={`w-8 h-8 ${bgColorClasses[color as keyof typeof bgColorClasses]} rounded-lg flex items-center justify-center`}>
          <span className="text-sm" role="img" aria-label={title}>{icon}</span>
        </div>
      </div>
    </div>
  );
} 