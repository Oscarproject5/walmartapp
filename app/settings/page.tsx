'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';

type AppSettings = Database['public']['Tables']['app_settings']['Row'];

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1);

      if (error) throw error;
      
      setSettings(data?.[0] || {
        shipping_base_cost: 1.75,
        label_cost: 2.25,
        cancellation_shipping_loss: 4,
        minimum_profit_margin: 25,
        auto_reorder_enabled: false,
        auto_price_adjustment_enabled: false,
        openrouter_api_key: null,
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData(e.currentTarget);
      const updates = {
        shipping_base_cost: parseFloat(formData.get('shipping_base_cost') as string),
        label_cost: parseFloat(formData.get('label_cost') as string),
        cancellation_shipping_loss: parseFloat(formData.get('cancellation_shipping_loss') as string),
        minimum_profit_margin: parseFloat(formData.get('minimum_profit_margin') as string),
        auto_reorder_enabled: formData.get('auto_reorder_enabled') === 'true',
        auto_price_adjustment_enabled: formData.get('auto_price_adjustment_enabled') === 'true',
        openrouter_api_key: formData.get('openrouter_api_key') as string,
        updated_at: new Date().toISOString(),
      };

      let response;
      if (settings?.id) {
        response = await supabase
          .from('app_settings')
          .update(updates)
          .eq('id', settings.id);
      } else {
        response = await supabase
          .from('app_settings')
          .insert([{ ...updates, user_id: 'default' }]);
      }

      if (response.error) throw response.error;

      setMessage({ type: 'success', text: 'Settings saved successfully' });
      loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>

        <div className="mt-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Shipping Settings */}
            <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
              <div className="md:grid md:grid-cols-3 md:gap-6">
                <div className="md:col-span-1">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Shipping Settings</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Configure your shipping costs and handling fees.
                  </p>
                </div>
                <div className="mt-5 md:mt-0 md:col-span-2">
                  <div className="grid grid-cols-6 gap-6">
                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="shipping_base_cost" className="block text-sm font-medium text-gray-700">
                        Base Shipping Cost ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="shipping_base_cost"
                        id="shipping_base_cost"
                        defaultValue={settings?.shipping_base_cost || 1.75}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="label_cost" className="block text-sm font-medium text-gray-700">
                        Label Cost ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="label_cost"
                        id="label_cost"
                        defaultValue={settings?.label_cost || 2.25}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="cancellation_shipping_loss" className="block text-sm font-medium text-gray-700">
                        Cancellation Shipping Loss ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="cancellation_shipping_loss"
                        id="cancellation_shipping_loss"
                        defaultValue={settings?.cancellation_shipping_loss || 4}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI and Automation Settings */}
            <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
              <div className="md:grid md:grid-cols-3 md:gap-6">
                <div className="md:col-span-1">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">AI & Automation</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Configure AI-powered features and automation settings.
                  </p>
                </div>
                <div className="mt-5 md:mt-0 md:col-span-2">
                  <div className="grid grid-cols-6 gap-6">
                    <div className="col-span-6">
                      <label htmlFor="openrouter_api_key" className="block text-sm font-medium text-gray-700">
                        OpenRouter API Key
                      </label>
                      <input
                        type="password"
                        name="openrouter_api_key"
                        id="openrouter_api_key"
                        defaultValue={settings?.openrouter_api_key || ''}
                        placeholder="sk-or-..."
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="minimum_profit_margin" className="block text-sm font-medium text-gray-700">
                        Minimum Profit Margin (%)
                      </label>
                      <input
                        type="number"
                        step="1"
                        name="minimum_profit_margin"
                        id="minimum_profit_margin"
                        defaultValue={settings?.minimum_profit_margin || 25}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <fieldset className="space-y-4">
                        <div className="relative flex items-start">
                          <div className="flex h-5 items-center">
                            <input
                              type="checkbox"
                              name="auto_reorder_enabled"
                              id="auto_reorder_enabled"
                              defaultChecked={settings?.auto_reorder_enabled}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="auto_reorder_enabled" className="font-medium text-gray-700">
                              Enable Auto-Reorder
                            </label>
                            <p className="text-gray-500">Automatically reorder products when inventory is low</p>
                          </div>
                        </div>

                        <div className="relative flex items-start">
                          <div className="flex h-5 items-center">
                            <input
                              type="checkbox"
                              name="auto_price_adjustment_enabled"
                              id="auto_price_adjustment_enabled"
                              defaultChecked={settings?.auto_price_adjustment_enabled}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="auto_price_adjustment_enabled" className="font-medium text-gray-700">
                              Enable Auto-Price Adjustment
                            </label>
                            <p className="text-gray-500">Automatically adjust prices based on AI recommendations</p>
                          </div>
                        </div>
                      </fieldset>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {message.text && (
              <div className={`p-4 rounded-md ${
                message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
              }`}>
                {message.text}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 