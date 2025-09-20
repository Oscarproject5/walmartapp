'use client';

import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

type DataType = 'products' | 'inventory' | 'orders' | 'users';

export default function ImportExport() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dataType, setDataType] = useState<DataType>('products');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
      setIsLoading(false);
    };
    
    checkAdminStatus();
  }, [router, supabase]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
      setImportStatus(null);
    }
  };
  
  const handleImport = async () => {
    if (!importFile) {
      setImportStatus('Please select a file first');
      return;
    }
    
    setIsImporting(true);
    setImportStatus('Processing...');
    
    try {
      // Here you would process the file and import the data
      // This is a simplified implementation - in production, you'd want to:
      // 1. Read the file contents
      // 2. Parse CSV/JSON
      // 3. Validate the data
      // 4. Insert into database
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For this demo, we'll just show a success message
      setImportStatus(`Successfully processed ${importFile.name}`);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setImportFile(null);
    } catch (error: any) {
      setImportStatus(`Error: ${error.message || 'Failed to import data'}`);
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus('Preparing export...');
    
    try {
      // Here you would query data from your database and format it
      // This is a simplified implementation - in production, you'd want to:
      // 1. Query database
      // 2. Format data as CSV or JSON
      // 3. Create a download link
      
      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For this demo, we'll create a small placeholder dataset
      const mockData = {
        products: [
          { id: 1, name: 'Product 1', price: 19.99, sku: 'SKU001' },
          { id: 2, name: 'Product 2', price: 29.99, sku: 'SKU002' }
        ],
        inventory: [
          { id: 1, product_id: 1, quantity: 150, location: 'Warehouse A' },
          { id: 2, product_id: 2, quantity: 75, location: 'Warehouse B' }
        ],
        orders: [
          { id: 'ORD-001', customer: 'John Doe', total: 49.98, status: 'completed' },
          { id: 'ORD-002', customer: 'Jane Smith', total: 29.99, status: 'processing' }
        ],
        users: [
          { id: 'USR-001', email: 'user1@example.com', role: 'customer' },
          { id: 'USR-002', email: 'user2@example.com', role: 'admin' }
        ]
      };
      
      // Get data for the selected type
      const dataToExport = mockData[dataType];
      
      // Format data based on selected format
      let content: string;
      let fileName: string;
      let mimeType: string;
      
      if (exportFormat === 'csv') {
        // Convert to CSV
        const headers = Object.keys(dataToExport[0]).join(',');
        const rows = dataToExport.map(item => Object.values(item).join(','));
        content = [headers, ...rows].join('\n');
        fileName = `${dataType}_export_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else {
        // JSON format
        content = JSON.stringify(dataToExport, null, 2);
        fileName = `${dataType}_export_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      }
      
      // Create download link
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setExportStatus(`Successfully exported ${dataToExport.length} ${dataType} records`);
    } catch (error: any) {
      setExportStatus(`Error: ${error.message || 'Failed to export data'}`);
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
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
      <h1 className="text-2xl font-bold mb-6">Data Import / Export</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Export Data</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Type
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={dataType}
                onChange={(e) => setDataType(e.target.value as DataType)}
              >
                <option value="products">Products</option>
                <option value="inventory">Inventory</option>
                <option value="orders">Orders</option>
                <option value="users">Users</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Export Format
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600"
                    value="csv"
                    checked={exportFormat === 'csv'}
                    onChange={() => setExportFormat('csv')}
                  />
                  <span className="ml-2">CSV</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600"
                    value="json"
                    checked={exportFormat === 'json'}
                    onChange={() => setExportFormat('json')}
                  />
                  <span className="ml-2">JSON</span>
                </label>
              </div>
            </div>
            
            {exportStatus && (
              <div className={`p-4 rounded-md ${exportStatus.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {exportStatus}
              </div>
            )}
            
            <div>
              <button
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? 'Exporting...' : `Export ${dataType}`}
              </button>
            </div>
          </div>
        </div>
        
        {/* Import Section */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Import Data</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Type
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={dataType}
                onChange={(e) => setDataType(e.target.value as DataType)}
              >
                <option value="products">Products</option>
                <option value="inventory">Inventory</option>
                <option value="orders">Orders</option>
                <option value="users">Users</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select File (CSV or JSON)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                onChange={handleFileChange}
              />
              <p className="mt-1 text-xs text-gray-500">
                File must be in CSV or JSON format with the proper structure for {dataType}
              </p>
            </div>
            
            {importStatus && (
              <div className={`p-4 rounded-md ${importStatus.startsWith('Error') ? 'bg-red-50 text-red-700' : importStatus === 'Processing...' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                {importStatus}
              </div>
            )}
            
            <div>
              <button
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                onClick={handleImport}
                disabled={isImporting || !importFile}
              >
                {isImporting ? 'Importing...' : `Import ${dataType}`}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Documentation/Help */}
      <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-4">
        <h3 className="text-blue-800 font-medium">Data Format Information</h3>
        <p className="text-blue-700 mt-1 mb-2">
          When importing data, your files must match the expected format:
        </p>
        <div className="bg-white p-3 rounded-md text-sm font-mono text-gray-700 overflow-x-auto">
          {dataType === 'products' && (
            <pre>{`Products CSV format:
id,name,price,sku

Products JSON format:
[
  {
    "id": 1,
    "name": "Product Name",
    "price": 19.99,
    "sku": "SKU001"
  }
]`}</pre>
          )}
          {dataType === 'inventory' && (
            <pre>{`Inventory CSV format:
id,product_id,quantity,location

Inventory JSON format:
[
  {
    "id": 1,
    "product_id": 1,
    "quantity": 100,
    "location": "Warehouse A"
  }
]`}</pre>
          )}
          {dataType === 'orders' && (
            <pre>{`Orders CSV format:
id,customer,total,status

Orders JSON format:
[
  {
    "id": "ORD-001",
    "customer": "Customer Name",
    "total": 49.98,
    "status": "completed"
  }
]`}</pre>
          )}
          {dataType === 'users' && (
            <pre>{`Users CSV format:
id,email,role

Users JSON format:
[
  {
    "id": "USR-001",
    "email": "user@example.com",
    "role": "customer"
  }
]`}</pre>
          )}
        </div>
      </div>
    </div>
  );
} 