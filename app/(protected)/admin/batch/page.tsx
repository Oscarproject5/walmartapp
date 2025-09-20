'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

type BatchOperationType = 'price-update' | 'stock-update' | 'recompute-profit' | 'recalculate-ratings' | 'archive-old-products';

interface BatchOperation {
  id: string;
  type: BatchOperationType;
  name: string;
  description: string;
  affectedRecords?: number;
  lastRun?: string;
  estimatedTime: string;
}

// Define batch operations
const BATCH_OPERATIONS: BatchOperation[] = [
  {
    id: 'price-update',
    type: 'price-update',
    name: 'Bulk Price Update',
    description: 'Update prices of multiple products at once based on criteria',
    affectedRecords: 257,
    lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedTime: '5-10 minutes'
  },
  {
    id: 'stock-update',
    type: 'stock-update',
    name: 'Inventory Sync',
    description: 'Synchronize inventory quantities with external systems',
    affectedRecords: 1250,
    lastRun: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedTime: '10-15 minutes'
  },
  {
    id: 'recompute-profit',
    type: 'recompute-profit',
    name: 'Recalculate Profit Margins',
    description: 'Update all profit margins based on the latest cost data',
    affectedRecords: 843,
    lastRun: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedTime: '15-20 minutes'
  },
  {
    id: 'recalculate-ratings',
    type: 'recalculate-ratings',
    name: 'Recalculate Product Ratings',
    description: 'Update product ratings based on recent reviews',
    affectedRecords: 536,
    lastRun: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedTime: '5-8 minutes'
  },
  {
    id: 'archive-old-products',
    type: 'archive-old-products',
    name: 'Archive Old Products',
    description: 'Move products that haven\'t sold in 90+ days to archive',
    affectedRecords: 124,
    lastRun: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedTime: '3-5 minutes'
  }
];

export default function BatchOperations() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<BatchOperation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  
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
  
  const handleOperationSelect = (operation: BatchOperation) => {
    setSelectedOperation(operation);
    setIsModalOpen(true);
  };
  
  const handleRunOperation = async () => {
    if (!selectedOperation) return;
    
    setIsRunning(true);
    setRunProgress(0);
    
    // Simulate a batch operation
    const totalSteps = 100;
    const timePerStep = Math.floor(Math.random() * 50) + 30; // 30-80ms per step
    
    for (let step = 1; step <= totalSteps; step++) {
      await new Promise(resolve => setTimeout(resolve, timePerStep));
      setRunProgress(Math.floor((step / totalSteps) * 100));
    }
    
    // Update the mock data to reflect the operation has been run
    const updatedOperation = { 
      ...selectedOperation, 
      lastRun: new Date().toISOString()
    };
    
    setMessage(`Successfully completed ${updatedOperation.name} operation at ${new Date().toLocaleTimeString()}`);
    setIsRunning(false);
    setIsModalOpen(false);
    
    // In a real implementation, you would make an API call to run the batch operation
    // and then poll for status updates or use WebSockets to get real-time progress updates
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
      <h1 className="text-2xl font-bold mb-6">Batch Operations</h1>
      
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
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Available Operations</h2>
          <p className="text-gray-600 mb-4">
            Run batch operations to process large amounts of data. Please ensure you have a backup before running operations that modify data.
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operation
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Affected Records
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Run
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Est. Time
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {BATCH_OPERATIONS.map((operation) => (
                <tr key={operation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{operation.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{operation.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{operation.affectedRecords?.toLocaleString() || 'Unknown'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">
                      {operation.lastRun 
                        ? new Date(operation.lastRun).toLocaleDateString()
                        : 'Never'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{operation.estimatedTime}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                      onClick={() => handleOperationSelect(operation)}
                    >
                      Run
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Operation confirmation modal */}
      {isModalOpen && selectedOperation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              {isRunning ? `Running: ${selectedOperation.name}` : `Confirm: ${selectedOperation.name}`}
            </h3>
            
            {isRunning ? (
              <div>
                <div className="w-full h-2 bg-gray-200 rounded-full mb-2">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-150" 
                    style={{ width: `${runProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mb-4">Processing... {runProgress}% complete</p>
              </div>
            ) : (
              <div>
                <p className="mb-4 text-gray-600">
                  You are about to run the {selectedOperation.name} operation.
                  This will affect approximately {selectedOperation.affectedRecords?.toLocaleString() || 'multiple'} records
                  and will take about {selectedOperation.estimatedTime}.
                </p>
                
                <p className="mb-4 text-gray-600">
                  Are you sure you want to continue?
                </p>
              </div>
            )}
            
            <div className="flex justify-end">
              {isRunning ? (
                <button
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md opacity-50 cursor-not-allowed"
                  disabled
                >
                  Processing...
                </button>
              ) : (
                <>
                  <button
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-md"
                    onClick={handleRunOperation}
                  >
                    Run Operation
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Implementation Note */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
        <h3 className="text-blue-800 font-medium">Implementation Note</h3>
        <p className="text-blue-700 mt-1">
          In a production environment, batch operations should be implemented as background jobs
          that can run asynchronously. Consider using a job queue system like Bull, Celery, or AWS SQS
          to manage these operations. Each operation should be properly logged and have rollback capabilities
          in case of failures.
        </p>
      </div>
    </div>
  );
} 