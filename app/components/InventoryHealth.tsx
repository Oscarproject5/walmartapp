'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { formatCurrency } from '../utils/calculations';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { AlertCircle, Activity, TrendingUp, XCircle } from 'lucide-react';

interface InventoryHealthProps {
  className?: string;
  refresh?: number;
}

interface ProductData {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  cost_per_item: number;
  stock_value?: number;
  supplier?: string;
  source?: string;
  status?: 'active' | 'low_stock' | 'out_of_stock';
}

interface StatusCount {
  active: number;
  low_stock: number;
  out_of_stock: number;
}

interface StatusValue {
  active: number;
  low_stock: number;
  out_of_stock: number;
}

interface ChartDataItem {
  name: string;
  value: number;
  color?: string;
}

// Define the different inventory status categories
const STATUSES = ['active', 'low_stock', 'out_of_stock'];
const STATUS_COLORS: Record<string, string> = {
  active: '#10B981', // green
  low_stock: '#F59E0B', // amber
  out_of_stock: '#EF4444', // red
  total: '#3B82F6', // blue
};

// Action Card component
interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: 'blue' | 'amber' | 'purple' | 'green' | 'red';
  url: string;
}

export default function InventoryHealth({ className = '', refresh = 0 }: InventoryHealthProps) {
  const [inventoryData, setInventoryData] = useState<ProductData[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<ChartDataItem[]>([]);
  const [valueByStatus, setValueByStatus] = useState<ChartDataItem[]>([]);
  const [supplierDistribution, setSupplierDistribution] = useState<ChartDataItem[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  // Get the current user's ID
  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    getUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      console.log('InventoryHealth: User ID available, fetching data...');
      fetchInventoryData();
    }
  }, [refresh, userId]);

  async function fetchInventoryData() {
    try {
      setIsLoading(true);
      console.log('InventoryHealth: Fetching inventory data from database...');
      
      // Fetch products for the current user
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      if (products) {
        console.log(`InventoryHealth: Retrieved ${products.length} products from database`);
        setInventoryData(products);
        
        // Calculate status distribution
        const statusCounts: StatusCount = {
          active: 0,
          low_stock: 0,
          out_of_stock: 0
        };
        
        products.forEach(product => {
          const status = product.status || 'active';
          if (status in statusCounts) {
            statusCounts[status as keyof StatusCount]++;
          }
        });
        
        const statusData = Object.entries(statusCounts).map(([status, count]) => ({
          name: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: count,
          color: STATUS_COLORS[status]
        }));
        
        setStatusDistribution(statusData);
        
        // Calculate inventory value by status
        const valueByStatus: StatusValue = {
          active: 0,
          low_stock: 0,
          out_of_stock: 0
        };
        
        products.forEach(product => {
          const status = product.status || 'active';
          if (status in valueByStatus) {
            valueByStatus[status as keyof StatusValue] += (product.stock_value || (product.quantity * product.cost_per_item)) || 0;
          }
        });
        
        const valueData = Object.entries(valueByStatus).map(([status, value]) => ({
          name: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: value,
          color: STATUS_COLORS[status]
        }));
        
        setValueByStatus(valueData);
        
        // Calculate supplier distribution
        const supplierCounts: Record<string, number> = {};
        products.forEach(product => {
          const supplier = product.supplier || product.source || 'unknown';
          if (!supplierCounts[supplier]) {
            supplierCounts[supplier] = 0;
          }
          supplierCounts[supplier]++;
        });
        
        const supplierData = Object.entries(supplierCounts)
          .map(([supplier, count]) => ({
            name: supplier,
            value: count
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5); // Get top 5 suppliers
        
        setSupplierDistribution(supplierData);
        
        // Generate mock historical data (would be replaced with real data in production)
        const mockHistoricalData = [];
        const today = new Date();
        for (let i = 30; i >= 0; i--) {
          const date = new Date();
          date.setDate(today.getDate() - i);
          
          mockHistoricalData.push({
            date: date.toISOString().split('T')[0],
            active: Math.floor(Math.random() * 20) + (statusCounts.active - 10),
            lowStock: Math.floor(Math.random() * 10) + (statusCounts.low_stock - 5),
            outOfStock: Math.floor(Math.random() * 8) + (statusCounts.out_of_stock - 4)
          });
        }
        
        setHistoricalData(mockHistoricalData);
        
        // Generate recommendations
        const recommendations = [];
        
        // Check for low stock items
        if (statusCounts.low_stock > 0) {
          recommendations.push(`${statusCounts.low_stock} products are running low on stock. Consider restocking soon.`);
        }
        
        // Check for out of stock items
        if (statusCounts.out_of_stock > 0) {
          recommendations.push(`${statusCounts.out_of_stock} products are out of stock. Review and restock these items.`);
        }
        
        // Check for high value products distribution
        const highValueProducts = products.filter(p => (p.stock_value || (p.quantity * p.cost_per_item)) > 500);
        if (highValueProducts.length > 0) {
          recommendations.push(`You have ${highValueProducts.length} high-value products (>$500) in your inventory. Ensure these are properly managed.`);
        }
        
        // Check inventory balance
        const totalValue = products.reduce((sum, p) => sum + (p.stock_value || (p.quantity * p.cost_per_item) || 0), 0);
        const avgValue = totalValue / products.length;
        
        if (avgValue > 200) {
          recommendations.push(`Your average product value ($${avgValue.toFixed(2)}) is relatively high. Consider diversifying with some lower cost items.`);
        }
        
        setRecommendations(recommendations);
      }
    } catch (error) {
      console.error('Error fetching inventory health data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-slate-200 rounded"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Health Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Inventory Health Score */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Inventory Health Score</h3>
          <div className="flex items-end space-x-2">
            <div className="text-3xl font-bold text-blue-600">
              {calculateHealthScore(statusDistribution)}/100
            </div>
            <div className="text-sm text-gray-500 mb-1 flex items-center gap-1">
              {getHealthStatus(calculateHealthScore(statusDistribution))}
            </div>
          </div>
          <div className="mt-2 bg-slate-100 rounded-full h-2.5">
            <div 
              className="h-2.5 rounded-full" 
              style={{
                width: `${calculateHealthScore(statusDistribution)}%`,
                backgroundColor: getHealthScoreColor(calculateHealthScore(statusDistribution))
              }}
            ></div>
          </div>
        </div>
        
        {/* Inventory Value */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Total Inventory Value</h3>
          <div className="text-3xl font-bold text-purple-600">
            {formatCurrency(inventoryData.reduce((sum, item) => sum + (item.stock_value || (item.quantity * item.cost_per_item) || 0), 0))}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Across {inventoryData.length} total products
          </div>
        </div>
        
        {/* Stock Status */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Current Stock Status</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {statusDistribution.map((status) => (
              <div 
                key={status.name} 
                className="px-3 py-1.5 rounded-lg flex items-center text-sm" 
                style={{ backgroundColor: `${status.color}20`, color: status.color }}
              >
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: status.color }}></div>
                <span className="font-medium">{status.name}:</span>&nbsp;
                <span>{status.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Status Distribution Chart */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <h3 className="text-base font-medium text-gray-900 mb-4">Inventory Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Products']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Value by Status Chart */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <h3 className="text-base font-medium text-gray-900 mb-4">Inventory Value by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={valueByStatus}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Value']} />
                <Legend />
                <Bar dataKey="value" fill="#8884d8">
                  {valueByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Top Suppliers Chart */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <h3 className="text-base font-medium text-gray-900 mb-4">Top Suppliers</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={supplierDistribution}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#6366F1" name="Products" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Stock Level Trends Chart */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <h3 className="text-base font-medium text-gray-900 mb-4">Stock Level Trends (30 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={historicalData}
                margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  angle={-45} 
                  textAnchor="end"
                  height={60}
                  interval={4}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                />
                <Legend />
                <Line type="monotone" dataKey="active" stroke={STATUS_COLORS.active} name="Active Items" dot={false} />
                <Line type="monotone" dataKey="lowStock" stroke={STATUS_COLORS.low_stock} name="Low Stock Items" dot={false} />
                <Line type="monotone" dataKey="outOfStock" stroke={STATUS_COLORS.out_of_stock} name="Out of Stock Items" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Recommendations & Insights */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 mb-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">Recommendations & Insights</h3>
        
        {recommendations.length === 0 ? (
          <p className="text-gray-500">Your inventory appears to be in good health. No specific recommendations at this time.</p>
        ) : (
          <ul className="space-y-3">
            {recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="rounded-full bg-blue-100 p-1 mt-0.5">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-gray-700">{recommendation}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Action Steps */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <h3 className="text-base font-medium text-gray-900 mb-4">Suggested Actions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard 
            title="Restock Low Items" 
            description="Review and restock the items that are running low or out of stock."
            icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
            color="amber"
            url="/inventory/restock"
          />
          
          <ActionCard 
            title="Optimize Inventory" 
            description="Analyze inventory turnover and adjust stock levels to improve efficiency."
            icon={<Activity className="h-5 w-5 text-purple-500" />}
            color="purple"
            url="/inventory/optimize"
          />
          
          <ActionCard 
            title="Supplier Analysis" 
            description="Review supplier performance and diversify sources if needed."
            icon={<TrendingUp className="h-5 w-5 text-green-500" />}
            color="green"
            url="/inventory/suppliers"
          />
        </div>
      </div>
    </div>
  );
}

// Helper components and functions
function ActionCard({ title, description, icon, color, url }: ActionCardProps) {
  const colorClasses: Record<ActionCardProps['color'], string> = {
    blue: 'border-blue-500',
    amber: 'border-amber-500',
    purple: 'border-purple-500',
    green: 'border-green-500',
    red: 'border-red-500',
  };
  
  const renderIcon = () => {
    if (color === 'amber')
      return <AlertCircle className="h-5 w-5 text-amber-500" />;
    if (color === 'purple')
      return <Activity className="h-5 w-5 text-purple-500" />;
    if (color === 'green') return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (color === 'red') return <XCircle className="h-5 w-5 text-red-500" />;
    return null; // Default case
  };
  
  return (
    <a href={url} className={`block p-4 border rounded-lg hover:shadow-md transition-shadow ${colorClasses[color]}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-full bg-${color}-100`}>
          {renderIcon()}
        </div>
        <h4 className="font-medium">{title}</h4>
      </div>
      <p className="text-sm opacity-90">{description}</p>
    </a>
  );
}

// Calculate health score based on inventory status
function calculateHealthScore(statusData: ChartDataItem[]) {
  if (!statusData || statusData.length === 0) return 0;

  // Initialize counts with expected keys, ensuring type compatibility
  const counts: { [key: string]: number } = {
    'Active': 0,
    'Low Stock': 0,
    'Out Of Stock': 0,
  };

  statusData.forEach((item) => {
    // Use the name from the item to update counts
    counts[item.name] = item.value;
  });

  // Access counts using string keys
  const total = counts['Active'] + counts['Low Stock'] + counts['Out Of Stock'];
  if (total === 0) return 0;

  // Formula: (100% * active + 40% * low_stock) / total
  // Out of stock items contribute 0 to the score
  const score =
    ((counts['Active'] * 1.0) + (counts['Low Stock'] * 0.4)) / total * 100;

  return Math.round(score);
}

// Get health status text based on score
function getHealthStatus(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Average';
  if (score >= 40) return 'Needs Attention';
  return 'Critical';
}

// Get color based on health score
function getHealthScoreColor(score: number): string {
  if (score >= 90) return '#10B981'; // green
  if (score >= 75) return '#34D399'; // green-light
  if (score >= 60) return '#F59E0B'; // amber
  if (score >= 40) return '#F97316'; // orange
  return '#EF4444'; // red
} 