'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface UploadedItem {
  name: string;
  quantity: number;
  cost_per_item: number;
  purchase_date: string;
  source: string;
  sku?: string;
  product_sku?: string;
  product_name?: string;
  supplier?: string;
  product_link?: string;
  purchase_price?: number;
  image_url?: string;
  status?: string;
  remarks?: string;
}

export default function UploadInventoryClient() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<UploadedItem[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'preview' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successCount, setSuccessCount] = useState(0);
  const [templateType, setTemplateType] = useState<'basic' | 'advanced'>('basic');
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabaseClient = createClientComponentClient();

  // Get the current user's ID
  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    getUserId();
  }, [supabaseClient]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage('');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

      if (jsonData.length === 0) {
        throw new Error('No data found in the uploaded file');
      }

      // Validate and transform data
      const processedData = jsonData.map((row, index) => {
        // Validate required fields
        if (!row.name && !row.product_name) {
          throw new Error(`Row ${index + 1}: Missing product name`);
        }
        if (isNaN(Number(row.quantity))) {
          throw new Error(`Row ${index + 1}: Invalid quantity`);
        }
        if (isNaN(Number(row.cost_per_item)) && isNaN(Number(row.purchase_price))) {
          throw new Error(`Row ${index + 1}: Missing cost information`);
        }

        // Transform the data
        return {
          name: row.name || row.product_name,
          product_name: row.product_name || row.name,
          quantity: Number(row.quantity),
          cost_per_item: Number(row.cost_per_item || row.purchase_price || 0),
          purchase_date: row.purchase_date || new Date().toISOString().split('T')[0],
          source: row.source || row.supplier || 'walmart',
          sku: row.sku,
          product_sku: row.product_sku || row.sku,
          supplier: row.supplier || row.source,
          product_link: row.product_link,
          purchase_price: Number(row.purchase_price || row.cost_per_item || 0),
          image_url: row.image_url,
          status: row.status || 'active',
          remarks: row.remarks
        };
      });

      setPreviewData(processedData);
      setUploadStatus('preview');
    } catch (error) {
      console.error('Error processing file:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process file');
      setUploadStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'application/vnd.ms-excel' ||
          file.type === 'text/csv') {
        processFile(file);
      } else {
        setErrorMessage('Please upload an Excel or CSV file');
        setUploadStatus('error');
      }
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleConfirmUpload = async () => {
    setIsProcessing(true);
    
    // Check if user is authenticated
    if (!userId) {
      setErrorMessage('You must be logged in to upload inventory');
      setUploadStatus('error');
      setIsProcessing(false);
      return;
    }
    
    try {
      let successfulUploads = 0;

      // Insert data in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < previewData.length; i += batchSize) {
        const batch = previewData.slice(i, i + batchSize);
        
        const { error } = await supabaseClient.from('products').insert(
          batch.map(item => ({
            name: item.name,
            product_name: item.product_name,
            quantity: item.quantity,
            cost_per_item: item.cost_per_item,
            purchase_date: item.purchase_date,
            source: item.source,
            sku: item.sku,
            product_sku: item.product_sku,
            supplier: item.supplier,
            product_link: item.product_link,
            purchase_price: item.purchase_price,
            image_url: item.image_url,
            status: item.status,
            remarks: item.remarks,
            created_at: new Date().toISOString(),
            user_id: userId // Add the user_id to each product
          }))
        );

        if (error) {
          console.error('Upload error details:', error);
          throw error;
        }
        successfulUploads += batch.length;
      }

      setSuccessCount(successfulUploads);
      setUploadStatus('success');
      toast.success(`Successfully imported ${successfulUploads} items`);
    } catch (error) {
      console.error('Error uploading data:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload data');
      setUploadStatus('error');
      toast.error('Failed to import data');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Create worksheet with headers based on template type
    const headers = templateType === 'basic' 
      ? ['name', 'quantity', 'cost_per_item', 'purchase_date', 'source']
      : ['name', 'product_name', 'sku', 'product_sku', 'quantity', 'cost_per_item', 'purchase_price', 
         'source', 'supplier', 'product_link', 'image_url', 'status', 'remarks'];
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    
    // Create workbook and add the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Template");
    
    // Generate and download file
    const template = templateType === 'basic' ? 'basic-inventory-template' : 'advanced-inventory-template';
    XLSX.writeFile(workbook, `${template}.xlsx`);
  };

  const resetUpload = () => {
    setPreviewData([]);
    setUploadStatus('idle');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Import Inventory Data</h2>
          <p className="text-sm text-gray-600 mt-1">Upload Excel or CSV files to bulk import inventory items</p>
        </div>
        <div className="flex space-x-2">
          <div className="flex items-center space-x-2 mr-4">
            <label className="text-sm font-medium text-gray-700">Template:</label>
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value as 'basic' | 'advanced')}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="basic">Basic</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Template
          </button>
        </div>
      </div>

      {uploadStatus === 'idle' && (
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          
          <div className="flex flex-col items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {isDragging ? 'Drop your file here' : 'Drag and drop your file here'}
            </h3>
            
            <p className="text-sm text-gray-500 mb-4">
              or <button type="button" onClick={handleFileButtonClick} className="text-blue-600 hover:text-blue-800 font-medium">browse from your computer</button>
            </p>
            
            <p className="text-xs text-gray-500">
              Supports Excel (.xlsx, .xls) and CSV files
            </p>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Processing your file...</p>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error uploading inventory data</h3>
              <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={resetUpload}
              className="text-sm font-medium text-red-600 hover:text-red-800"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {uploadStatus === 'preview' && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Review your data before uploading</h3>
                <p className="text-sm text-yellow-700 mt-1">Please review the {previewData.length} items below and confirm to upload.</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.slice(0, 10).map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{item.sku || item.product_sku || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{item.quantity}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">${(item.cost_per_item / 100).toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{item.source}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{item.purchase_date}</td>
                  </tr>
                ))}
                {previewData.length > 10 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-2 text-sm text-gray-500 text-center italic">
                      ... and {previewData.length - 10} more items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={resetUpload}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmUpload}
              disabled={isProcessing}
              className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isProcessing ? 'Uploading...' : 'Confirm Upload'}
            </button>
          </div>
        </div>
      )}

      {uploadStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h3 className="text-lg font-medium text-green-800 mb-2">Upload Successful!</h3>
          <p className="text-green-700 mb-6">Successfully imported {successCount} items to your inventory.</p>
          
          <div className="flex justify-center space-x-4">
            <Link href="/inventory" className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
              View Inventory
            </Link>
            <button
              onClick={resetUpload}
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Upload Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 