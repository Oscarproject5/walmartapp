'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import Image from 'next/image';
import { formatCurrency } from '../utils/calculations';
import { checkDatabasePermissions } from '../lib/check-permissions';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import ColumnMappingModal from './ColumnMappingModal';
import AddInventoryItemModal from './AddInventoryItemModal';
import EditInventoryItemModal from './EditInventoryItemModal';
import ProductBatchDetailModal from './ProductBatchDetailModal';

interface InventoryTableProps {
  className?: string;
  onItemDeleted?: () => void;
  refresh?: number;
}

interface InventoryItem {
  id: string;
  sku: string | null;
  product_sku: string | null;
  name: string;
  product_name: string | null;
  quantity: number;
  cost_per_item: number;
  purchase_date: string;
  source: 'amazon' | 'walmart' | 'sams_club';
  created_at: string;
  image_url: string | null;
  supplier: string | null;
  product_link: string | null;
  purchase_price: number | null;
  sales_qty: number | null;
  available_qty: number | null;
  per_qty_price: number | null;
  stock_value: number | null;
  status: string | null;
  remarks: string | null;
  original_status?: string;
}

// Define column types for sorting
type SortableColumn = 'product_sku' | 'product_name' | 'supplier' | 'purchase_price' | 
  'sales_qty' | 'available_qty' | 'per_qty_price' | 'stock_value' | 'status';
type SortDirection = 'asc' | 'desc';

