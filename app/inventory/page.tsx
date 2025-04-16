'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { InventoryClient } from '../components/dynamic/InventoryClient';
import InventoryDetailedOverview from '../components/InventoryDetailedOverview';
import InventoryHealth from '../components/InventoryHealth';
import EditInventoryItemModal from '../components/EditInventoryItemModal';

// Component that uses search params
function InventoryContent() {
  const [activeTab, setActiveTab] = useState<'table' | 'health'>('table');
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Check if we have an edit parameter in the URL
    const editId = searchParams?.get('edit');
    if (editId) {
      setEditItemId(editId);
      setShowEditModal(true);
      setActiveTab('table'); // Make sure we're on the table tab
    }
  }, [searchParams]);

  // Function to trigger a refresh of all inventory components
  const refreshInventory = () => {
    console.log('InventoryPage: Triggering inventory refresh...');
    setRefreshCounter(prev => {
      const newCounter = prev + 1;
      console.log(`InventoryPage: Refresh counter updated to ${newCounter}`);
      return newCounter;
    });
  };
  
  // Handle item update
  const handleItemUpdated = () => {
    console.log('InventoryPage: Item updated, refreshing inventory...');
    refreshInventory();
    // Clear the URL parameter
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('edit');
      window.history.replaceState({}, '', url);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <a href="/" className="hover:text-blue-600 transition-colors">Dashboard</a>
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"></path>
              </svg>
              <span className="font-medium text-gray-900">Inventory Management</span>
            </li>
          </ol>
        </nav>
        <div className="flex justify-between items-center mt-2">
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <button 
            onClick={refreshInventory}
            className="text-blue-600 hover:text-blue-800 transition-colors flex items-center text-sm"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </button>
        </div>
      </div>

      <div className="mb-6">
        <InventoryDetailedOverview refresh={refreshCounter} />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 bg-slate-50">
          <div className="flex space-x-2">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'table'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-slate-200'
              }`}
              onClick={() => setActiveTab('table')}
            >
              Enhanced Table
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'health'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-slate-200'
              }`}
              onClick={() => setActiveTab('health')}
            >
              Inventory Health
            </button>
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'table' && <InventoryClient onItemDeleted={refreshInventory} />}
          {activeTab === 'health' && <InventoryHealth refresh={refreshCounter} />}
        </div>
      </div>
      
      {/* Edit Item Modal */}
      <EditInventoryItemModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          // Clear the URL parameter
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('edit');
            window.history.replaceState({}, '', url);
          }
        }}
        onItemUpdated={handleItemUpdated}
        itemId={editItemId}
      />
    </div>
  );
}

// Loading fallback component
function Loading() {
  return <div className="p-4 text-center">Loading inventory...</div>;
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<Loading />}>
      <InventoryContent />
    </Suspense>
  );
} 