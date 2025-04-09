'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

const AVAILABLE_MIGRATIONS = [
  { name: 'Invitation System', path: 'migrations/invite-system.sql' },
  { name: 'SQL Executor Function', path: 'migrations/create-sql-executor.sql' }
];

export default function AdminMigrations() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
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

  const runMigration = async (migrationPath: string) => {
    setError(null);
    setMessage(null);
    setRunning(true);
    
    try {
      const response = await fetch('/api/auth/apply-migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ migrationFile: migrationPath }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to run migration');
      }
      
      setMessage(data.message || 'Migration applied successfully');
    } catch (error: any) {
      setError(error.message || 'Failed to run migration');
      console.error('Migration error:', error);
    } finally {
      setRunning(false);
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
      <h1 className="text-2xl font-bold mb-6">Database Migrations</h1>
      
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
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Available Migrations</h2>
        <p className="mb-4 text-red-600 font-medium">Warning: Running migrations can modify your database schema. Always back up your database before proceeding.</p>
        
        <div className="space-y-4">
          {AVAILABLE_MIGRATIONS.map((migration) => (
            <div key={migration.path} className="border border-gray-200 p-4 rounded-md">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{migration.name}</h3>
                  <p className="text-sm text-gray-500">{migration.path}</p>
                </div>
                <button
                  onClick={() => runMigration(migration.path)}
                  disabled={running}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {running ? 'Running...' : 'Run Migration'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 