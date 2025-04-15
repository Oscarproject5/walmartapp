'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

// Define the system settings structure
interface SystemSettings {
  site_name: string;
  support_email: string;
  pagination_limit: number;
  enable_analytics: boolean;
  enable_user_registration: boolean;
  maintenance_mode: boolean;
  allow_guest_checkout: boolean;
  default_currency: string;
  automatic_inventory_alerts: boolean;
  low_stock_threshold: number;
}

export default function SystemSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({
    site_name: 'WalmartApp',
    support_email: 'support@example.com',
    pagination_limit: 20,
    enable_analytics: true,
    enable_user_registration: true,
    maintenance_mode: false,
    allow_guest_checkout: false,
    default_currency: 'USD',
    automatic_inventory_alerts: true,
    low_stock_threshold: 10
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
      fetchSettings();
    };
    
    checkAdminStatus();
  }, [router, supabase]);
  
  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, you'd fetch from the database
      // For this demo, we'll use the default values
      
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsLoading(false);
    } catch (error: any) {
      setError(error.message || 'Failed to fetch system settings');
      setIsLoading(false);
    }
  };
  
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : type === 'number' 
          ? parseInt(value, 10) 
          : value
    }));
  };
  
  const handleSaveSettings = async () => {
    setIsSaving(true);
    setMessage(null);
    setError(null);
    
    try {
      // In a real implementation, you'd save to the database
      // For this demo, we'll just simulate a save operation
      
      // Simulate saving delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setMessage('Settings saved successfully');
    } catch (error: any) {
      setError(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
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
      <h1 className="text-2xl font-bold mb-6">System Settings</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {message && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <div className="flex justify-between items-center">
            <p className="text-green-700">{message}</p>
            <button 
              onClick={() => setMessage(null)} 
              className="text-green-700 hover:text-green-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General Settings */}
          <div>
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">General Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site Name
                </label>
                <input
                  type="text"
                  name="site_name"
                  value={settings.site_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Support Email
                </label>
                <input
                  type="email"
                  name="support_email"
                  value={settings.support_email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Currency
                </label>
                <select
                  name="default_currency"
                  value={settings.default_currency}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Items Per Page
                </label>
                <input
                  type="number"
                  name="pagination_limit"
                  value={settings.pagination_limit}
                  onChange={handleChange}
                  min="5"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          {/* Feature Settings */}
          <div>
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Feature Settings</h2>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="enable_analytics"
                  name="enable_analytics"
                  type="checkbox"
                  checked={settings.enable_analytics}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="enable_analytics" className="ml-2 block text-sm text-gray-700">
                  Enable Analytics
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="enable_user_registration"
                  name="enable_user_registration"
                  type="checkbox"
                  checked={settings.enable_user_registration}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="enable_user_registration" className="ml-2 block text-sm text-gray-700">
                  Enable Public User Registration
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="maintenance_mode"
                  name="maintenance_mode"
                  type="checkbox"
                  checked={settings.maintenance_mode}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="maintenance_mode" className="ml-2 block text-sm text-gray-700">
                  Maintenance Mode
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="allow_guest_checkout"
                  name="allow_guest_checkout"
                  type="checkbox"
                  checked={settings.allow_guest_checkout}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allow_guest_checkout" className="ml-2 block text-sm text-gray-700">
                  Allow Guest Checkout
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="automatic_inventory_alerts"
                  name="automatic_inventory_alerts"
                  type="checkbox"
                  checked={settings.automatic_inventory_alerts}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="automatic_inventory_alerts" className="ml-2 block text-sm text-gray-700">
                  Automatic Inventory Alerts
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  name="low_stock_threshold"
                  value={settings.low_stock_threshold}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2 hover:bg-gray-300 transition-colors"
            onClick={() => fetchSettings()}
          >
            Reset
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            onClick={handleSaveSettings}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
      
      {/* Implementation Note */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
        <h3 className="text-blue-800 font-medium">Implementation Note</h3>
        <p className="text-blue-700 mt-1">
          In a production environment, you should store these settings in a database table
          and implement proper validation. Consider implementing a cached settings service
          to avoid frequent database queries.
        </p>
      </div>
    </div>
  );
} 