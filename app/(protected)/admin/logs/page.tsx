'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

// Define the activity log structure
interface ActivityLog {
  id: string;
  created_at: string;
  user_id: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: any;
  ip_address?: string;
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [resourceFilter, setResourceFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    end: new Date().toISOString().split('T')[0]
  });
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }
      
      // Check if user is an admin
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();
      
      if (error || !profile?.is_admin) {
        setError('You do not have permission to access this page');
        setIsAdmin(false);
        setTimeout(() => router.push('/dashboard'), 3000);
        return;
      }
      
      setIsAdmin(true);
      fetchLogs();
    };
    
    checkAdminStatus();
  }, [router, supabase]);
  
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      // Mock log data since we haven't created the actual logs table yet
      // In a real implementation, this would query from a logs table
      const mockLogs: ActivityLog[] = [
        {
          id: '1',
          created_at: new Date().toISOString(),
          user_id: 'user-123',
          user_email: 'admin@example.com',
          action: 'CREATE',
          resource_type: 'INVITATION',
          resource_id: 'inv-456',
          details: { code: 'ABC123', is_admin: true },
          ip_address: '192.168.1.1'
        },
        {
          id: '2',
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          user_id: 'user-123',
          user_email: 'admin@example.com',
          action: 'UPDATE',
          resource_type: 'USER',
          resource_id: 'user-456',
          details: { is_admin: true },
          ip_address: '192.168.1.1'
        },
        {
          id: '3',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          user_id: 'user-456',
          user_email: 'user@example.com',
          action: 'LOGIN',
          resource_type: 'AUTH',
          resource_id: 'user-456',
          details: { method: 'email' },
          ip_address: '192.168.1.2'
        },
        {
          id: '4',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          user_id: 'user-123',
          user_email: 'admin@example.com',
          action: 'DELETE',
          resource_type: 'INVITATION',
          resource_id: 'inv-789',
          details: { code: 'XYZ789' },
          ip_address: '192.168.1.1'
        },
        {
          id: '5',
          created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          user_id: 'user-789',
          user_email: 'another@example.com',
          action: 'IMPORT',
          resource_type: 'INVENTORY',
          resource_id: 'batch-123',
          details: { items: 150, success: true },
          ip_address: '192.168.1.3'
        }
      ];
      
      // Apply filters
      let filteredLogs = mockLogs;
      if (actionFilter) {
        filteredLogs = filteredLogs.filter(log => 
          log.action.toLowerCase().includes(actionFilter.toLowerCase())
        );
      }
      if (resourceFilter) {
        filteredLogs = filteredLogs.filter(log => 
          log.resource_type.toLowerCase().includes(resourceFilter.toLowerCase())
        );
      }
      if (dateRange.start) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.created_at) >= new Date(dateRange.start)
        );
      }
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999); // End of day
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.created_at) <= endDate
        );
      }
      
      setLogs(filteredLogs);
    } catch (error: any) {
      setError(error.message || 'Failed to fetch activity logs');
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'LOGIN':
        return 'bg-purple-100 text-purple-800';
      case 'IMPORT':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const handleFilterChange = () => {
    fetchLogs();
  };
  
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-700">{error || 'Checking permissions...'}</p>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Activity Logs</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Type
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. CREATE, UPDATE"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resource Type
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. USER, INVITATION"
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            onClick={handleFilterChange}
          >
            Apply Filters
          </button>
        </div>
      </div>
      
      {/* Activity Logs Table */}
      <div className="bg-white p-6 rounded-lg shadow-md overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">System Activity</h2>
          <div className="text-sm text-gray-500">
            Displaying {logs.length} records
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.user_email}</div>
                    <div className="text-xs text-gray-500">{log.user_id.substring(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.resource_type}</div>
                    <div className="text-xs text-gray-500">{log.resource_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.ip_address}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      className="text-blue-600 hover:text-blue-900"
                      onClick={() => alert(JSON.stringify(log.details, null, 2))}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No activity logs found matching the selected filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Tip for implementation */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
        <h3 className="text-blue-800 font-medium">Implementation Note</h3>
        <p className="text-blue-700 mt-1">
          To track activities, you should create an <code>activity_logs</code> table in your database and 
          implement logging functions that record user actions. This interface shows example data only.
        </p>
      </div>
    </div>
  );
} 