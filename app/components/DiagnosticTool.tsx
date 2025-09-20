'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { checkDatabasePermissions } from '../lib/check-permissions';

export default function DiagnosticTool() {
  const [productId, setProductId] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function runDiagnostics() {
    if (!productId) {
      setError('Please enter a product ID');
      return;
    }

    try {
      setIsRunning(true);
      setError(null);
      setResults(null);
      
      // Step 1: Check if product exists
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      
      if (productError) {
        setError(`Error finding product: ${productError.message}`);
        setResults({ productCheck: { error: productError } });
        return;
      }
      
      if (!product) {
        setError('Product not found');
        setResults({ productCheck: { error: 'Not found' } });
        return;
      }
      
      // Step 2: Check permissions
      const permissions = await checkDatabasePermissions();
      
      // Step 3: Check for relationships
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('id')
        .eq('product_id', productId);
      
      // Step 4: Try a no-op update
      const { error: updateError } = await supabase
        .from('products')
        .update({ name: product.name })
        .eq('id', productId);
      
      // Step 5: Diagnostic delete attempt
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      
      // Compile results
      const diagnostic = {
        product,
        permissions,
        hasRelationships: salesData && salesData.length > 0,
        relationships: {
          sales: salesData?.length || 0,
          salesError
        },
        operations: {
          canUpdate: !updateError,
          updateError,
          canDelete: !deleteError,
          deleteError
        }
      };
      
      setResults(diagnostic);
      
      if (deleteError) {
        setError(`Cannot delete: ${deleteError.message}`);
      } else {
        setError('Diagnostic completed successfully');
      }
      
    } catch (err) {
      console.error('Diagnostic error:', err);
      setError(`Error running diagnostics: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Deletion Diagnostic Tool</h2>
      
      <div className="mb-4 flex gap-2">
        <input 
          type="text"
          placeholder="Enter Product ID"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        />
        <button
          onClick={runDiagnostics}
          disabled={isRunning || !productId}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {isRunning ? 'Running...' : 'Run Diagnostics'}
        </button>
      </div>
      
      {error && (
        <div className={`p-3 rounded-lg mb-4 ${error.includes('Cannot delete') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
          {error}
        </div>
      )}
      
      {results && (
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
          <h3 className="text-md font-medium mb-2">Results</h3>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="p-2 bg-white rounded border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700">Product</h4>
              <p className="text-xs">{results.product?.name || 'Not found'}</p>
            </div>
            
            <div className="p-2 bg-white rounded border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700">Relationships</h4>
              <p className="text-xs">Sales: {results.relationships?.sales || 0}</p>
            </div>
            
            <div className="p-2 bg-white rounded border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700">Can Update?</h4>
              <p className={`text-xs ${results.operations?.canUpdate ? 'text-green-600' : 'text-red-600'}`}>
                {results.operations?.canUpdate ? 'Yes' : 'No'}
              </p>
            </div>
            
            <div className="p-2 bg-white rounded border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700">Can Delete?</h4>
              <p className={`text-xs ${results.operations?.canDelete ? 'text-green-600' : 'text-red-600'}`}>
                {results.operations?.canDelete ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
          
          {results.operations?.deleteError && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-gray-700">Delete Error:</h4>
              <pre className="text-xs bg-white border border-red-200 p-2 rounded overflow-auto mt-1">
                {JSON.stringify({
                  message: results.operations.deleteError.message,
                  details: results.operations.deleteError.details,
                  hint: results.operations.deleteError.hint
                }, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700">All Details:</h4>
            <pre className="text-xs bg-white border border-gray-200 p-2 rounded overflow-auto mt-1 max-h-48">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
} 