export default function InventoryTable({ className = '', onItemDeleted, refresh = 0 }: InventoryTableProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('inventorySearchQuery') || '';
    }
    return '';
  });
  const [sortBy, setSortBy] = useState<SortableColumn>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('inventorySortBy') as SortableColumn) || 'product_sku';
    }
    return 'product_sku';
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('inventorySortDirection') as SortDirection) || 'asc';
    }
    return 'asc';
  });
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [permissions, setPermissions] = useState<{ canDelete: boolean } | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [inactivateMode, setInactivateMode] = useState(false);
  const [runningDiagnostic, setRunningDiagnostic] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Add state for the upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreviewData, setFilePreviewData] = useState<any[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [importStats, setImportStats] = useState<{
    total: number;
    success: number;
    duplicates?: number;
    errors?: number;
  } | null>(null);
  
  // Add state for column mapping modal
  const [showColumnMappingModal, setShowColumnMappingModal] = useState(false);
  const [mappedData, setMappedData] = useState<any[]>([]);
  
  // Add a showDebugInfo state
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  
  // Add new state variables for clear inventory confirmation
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearingInventory, setIsClearingInventory] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [clearSuccess, setClearSuccess] = useState(false);
  
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Add state for the add item modal
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  
  // Add state for the edit item modal
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  
  // Add user state
  const [userId, setUserId] = useState<string | null>(null);
  const supabaseClient = createClientComponentClient();
  
  // Add state for displaying the FIFO details modal
  const [showFifoDetailModal, setShowFifoDetailModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  // Get the current user's ID
  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    getUserId();
  }, []);

  // Update the useEffect to reset pagination when inventory changes
  useEffect(() => {
    if (userId) {
      console.log('InventoryTable: User ID available, fetching data...');
      fetchInventory();
    }
    checkPermissions();
  }, [userId, refresh]);

  useEffect(() => {
    // Reset to first page when search query changes
    setCurrentPage(1);
  }, [searchQuery]);

  // Process and prepare inventory data
  const processInventoryData = (data: any[]) => {
    return data.map(item => {
      // Calculate available quantity and stock value
      const salesQty = item.sales_qty || 0;
      const availableQty = item.available_qty !== undefined ? item.available_qty : (item.quantity || 0) - salesQty;
      const perQtyPrice = item.cost_per_item || 0;
      const stockValue = availableQty > 0 ? availableQty * perQtyPrice : 0;
      
      // Determine status based on available quantity
      let status = item.status || 'active';
      if (availableQty <= 0) {
        status = 'out_of_stock';
      } else if (availableQty < 5) { // Threshold for low stock
        status = 'low_stock';
      } else {
        // If available_qty > 0 and not low_stock, set to active
        // This ensures items with available_qty > 0 are never "out_of_stock"
        if (status === 'out_of_stock') {
          status = 'active';
        }
      }
      
      return {
        ...item,
        original_status: item.status,  // Store the original status for comparison
        sales_qty: salesQty,
        available_qty: availableQty,
        per_qty_price: perQtyPrice,
        stock_value: stockValue,
        status: status
      };
    });
  };

  // Update the fetchInventory function to use user_id filtering
  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (refresh > 0) {
        console.log(`Refreshing inventory (${refresh})`);
      }

      // Only fetch data if we have a userId
      if (!userId) {
        console.log('No user ID available, deferring inventory fetch');
        return;
      }

      console.log('Fetching inventory data from the database...');
      console.log(`Using user_id: ${userId}`);
      
      // Fetch products for the current user
      const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log(`Inventory data fetched: ${data?.length || 0} items found`);
      
      // Process the data to add calculated fields
      const processedData = processInventoryData(data || []);
      
      console.log('Setting inventory state with processed data...');
      setInventory(processedData);
      setFilteredInventory(processedData);
      
      // Log counts for debugging
      const counts = {
        total: processedData.length,
        active: processedData.filter(item => item.status === 'active').length,
        lowStock: processedData.filter(item => item.status === 'low_stock').length,
        outOfStock: processedData.filter(item => item.status === 'out_of_stock').length,
        totalQty: processedData.reduce((sum, item) => sum + (item.quantity || 0), 0),
        totalValue: processedData.reduce((sum, item) => sum + (item.stock_value || 0), 0).toFixed(2),
      };
      console.log('Inventory stats:', counts);
      
      // Update the database with calculated statuses
      updateInventoryStatuses(processedData);
      
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Failed to load inventory data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update the updateInventoryStatuses function to use the authenticated client
  const updateInventoryStatuses = async (items: any[]) => {
    if (!userId) {
      console.log('No user ID available, skipping status updates');
      return;
    }
    
    for (const item of items) {
      // Only update if status has been recalculated differently from stored value
      if (item.status !== item.original_status) {
        try {
          const { error } = await supabaseClient
            .from('products')
            .update({ status: item.status })
            .eq('id', item.id)
            .eq('user_id', userId);
            
          if (error) {
            console.error(`Failed to update status for item ${item.id}:`, error);
          }
        } catch (err) {
          console.error(`Error updating item ${item.id} status:`, err);
        }
      }
    }
  };

  async function checkPermissions() {
    try {
      const perms = await checkDatabasePermissions();
      setPermissions(perms);
      
      if (!perms.canDelete) {
        setError(`Warning: You may not have permission to delete items. Error: ${perms.deleteError || 'Unknown'}`);
      }
    } catch (err) {
      console.error('Failed to check permissions:', err);
    }
  }

  // Function to handle sorting
  const handleSort = (column: SortableColumn) => {
    let newDirection: SortDirection = 'asc';
    
    if (sortBy === column) {
      // Toggle sort direction if same column
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
      localStorage.setItem('inventorySortDirection', newDirection);
    } else {
      // Set new sort column with default ascending direction
      setSortBy(column);
      setSortDirection('asc');
      localStorage.setItem('inventorySortBy', column);
      localStorage.setItem('inventorySortDirection', 'asc');
    }
  };

  // Function to handle delete confirmation
  const handleDeleteConfirm = (id: string) => {
    if (permissions && !permissions.canDelete) {
      setError('You do not have permission to delete items. Please check your database permissions.');
      return;
    }
    
    setDeleteItemId(id);
    setInactivateMode(false);
    setShowDeleteConfirm(true);
  };

  // Add a new function to handle inactivate confirmation
  const handleInactivateConfirm = (id: string) => {
    setDeleteItemId(id);
    setInactivateMode(true);
    setShowDeleteConfirm(true);
  };

  // Function to handle actual deletion
  const handleDelete = async () => {
    if (!deleteItemId || !userId) return;
    
    try {
      setIsDeleting(true);
      
      console.log(`Deleting inventory item with ID: ${deleteItemId}`);
      
      // Delete the item with user_id check
      const { error } = await supabaseClient
        .from('products')
        .delete()
        .eq('id', deleteItemId)
        .eq('user_id', userId);
      
      if (error) {
        throw error;
      }
      
      console.log('Item deleted successfully');
      
      // Remove the item from local state
      setInventory(prev => prev.filter(item => item.id !== deleteItemId));
      setFilteredInventory(prev => prev.filter(item => item.id !== deleteItemId));
      
      // Reset state
      setShowDeleteConfirm(false);
      setDeleteItemId(null);
      
      // Refresh the parent component if needed
      if (onItemDeleted) {
        onItemDeleted();
      }
      
    } catch (error) {
      console.error('Error deleting item:', error);
      setError('Failed to delete the item. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to mark product as inactive
  const handleInactivate = async () => {
    if (!deleteItemId || !userId) return;
    
    try {
      setIsDeleting(true);
      
      console.log(`Inactivating inventory item with ID: ${deleteItemId}`);
      
      const { error } = await supabaseClient
        .from('products')
        .update({ status: 'inactive' })
        .eq('id', deleteItemId)
        .eq('user_id', userId);
      
      if (error) {
        throw error;
      }
      
      console.log('Item inactivated successfully');
      
      // Update the status in local state
      setInventory(prev => 
        prev.map(item => 
          item.id === deleteItemId 
            ? { ...item, status: 'inactive' } 
            : item
        )
      );
      
      setFilteredInventory(prev => 
        prev.map(item => 
          item.id === deleteItemId 
            ? { ...item, status: 'inactive' } 
            : item
        )
      );
      
      // Reset state
      setShowDeleteConfirm(false);
      setDeleteItemId(null);
      
      // Refresh the parent component if needed
      if (onItemDeleted) {
        onItemDeleted();
      }
      
    } catch (error) {
      console.error('Error inactivating item:', error);
      setError('Failed to inactivate the item. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleActivate = async () => {
    if (!deleteItemId || !userId) return;
    
    try {
      setIsDeleting(true);
      
      console.log(`Activating inventory item with ID: ${deleteItemId}`);
      
      const { error } = await supabaseClient
        .from('products')
        .update({ status: 'active' })
        .eq('id', deleteItemId)
        .eq('user_id', userId);
      
      if (error) {
        throw error;
      }
      
      console.log('Item activated successfully');
      
      // Update the status in local state
      setInventory(prev => 
        prev.map(item => 
          item.id === deleteItemId 
            ? { ...item, status: 'active' } 
            : item
        )
      );
      
      setFilteredInventory(prev => 
        prev.map(item => 
          item.id === deleteItemId 
            ? { ...item, status: 'active' } 
            : item
        )
      );
      
      // Reset state
      setShowDeleteConfirm(false);
      setDeleteItemId(null);
      
      // Refresh the parent component if needed
      if (onItemDeleted) {
        onItemDeleted();
      }
      
    } catch (error) {
      console.error('Error activating item:', error);
      setError('Failed to activate the item. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Update the handleActivateConfirm function to set inactivateMode correctly
  const handleActivateConfirm = (id: string) => {
    setDeleteItemId(id);
    setInactivateMode(true); // We are using the same dialog but need inactivateMode for logic checks
    setShowDeleteConfirm(true);
  };

  // Add a toggle function for the dropdown menu
  const toggleMenu = (id: string) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  // Update filtered inventory when search query or inventory changes
  useEffect(() => {
    const filtered = inventory.filter(item => {
      const searchableText = [
        item.sku,
        item.product_sku,
        item.name,
        item.product_name,
        item.supplier,
        item.source,
        item.status
      ].filter(Boolean).join(' ').toLowerCase();
      
      return searchQuery === '' || searchableText.includes(searchQuery.toLowerCase());
    });
    
    setFilteredInventory(filtered);
  }, [inventory, searchQuery]);

  // Sort the filtered inventory
  const sortedInventory = [...filteredInventory].sort((a, b) => {
    const getValue = (item: InventoryItem, column: SortableColumn) => {
      // Handle different data types for comparison
      switch (column) {
        case 'purchase_price':
          return Number(item.purchase_price || item.cost_per_item || 0);
        case 'sales_qty':
          return Number(item.sales_qty || 0);
        case 'available_qty':
          return Number(item.available_qty || item.quantity || 0);
        case 'per_qty_price':
          return Number(item.per_qty_price || item.cost_per_item || 0);
        case 'stock_value':
          return Number(item.stock_value || (item.quantity * item.cost_per_item) || 0);
        case 'product_sku':
          return (item.product_sku || '').toLowerCase();
        case 'product_name':
          return (item.product_name || item.name || '').toLowerCase();
        case 'supplier':
          return (item.supplier || item.source || '').toLowerCase();
        case 'status':
          return (item.status || 'active').toLowerCase();
        default:
          return '';
      }
    };

    const valueA = getValue(a, sortBy);
    const valueB = getValue(b, sortBy);

    if (sortDirection === 'asc') {
      return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
    } else {
      return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
    }
  });

  // Pagination calculation helper functions
  const paginate = (array: InventoryItem[], pageSize: number, pageNumber: number) => {
    return array.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
  };

  const totalPages = Math.ceil(sortedInventory.length / itemsPerPage);

  // Handle page changes
  const goToPage = (page: number) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  };

  // Get the current page's items
  const currentItems = paginate(sortedInventory, itemsPerPage, currentPage);

  // Add the pagination controls component
  const PaginationControls = () => {
    if (sortedInventory.length <= itemsPerPage) return null;

    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-b-lg">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
              currentPage === 1
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-700 bg-white hover:bg-gray-50'
            } border border-gray-300`}
          >
            Previous
          </button>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
              currentPage === totalPages
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-700 bg-white hover:bg-gray-50'
            } border border-gray-300`}
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, sortedInventory.length)}
              </span>{' '}
              of <span className="font-medium">{sortedInventory.length}</span> results
            </p>
          </div>
          <div>
            <div className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 text-sm font-medium ${
                  currentPage === 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:bg-gray-50'
                } rounded-l-md border border-gray-300`}
              >
                <span className="sr-only">First</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M8.707 5.293a1 1 0 010 1.414L5.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 text-sm font-medium ${
                  currentPage === 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:bg-gray-50'
                } border border-gray-300`}
              >
                <span className="sr-only">Previous</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  // If 5 or fewer pages, show all page numbers
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  // If near the start, show first 5 pages
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  // If near the end, show last 5 pages
                  pageNumber = totalPages - 4 + i;
                } else {
                  // Otherwise show current page and 2 pages before & after
                  pageNumber = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={i}
                    onClick={() => goToPage(pageNumber)}
                    aria-current={currentPage === pageNumber ? 'page' : undefined}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
                      currentPage === pageNumber
                        ? 'z-10 bg-blue-600 text-white focus:z-20'
                        : 'text-gray-500 hover:bg-gray-50'
                    } border border-gray-300`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-2 text-sm font-medium ${
                  currentPage === totalPages
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:bg-gray-50'
                } border border-gray-300`}
              >
                <span className="sr-only">Next</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-2 text-sm font-medium ${
                  currentPage === totalPages
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:bg-gray-50'
                } rounded-r-md border border-gray-300`}
              >
                <span className="sr-only">Last</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M11.293 14.707a1 1 0 010-1.414L14.586 10l-3.293-3.293a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Now update the table to map over currentItems instead of sortedInventory
  // Find the part of the code that renders the table body and replace 'sortedInventory.map' with 'currentItems.map'

  // At the end of the table, add the PaginationControls component

  // Modify the map function in the table body to use currentItems instead of sortedInventory
  // sortedInventory.map((item) => ( ... )) => currentItems.map((item) => ( ... ))

  // Add the pagination controls component at the bottom of the table
  // <tbody className="bg-white divide-y divide-gray-200">
  //   {currentItems.map((item) => ( ... ))}
  // </tbody>
  // ...
  // </table>
  // <PaginationControls />

  // You also need to update the "no results" message if needed
  // {sortedInventory.length === 0 ? <tr>...</tr> : currentItems.map((item) => ...

  // Add a function to run diagnostics
  const runDiagnostics = async () => {
    try {
      setRunningDiagnostic(true);
      setDiagnosticResults(null);
      
      const results: Record<string, any> = {};
      
      // Step 1: Check permissions
      console.log('Running permission check...');
      const permissionCheck = await checkDatabasePermissions();
      results.permissions = permissionCheck;
      
      // Step 2: Check schema - Removed as checkDatabaseSchema function was removed
      console.log('Schema check skipped - function removed');
      results.schema = { success: true, note: "Schema check function was removed from the codebase" };
      
      // Step 3: Try to get specific information about a product
      if (deleteItemId) {
        console.log(`Checking product ${deleteItemId}...`);
        const { data: productData, error: productError } = await supabaseClient
          .from('products')
          .select('*')
          .eq('id', deleteItemId)
          .eq('user_id', userId)
          .single();
          
        results.productCheck = { data: productData, error: productError };
        
        // Step 4: Check for relationships
        console.log('Checking relationships...');
        const { data: salesData, error: salesError } = await supabaseClient
          .from('sales')
          .select('id')
          .eq('product_id', deleteItemId)
          .eq('user_id', userId)
          .limit(1);
        
        console.log('Sales check result:', { salesData, salesError });
        
        if (salesError) {
          throw new Error(`Error checking sales data: ${salesError.message}`);
        }
        
        if (salesData && salesData.length > 0) {
          setErrorDetails(JSON.stringify({
            message: "Cannot delete product with related sales records",
            details: "This product has sales records associated with it. Delete the sales records first or mark the product as inactive instead.",
            hint: "Consider adding a status field to mark products as inactive instead of deleting them."
          }, null, 2));
          throw new Error("Cannot delete: Product has related sales records");
        }
        
        // Check for any other foreign key relationships
        console.log('Checking for other foreign key relationships...');
        
        // If no sales records, proceed with deletion
        console.log('Proceeding with deletion');
        const deleteResponse = await supabaseClient
          .from('products')
          .delete()
          .eq('id', deleteItemId)
          .eq('user_id', userId);
        
        console.log('Delete response:', deleteResponse);
        
        if (deleteResponse.error) {
          console.error('Supabase delete error:', deleteResponse.error.message, deleteResponse.error.details, deleteResponse.error.hint);
          setErrorDetails(JSON.stringify({ 
            message: deleteResponse.error.message, 
            details: deleteResponse.error.details, 
            hint: deleteResponse.error.hint,
            code: deleteResponse.error.code
          }, null, 2));
          throw new Error(`Failed to delete: ${deleteResponse.error.message}`);
        }
        
        // Remove item from local state
        setInventory(prev => prev.filter(item => item.id !== deleteItemId));
        
        // Close the dialog
        setShowDeleteConfirm(false);
        setDeleteItemId(null);
        
        // Call the onItemDeleted callback if provided
        if (onItemDeleted) {
          onItemDeleted();
        }
        
      } else {
        setErrorDetails(JSON.stringify({
          message: "No product selected for deletion",
          details: "Please select a product to delete",
          hint: "Select a product from the table to delete"
        }, null, 2));
        throw new Error("No product selected for deletion");
      }
      
    } catch (err) {
      console.error('Error running diagnostics:', err);
      setError(err instanceof Error ? err.message : 'Failed to run diagnostics. Please try again.');
    } finally {
      setRunningDiagnostic(false);
    }
  };

  // Add a function to test product updates
  async function testProductUpdate(productId: string) {
    try {
      // First try to get the product
      const { data: product, error: getError } = await supabaseClient
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('user_id', userId)
        .single();
      
      if (getError) {
        return { success: false, error: getError, phase: 'get' };
      }
      
      if (!product) {
        return { success: false, error: 'Product not found', phase: 'get' };
      }
      
      // Try to update the product with the same data (no actual change)
      const { error: updateError } = await supabaseClient
        .from('products')
        .update({ 
          // Use existing values to not change anything
          name: product.name,
          quantity: product.quantity
        })
        .eq('id', productId)
        .eq('user_id', userId);
      
      if (updateError) {
        return { success: false, error: updateError, phase: 'update' };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error, phase: 'exception' };
    }
  }

  // Add a function to handle search query changes that saves to localStorage
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    localStorage.setItem('inventorySearchQuery', value);
  };

  // Add a function to reset all filters and sorting
  const resetFiltersAndSorting = () => {
    // Reset states
    setSearchQuery('');
    setSortBy('product_sku');
    setSortDirection('asc');
    
    // Clear localStorage
    localStorage.removeItem('inventorySearchQuery');
    localStorage.removeItem('inventorySortBy');
    localStorage.removeItem('inventorySortDirection');
  };

  // Update the handleFileSelect function
  const handleFileSelect = async (file: File) => {
    if (!file) return;
    
    try {
      const allowedExtensions = ['.xlsx', '.xls', '.csv', '.ods'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!allowedExtensions.includes(fileExtension)) {
        throw new Error(`Unsupported file format. Please upload ${allowedExtensions.join(', ')} files.`);
      }
      
      setIsProcessingFile(true);
      setUploadError(null);
      setUploadedFile(file);
      
      // Using the existing method for file preview
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
      
      if (jsonData.length === 0) {
        throw new Error('No data found in the uploaded file');
      }
      
      // Display the first 10 items for preview
      setFilePreviewData(jsonData.slice(0, 10));
      
      // Show column mapping modal
      setShowColumnMappingModal(true);
      
    } catch (error) {
      console.error('Error processing file:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to process file');
    } finally {
      setIsProcessingFile(false);
    }
  };
  
  // Add a function to handle mapped data from the column mapping modal
  const handleMappedData = async (mappedData: any[], columnMapping: Record<string, string>) => {
    try {
      setIsProcessingFile(true);
      setMappedData(mappedData);
      
      // Close the column mapping modal
      setShowColumnMappingModal(false);
      
      // Show preview of the mapped data
      setFilePreviewData(mappedData.slice(0, 10));
      
    } catch (error) {
      console.error('Error handling mapped data:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to process mapped data');
    } finally {
      setIsProcessingFile(false);
    }
  };
  
  // Update the handleUploadConfirm function to include user_id
  const handleUploadConfirm = async () => {
    if (mappedData.length === 0) {
      setUploadError('No data to upload. Please map your columns first.');
      return;
    }
    
    // Check if user is authenticated
    if (!userId) {
      setUploadError('You must be logged in to upload inventory');
      toast.error('Authentication required');
      setIsProcessingFile(false);
      return;
    }
    
    try {
      setIsProcessingFile(true);
      setUploadError(null);
      
      // Initialize stats
      const stats = {
        total: mappedData.length,
        success: 0,
        duplicates: 0,
        errors: 0
      };
      
      console.log(`Starting import of ${mappedData.length} items...`);
      
      // Format and validate all records first
      const formattedData = mappedData.map((item, index) => {
        // Create a new object to avoid modifying the original
        const formattedItem: Record<string, any> = { ...item };
        
        // Ensure required fields
        if (!formattedItem.name || formattedItem.name === '') {
          formattedItem.name = `Unnamed Item ${index+1}`;
        }
        
        if (!formattedItem.product_sku || formattedItem.product_sku === '') {
          formattedItem.product_sku = `SKU-${Date.now()}-${index}`;
        }
        
        // Format numeric fields correctly
        formattedItem.quantity = Number(formattedItem.quantity) || 0;
        formattedItem.sales_qty = Number(formattedItem.sales_qty) || 0;
        formattedItem.available_qty = Number(formattedItem.available_qty) || 0;
        formattedItem.per_qty_price = Number(formattedItem.per_qty_price) || 0;
        formattedItem.stock_value = Number(formattedItem.stock_value) || 0;
        formattedItem.cost_per_item = Number(formattedItem.cost_per_item || formattedItem.per_qty_price) || 0;
        
        // Set date fields
        if (!formattedItem.purchase_date) {
          formattedItem.purchase_date = new Date().toISOString();
        }
        
        // Ensure source/supplier is set
        if (!formattedItem.source) {
          formattedItem.source = formattedItem.supplier?.toLowerCase().includes('walmart') ? 'walmart' : 
                               formattedItem.supplier?.toLowerCase().includes('amazon') ? 'amazon' : 'walmart';
        }
        
        // Default status to active if not specified
        if (!formattedItem.status) {
          formattedItem.status = 'active';
        } else if (formattedItem.status === 'AVAILABLE') {
          // Normalize AVAILABLE to be active
          formattedItem.status = 'active';
        }
        
        // Ensure created_at is set
        if (!formattedItem.created_at) {
          formattedItem.created_at = new Date().toISOString();
        }
        
        // Add user_id to each record
        formattedItem.user_id = userId;
        
        // Initially set these fields to zero - they'll be calculated by database triggers from batch data
        formattedItem.stock_value = 0;
        
        return formattedItem;
      });
      
      // Log a few formatted items for debugging
      console.log('First formatted item:', formattedData[0]);
      
      // Track products and their ids for batch creation
      const productIdMap: Record<string, string> = {};
      
      // Process in smaller batches for better error handling
      const batchSize = 20; // Smaller batches for better error tracking
      
      for (let i = 0; i < formattedData.length; i += batchSize) {
        const batch = formattedData.slice(i, i + batchSize);
        
        try {
          console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(formattedData.length/batchSize)}...`);
          
          // Use upsert instead of insert to handle duplicate SKUs
          const { data, error } = await supabaseClient
            .from('products')
            .upsert(batch, { 
              onConflict: 'user_id,product_sku',
              ignoreDuplicates: false // Set to true if you want to keep existing records when there's a conflict
            })
            .select();
          
          if (error) {
            console.error(`Error upserting batch ${Math.floor(i/batchSize) + 1}:`, error);
            
            // If batch upsert fails, try individual upserts for more granular error reporting
            console.log('Trying individual upserts for this batch...');
            
            for (let j = 0; j < batch.length; j++) {
              const item = batch[j];
              
              try {
                const { data: itemData, error: itemError } = await supabaseClient
                  .from('products')
                  .upsert([item], { 
                    onConflict: 'user_id,product_sku',
                    ignoreDuplicates: false 
                  })
                  .select();
                
                if (itemError) {
                  console.error(`Error upserting item ${i+j+1}:`, itemError);
                  stats.errors++;
                } else {
                  // Store the product ID for batch creation
                  if (itemData && itemData.length > 0) {
                    productIdMap[item.product_sku] = itemData[0].id;
                    stats.success++;
                  } else {
                    // Need to query to get the ID for existing products
                    const { data: existingProduct } = await supabaseClient
                      .from('products')
                      .select('id')
                      .eq('product_sku', item.product_sku)
                      .eq('user_id', userId)
                      .single();
                    
                    if (existingProduct) {
                      productIdMap[item.product_sku] = existingProduct.id;
                      stats.duplicates++;
                    }
                  }
                }
              } catch (err) {
                console.error(`Exception processing item ${i+j+1}:`, err);
                stats.errors++;
              }
            }
          } else {
            // Store product IDs from successful batch
            if (data && data.length > 0) {
              data.forEach(product => {
                productIdMap[product.product_sku] = product.id;
              });
            }
            
            // Batch upsert succeeded
            stats.success += batch.length;
            console.log(`Successfully upserted batch ${Math.floor(i/batchSize) + 1}`);
          }
        } catch (err) {
          console.error(`Exception processing batch ${Math.floor(i/batchSize) + 1}:`, err);
          stats.errors += batch.length;
        }
      }
      
      // After all products are created/updated, create batch records for each product
      console.log("Creating FIFO batch records for uploaded products...");
      const batchRecords = formattedData.map(item => {
        const productId = productIdMap[item.product_sku];
        if (!productId) {
          console.error(`No product ID found for SKU: ${item.product_sku}`);
          return null;
        }
        
        return {
          product_id: productId,
          purchase_date: item.purchase_date,
          quantity_purchased: item.quantity,
          quantity_available: item.available_qty || item.quantity,
          cost_per_item: item.cost_per_item,
          user_id: userId
        };
      }).filter(Boolean);
      
      if (batchRecords.length > 0) {
        // Process batch records in chunks
        for (let i = 0; i < batchRecords.length; i += batchSize) {
          const batchChunk = batchRecords.slice(i, i + batchSize);
          
          try {
            const { error: batchError } = await supabaseClient
              .from('product_batches')
              .insert(batchChunk);
            
            if (batchError) {
              console.error(`Error inserting batch records chunk ${Math.floor(i/batchSize) + 1}:`, batchError);
            } else {
              console.log(`Successfully created batch records chunk ${Math.floor(i/batchSize) + 1}/${Math.ceil(batchRecords.length/batchSize)}`);
            }
          } catch (err) {
            console.error(`Exception creating batch records chunk ${Math.floor(i/batchSize) + 1}:`, err);
          }
        }
      }
      
      console.log('Import results:', stats);
      setImportStats(stats);
      
      if (stats.success > 0) {
        setUploadSuccess(true);
        
        // Show success message with details
        const successMsg = `Successfully imported ${stats.success} items` + 
          (stats.duplicates ? ` (${stats.duplicates} duplicates updated)` : '') +
          (stats.errors ? ` (${stats.errors} errors)` : '');
          
        toast.success(successMsg);
        
        // Add a delay before fetching inventory to ensure database operations complete
        console.log('Waiting for database operations to complete before refresh...');
        setTimeout(() => {
          // Refresh inventory data
          console.log('Refreshing inventory data after successful import...');
          fetchInventory();
        }, 2000);
        
        // Close modals and reset state
        setShowUploadModal(false);
        setUploadedFile(null);
        setFilePreviewData([]);
        setMappedData([]);
      }
      
    } catch (error) {
      console.error('Error uploading inventory:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload inventory');
    } finally {
      setIsProcessingFile(false);
    }
  };
  
  // Add a function to handle template download
  const handleDownloadTemplate = (type: 'basic' | 'advanced') => {
    // Create worksheet with headers based on template type
    const headers = type === 'basic' 
      ? ['product_sku', 'name', 'quantity', 'supplier']
      : ['product_sku', 'name', 'image_url', 'supplier', 'product_link', 
         'quantity', 'sales_qty', 'available_qty', 'per_qty_price', 
         'stock_value', 'status', 'remarks'];
    
    // Add a description row
    const descriptions = type === 'basic'
      ? ['SKU', 'Product Name', 'Purchase Quantity', 'Supplier Name']
      : ['SKU', 'Product Name', 'Image URL', 'Supplier Name', 'Product Link',
         'Purchase Quantity', 'Sales Quantity', 'Available Stock', 'Price Per Quantity',
         'Total Stock Value', 'Status (active/inactive)', 'Additional Notes'];
    
    // Create worksheet with headers and descriptions
    const worksheetData = [headers, descriptions];
    
    // Add an example row
    if (type === 'basic') {
      worksheetData.push(['PROD-001', 'Example Product', '10', 'Example Supplier']);
    } else {
      worksheetData.push([
        'PROD-001', 
        'Example Product', 
        'https://example.com/image.jpg', 
        'Example Supplier',
        'https://example.com/product',
        '10',
        '2',
        '8',
        '25.99',
        '207.92',
        'active',
        'High demand product'
      ]);
    }
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Create workbook and add the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Template");
    
    // Generate and download file
    const template = type === 'basic' ? 'basic-inventory-template' : 'advanced-inventory-template';
    XLSX.writeFile(workbook, `${template}.xlsx`);
  };

  // Function to clear inventory
  const clearInventory = async () => {
    if (!userId) {
      setClearError('You must be logged in to clear inventory');
      return;
    }
    
    try {
      console.log('Clearing inventory...');
      setIsClearingInventory(true);
      setClearError(null);
      
      // Use a transaction or a single delete command
      const { error } = await supabaseClient
        .from('products')
        .delete()
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Clear the inventory state
      setInventory([]);
      setFilteredInventory([]);
      setClearSuccess(true);
      
      // Close the modal
      setTimeout(() => {
        setShowClearModal(false);
        setClearSuccess(false);
      }, 2000);
      
      // Refresh the parent component if needed
      if (onItemDeleted) {
        onItemDeleted();
      }
      
    } catch (error) {
      console.error('Error clearing inventory:', error);
      setClearError('Failed to clear inventory. Please try again.');
    } finally {
      setIsClearingInventory(false);
    }
  };

  // Update the handleMarkAllInactive function to use the authenticated client
  const handleMarkAllInactive = async () => {
    try {
      setIsClearingInventory(true);
      setClearError(null);
      
      // Get the current user's active inventory items
      const { data, error: fetchError } = await supabaseClient
        .from('products')
        .select('id')
        .eq('status', 'active');
      
      if (fetchError) throw fetchError;
      
      if (!data || data.length === 0) {
        setClearSuccess(true);
        toast.success('No active items to mark as inactive');
        return;
      }
      
      // Update all items' status using the authenticated client
      const { error: updateError } = await supabaseClient
        .from('products')
        .update({ status: 'inactive' })
        .in('id', data.map(item => item.id));
      
      if (updateError) throw updateError;
      
      // Update items status in local state
      setInventory(prev => prev.map(item => 
        item.status === 'active' ? { ...item, status: 'inactive', original_status: 'inactive' } : item
      ));
      setFilteredInventory(prev => prev.map(item => 
        item.status === 'active' ? { ...item, status: 'inactive', original_status: 'inactive' } : item
      ));
      
      // Show success message
      setClearSuccess(true);
      toast.success(`Successfully marked ${data.length} items as inactive`);
      
      // Call the onItemDeleted callback if provided
      if (onItemDeleted) {
        onItemDeleted();
      }
      
    } catch (err) {
      console.error('Error marking items inactive:', err);
      setClearError('Failed to mark items as inactive. Please try again.');
      toast.error('Failed to mark items as inactive');
    } finally {
      setIsClearingInventory(false);
      
      // Auto-close modal after a delay if successful
      if (clearSuccess) {
        setTimeout(() => {
          setShowClearModal(false);
          setClearSuccess(false);
        }, 2000);
      }
    }
  };

  // Function to handle edit button click
  const handleEditClick = (id: string) => {
    setEditItemId(id);
    setShowEditItemModal(true);
  };
  
  // Function to handle item update
  const handleItemUpdated = () => {
    fetchInventory();
    if (onItemDeleted) {
      onItemDeleted();
    }
  };

  // Function to handle row click for FIFO details
  const handleRowClick = (productId: string, e?: React.MouseEvent) => {
    // If the click is coming from the Actions column or its children, don't open the modal
    if (e && e.target instanceof HTMLElement) {
      const actionCell = (e.target as HTMLElement).closest('td:last-child');
      if (actionCell) {
        return;
      }
    }
    
    setSelectedProductId(productId);
    setShowFifoDetailModal(true);
  };

  // Function to open FIFO inventory detail
  const handleOpenFifoDetail = (productId: string) => {
    setSelectedProductId(productId);
    setShowFifoDetailModal(true);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-slate-200 rounded w-full"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="h-12 bg-slate-200 rounded w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border-l-4 border-red-400 bg-red-50 rounded-md mb-4">
        <div className="flex justify-between items-start">
          <p className="text-red-600">{error}</p>
          <div className="flex space-x-2">
            <button 
              onClick={() => setShowErrorDetails(!showErrorDetails)}
              className="text-xs text-red-600 underline"
            >
              {showErrorDetails ? 'Hide Details' : 'Show Details'}
            </button>
            {error.includes('delete') && (
              <button 
                onClick={() => checkPermissions()}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
              >
                Check Permissions
              </button>
            )}
          </div>
        </div>
        {showErrorDetails && errorDetails && (
          <pre className="mt-2 text-xs bg-white p-2 rounded border border-red-200 overflow-auto">
            {errorDetails}
          </pre>
        )}
      </div>
    );
  }

  // Update the SortIndicator component to show more visible indication
  const SortIndicator = ({ column }: { column: SortableColumn }) => {
    if (sortBy !== column) return <span className="text-gray-300 ml-1 opacity-50">↕</span>;
    return (
      <span className="text-blue-600 ml-1 font-bold">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  // Update the SortableHeader component to highlight the active sort column
  const SortableHeader = ({ column, label, className }: { column: SortableColumn, label: string, className: string }) => (
  <th 
    onClick={() => handleSort(column)} 
    className={`${className} cursor-pointer select-none hover:bg-slate-200 transition-colors ${
      sortBy === column ? 'bg-blue-50 text-blue-700' : ''
    }`}
  >
    <div className="flex items-center">
      {label}
      <SortIndicator column={column} />
      {sortBy === column && (
        <span className="ml-1 text-xs text-blue-500 font-normal">
          ({sortDirection === 'asc' ? 'A-Z' : 'Z-A'})
        </span>
      )}
    </div>
  </th>
);

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center">
          <input
            type="text"
            placeholder="Search inventory..."
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 shadow-sm"
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {(searchQuery || sortBy !== 'product_sku' || sortDirection !== 'asc') && (
            <button
              onClick={resetFiltersAndSorting}
              className="ml-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-2 px-3 rounded-lg transition-colors"
              title="Reset filters and sorting"
            >
              Reset
            </button>
          )}
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center shadow-sm transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Inventory
          </button>
          <button
            onClick={() => setShowClearModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg flex items-center shadow-sm transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
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
            Clear Inventory
          </button>
          <button 
            onClick={() => setShowAddItemModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center shadow-sm transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Add Item
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full border-collapse text-sm bg-white">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <SortableHeader 
                column="product_sku"
                label="PRODUCT SKU"
                className="p-2 text-left font-semibold text-gray-600 border-y border-slate-200 whitespace-nowrap w-32"
              />
              <SortableHeader 
                column="product_name"
                label="PRODUCTS NAME"
                className="p-2 text-left font-semibold text-gray-600 border-y border-slate-200 whitespace-nowrap"
              />
              <th className="p-2 text-center font-semibold text-gray-600 border-y border-slate-200 whitespace-nowrap w-24">IMAGE</th>
              <SortableHeader 
                column="supplier"
                label="SUPPLIER"
                className="p-2 text-center font-semibold text-gray-600 border-y border-slate-200 whitespace-nowrap w-28"
              />
              <th className="p-2 text-center font-semibold text-gray-600 border-y border-slate-200 whitespace-nowrap w-20">LINK</th>
              <SortableHeader 
                column="purchase_price"
                label="PURCHASE PRICE"
                className="p-2 text-right font-semibold text-gray-600 border-y border-slate-200 whitespace-nowrap w-32"
              />
              <SortableHeader 
                column="sales_qty"
                label="SALES QTY"
                className="p-2 text-right font-semibold text-gray-600 border-y border-slate-200 whitespace-nowrap w-28"
              />
              <SortableHeader 
                column="available_qty"
                label="AVAILABLE QTY"
                className="p-2 text-right font-semibold text-gray-600 border-y border-slate-200 whitespace-nowrap w-32"
              />
              <SortableHeader 
                column="per_qty_price"
                label="PER QTY PRICE"
                className="p-2 text-right font-semibold text-gray-600 border-y border-slate-200 whitespace-nowrap w-32"
              />
              <SortableHeader 
                column="stock_value"
                label="STOCK VALUE"
                className="p-2 text-right font-semibold text-gray-600 border-y border-slate-200 whitespace-nowrap w-32"
              />
              <SortableHeader 
                column="status"
                label="STATUS"
                className="p-2 text-center font-semibold text-gray-600 border-y border-slate-200 whitespace-nowrap w-28"
              />
              <th className="p-2 text-left font-semibold text-gray-600 border-y border-slate-200 whitespace-nowrap w-32">REMARKS</th>
              <th className="p-2 text-center font-semibold text-gray-600 border-y border-slate-200 whitespace-nowrap w-24">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={13} className="p-4 text-center text-slate-500 border-b border-slate-200">
                  No inventory items found. Add some products to get started.
                </td>
              </tr>
            ) : (
              currentItems.map((item) => (
                <tr 
                  key={item.id} 
                  className={`hover:bg-slate-50 border-b border-slate-200 cursor-pointer ${
                    item.status === 'out_of_stock' ? 'bg-red-50' : 
                    item.status === 'low_stock' ? 'bg-yellow-50' : 
                    item.status === 'inactive' ? 'bg-gray-100 text-gray-500' : ''
                  }`}
                >
                  <td className="p-2 text-slate-800">{item.product_sku || '-'}</td>
                  <td className="p-2 text-slate-800 font-medium">{item.product_name || item.name}</td>
                  <td className="p-2 flex justify-center items-center">
                    {item.image_url ? (
                      <div className="w-8 h-8 relative border border-slate-200 rounded overflow-hidden">
                        <Image 
                          src={item.image_url} 
                          alt={item.name} 
                          fill
                          className="object-contain"
                          unoptimized={!item.image_url.startsWith('/')}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM5OTkiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-slate-100 flex items-center justify-center rounded">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${
                      item.supplier?.toLowerCase().includes('walmart') || item.source === 'walmart'
                        ? 'bg-blue-50 text-blue-600' 
                        : item.supplier?.toLowerCase().includes('amazon') || item.source === 'amazon'
                        ? 'bg-orange-50 text-orange-600'
                        : 'bg-green-50 text-green-600'
                    }`}>
                      {item.supplier || item.source}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    {item.product_link ? (
                      <a 
                        href={item.product_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                        </svg>
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-2 text-right font-medium">
                    {formatCurrency(item.purchase_price || item.cost_per_item)}
                  </td>
                  <td className="p-2 text-right">
                    {item.sales_qty !== null ? item.sales_qty : 0}
                  </td>
                  <td className="p-2 text-right font-medium">
                    {item.available_qty !== null ? item.available_qty : item.quantity}
                  </td>
                  <td className="p-2 text-right">
                    {formatCurrency(item.per_qty_price || item.cost_per_item)}
                  </td>
                  <td className="p-2 text-right font-medium">
                    {formatCurrency(item.stock_value || (item.quantity * item.cost_per_item))}
                  </td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${
                      item.status === 'active' || item.status === 'AVAILABLE' 
                        ? 'bg-green-100 text-green-700 border border-green-300' 
                        : item.status === 'low_stock'
                        ? 'bg-amber-100 text-amber-700 border border-amber-300'
                        : item.status === 'out_of_stock'
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}>
                      {item.status || 'active'}
                    </span>
                  </td>
                  <td className="p-2 text-slate-600 truncate max-w-[120px]">
                    {item.remarks || '-'}
                  </td>
                  <td className="p-2 text-center">
                    <div className="relative">
                      <button
                        onClick={() => toggleMenu(item.id)}
                        className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100"
                        title="Actions"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
                        </svg>
                      </button>
                      
                      {openMenuId === item.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                          <div className="py-1" role="menu" aria-orientation="vertical">
                            <button
                              onClick={() => {
                                toggleMenu(item.id);
                                handleEditClick(item.id);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100"
                              role="menuitem"
                            >
                              Edit Item
                            </button>
                            
                            <button
                              onClick={() => {
                                toggleMenu(item.id);
                                handleDeleteConfirm(item.id);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                              role="menuitem"
                            >
                              Delete Item
                            </button>
                            
                            {(!item.status || item.status === 'active') && (
                              <button
                                onClick={() => {
                                  toggleMenu(item.id);
                                  handleInactivateConfirm(item.id);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-amber-600 hover:bg-gray-100"
                                role="menuitem"
                              >
                                Mark as Inactive
                              </button>
                            )}
                            
                            {item.status === 'inactive' && (
                              <button
                                onClick={() => {
                                  toggleMenu(item.id);
                                  handleActivateConfirm(item.id);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-gray-100"
                                role="menuitem"
                              >
                                Mark as Active
                              </button>
                            )}
                            
                            <button
                              onClick={() => {
                                toggleMenu(item.id);
                                handleRowClick(item.id);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100"
                              role="menuitem"
                            >
                              View FIFO Details
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

      {/* Delete/Inactivate Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {inactivateMode ? 
                (deleteItemId && inventory.find(i => i.id === deleteItemId)?.status === 'inactive' ? 
                  'Confirm Mark as Active' : 
                  'Confirm Mark as Inactive'
                ) : 
                'Confirm Deletion'}
            </h3>
            <p className="text-gray-600 mb-6">
              {inactivateMode ? 
                (deleteItemId && inventory.find(i => i.id === deleteItemId)?.status === 'inactive' ? 
                  'Are you sure you want to mark this inventory item as active? The item will become visible in active inventory.' :
                  'Are you sure you want to mark this inventory item as inactive? The item will remain in the database but will be shown as inactive.'
                ) : 
                'Are you sure you want to delete this inventory item? This action cannot be undone.'}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={inactivateMode ? 
                  (deleteItemId && inventory.find(i => i.id === deleteItemId)?.status === 'inactive' ?
                    handleActivate : 
                    handleInactivate
                  ) : 
                  handleDelete
                }
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  inactivateMode ? 
                    (deleteItemId && inventory.find(i => i.id === deleteItemId)?.status === 'inactive' ?
                      'bg-green-600 hover:bg-green-700 focus:ring-green-500' :
                      'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
                    ) : 
                    'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                }`}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {inactivateMode ? 
                      (deleteItemId && inventory.find(i => i.id === deleteItemId)?.status === 'inactive' ?
                        'Activating...' :
                        'Deactivating...'
                      ) : 
                      'Deleting...'}
                  </span>
                ) : inactivateMode ? 
                  (deleteItemId && inventory.find(i => i.id === deleteItemId)?.status === 'inactive' ?
                    'Mark as Active' :
                    'Mark as Inactive'
                  ) : 
                  'Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Inventory Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Inventory Data</h3>
              <button 
                onClick={() => {
                  if (!isProcessingFile) {
                    setShowUploadModal(false);
                    setUploadedFile(null);
                    setFilePreviewData([]);
                    setMappedData([]);
                    setUploadError(null);
                    setUploadSuccess(false);
                  }
                }}
                className="text-gray-400 hover:text-gray-500 transition-colors"
                disabled={isProcessingFile}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            {uploadSuccess ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <h3 className="text-lg font-medium text-green-800 mb-2">Upload Successful!</h3>
                {importStats ? (
                  <div className="text-green-700 space-y-1">
                    <p>Successfully imported {importStats.success} of {importStats.total} items.</p>
                    {importStats.duplicates ? (
                      <p className="text-yellow-600">{importStats.duplicates} duplicate items were skipped.</p>
                    ) : null}
                    {importStats.errors ? (
                      <p className="text-red-600">{importStats.errors} items had errors and were not imported.</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-green-700 mb-2">Successfully imported the inventory items.</p>
                )}
              </div>
            ) : uploadedFile && filePreviewData.length > 0 ? (
              <div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium text-yellow-800">Review Data Before Uploading</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Preview of {mappedData.length || filePreviewData.length} items from {uploadedFile.name}. 
                        {filePreviewData.length < 10 ? '' : ' Showing first 10 records only.'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto border border-gray-200 rounded-lg mb-4">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products Name</th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Value</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filePreviewData.slice(0, 10).map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-sm text-gray-900">{item.product_sku || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">{item.name || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-500">{item.supplier || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-500">{item.quantity !== undefined ? item.quantity : '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-500">{item.stock_value !== undefined ? formatCurrency(item.stock_value) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setUploadedFile(null);
                      setFilePreviewData([]);
                      setMappedData([]);
                      // Show column mapping again if user wants to remap
                      setShowColumnMappingModal(true);
                    }}
                    className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    disabled={isProcessingFile}
                  >
                    Remap Columns
                  </button>
                  <button
                    onClick={handleUploadConfirm}
                    disabled={isProcessingFile || mappedData.length === 0}
                    className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isProcessingFile ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : 'Confirm Upload'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600 mt-1">Upload Excel or CSV files to bulk import inventory items. 
                    You'll be able to map your columns to our system fields.</p>
                  </div>
                  <div className="flex space-x-2">
                    <select
                      id="template-type"
                      className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleDownloadTemplate(e.target.value as 'basic' | 'advanced');
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Download Template</option>
                      <option value="basic">Basic Template</option>
                      <option value="advanced">Advanced Template</option>
                    </select>
                  </div>
                </div>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      handleFileSelect(files[0]);
                    }
                  }}
                >
                  <input
                    type="file"
                    id="inventory-file"
                    className="hidden"
                    accept=".xlsx,.xls,.csv,.ods"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        handleFileSelect(files[0]);
                      }
                    }}
                  />
                  
                  <div className="flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      Drag and drop your file here
                    </h3>
                    
                    <p className="text-sm text-gray-500 mb-4">
                      or <button type="button" onClick={() => document.getElementById('inventory-file')?.click()} className="text-blue-600 hover:text-blue-800 font-medium">browse from your computer</button>
                    </p>
                    
                    <p className="text-xs text-gray-500">
                      Supports Excel (.xlsx, .xls), OpenDocument (.ods) and CSV files
                    </p>
                  </div>
                </div>
                
                {isProcessingFile && (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-2"></div>
                    <p className="text-gray-600">Processing your file...</p>
                  </div>
                )}
                
                {uploadError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h3 className="text-sm font-medium text-red-800">Error processing file</h3>
                        <p className="text-sm text-red-700 mt-1">{uploadError}</p>
                      </div>
                    </div>
                    
                    {/* Debug button */}
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => {
                          setShowDebugInfo(!showDebugInfo);
                          
                          // Generate debug info
                          const debug = {
                            uploadedFile: uploadedFile ? {
                              name: uploadedFile.name,
                              size: uploadedFile.size,
                              type: uploadedFile.type,
                              lastModified: new Date(uploadedFile.lastModified).toISOString()
                            } : null,
                            mappedDataStats: mappedData.length > 0 ? {
                              count: mappedData.length,
                              firstTwoItems: mappedData.slice(0, 2),
                              requiredFields: {
                                namesMissing: mappedData.filter(item => !item.name || item.name === '').length,
                                skusMissing: mappedData.filter(item => !item.product_sku || item.product_sku === '').length,
                              },
                              samplingOfFields: {
                                typesOfFirst5Quantity: mappedData.slice(0, 5).map(item => typeof item.quantity),
                                typesOfFirst5Name: mappedData.slice(0, 5).map(item => typeof item.name),
                                typesOfFirst5SKU: mappedData.slice(0, 5).map(item => typeof item.product_sku),
                              }
                            } : null,
                            error: uploadError
                          };
                          
                          setDebugInfo(JSON.stringify(debug, null, 2));
                        }}
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                      >
                        {showDebugInfo ? 'Hide Debug Info' : 'Show Debug Info'}
                      </button>
                    </div>
                    
                    {showDebugInfo && debugInfo && (
                      <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto">
                        <h4 className="text-xs font-medium text-gray-700 mb-1 text-left">Debug Information</h4>
                        <pre className="text-xs text-left whitespace-pre-wrap bg-black text-green-400 p-2 rounded max-h-60 overflow-y-auto">
                          {debugInfo}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Column Mapping Modal */}
      <ColumnMappingModal
        isOpen={showColumnMappingModal}
        onClose={() => setShowColumnMappingModal(false)}
        file={uploadedFile}
        onConfirm={handleMappedData}
      />

      {/* Add the Clear Inventory confirmation modal */}
      {showClearModal && (
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
              <h3 className="text-lg font-bold text-gray-900 mt-4">Clear Entire Inventory</h3>
              
              {!clearSuccess ? (
                <>
                  {!clearError ? (
                    <>
                      <p className="text-sm text-gray-600 mt-2">
                        Are you sure you want to delete <span className="font-bold text-red-600">ALL</span> inventory items? 
                        This action cannot be undone.
                      </p>
                      <p className="text-sm text-amber-600 mt-2">
                        Note: Items referenced in orders cannot be deleted due to database constraints.
                      </p>
                      
                      <div className="mt-6 flex space-x-3 justify-center">
                        <button
                          onClick={() => setShowClearModal(false)}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={clearInventory}
                          disabled={isClearingInventory}
                          className={`px-4 py-2 rounded text-white ${
                            isClearingInventory ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          {isClearingInventory ? (
                            <span className="flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Deleting...
                            </span>
                          ) : (
                            'Delete All Items'
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="mt-2">
                      <div className="bg-red-50 p-4 rounded-md text-red-700 text-sm border border-red-200">
                        {clearError}
                      </div>
                      
                      <div className="mt-6 flex flex-col space-y-4">
                        <p className="text-sm text-gray-600">
                          Would you like to mark all inventory items as inactive instead?
                          This preserves the data but hides the items from active inventory.
                        </p>
                        
                        <div className="flex space-x-3 justify-center">
                          <button
                            onClick={() => setShowClearModal(false)}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleMarkAllInactive}
                            disabled={isClearingInventory}
                            className={`px-4 py-2 rounded text-white ${
                              isClearingInventory ? 'bg-amber-400' : 'bg-amber-600 hover:bg-amber-700'
                            }`}
                          >
                            {isClearingInventory ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                              </span>
                            ) : (
                              'Mark All as Inactive'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-4 text-green-600">
                  <p className="font-medium">Operation completed successfully!</p>
                  <p className="text-sm mt-1">Items referenced in orders were preserved.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      <PaginationControls />
      
      {/* Add the AddInventoryItemModal component */}
      <AddInventoryItemModal 
        isOpen={showAddItemModal} 
        onClose={() => setShowAddItemModal(false)} 
        onItemAdded={() => {
          fetchInventory();
          if (onItemDeleted) onItemDeleted();
        }} 
      />
      
      {/* Edit Item Modal */}
      <EditInventoryItemModal
        isOpen={showEditItemModal}
        onClose={() => setShowEditItemModal(false)}
        onItemUpdated={handleItemUpdated}
        itemId={editItemId}
      />
      
      {/* Add the FIFO Detail Modal at the end of the component */}
      <ProductBatchDetailModal
        isOpen={showFifoDetailModal}
        onClose={() => setShowFifoDetailModal(false)}
        productId={selectedProductId}
        onBatchesChanged={() => {
          // Refresh inventory data when batches are changed
          fetchInventory();
          if (onItemDeleted) onItemDeleted();
        }}
      />
    </div>
  );
} 