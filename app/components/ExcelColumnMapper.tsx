'use client';

import { useState, useEffect, useRef } from 'react';
import { X, FileSpreadsheet, Upload, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExcelColumnMapperProps {
  onMappedDataReady: (mappedData: any[]) => void;
  onClose: () => void;
  requiredFields: string[];
  suggestedFileName?: string;
}

// Field definitions with labels and descriptions
const fieldDefinitions: Record<string, { label: string; description: string; required: boolean; section: 'customer' | 'internal' }> = {
  order_id: { 
    label: 'Order ID', 
    description: 'Unique identifier for the order (e.g., Walmart Order #)',
    required: true,
    section: 'customer'
  },
  order_date: { 
    label: 'Order Date', 
    description: 'Date when the order was placed',
    required: true,
    section: 'customer'
  },
  customer_name: { 
    label: 'Customer Name', 
    description: 'Name of the customer who placed the order',
    required: true,
    section: 'customer'
  },
  sku: { 
    label: 'SKU', 
    description: 'Stock Keeping Unit - product identifier',
    required: true,
    section: 'customer'
  },
  product_name: { 
    label: 'Product Name', 
    description: 'Name of the product',
    required: false,
    section: 'customer'
  },
  order_quantity: { 
    label: 'Quantity', 
    description: 'Number of units ordered',
    required: true,
    section: 'customer'
  },
  walmart_price_per_unit: { 
    label: 'Item Cost', 
    description: 'Price per unit displayed on Walmart',
    required: true,
    section: 'customer'
  },
  walmart_shipping_fee_per_unit: { 
    label: 'Walmart Shipping Fee Per Unit', 
    description: 'Shipping fee per unit charged by Walmart',
    required: true,
    section: 'customer'
  },
  product_cost_per_unit: { 
    label: 'Product Cost Per Unit', 
    description: 'Cost per unit to purchase the product from supplier',
    required: false,
    section: 'internal'
  },
  fulfillment_cost: { 
    label: 'Fulfillment Cost', 
    description: 'Cost for packaging and shipping the product',
    required: false,
    section: 'internal'
  }
};

export default function ExcelColumnMapper({ onMappedDataReady, onClose, requiredFields, suggestedFileName }: ExcelColumnMapperProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [headerRow, setHeaderRow] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [activeTab, setActiveTab] = useState<'mapping' | 'preview'>('mapping');
  const [isAutoMapped, setIsAutoMapped] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragAreaRef = useRef<HTMLDivElement>(null);

  // This effect handles drag and drop events
  useEffect(() => {
    const dragArea = dragAreaRef.current;
    if (!dragArea) return;

    const preventDefaults = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const highlight = () => {
      dragArea.classList.add('bg-blue-50', 'border-blue-300');
    };

    const unhighlight = () => {
      dragArea.classList.remove('bg-blue-50', 'border-blue-300');
    };

    const handleDrop = (e: DragEvent) => {
      unhighlight();
      preventDefaults(e);
      
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        handleFileChange(e.dataTransfer.files[0]);
      }
    };

    dragArea.addEventListener('dragenter', preventDefaults);
    dragArea.addEventListener('dragover', preventDefaults);
    dragArea.addEventListener('dragleave', unhighlight);
    dragArea.addEventListener('dragenter', highlight);
    dragArea.addEventListener('drop', handleDrop as EventListener);

    return () => {
      dragArea.removeEventListener('dragenter', preventDefaults);
      dragArea.removeEventListener('dragover', preventDefaults);
      dragArea.removeEventListener('dragleave', unhighlight);
      dragArea.removeEventListener('dragenter', highlight);
      dragArea.removeEventListener('drop', handleDrop as EventListener);
    };
  }, []);

  // Auto-map columns based on header names when a file is uploaded
  useEffect(() => {
    if (headerRow.length > 0 && !isAutoMapped) {
      const newMappings: Record<string, string> = {};
      
      // Define patterns to match different field types
      const patterns = {
        order_id: /order.*id|order.*number|order.*#|po.*number|po.*id|po.*#/i,
        order_date: /order.*date|date|purchase.*date/i,
        customer_name: /customer.*name|buyer|purchaser/i,
        sku: /sku|item.*number|product.*id/i,
        product_name: /product.*name|item.*name|title|description/i,
        order_quantity: /quantity|qty|amount|units/i,
        walmart_price_per_unit: /price|unit.*price|retail.*price|item.*cost|item.*price/i,
        walmart_shipping_fee_per_unit: /shipping.*fee|shipping.*cost|shipping|shipping cost/i,
        product_cost_per_unit: /cost|unit.*cost|product.*cost/i,
        fulfillment_cost: /fulfillment|handling|packaging/i
      };
      
      // First try to match excel headers exactly to the PO_Data file column names
      const specificMappings: Record<string, string> = {
        "Order ID": "order_id",
        "Order Number": "order_id",
        "PO Number": "order_id",
        "Order Date": "order_date",
        "Customer Name": "customer_name",
        "SKU": "sku",
        "Product Name": "product_name",
        "Quantity": "order_quantity",
        "Item Cost": "walmart_price_per_unit",
        "Shipping Cost": "walmart_shipping_fee_per_unit",
      };
      
      // Try exact matches for PO_Data file first
      headerRow.forEach(header => {
        if (header in specificMappings) {
          newMappings[specificMappings[header]] = header;
        }
      });
      
      // Then try to match column headers to fields using patterns
      headerRow.forEach(header => {
        const lowerHeader = header.toLowerCase();
        
        Object.entries(patterns).forEach(([field, pattern]) => {
          if (!newMappings[field] && pattern.test(lowerHeader)) {
            newMappings[field] = header;
          }
        });
        
        // Exact matches (case insensitive)
        Object.keys(fieldDefinitions).forEach(field => {
          if (lowerHeader === field.toLowerCase() && !newMappings[field]) {
            newMappings[field] = header;
          }
        });
      });
      
      setMappings(newMappings);
      setIsAutoMapped(true);
      validateMappings(newMappings);
    }
  }, [headerRow, isAutoMapped, requiredFields]);

  const handleFileChange = (file: File) => {
    if (!file) {
      setFileError('No file selected');
      return;
    }
    
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'text/csv', // csv
      'application/vnd.oasis.opendocument.spreadsheet' // ods
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setFileError('Invalid file type. Please upload an Excel file (.xlsx, .xls, .csv, .ods)');
      return;
    }
    
    setFile(file);
    setFileError(null);
    processExcelFile(file);
  };

  const processExcelFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      
      // Get the first worksheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (!data || data.length < 2) {
        throw new Error('File contains insufficient data. Please ensure it has headers and at least one data row.');
      }
      
      // Extract header row
      const headers = data[0] as string[];
      if (!headers || headers.length === 0) {
        throw new Error('Could not detect header row in the file.');
      }
      
      // Extract preview data (first few rows)
      const preview = data.slice(1, Math.min(6, data.length)).map(row => {
        const rowData: Record<string, any> = {};
        (row as any[]).forEach((cell, index) => {
          if (index < headers.length) {
            rowData[headers[index]] = cell;
          }
        });
        return rowData;
      });
      
      setHeaderRow(headers);
      setPreviewData(preview);
      
    } catch (error) {
      console.error('Error processing Excel file:', error);
      setFileError(error instanceof Error ? error.message : 'Failed to process Excel file');
    } finally {
      setIsProcessing(false);
    }
  };

  const validateMappings = (currentMappings: Record<string, string> = mappings) => {
    const errors: Record<string, string> = {};
    
    requiredFields.forEach(field => {
      if (!currentMappings[field]) {
        errors[field] = `Required field '${fieldDefinitions[field]?.label || field}' must be mapped to an Excel column`;
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleMapField = (field: string, excelColumn: string) => {
    const newMappings = { ...mappings, [field]: excelColumn };
    setMappings(newMappings);
    validateMappings(newMappings);
  };

  const handleMappingComplete = async () => {
    setIsProcessing(true);
    
    try {
      // Read the entire file
      const arrayBuffer = await file!.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      
      // Get the first worksheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON with headers
      const rawData = XLSX.utils.sheet_to_json(worksheet);
      
      // Map the Excel data to our schema
      const mappedData = rawData.map((row: any) => {
        const mappedRow: Record<string, any> = {};
        
        // Map fields based on user-defined mappings
        Object.entries(mappings).forEach(([field, excelHeader]) => {
          let value = row[excelHeader];
          
          // Handle special data type conversions
          if (field === 'order_date' && value !== undefined) {
            // Handle Excel date formats
            if (typeof value === 'number') {
              // Excel stores dates as days since 1900-01-01
              const excelDate = XLSX.SSF.parse_date_code(value);
              if (excelDate) {
                // Format as YYYY-MM-DD
                value = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
              }
            } else if (typeof value === 'string') {
              // Try to parse date strings
              const datePattern = /^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/;
              if (datePattern.test(value)) {
                const parsedDate = new Date(value);
                if (!isNaN(parsedDate.getTime())) {
                  value = parsedDate.toISOString().split('T')[0];
                }
              }
            }
          } else if (['order_quantity', 'walmart_price_per_unit', 'walmart_shipping_fee_per_unit', 
                    'product_cost_per_unit', 'fulfillment_cost'].includes(field)) {
            // Convert to numbers for numeric fields
            if (typeof value === 'string') {
              // Remove currency symbols and other non-numeric characters
              value = parseFloat(value.replace(/[^0-9.-]+/g, ''));
            } else {
              value = Number(value);
            }
            
            // Set to 0 if NaN
            if (isNaN(value)) value = 0;
          }
          
          mappedRow[field] = value;
        });
        
        return mappedRow;
      });
      
      console.log('Mapped Data:', mappedData.slice(0, 2)); // Debug log
      
      // Call the parent's callback with the mapped data
      onMappedDataReady(mappedData);
      
    } catch (error) {
      console.error('Error processing data:', error);
      setFileError(error instanceof Error ? error.message : 'Failed to process data');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderFieldMappingSection = (section: 'customer' | 'internal') => {
    const sectionFields = Object.entries(fieldDefinitions)
      .filter(([_, def]) => def.section === section)
      .map(([field, _]) => field);
    
    const sectionTitle = section === 'customer' 
      ? 'Customer-Visible Fields' 
      : 'Internal Cost Tracking Fields';
      
    const sectionDescription = section === 'customer'
      ? 'These fields are visible to customers and appear on order confirmations'
      : 'These fields are used for internal cost tracking and profit calculations';
    
    return (
      <div className="mb-6">
        <h3 className="text-md font-semibold text-slate-800 mb-2">{sectionTitle}</h3>
        <p className="text-sm text-slate-600 mb-4">{sectionDescription}</p>
        
        <div className="space-y-4">
          {sectionFields.map(field => {
            const fieldDef = fieldDefinitions[field];
            const isRequired = requiredFields.includes(field);
            const hasError = !!validationErrors[field];
            
            return (
              <div key={field} className={`p-4 rounded-lg border ${hasError ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      {fieldDef.label}
                      {isRequired && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <p className="text-xs text-slate-500">{fieldDef.description}</p>
                  </div>
                  {isRequired && <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Required</div>}
                </div>
                
                <select
                  value={mappings[field] || ''}
                  onChange={(e) => handleMapField(field, e.target.value)}
                  className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md ${
                    hasError ? 'border-red-300' : 'border-slate-300'
                  }`}
                >
                  <option value="">Select Excel column...</option>
                  {headerRow.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
                
                {hasError && (
                  <p className="mt-2 text-sm text-red-600">{validationErrors[field]}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMappingTab = () => (
    <div>
      {/* Required fields warning */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded mb-6 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <div>
            <p className="font-medium">Some required fields are not mapped</p>
            <p className="text-sm">Please make sure all required fields are mapped to Excel columns.</p>
          </div>
        </div>
      )}
      
      {renderFieldMappingSection('customer')}
      {renderFieldMappingSection('internal')}
      
      <div className="border-t border-slate-200 pt-4 mt-4">
        <p className="text-xs text-slate-500 mb-2">
          <span className="font-medium">Note:</span> Fields marked with an asterisk (*) are required.
        </p>
      </div>
    </div>
  );
  
  const renderPreviewTab = () => (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {headerRow.map((header, index) => (
                <th 
                  key={index}
                  className="px-3 py-3.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {previewData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {headerRow.map((header, colIndex) => (
                  <td 
                    key={`${rowIndex}-${colIndex}`}
                    className="px-3 py-3 text-xs text-slate-700 max-w-xs truncate"
                  >
                    {row[header] !== undefined ? String(row[header]) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 mt-2">
        Showing preview of first {previewData.length} rows
      </p>
    </div>
  );

  return (
    <div className="w-full">
      {!file ? (
        <div 
          ref={dragAreaRef}
          className="border-2 border-dashed border-slate-300 bg-slate-50 rounded-lg p-8 text-center mb-6"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            className="hidden"
            accept=".xlsx,.xls,.csv,.ods"
          />
          <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Drag & drop your Excel file here</h3>
          
          {suggestedFileName && (
            <div className="mb-4 p-2 bg-blue-50 border border-blue-100 rounded-lg inline-block">
              <p className="text-sm text-blue-700 flex items-center">
                <HelpCircle className="h-4 w-4 mr-1.5" />
                Recommended file: <span className="font-medium ml-1">{suggestedFileName}</span>
              </p>
            </div>
          )}
          
          <p className="text-sm text-slate-500 mb-4">or</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 inline-flex items-center"
          >
            <Upload className="h-4 w-4 mr-2" />
            Browse files
          </button>
          <p className="text-xs text-slate-500 mt-4">
            Supported formats: .xlsx, .xls, .csv, .ods
          </p>
        </div>
      ) : (
        <>
          {fileError && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-700">{fileError}</p>
              </div>
            </div>
          )}
          
          <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileSpreadsheet className="h-6 w-6 text-blue-500 mr-2" />
                <span className="font-medium truncate max-w-[250px]">{file.name}</span>
                <span className="ml-2 text-xs text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setHeaderRow([]);
                  setPreviewData([]);
                  setMappings({});
                  setIsAutoMapped(false);
                  setFileError(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {headerRow.length > 0 && (
            <>
              <div className="mb-4 border-b border-slate-200">
                <div className="flex">
                  <button
                    className={`px-4 py-2 ${
                      activeTab === 'mapping' 
                        ? 'border-b-2 border-blue-500 text-blue-600 font-medium' 
                        : 'text-slate-600'
                    }`}
                    onClick={() => setActiveTab('mapping')}
                  >
                    Column Mapping
                  </button>
                  <button
                    className={`px-4 py-2 ${
                      activeTab === 'preview' 
                        ? 'border-b-2 border-blue-500 text-blue-600 font-medium' 
                        : 'text-slate-600'
                    }`}
                    onClick={() => setActiveTab('preview')}
                    disabled={!file || headerRow.length === 0}
                  >
                    Data Preview
                  </button>
                </div>
              </div>
              
              {activeTab === 'mapping' ? renderMappingTab() : renderPreviewTab()}
            </>
          )}
        </>
      )}
      
      <div className="p-4 border-t border-slate-200 flex justify-between">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
        >
          Cancel
        </button>
        
        {file && headerRow.length > 0 && (
          <button
            onClick={handleMappingComplete}
            disabled={isProcessing || Object.keys(validationErrors).length > 0}
            className={`px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center ${
              isProcessing || Object.keys(validationErrors).length > 0
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-blue-600'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Import Orders
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
} 