'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { formatCurrency } from '../utils/calculations';
import { toast } from 'react-hot-toast';

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onConfirm: (mappedData: any[], columnMapping: Record<string, string>) => void;
}

// Define the target field structure
interface InventoryField {
  label: string;
  key: string;
  required?: boolean;
}

export default function ColumnMappingModal({
  isOpen,
  onClose,
  file,
  onConfirm
}: ColumnMappingModalProps) {
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mapping' | 'preview'>('mapping');
  const [mappedPreviewData, setMappedPreviewData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  // Define the target inventory fields
  const inventoryFields: InventoryField[] = [
    { label: 'SKU', key: 'product_sku', required: true },
    { label: 'PRODUCTS NAME', key: 'name', required: true },
    { label: 'IMAGE', key: 'image_url' },
    { label: 'SUPPLIER', key: 'supplier' },
    { label: 'LINK', key: 'product_link' },
    { label: 'PURCHASE QTY', key: 'quantity' },
    { label: 'SALES QTY', key: 'sales_qty' },
    { label: 'AVAILABLE STOCK', key: 'available_qty' },
    { label: 'PER QTY PRICE', key: 'per_qty_price' },
    { label: 'STOCK VALUE', key: 'stock_value' },
    { label: 'STATUS', key: 'status' },
    { label: 'REMARKS', key: 'remarks' }
  ];

  // Check if all required fields are mapped
  const areRequiredFieldsMapped = () => {
    const mappedFields = Object.values(columnMapping).filter(Boolean);
    return inventoryFields
      .filter(field => field.required)
      .every(field => mappedFields.includes(field.key));
  };

  // List of unmapped required fields
  const getUnmappedRequiredFields = () => {
    const mappedFields = Object.values(columnMapping).filter(Boolean);
    return inventoryFields
      .filter(field => field.required && !mappedFields.includes(field.key))
      .map(field => field.label);
  };

  // Process file when it changes
  useEffect(() => {
    if (file) {
      processFile();
    }
  }, [file]);

  // Update preview data when mapping changes
  useEffect(() => {
    if (previewData.length > 0 && Object.keys(columnMapping).length > 0) {
      generateMappedPreview();
    }
  }, [columnMapping, previewData]);

  // Process the uploaded file
  const processFile = async () => {
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);
      setValidationErrors({});

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 'A' });

      if (jsonData.length === 0) {
        throw new Error('No data found in the uploaded file');
      }

      // Extract headers (first row)
      const headers = Object.keys(jsonData[0]).map(key => 
        jsonData[0][key] ? String(jsonData[0][key]).trim() : ''
      ).filter(Boolean);

      setExcelColumns(headers);

      // Generate initial mapping suggestions
      const initialMapping: Record<string, string> = {};
      headers.forEach(header => {
        // Try to find matching field by comparing headers with inventory fields
        const normalizedHeader = header.toLowerCase().replace(/[_\s-]/g, '');
        
        const matchedField = inventoryFields.find(field => {
          const normalizedField = field.label.toLowerCase().replace(/[_\s-]/g, '');
          const normalizedKey = field.key.toLowerCase().replace(/[_\s-]/g, '');
          return normalizedHeader === normalizedField || normalizedHeader === normalizedKey;
        });

        if (matchedField) {
          initialMapping[header] = matchedField.key;
        } else {
          initialMapping[header] = '';
        }
      });

      setColumnMapping(initialMapping);

      // Extract preview data (excluding header row)
      const previewRows = jsonData.slice(1, 6);
      setPreviewData(previewRows);

    } catch (error) {
      console.error('Error processing file for mapping:', error);
      setError(error instanceof Error ? error.message : 'Failed to process file');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate preview of mapped data
  const generateMappedPreview = () => {
    try {
      // Map the data according to the column mapping
      const mapped = previewData.map((row: any) => {
        const mappedRow: Record<string, any> = {};

        // Initialize with default values for required fields
        inventoryFields.forEach(field => {
          if (field.key === 'status') {
            mappedRow[field.key] = 'active';
          } else if (field.key === 'quantity' || field.key === 'sales_qty' || 
                    field.key === 'available_qty' || field.key === 'per_qty_price' || 
                    field.key === 'stock_value') {
            mappedRow[field.key] = 0;
          } else {
            mappedRow[field.key] = null;
          }
        });

        // Apply the mapping
        Object.entries(columnMapping).forEach(([excelColumn, targetField]) => {
          if (targetField && row[excelColumn] !== undefined) {
            let value = row[excelColumn];
            
            // Force convert numeric fields to numbers
            if (targetField === 'quantity' || targetField === 'sales_qty' || 
                targetField === 'available_qty' || targetField === 'per_qty_price' || 
                targetField === 'stock_value') {
              // Convert to number, handling various formats
              if (typeof value === 'string') {
                // Remove currency symbols, commas, etc.
                value = value.replace(/[$,]/g, '');
              }
              value = Number(value) || 0;
            }
            
            // Ensure product_sku is a string
            if (targetField === 'product_sku' && value !== null) {
              value = String(value);
            }
            
            // Ensure name is a string
            if (targetField === 'name' && value !== null) {
              value = String(value);
            }
            
            // Normalize status values
            if (targetField === 'status' && value !== null) {
              // Convert to lowercase for consistency
              value = String(value).toLowerCase();
              
              // Map AVAILABLE to active
              if (value === 'available') {
                value = 'active';
              }
            }
            
            mappedRow[targetField] = value;
          }
        });

        return mappedRow;
      });

      setMappedPreviewData(mapped);
    } catch (error) {
      console.error('Error generating preview:', error);
    }
  };

  // Handle mapping selection change
  const handleMappingChange = (excelColumn: string, targetField: string) => {
    // Clear validation errors when mapping changes
    setValidationErrors({});
    
    setColumnMapping(prev => ({
      ...prev,
      [excelColumn]: targetField
    }));
  };

  // Validate the mapping
  const validateMapping = () => {
    const errors: Record<string, boolean> = {};
    const mappedFields = Object.values(columnMapping).filter(Boolean);
    
    // Check if required fields are mapped
    const missingRequired = inventoryFields
      .filter(field => field.required)
      .filter(field => !mappedFields.includes(field.key));
    
    missingRequired.forEach(field => {
      errors[field.key] = true;
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle confirmation and map data
  const handleConfirm = async () => {
    if (!file) return;

    // Validate mapping first
    if (!validateMapping()) {
      setError(`Missing required fields: ${getUnmappedRequiredFields().join(', ')}`);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

      if (jsonData.length === 0) {
        throw new Error('No data found in the uploaded file');
      }

      console.log(`Processing ${jsonData.length} rows for mapping...`);

      // Map the data according to the column mapping
      const mappedData = jsonData.map((row: any, index: number) => {
        const mappedRow: Record<string, any> = {};

        // Initialize with default values for required fields
        inventoryFields.forEach(field => {
          if (field.key === 'status') {
            mappedRow[field.key] = 'active';
          } else if (field.key === 'quantity' || field.key === 'sales_qty' || 
                    field.key === 'available_qty' || field.key === 'per_qty_price' || 
                    field.key === 'stock_value') {
            mappedRow[field.key] = 0;
          } else {
            mappedRow[field.key] = null;
          }
        });

        // Apply the mapping
        Object.entries(columnMapping).forEach(([excelColumn, targetField]) => {
          if (targetField && row[excelColumn] !== undefined) {
            let value = row[excelColumn];
            
            // Force convert numeric fields to numbers
            if (targetField === 'quantity' || targetField === 'sales_qty' || 
                targetField === 'available_qty' || targetField === 'per_qty_price' || 
                targetField === 'stock_value') {
              // Convert to number, handling various formats
              if (typeof value === 'string') {
                // Remove currency symbols, commas, etc.
                value = value.replace(/[$,]/g, '');
              }
              value = Number(value) || 0;
            }
            
            // Ensure product_sku is a string
            if (targetField === 'product_sku' && value !== null) {
              value = String(value);
            }
            
            // Ensure name is a string
            if (targetField === 'name' && value !== null) {
              value = String(value);
            }
            
            // Normalize status values
            if (targetField === 'status' && value !== null) {
              // Convert to lowercase for consistency
              value = String(value).toLowerCase();
              
              // Map AVAILABLE to active
              if (value === 'available') {
                value = 'active';
              }
            }
            
            mappedRow[targetField] = value;
          }
        });

        // Add created_at field
        mappedRow.created_at = new Date().toISOString();
        
        // Double-check required fields have values
        if (!mappedRow.product_sku) {
          mappedRow.product_sku = `SKU-${Date.now()}-${index}`;
        }
        
        if (!mappedRow.name) {
          mappedRow.name = `Unnamed Item ${index+1}`;
        }

        // Log a few items for debugging (just first 2)
        if (index < 2) {
          console.log(`Mapped row ${index+1}:`, mappedRow);
        }

        return mappedRow;
      });

      // Filter out invalid entries from ODS files (items with #REF!, unnamed items, and zero quantity)
      const isOdsFile = file.name.toLowerCase().endsWith('.ods');
      const filteredData = isOdsFile 
        ? mappedData.filter(item => {
            // Check if the item has #REF! in any field or SKU
            const hasRefError = Object.values(item).some(
              value => typeof value === 'string' && value.includes('#REF!')
            ) || (item.product_sku && item.product_sku.includes('#REF!'));
            
            // Check if item is unnamed
            const isUnnamed = item.name && (
              item.name.includes('Unnamed') || 
              item.name.includes('unnamed')
            );
            
            // Check if item is out of stock
            const isOutOfStock = Number(item.quantity) === 0;
            
            // Skip item if it meets all three conditions
            const shouldSkip = hasRefError && isUnnamed && isOutOfStock;
            
            if (shouldSkip) {
              console.log(`Skipping invalid entry: ${item.name} (${item.product_sku})`);
            }
            
            // Keep the item only if it DOESN'T meet all three conditions
            return !shouldSkip;
          })
        : mappedData;
        
      if (isOdsFile && filteredData.length < mappedData.length) {
        console.log(`Filtered out ${mappedData.length - filteredData.length} invalid entries from ODS file`);
        toast.success(`Skipped ${mappedData.length - filteredData.length} invalid entries`);
      }

      console.log(`Successfully mapped ${filteredData.length} rows`);
      onConfirm(filteredData, columnMapping);

    } catch (error) {
      console.error('Error mapping data:', error);
      setError(error instanceof Error ? error.message : 'Failed to map data');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Map Your Excel Data to Inventory Fields
            </h2>
            <button 
              onClick={onClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {!areRequiredFieldsMapped() && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Required Fields Not Mapped</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    The following required fields are not yet mapped: {getUnmappedRequiredFields().join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Processing your file...</p>
            </div>
          ) : excelColumns.length > 0 ? (
            <>
              <div className="mb-4 border-b border-gray-200">
                <div className="flex">
                  <button 
                    className={`py-3 px-6 focus:outline-none ${
                      activeTab === 'mapping' 
                        ? 'border-b-2 border-blue-500 text-blue-600 font-medium' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('mapping')}
                  >
                    Column Mapping
                  </button>
                  <button 
                    className={`py-3 px-6 focus:outline-none ${
                      activeTab === 'preview' 
                        ? 'border-b-2 border-blue-500 text-blue-600 font-medium' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('preview')}
                    disabled={!areRequiredFieldsMapped()}
                  >
                    Data Preview
                  </button>
                </div>
              </div>

              {activeTab === 'mapping' ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h3 className="text-sm font-medium text-blue-800">Map Your Excel Columns</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          For each column in your Excel file, select the corresponding inventory field. 
                          Fields marked with <span className="text-red-500 font-bold">*</span> are required.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {excelColumns.map((column, index) => (
                      <div key={index} className={`flex flex-col border rounded-lg p-4 bg-white dark:bg-gray-700 shadow-sm ${validationErrors[columnMapping[column]] ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-medium text-gray-700 dark:text-gray-200">
                            <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs mr-2">
                              Excel Column
                            </span>
                            {column}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2 text-gray-600 dark:text-gray-300">Map to:</span>
                          <select
                            value={columnMapping[column] || ''}
                            onChange={(e) => handleMappingChange(column, e.target.value)}
                            className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                              validationErrors[columnMapping[column]]
                                ? 'border-red-300 bg-red-50 text-red-800'
                                : 'border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-white'
                            }`}
                          >
                            <option value="">Ignore Column</option>
                            {inventoryFields.map((field) => (
                              <option key={field.key} value={field.key}>
                                {field.label}{field.required ? ' *' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {previewData.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Preview values:</p>
                            <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                              {previewData.map((row, rowIndex) => (
                                <li key={rowIndex} className="truncate">
                                  {row[column] !== undefined ? String(row[column]) : '-'}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h3 className="text-sm font-medium text-green-800">Preview Mapped Data</h3>
                        <p className="text-sm text-green-700 mt-1">
                          Review how your data will look after import. Showing the first 5 rows.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {inventoryFields.map(field => (
                            <th 
                              key={field.key}
                              scope="col" 
                              className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {mappedPreviewData.length > 0 ? (
                          mappedPreviewData.map((item, index) => (
                            <tr key={index}>
                              {inventoryFields.map(field => (
                                <td key={field.key} className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                                  {field.key === 'per_qty_price' || field.key === 'stock_value' 
                                    ? (item[field.key] ? formatCurrency(item[field.key]) : '-')
                                    : (item[field.key] !== null ? String(item[field.key]) : '-')}
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={inventoryFields.length} className="px-3 py-4 text-sm text-center text-gray-500">
                              No preview data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                {activeTab === 'mapping' ? (
                  <button
                    onClick={() => {
                      if (validateMapping()) {
                        setActiveTab('preview');
                      } else {
                        setError(`Missing required fields: ${getUnmappedRequiredFields().join(', ')}`);
                      }
                    }}
                    disabled={isLoading || !areRequiredFieldsMapped()}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    Preview Data
                  </button>
                ) : (
                  <button
                    onClick={handleConfirm}
                    disabled={isLoading || !areRequiredFieldsMapped()}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    Confirm & Import
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-300">No columns found in the file</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 