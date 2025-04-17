'use client';

import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Search, Filter, ChevronDown, ChevronUp, MoreVertical, AlertTriangle, CheckCircle, Calendar, User, Package, DollarSign, Upload, FileSpreadsheet, X } from 'lucide-react';
import { Order, OrderStatus } from '../lib/orders-types';
import { formatCurrency } from '../lib/utils';
import ExcelColumnMapper from '../components/ExcelColumnMapper';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

// Define interface for shipping settings
interface ShippingSettings {
  shipping_base_cost: number;
  label_cost: number;
}

export default function NewOrdersClient() {
  const supabase = createClientComponentClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<{count: number, message: string} | null>(null);
  const [showMissingSkusWarning, setShowMissingSkusWarning] = useState(false);
  const [missingSkus, setMissingSkus] = useState<string[]>([]);
  
  // Add state for Clear Orders functionality
  const [showClearOrdersModal, setShowClearOrdersModal] = useState(false);
  const [isClearingOrders, setIsClearingOrders] = useState(false);
  const [clearOrdersError, setClearOrdersError] = useState<string | null>(null);
  const [clearOrdersSuccess, setClearOrdersSuccess] = useState(false);
  
  // Track skipped duplicate orders
  const [skippedDuplicates, setSkippedDuplicates] = useState(0);
  
  // Add state for import progress
  const [importTotalItems, setImportTotalItems] = useState(0);
  const [importProcessedItems, setImportProcessedItems] = useState(0);
  
  // Add state for batch management
  const [showBatchesModal, setShowBatchesModal] = useState(false);
  const [batchData, setBatchData] = useState<{upload_batch_id: string, order_count: number, created_at: string}[]>([]);
  const [isFetchingBatches, setIsFetchingBatches] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  
  // Add shipping settings state
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings>({
    shipping_base_cost: 1.75,
    label_cost: 2.25,
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(10);

  // Required fields for Excel upload
  const requiredFields = ['order_id', 'order_date', 'customer_name', 'sku', 'order_quantity', 'walmart_price_per_unit', 'walmart_shipping_fee_per_unit'];

  // Add state for viewing current month metrics
  const [isViewingCurrentMonth, setIsViewingCurrentMonth] = useState(false);
  // Add state for selected months
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  // Month names array for dropdown display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get current month and year
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Metrics calculations
  const getFilteredOrdersByMonths = () => {
    if (selectedMonths.length === 0 && !isViewingCurrentMonth) {
      return filteredOrders; // Return all orders if no specific months selected
    }
    
    // If viewing current month only is selected
    if (isViewingCurrentMonth) {
      return filteredOrders.filter(order => {
        const orderDate = new Date(order.order_date);
        return orderDate.getFullYear() === currentYear && orderDate.getMonth() === currentMonth;
      });
    }
    
    // Filter by selected months
    return filteredOrders.filter(order => {
      const orderDate = new Date(order.order_date);
      return selectedMonths.includes(orderDate.getMonth());
    });
  };
  
  const ordersForMetrics = getFilteredOrdersByMonths();
  
  const totalRevenue = ordersForMetrics.reduce((sum, order) => sum + order.total_revenue, 0);
  const totalProfit = ordersForMetrics.reduce((sum, order) => sum + order.net_profit, 0);
  
  // Calculate total investment cost
  const totalInvestmentCost = ordersForMetrics.reduce((sum, order) => {
    // Ensure costs are numbers, default to 0 if null/undefined
    const productCost = Number(order.product_cost_total) || 0;
    const fulfillment = Number(order.fulfillment_cost) || 0;
    const fee = Number(order.walmart_fee) || 0;
    return sum + productCost + fulfillment + fee;
  }, 0);
  
  // Calculate true Overall ROI based on investment cost
  const overallRoi = totalInvestmentCost > 0 
    ? (totalProfit / totalInvestmentCost) * 100 
    : 0;

  // Calculate Overall Profit Margin
  const overallProfitMargin = totalRevenue > 0
    ? (totalProfit / totalRevenue) * 100
    : 0;

  // Cache for mapped data
  const mappedDataRef = useRef<any[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // First get the current user
        const { data: userData, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Authentication error:', authError);
          throw new Error(`Authentication failed: ${authError.message || 'Unknown error'}`);
        }
        
        const userId = userData?.user?.id;
        console.log('Current user ID:', userId);

        if (!userId) {
          throw new Error('No authenticated user found');
        }

        // Test if user_id column exists before querying with it
        console.log('Fetching orders with user_id:', userId);
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', userId)
          .order('order_date', { ascending: false });

        // Log detailed error information
        if (error) {
          console.error('Supabase query error:', error);
          console.error('Error details:', JSON.stringify(error));
          throw error;
        }

        console.log(`Successfully fetched ${data?.length || 0} orders`);
        setOrders(data || []);
        setFilteredOrders(data || []);
      } catch (err: any) {
        const errorMessage = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
        console.error('Error fetching orders:', err);
        console.error('Error type:', typeof err);
        console.error('Error message:', errorMessage);
        console.error('Error stack:', err?.stack);
        setError(`Failed to load orders: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [supabase]);
  
  // Fetch shipping settings when component loads
  useEffect(() => {
    const fetchShippingSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('shipping_base_cost, label_cost')
          .limit(1);
          
        if (error) {
          throw error;
        }
        
        if (data && data.length > 0) {
          console.log('Loaded shipping settings:', data[0]);
          setShippingSettings({
            shipping_base_cost: data[0].shipping_base_cost || 1.75,
            label_cost: data[0].label_cost || 2.25
          });
        } else {
          console.log('No settings found, using defaults');
        }
      } catch (err) {
        console.error('Error fetching shipping settings:', err);
      }
    };
    
    fetchShippingSettings();
    
    // Subscribe to changes in app_settings to get real-time updates
    const settingsSubscription = supabase
      .channel('app_settings_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'app_settings' 
      }, (payload) => {
        console.log('App settings changed:', payload);
        
        // Update shipping settings when changes occur
        if (payload.new) {
          const newSettings = payload.new as any;
          setShippingSettings({
            shipping_base_cost: newSettings.shipping_base_cost || 1.75,
            label_cost: newSettings.label_cost || 2.25
          });
        }
      })
      .subscribe();
      
    // Cleanup subscription on component unmount
    return () => {
      settingsSubscription.unsubscribe();
    };
  }, [supabase]);

  // Calculate fulfillment cost from shipping settings
  const calculateFulfillmentCost = () => {
    return shippingSettings.shipping_base_cost + shippingSettings.label_cost;
  };

  useEffect(() => {
    // Filter orders based on search query and status filter
    let filtered = [...orders];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        order =>
          order.order_id.toLowerCase().includes(query) ||
          order.product_name.toLowerCase().includes(query) ||
          order.sku.toLowerCase().includes(query) ||
          order.customer_name.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      // Note: Status filtering is removed as we don't have order_status in the new schema
      // This would need to be reimplemented if status is added back
    }

    setFilteredOrders(filtered);
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [orders, searchQuery, statusFilter]);

  // Get current orders for the current page
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  // Change page
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const toggleMenu = (orderId: string) => {
    setOpenMenuId(prev => (prev === orderId ? null : orderId));
  };

  const handleMappedDataReady = async (mappedData: any[]) => {
    // Store the mapped data for later use
    mappedDataRef.current = mappedData;
    
    setIsImporting(true);
    setShowUploadModal(false);
    setSkippedDuplicates(0); // Reset skipped duplicates counter
    
    try {
      console.log("Mapped data received:", mappedData);
      
      // Validate order_id field exists in all rows
      const missingOrderIds = mappedData.filter(row => !row.order_id);
      if (missingOrderIds.length > 0) {
        throw new Error(`${missingOrderIds.length} orders are missing an order ID. Please ensure all orders have an ID.`);
      }
      
      // First, check for order_id field in the data to identify potential duplicates
      const orderIds = mappedData.map(row => row.order_id);
      
      // Check for duplicates in the database
      const { data: existingOrders, error: orderCheckError } = await supabase
        .from('orders')
        .select('order_id')
        .in('order_id', orderIds);
        
      if (orderCheckError) {
        console.error("Error checking for duplicate orders:", orderCheckError);
      } else if (existingOrders && existingOrders.length > 0) {
        // Create a set of existing order IDs for quick lookup
        const existingOrderIdSet = new Set(existingOrders.map(o => o.order_id));
        
        // Filter out duplicate orders
        const filteredData = mappedData.filter(row => {
          if (existingOrderIdSet.has(row.order_id)) {
            return false; // Skip this row as it's a duplicate
          }
          return true;
        });
        
        // Count skipped duplicates
        const skippedCount = mappedData.length - filteredData.length;
        setSkippedDuplicates(skippedCount);
        
        if (skippedCount > 0) {
          console.log(`Skipped ${skippedCount} duplicate orders based on order_id`);
          
          // Update the mappedData reference with filtered data
          mappedDataRef.current = filteredData;
          
          // If all orders were duplicates, show a message and stop
          if (filteredData.length === 0) {
            setIsImporting(false);
            toast.success(`All ${skippedCount} orders were duplicates and have been skipped.`);
            return;
          }
          
          // Continue with the filtered data
          mappedData = filteredData;
          
          // Notify user about skipped duplicates but continue with valid orders
          toast.success(`Skipped ${skippedCount} duplicate orders. Continuing with ${filteredData.length} new orders.`);
        }
      }
      
      // First, let's check all SKUs to see if they exist in the products table
      const allSkus = mappedData.map(row => row.sku).filter(Boolean);
      
      // Convert SKUs to lowercase for case-insensitive comparison
      const normalizedSkus = allSkus.map(sku => sku.toLowerCase());
      
      // Get all existing SKUs from products table
      const { data: existingProducts, error: skuError } = await supabase
        .from('products')
        .select('product_sku');
        
      if (skuError) {
        throw skuError;
      }
      
      // Create a map of existing SKUs for quick lookup (case insensitive)
      const existingSkuMap = new Map();
      existingProducts?.forEach(p => {
        if (p.product_sku) {
          existingSkuMap.set(p.product_sku.toLowerCase(), p.product_sku);
        }
      });
      
      // Separate rows into valid (SKU exists) and invalid (SKU doesn't exist)
      const validRows = [];
      const invalidRows = [];
      
      for (const row of mappedData) {
        if (!row.sku) {
          validRows.push(row);
        } else {
          // Case-insensitive lookup
          const normalizedSku = row.sku.toLowerCase();
          if (existingSkuMap.has(normalizedSku)) {
            // Use the exact case from the database
            row.sku = existingSkuMap.get(normalizedSku);
            validRows.push(row);
          } else {
            invalidRows.push(row);
          }
        }
      }
      
      // If there are missing SKUs, show a warning and offer to create products
      if (invalidRows.length > 0) {
        console.warn(`Found ${invalidRows.length} orders with SKUs that don't exist in the products table:`, 
          invalidRows.map(r => r.sku));
        
        // Get unique missing SKUs (remove duplicates and normalize case)
        const uniqueMissingSkus = Array.from(
          new Set(invalidRows.map(r => r.sku.toUpperCase()))
        );
        console.log(`Unique missing SKUs: ${uniqueMissingSkus.length}`, uniqueMissingSkus);
          
        // Store missing SKUs and show warning
        setMissingSkus(uniqueMissingSkus);
        setShowMissingSkusWarning(true);
        setIsImporting(false);
        return;
      }
      
      // If no missing SKUs, proceed with processing
      await processMappedData();
      
    } catch (error: any) {
      console.error("Error handling mapped data:", error);
      toast.error(`Import error: ${error.message || 'Unknown error occurred'}`);
      setIsImporting(false);
    }
  };

  // Function to create missing products
  const createMissingProducts = async (skus: string[]) => {
    if (!skus.length) return;
    
    setIsImporting(true);
    
    try {
      // Get current user ID
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        throw new Error('No authenticated user found');
      }
      
      // First, remove duplicates from the missing SKUs array and normalize case
      const uniqueSkus = [...new Set(skus.map(sku => sku.toUpperCase()))];
      
      // Check which SKUs actually don't exist to avoid conflicts (case insensitive)
      const { data: existingProducts, error: checkError } = await supabase
        .from('products')
        .select('product_sku');
        
      if (checkError) throw checkError;
      
      // Create case-insensitive lookup map of existing SKUs
      const existingSkuMap = new Map();
      existingProducts?.forEach(p => {
        if (p.product_sku) {
          existingSkuMap.set(p.product_sku.toLowerCase(), true);
        }
      });
      
      // Filter out any SKUs that already exist in the database (case insensitive)
      const skusToCreate = uniqueSkus.filter(sku => !existingSkuMap.has(sku.toLowerCase()));
      
      // If all SKUs already exist, just proceed with import
      if (skusToCreate.length === 0) {
        console.log('All SKUs already exist in the database, proceeding with import');
        setMissingSkus([]);
        setShowMissingSkusWarning(false);
        await processMappedData();
        return;
      }
      
      // Create new product entries for the truly missing SKUs
      const newProducts = skusToCreate.map(sku => ({
        product_sku: sku, // Keep uppercase for consistency
        name: `Product ${sku}`,
        cost_per_item: 0,
        quantity: 0,
        source: 'auto-generated',
        purchase_date: new Date().toISOString().split('T')[0],
        user_id: userId // Add user_id to each product
      }));
      
      const { data, error } = await supabase
        .from('products')
        .insert(newProducts);
        
      if (error) throw error;
      
      toast.success(`Created ${skusToCreate.length} new products in inventory.`);
      setMissingSkus([]);
      setShowMissingSkusWarning(false);
      
      // Proceed with import after creating products
      await processMappedData();
    } catch (err: any) {
      console.error('Error creating missing products:', err);
      const errorMessage = err.message || 'Unknown error occurred';
      toast.error(`Failed to create missing products: ${errorMessage}`);
      setIsImporting(false);
    }
  };

  // Process mapped data and import to database
  const processMappedData = async () => {
    setIsImporting(true);
    setImportProcessedItems(0); // Reset progress
    let localSkippedDuplicates = 0;
    const currentBatchId = uuidv4(); // Generate a unique batch ID for this upload
    
    try {
      // Get current user ID
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        throw new Error('No authenticated user found');
      }
      
      const mappedData = mappedDataRef.current;
      if (!mappedData || !mappedData.length) {
        throw new Error("No data to import");
      }
      
      setImportTotalItems(mappedData.length); // Set total items for progress bar (initial count)
      
      // Ensure all rows have an order_id
      if (mappedData.some(row => !row.order_id)) {
        throw new Error("Some orders are missing an order ID. Please ensure all orders have an ID.");
      }
      
      // --- Start: Enhanced Pre-computation and Validation ---
      
      // 1. Fetch existing order IDs again to be absolutely sure about duplicates
      const { data: existingOrdersData, error: orderFetchError } = await supabase
        .from('orders')
        .select('order_id');
        
      if (orderFetchError) {
        console.error("Pre-insert Fetch Error: Could not get existing order IDs:", orderFetchError);
        // Decide if we should proceed or throw error
      }
      const existingOrderIdSet = new Set(existingOrdersData?.map(o => o.order_id) || []);
      
      // 2. Fetch existing product SKUs and related data (cost, name) again
      const { data: existingProductsData, error: productFetchError } = await supabase
        .from('products')
        .select('product_sku, cost_per_item, name, per_qty_price');
        
      if (productFetchError) {
        console.error("Pre-insert Fetch Error: Could not get product data:", productFetchError);
        throw new Error("Failed to fetch product data for validation.");
      }
      const productMap = new Map();
      const validProductSkuSet = new Set(); // Case-sensitive set for validation
      existingProductsData?.forEach(p => {
        if (p.product_sku) {
          productMap.set(p.product_sku.toLowerCase(), p); // Use lowercase for lookup
          validProductSkuSet.add(p.product_sku); // Use exact case for validation
        }
      });
      
      // 3. Pre-process and validate all rows *before* attempting any inserts
      const rowsToInsert: any[] = [];
      const validationErrors: string[] = [];
      localSkippedDuplicates = 0; // Reset local count
      
      mappedData.forEach((originalRow, index) => {
        const rowIndex = index + 1; // 1-based index for user messages
        
        // Check for duplicate order_id
        if (existingOrderIdSet.has(originalRow.order_id)) {
          localSkippedDuplicates++;
          return; // Skip duplicate
        }
        
        // Check for valid SKU (case-sensitive)
        const currentSku = originalRow.sku;
        if (!currentSku || !validProductSkuSet.has(currentSku)) {
          validationErrors.push(`Row ${rowIndex} (Order ID: ${originalRow.order_id || 'N/A'}): Invalid or missing SKU '${currentSku}'.`);
          return; // Skip row with invalid SKU
        }
        
        // Format the row data and check NOT NULL constraints
        const productData = productMap.get(currentSku.toLowerCase());
        const productCost = parseFloat(productData?.per_qty_price ?? productData?.cost_per_item) || 0;
        const fulfillmentCost = parseFloat(originalRow.fulfillment_cost) || calculateFulfillmentCost();
        
        let processedRow: any = {
          order_id: originalRow.order_id,
          order_date: originalRow.order_date || new Date().toISOString().split('T')[0],
          customer_name: originalRow.customer_name || 'Unknown Customer',
          sku: originalRow.sku, // Use the validated SKU
          product_name: originalRow.product_name || productData?.name || 'Unknown Product',
          order_quantity: parseInt(originalRow.order_quantity) || 1,
          walmart_price_per_unit: parseFloat(originalRow.walmart_price_per_unit) || 0,
          walmart_shipping_fee_per_unit: parseFloat(originalRow.walmart_shipping_fee_per_unit) || 0,
          product_cost_per_unit: productCost,
          fulfillment_cost: fulfillmentCost,
          user_id: userId // Add user_id to each row
        };
        
        // Final check for NOT NULL fields before adding to insert list
        const notNullFields = ['order_id', 'order_date', 'customer_name', 'sku', 'order_quantity', 'walmart_price_per_unit', 'walmart_shipping_fee_per_unit', 'product_cost_per_unit', 'fulfillment_cost'];
        const missingFields = notNullFields.filter(field => processedRow[field] === null || processedRow[field] === undefined || processedRow[field] === '');
        
        if (missingFields.length > 0) {
          validationErrors.push(`Row ${rowIndex} (Order ID: ${processedRow.order_id}): Missing or invalid required fields: ${missingFields.join(', ')}.`);
          return; // Skip row failing NOT NULL checks
        }
        
        // If row is valid, add it to the list for batch insertion
        processedRow.upload_batch_id = currentBatchId; // Assign batch ID
        rowsToInsert.push(processedRow);
      });
      
      // Update the total skipped duplicate count state
      setSkippedDuplicates(prev => prev + localSkippedDuplicates);
      
      // If validation errors occurred, report them and stop
      if (validationErrors.length > 0) {
        const errorMsg = `${validationErrors.length} rows had validation errors and will be skipped: ${validationErrors.slice(0, 5).join('; ')}${validationErrors.length > 5 ? '...' : ''}`;
        console.error("Validation Errors:", validationErrors);
        
        // Don't stop the import if there are still valid rows, just show a warning
        if (rowsToInsert.length > 0) {
          toast.error(errorMsg, { duration: 10000 });
        } else {
          setError(errorMsg);
          toast.error(errorMsg, { duration: 10000 });
          setIsImporting(false);
          return;
        }
      }
      
      // If all rows were duplicates or invalid, stop
      if (rowsToInsert.length === 0) {
        const message = `No valid new orders found to import. Skipped ${localSkippedDuplicates} duplicates${validationErrors.length > 0 ? ` and ${validationErrors.length} invalid rows` : ''}.`;
        setIsImporting(false);
        setImportTotalItems(0); // Update total for progress display
        toast.success(message);
        return;
      }
      
      // Update total items for progress bar (actual number to insert)
      setImportTotalItems(rowsToInsert.length);
      
      // --- End: Enhanced Pre-computation and Validation ---
      
      // Insert the processed and validated data into the orders table
      let successCount = 0;
      let errorCount = 0;
      let insertErrors: string[] = [];
      let updateCount = 0;
      
      // Create a map to aggregate quantities by SKU for updating inventory
      const skuQuantityMap = new Map();
      
      // Insert rows one by one for better error isolation
      for (const [index, rowToInsert] of rowsToInsert.entries()) {
        try {
          console.log(`Attempting to insert/update row ${index + 1}/${rowsToInsert.length}:`, JSON.stringify(rowToInsert)); // Log row before insert
          
          // First check if this order already exists
          const { data: existingOrder, error: checkError } = await supabase
            .from('orders')
            .select('order_id')
            .eq('order_id', rowToInsert.order_id)
            .maybeSingle();
          
          let operationResult;
          
          if (existingOrder) {
            // Order exists - update it
            operationResult = await supabase
              .from('orders')
              .update(rowToInsert)
              .eq('order_id', rowToInsert.order_id);
            
            if (!operationResult.error) {
              updateCount++;
              successCount++;
            }
          } else {
            // Order doesn't exist - insert it
            operationResult = await supabase
              .from('orders')
              .insert([rowToInsert]);
              
            if (!operationResult.error) {
              successCount++;
            }
          }
            
          if (operationResult.error) {
            console.error(`Error processing row (Order ID: ${rowToInsert.order_id}):`, operationResult.error); 
            console.error(`Full Error Object (Order ID: ${rowToInsert.order_id}):`, JSON.stringify(operationResult.error, null, 2));
            errorCount++;
            insertErrors.push(`Order ID ${rowToInsert.order_id}: ${operationResult.error.message || 'Unknown error'}`);
          } else {
            // Aggregate quantities by SKU for inventory update
            if (rowToInsert.sku) {
              const currentQty = skuQuantityMap.get(rowToInsert.sku) || 0;
              skuQuantityMap.set(rowToInsert.sku, currentQty + (rowToInsert.order_quantity || 0));
            }
          }
        } catch (err: any) {
          console.error(`Exception processing row (Order ID: ${rowToInsert.order_id}):`, err);
          console.error(`Full Exception Object (Order ID: ${rowToInsert.order_id}):`, JSON.stringify(err, null, 2));
          errorCount++;
          insertErrors.push(`Order ID ${rowToInsert.order_id}: ${err.message || 'Unknown exception'}`);
        }
        // Update progress after each item attempt
        setImportProcessedItems(index + 1);
      }
      
      // Update inventory SALES QTY for each affected product
      if (skuQuantityMap.size > 0) {
        console.log("Updating inventory sales quantities:", Object.fromEntries(skuQuantityMap));
        
        // Perform updates for each SKU
        for (const [sku, quantity] of skuQuantityMap.entries()) {
          try {
            // First, get the current sales_qty value
            const { data: productData, error: fetchError } = await supabase
              .from('products')
              .select('sales_qty')
              .eq('product_sku', sku)
              .single();
              
            if (fetchError) {
              console.error(`Error fetching current sales_qty for ${sku}:`, fetchError);
              continue;
            }
            
            // Calculate new sales_qty value
            const currentSalesQty = productData?.sales_qty || 0;
            const newSalesQty = currentSalesQty + quantity;
            
            // Update the product's sales_qty
            const { error: updateError } = await supabase
              .from('products')
              .update({ sales_qty: newSalesQty })
              .eq('product_sku', sku);
              
            if (updateError) {
              console.error(`Error updating sales_qty for ${sku}:`, updateError);
            } else {
              console.log(`Updated sales_qty for ${sku}: ${currentSalesQty} + ${quantity} = ${newSalesQty}`);
            }
          } catch (err) {
            console.error(`Error processing sales_qty update for ${sku}:`, err);
          }
        }
      }
      
      // Prepare message based on results
      let message = `Import finished. Successful: ${successCount} (${updateCount} updated, ${successCount - updateCount} new), Failed: ${errorCount}.`;
      if (skippedDuplicates > 0) {
        message += ` Skipped ${skippedDuplicates} duplicates.`;
      }
      if (validationErrors.length > 0) {
        message += ` Skipped ${validationErrors.length} invalid rows.`;
      }
      
      // Add details about insertion errors if any
      if (insertErrors.length > 0) {
        message += ` Errors: ${insertErrors.slice(0, 2).join('; ')}${insertErrors.length > 2 ? '...' : ''}`;
      }
      
      // Show message
      if (successCount > 0 && errorCount === 0) {
        setImportSuccess({
          count: successCount,
          message: message
        });
        toast.success(message);
      } else if (successCount > 0 && errorCount > 0) {
        setError(message);
        toast.error(message, { duration: 10000 });
      } else if (successCount === 0 && errorCount > 0) {
        setError(`Import failed. ${message}`);
        toast.error(`Import failed. ${message}`, { duration: 10000 });
      } else if (successCount === 0 && errorCount === 0) {
        // This case might happen if all were duplicates initially
        toast.success(message); // Already handled the 'no valid orders' case earlier
      }
      
      // Refresh the orders list if any succeeded
      if (successCount > 0) {
        const { data: updatedOrders, error: fetchError } = await supabase
          .from('orders')
          .select('*')
          .order('order_date', { ascending: false });
          
        if (fetchError) throw fetchError;
        
        setOrders(updatedOrders || []);
      }      
      
    } catch (err: any) {
      console.error('Error processing orders:', err);
      setError(`Failed to import orders: ${err.message || JSON.stringify(err)}`);
      toast.error('Failed to import orders. Please try again.');
    } finally {
      setIsImporting(false);
      setImportProcessedItems(0); // Reset progress on finish/error
      setImportTotalItems(0);
    }
  };

  // Add handleClearAllOrders function
  const handleClearAllOrders = async () => {
    try {
      setIsClearingOrders(true);
      setClearOrdersError(null);
      
      // Get current user ID
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        throw new Error('No authenticated user found');
      }
      
      // Get all order IDs for the current user
      const { data: orderIds, error: fetchError } = await supabase
        .from('orders')
        .select('order_id')
        .eq('user_id', userId)
        .limit(1000);
      
      if (fetchError) {
        console.error('Error fetching orders for deletion:', fetchError);
        throw new Error(fetchError.message || 'Failed to fetch orders for deletion');
      }
      
      if (!orderIds || orderIds.length === 0) {
        setClearOrdersSuccess(true);
        toast.success('No orders to delete');
        setTimeout(() => {
          setShowClearOrdersModal(false);
          setClearOrdersSuccess(false);
        }, 1500);
        return;
      }
      
      console.log(`Found ${orderIds.length} orders to delete`);
      
      // Delete orders in smaller batches to avoid timeout/permission issues
      const batchSize = 25;
      let deletedCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < orderIds.length; i += batchSize) {
        const batchIds = orderIds.slice(i, i + batchSize).map(o => o.order_id);
        console.log(`Deleting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(orderIds.length/batchSize)}, size: ${batchIds.length}`);
        
        try {
          // Add a small delay between batches to prevent overloading the database
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          const { error: deleteError } = await supabase
            .from('orders')
            .delete()
            .in('order_id', batchIds);
          
          if (deleteError) {
            console.error(`Error deleting batch ${Math.floor(i/batchSize) + 1}:`, deleteError);
            
            // Try to get more detailed error info
            const errorDetails = typeof deleteError === 'object' ? 
              JSON.stringify(deleteError) : 'Unknown error';
              
            console.error(`Error details: ${errorDetails}`);
            errorCount += batchIds.length;
          } else {
            deletedCount += batchIds.length;
          }
        } catch (batchError) {
          console.error(`Exception in batch ${Math.floor(i/batchSize) + 1}:`, batchError);
          errorCount += batchIds.length;
        }
      }
      
      console.log(`Deletion complete. Deleted: ${deletedCount}, Errors: ${errorCount}`);
      
      if (deletedCount > 0) {
        // Show success message
        setClearOrdersSuccess(true);
        
        let message = `Deleted ${deletedCount} orders successfully`;
        if (errorCount > 0) {
          message += `. ${errorCount} orders could not be deleted due to errors.`;
        }
        
        toast.success(message);
        
        // Refresh orders
        const fetchOrders = async () => {
          try {
            const { data, error } = await supabase
              .from('orders')
              .select('*')
              .order('order_date', { ascending: false });
    
            if (error) {
              throw error;
            }
    
            setOrders(data || []);
            setFilteredOrders(data || []);
          } catch (err: any) {
            console.error('Error fetching orders:', err);
            setError('Failed to load orders. Please try again.');
          }
        };
        
        fetchOrders();
      } else {
        throw new Error('Failed to delete any orders. Check console for details.');
      }
      
      // Close modal after delay
      setTimeout(() => {
        setShowClearOrdersModal(false);
        setClearOrdersSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error clearing orders:', error);
      
      // Handle different error types properly
      let errorMessage = 'Failed to clear orders';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        try {
          const errorString = JSON.stringify(error);
          errorMessage = errorString !== '{}' ? errorString : 'Unknown error occurred while deleting orders';
        } catch (e) {
          errorMessage = 'Failed to process error details';
        }
      }
      
      setClearOrdersError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsClearingOrders(false);
    }
  };

  // Function to fetch batch data
  const fetchBatchData = async () => {
    setIsFetchingBatches(true);
    setBatchError(null);
    
    try {
      // Get current user ID
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        throw new Error('No authenticated user found');
      }
      
      // Get unique batch IDs and their counts
      const { data, error } = await supabase.rpc('get_batch_data', { user_id_param: userId });
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        setBatchData([]);
        return;
      }
      
      console.log("Fetched batch data:", data);
      setBatchData(data);
    } catch (err: any) {
      console.error("Error fetching batch data:", err);
      setBatchError(err.message || "Failed to fetch batch data");
    } finally {
      setIsFetchingBatches(false);
    }
  };
  
  // Function to delete a specific batch
  const handleDeleteBatch = async (batchId: string) => {
    try {
      setIsDeletingBatch(true);
      setSelectedBatchId(batchId);
      setBatchError(null);
      
      // Get current user ID
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        throw new Error('No authenticated user found');
      }
      
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('upload_batch_id', batchId)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Update batches list
      setBatchData(prev => prev.filter(batch => batch.upload_batch_id !== batchId));
      
      // Refresh orders
      const { data: updatedOrders, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .order('order_date', { ascending: false });
        
      if (fetchError) throw fetchError;
      
      setOrders(updatedOrders || []);
      
      toast.success('Batch deleted successfully');
    } catch (err: any) {
      console.error('Error deleting batch:', err);
      setBatchError(err.message || 'Failed to delete batch');
      toast.error('Failed to delete batch. Please try again.');
    } finally {
      setIsDeletingBatch(false);
      setSelectedBatchId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold gradient-text mb-6">Orders Management</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}
      
      {importSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded mb-6 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          <div>
            <p className="font-medium">Import Successful</p>
            <p className="text-sm">{importSuccess.message}</p>
          </div>
          <button 
            onClick={() => setImportSuccess(null)} 
            className="ml-auto text-emerald-500 hover:text-emerald-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Progress Bar during import */}
      {isImporting && importTotalItems > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-blue-700">Importing orders...</p>
            <p className="text-sm text-blue-600">
              {importProcessedItems} / {importTotalItems}
            </p>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${(importProcessedItems / importTotalItems) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="card p-4 border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50">
          <div className="text-sm text-blue-600 font-medium mb-1">Total Revenue</div>
          <div className="text-2xl font-bold text-slate-800">{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="card p-4 border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50">
          <div className="text-sm text-emerald-600 font-medium mb-1">Total Profit</div>
          <div className="text-2xl font-bold text-slate-800">{formatCurrency(totalProfit)}</div>
        </div>
        <div className="card p-4 border-l-4 border-l-purple-500 bg-gradient-to-br from-white to-purple-50">
          <div className="text-sm text-purple-600 font-medium mb-1">Fulfillment Costs</div>
          <div className="text-2xl font-bold text-slate-800">{formatCurrency(ordersForMetrics.reduce((sum, order) => sum + Number(order.fulfillment_cost || 0), 0))}</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center">
            <span className="font-medium mr-1">Per order:</span> ${calculateFulfillmentCost().toFixed(2)}
          </div>
        </div>
        <div className="card p-4 border-l-4 border-l-orange-500 bg-gradient-to-br from-white to-orange-50">
          <div className="text-sm text-orange-600 font-medium mb-1">Overall ROI</div>
          <div className="text-2xl font-bold text-slate-800">{overallRoi.toFixed(2)}%</div>
          <div className="text-xs text-slate-500 mt-1">
            {isViewingCurrentMonth ? 'Current Month' : 
             selectedMonths.length > 0 ? `${selectedMonths.length} Month${selectedMonths.length > 1 ? 's' : ''} Selected` : 
             'All Time'}
          </div>
        </div>
        <div className="card p-4 border-l-4 border-l-teal-500 bg-gradient-to-br from-white to-teal-50">
          <div className="text-sm text-teal-600 font-medium mb-1">Profit Margin (Current View)</div>
          <div className="text-2xl font-bold text-slate-800">{overallProfitMargin.toFixed(2)}%</div>
          <div className="text-xs text-slate-500 mt-1">
            {isViewingCurrentMonth ? 'Current Month' : 
             selectedMonths.length > 0 ? `${selectedMonths.length} Month${selectedMonths.length > 1 ? 's' : ''} Selected` : 
             'All Time'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-blue-400" />
          </div>
          <input
            type="text"
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-xs text-slate-500 mr-2">
            <span className="font-medium">Fulfillment cost:</span> ${calculateFulfillmentCost().toFixed(2)} 
            <span className="ml-1 text-slate-400">
              (Shipping: ${shippingSettings.shipping_base_cost.toFixed(2)} + Label: ${shippingSettings.label_cost.toFixed(2)})
            </span>
          </div>
        
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center mr-2 text-sm"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
            Upload Orders Excel
          </button>
          
          <button
            onClick={() => {
              setShowBatchesModal(true);
              fetchBatchData();
            }}
            className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center mr-2 text-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 mr-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Manage Batches
          </button>
          
          <button
            onClick={() => setShowClearOrdersModal(true)}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center mr-2 text-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5 mr-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Clear All Orders
          </button>
          
          <div className="relative">
            <button
              onClick={() => {
                if (selectedMonths.length === 0) {
                  // If no months selected, toggle current month filter
                  setIsViewingCurrentMonth(!isViewingCurrentMonth);
                }
                setShowMonthDropdown(!showMonthDropdown);
              }}
              className={`px-3 py-1.5 ${
                isViewingCurrentMonth || selectedMonths.length > 0 
                  ? 'bg-indigo-600 hover:bg-indigo-700' 
                  : 'bg-slate-600 hover:bg-slate-700'
              } text-white rounded-lg flex items-center mr-2 text-sm`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5 mr-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {isViewingCurrentMonth ? 'Current Month' : 
               selectedMonths.length > 0 ? `${selectedMonths.length} Month${selectedMonths.length > 1 ? 's' : ''} Selected` : 
               'Filter by Month'}
              <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
            </button>
            
            {showMonthDropdown && (
              <div className="absolute right-0 mt-1 bg-white rounded-md shadow-lg z-10 border border-slate-200 w-56">
                <div className="p-2">
                  <div className="mb-2 border-b border-slate-200 pb-2">
                    <label className="flex items-center space-x-2 p-1.5 hover:bg-slate-50 rounded">
                      <input
                        type="checkbox"
                        checked={isViewingCurrentMonth}
                        onChange={() => {
                          setIsViewingCurrentMonth(!isViewingCurrentMonth);
                          // Clear multi-month selection when selecting current month only
                          if (!isViewingCurrentMonth) {
                            setSelectedMonths([]);
                          }
                        }}
                        className="h-4 w-4 text-indigo-600 rounded"
                      />
                      <span className="text-sm font-medium">Current Month Only</span>
                    </label>
                  </div>
                  
                  <div className="mb-1">
                    <div className="text-xs font-medium text-slate-500 mb-1 px-1.5">Select Multiple Months:</div>
                    <div className="max-h-48 overflow-y-auto">
                      {monthNames.map((month, index) => (
                        <label key={month} className="flex items-center space-x-2 p-1.5 hover:bg-slate-50 rounded">
                          <input
                            type="checkbox"
                            checked={selectedMonths.includes(index)}
                            onChange={() => {
                              setIsViewingCurrentMonth(false);
                              setSelectedMonths(prev => 
                                prev.includes(index)
                                  ? prev.filter(m => m !== index)
                                  : [...prev, index]
                              );
                            }}
                            className="h-4 w-4 text-indigo-600 rounded"
                            disabled={isViewingCurrentMonth}
                          />
                          <span className="text-sm">{month}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between">
                    <button
                      onClick={() => {
                        setSelectedMonths([]);
                        setIsViewingCurrentMonth(false);
                        setShowMonthDropdown(false);
                      }}
                      className="text-xs text-slate-600 hover:text-slate-800"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() => setShowMonthDropdown(false)}
                      className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <button
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center text-slate-700 text-sm"
            onClick={() => setShowAllColumns(!showAllColumns)}
          >
            {showAllColumns ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 mr-1" /> Compact
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 mr-1" /> Expanded
              </>
            )}
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card overflow-hidden border-t-4 border-t-blue-500">
        <div className="overflow-x-auto">
          <table className="table-modern">
            <thead>
              <tr className="bg-gradient-to-r from-blue-50 to-slate-50">
                <th>Order Info</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Financials</th>
                {showAllColumns && (
                  <>
                    <th>Costs</th>
                    <th>Calculations</th>
                  </>
                )}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={showAllColumns ? 6 : 5} className="text-center py-8">
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={showAllColumns ? 6 : 5} className="text-center py-8">
                    No orders found.
                  </td>
                </tr>
              ) : (
                currentOrders.map((order) => (
                  <tr key={`${order.order_id}-${order.sku}`} className="border-t border-slate-100 hover:bg-slate-50">
                    <td>
                      <div className="font-medium text-blue-700">{order.order_id}</div>
                      <div className="text-xs text-slate-500 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(order.order_date)}
                      </div>
                    </td>
                    <td>
                      <div className="font-medium text-slate-800 flex items-center">
                        <User className="h-4 w-4 mr-1 text-slate-400" />
                        {order.customer_name}
                      </div>
                    </td>
                    <td>
                      <div className="font-medium text-slate-800">{order.product_name}</div>
                      <div className="text-xs text-slate-500 flex items-center">
                        <Package className="h-3 w-3 mr-1" />
                        SKU: {order.sku} • Qty: {order.order_quantity}
                      </div>
                    </td>
                    <td>
                      <div className="font-medium flex items-center">
                        <DollarSign className="h-4 w-4 mr-1 text-blue-500" />
                        {formatCurrency(order.total_revenue)}
                      </div>
                      <div className="text-sm text-emerald-600 font-medium">
                        Profit: {formatCurrency(order.net_profit)}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center mt-1">
                        <span className="font-medium">Fulfillment:</span> {formatCurrency(order.fulfillment_cost)}
                      </div>
                    </td>
                    {showAllColumns && (
                      <>
                        <td>
                          <div className="font-medium">Unit Cost: {formatCurrency(order.product_cost_per_unit)}</div>
                          <div className="text-xs text-slate-500">
                            Fulfillment: {formatCurrency(order.fulfillment_cost)}
                          </div>
                          <div className="text-xs text-slate-500">
                            Total Cost: {formatCurrency(order.product_cost_total + order.fulfillment_cost)}
                          </div>
                        </td>
                        <td>
                          <div>Item Total: {formatCurrency(order.walmart_item_total)}</div>
                          <div className="text-xs text-slate-500">
                            Shipping: {formatCurrency(order.walmart_shipping_total)}
                          </div>
                          <div className="text-xs text-slate-500">
                            Walmart Fee: {formatCurrency(order.walmart_fee)}
                          </div>
                        </td>
                      </>
                    )}
                    <td>
                      <div className="relative">
                        <button
                          className="p-1 rounded-full hover:bg-blue-100"
                          onClick={() => toggleMenu(order.order_id)}
                        >
                          <MoreVertical className="h-5 w-5 text-blue-500" />
                        </button>
                        {openMenuId === order.order_id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-slate-100">
                            <div className="py-1">
                              <button
                                className="px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 w-full text-left flex items-center"
                                onClick={() => {
                                  // Implement actions appropriate for the new schema
                                  setOpenMenuId(null);
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
                                View Details
                              </button>
                              <button
                                className="px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 w-full text-left flex items-center"
                                onClick={() => {
                                  // Print function could be implemented here
                                  setOpenMenuId(null);
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" />
                                Print Invoice
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination */}
      {filteredOrders.length > 0 && (
        <div className="flex items-center justify-between mt-6 flex-wrap gap-4">
          <div className="text-sm text-slate-500">
            Showing {indexOfFirstOrder + 1} to {Math.min(indexOfLastOrder, filteredOrders.length)} of {filteredOrders.length} orders
          </div>
          
          <div className="flex items-center">
            <div className="mr-4 flex items-center">
              <span className="mr-2 text-sm text-slate-600">Orders per page:</span>
              <select 
                value={ordersPerPage} 
                onChange={(e) => {
                  setOrdersPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-slate-200 rounded p-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            <nav className="flex items-center">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 border border-slate-200 rounded-l-lg ${
                  currentPage === 1 
                    ? 'bg-slate-50 text-slate-400 cursor-not-allowed' 
                    : 'bg-white text-blue-500 hover:bg-blue-50'
                }`}
              >
                Previous
              </button>
              
              {/* Page numbers */}
              <div className="hidden md:flex">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  
                  // Show first page, last page, current page, and pages adjacent to current
                  if (totalPages <= 5) {
                    // If 5 or fewer pages, show all
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    // Near start
                    pageNum = i + 1;
                    if (i === 4) pageNum = totalPages;
                  } else if (currentPage >= totalPages - 2) {
                    // Near end
                    if (i === 0) pageNum = 1;
                    else pageNum = totalPages - (4 - i);
                  } else {
                    // Middle
                    pageNum = currentPage - 2 + i;
                    if (i === 0) pageNum = 1;
                    if (i === 4) pageNum = totalPages;
                  }
                  
                  // Add ellipsis indicators
                  if ((i === 1 && pageNum !== 2) || (i === 3 && pageNum !== totalPages - 1)) {
                    return (
                      <span key={`ellipsis-${i}`} className="px-3 py-2 border-t border-b border-slate-200 bg-white text-slate-400">
                        ...
                      </span>
                    );
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => paginate(pageNum)}
                      className={`px-3 py-2 border-t border-b border-slate-200 ${
                        currentPage === pageNum
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'bg-white text-slate-600 hover:bg-blue-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              {/* Mobile page indicator */}
              <div className="md:hidden px-3 py-2 border-t border-b border-slate-200 bg-white text-slate-600">
                Page {currentPage} of {totalPages}
              </div>
              
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 border border-slate-200 rounded-r-lg ${
                  currentPage === totalPages
                    ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                    : 'bg-white text-blue-500 hover:bg-blue-50'
                }`}
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      )}
      
      {/* Excel Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Upload Orders from Excel</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <ExcelColumnMapper
              onMappedDataReady={handleMappedDataReady}
              onClose={() => setShowUploadModal(false)}
              requiredFields={requiredFields}
              suggestedFileName="@PO_Data_03-21-2025_21_00_52.xlsx"
            />
          </div>
        </div>
      )}
      
      {/* Missing SKUs Warning Modal */}
      {showMissingSkusWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
              Missing Products
            </h3>
            
            <p className="text-slate-600 mb-4">
              The following SKUs from your order data don't exist in your inventory:
            </p>
            
            <div className="max-h-48 overflow-y-auto bg-slate-50 p-2 rounded border border-slate-200 mb-4">
              <ul className="list-disc pl-5">
                {missingSkus.map((sku, index) => (
                  <li key={index} className="text-sm text-slate-700">{sku}</li>
                ))}
              </ul>
            </div>
            
            <p className="text-slate-600 mb-6">
              You can either create these products automatically or cancel the import and add them manually.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowMissingSkusWarning(false);
                  setMissingSkus([]);
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancel Import
              </button>
              
              <button
                onClick={() => createMissingProducts(missingSkus)}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Create Missing Products
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Clear Orders confirmation modal */}
      {showClearOrdersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <svg 
                className="mx-auto h-12 w-12 text-red-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                />
              </svg>
              <h3 className="text-lg font-bold text-gray-900 mt-4">Clear All Orders</h3>
              
              {!clearOrdersSuccess ? (
                <>
                  <p className="text-sm text-gray-600 mt-2">
                    Are you sure you want to delete <span className="font-bold text-red-600">ALL</span> orders? 
                    This action cannot be undone.
                  </p>
                  
                  {clearOrdersError && (
                    <div className="mt-4 bg-red-50 p-4 rounded-md text-red-700 text-sm">
                      {clearOrdersError}
                    </div>
                  )}
                  
                  <div className="mt-6 flex space-x-3 justify-center">
                    <button
                      onClick={() => setShowClearOrdersModal(false)}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClearAllOrders}
                      disabled={isClearingOrders}
                      className={`px-4 py-2 rounded text-white ${
                        isClearingOrders ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {isClearingOrders ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deleting...
                        </span>
                      ) : (
                        'Delete All Orders'
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-4 text-green-600">
                  <p className="font-medium">Orders have been cleared successfully!</p>
                  <p className="text-sm mt-1">Your orders table is now empty.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Batch Management Modal */}
      {showBatchesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2 text-indigo-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Manage Order Batches
              </h3>
              <button
                onClick={() => setShowBatchesModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {batchError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {batchError}
              </div>
            )}
            
            <p className="text-slate-600 mb-4">
              Orders are grouped by upload batch. You can delete specific batches without affecting others.
            </p>
            
            {isFetchingBatches ? (
              <div className="py-8 text-center text-slate-500">
                <svg className="animate-spin h-6 w-6 mx-auto mb-2 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading batches...
              </div>
            ) : batchData.length === 0 ? (
              <div className="py-8 text-center text-slate-500 border border-slate-200 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10 mx-auto mb-2 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p>No batch information found.</p>
                <p className="text-sm mt-1">Orders may not have been uploaded in batches.</p>
              </div>
            ) : (
              <div className="overflow-hidden border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Batch ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Upload Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Orders</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {batchData.map((batch) => (
                      <tr key={batch.upload_batch_id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-900">
                          <div className="font-mono text-xs truncate max-w-[150px]" title={batch.upload_batch_id}>
                            {batch.upload_batch_id.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {new Date(batch.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {batch.order_count}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900 text-center">
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete all ${batch.order_count} orders in this batch? This action cannot be undone.`)) {
                                handleDeleteBatch(batch.upload_batch_id);
                              }
                            }}
                            disabled={isDeletingBatch && selectedBatchId === batch.upload_batch_id}
                            className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white 
                              ${isDeletingBatch && selectedBatchId === batch.upload_batch_id
                                ? 'bg-red-400 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                              }`}
                          >
                            {isDeletingBatch && selectedBatchId === batch.upload_batch_id ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Deleting...
                              </>
                            ) : (
                              <>
                                <svg className="mr-1.5 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete Batch
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowBatchesModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 