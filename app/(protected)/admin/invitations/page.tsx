'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

interface Invitation {
  id: string;
  code: string;
  email: string | null;
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
  status: string;
  is_admin: boolean;
}

export default function InvitationsAdmin() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [expiryDays, setExpiryDays] = useState(30);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const fetchInvitations = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error: unknown) {
      let message = 'Failed to fetch invitations';
      if (error instanceof Error) {
        message = error.message;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const checkAdminStatus = async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .single();
        if (!profile?.is_admin) {
            router.push('/dashboard');
        }
    } catch (error: unknown) {
        let message = 'Failed to check admin status';
        if (error instanceof Error) {
            message = error.message;
        }
        console.error('Error checking admin status:', message);
        setError(message);
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, [router, supabase, fetchInvitations, checkAdminStatus]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);
  
  const generateRandomCode = () => {
    const characters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };
  
  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const code = generateRandomCode();
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + parseInt(expiryDays.toString()));
      const expiresAt = expiryDays > 0 
        ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString() 
        : null;
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to create invitations');
      }
      
      // Check admin status first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();
        
      if (profileError) {
        throw new Error('Could not verify admin status');
      }
      
      if (!profile?.is_admin) {
        throw new Error('Only administrators can create invitation codes');
      }
      
      // Create the invitation
      const { data, error } = await supabase
        .from('invitation_codes')
        .insert([
          {
            code: code,
            email: newEmail || null,
            created_by: session.user.id,
            expires_at: expiresAt,
            is_admin: makeAdmin,
            status: 'active'
          },
        ])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating invitation:', error);
        throw new Error(error.message || 'Failed to create invitation');
      }
      
      // Show success message
      setMessage(`Invitation code created: ${code}`);
      
      // Refresh the invitations list
      fetchInvitations();
      
      // Reset form fields
      setNewEmail('');
      setMakeAdmin(false);
      setExpiryDays(30);
    } catch (error: unknown) {
      console.error('Error creating invitation:', error);
      let message = 'Failed to create invitation';
      if (error instanceof Error) {
        message = error.message;
      }
      setError(message);
    } finally {
      setCreating(false);
    }
  };
  
  const handleRevokeInvitation = async (code: string) => {
    try {
        const { error } = await supabase
            .from('invitation_codes')
            .update({ revoked: true })
            .eq('code', code);

        if (error) throw error;
        await fetchInvitations();
    } catch (error: unknown) {
        let message = 'Failed to revoke invitation';
        if (error instanceof Error) {
            message = error.message;
        }
        console.error('Error revoking invitation:', message);
        setError(message);
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
      <h1 className="text-2xl font-bold mb-6">Invitation Management</h1>
      
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
        <h2 className="text-xl font-semibold mb-4">Create New Invitation</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email (optional)
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="recipient@example.com"
            />
            <p className="mt-1 text-sm text-gray-500">Leave blank to create a general invitation code</p>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="make-admin"
              checked={makeAdmin}
              onChange={(e) => setMakeAdmin(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="make-admin" className="ml-2 block text-sm text-gray-700">
              Make user an administrator
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expires after (days)
            </label>
            <input
              type="number"
              min="0"
              value={expiryDays}
              onChange={(e) => setExpiryDays(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">Set to 0 for no expiration</p>
          </div>
          
          <div>
            <button
              onClick={handleCreateInvitation}
              disabled={creating}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Invitation'}
            </button>
          </div>
        </div>
      </div>
      
      <h2 className="text-xl font-semibold mb-4">Existing Invitations</h2>
      
      {invitations.length === 0 ? (
        <p className="text-gray-500">No invitations found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                    {invitation.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {invitation.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(invitation.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {invitation.expires_at 
                      ? new Date(invitation.expires_at).toLocaleDateString() 
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span 
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        invitation.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : invitation.status === 'used' 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {invitation.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {invitation.is_admin ? 'Yes' : 'No'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {invitation.status === 'active' && (
                      <button
                        onClick={() => handleRevokeInvitation(invitation.code)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 