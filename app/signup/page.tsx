'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/auth-context';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [isCodeValid, setIsCodeValid] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const { signUp } = useAuth();

  const validateInviteCode = async () => {
    if (!inviteCode || inviteCode.length < 6) {
      setError('Please enter a valid invitation code');
      setIsCodeValid(false);
      return false;
    }

    setValidatingCode(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/validate-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: inviteCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate invitation code');
      }

      setIsCodeValid(data.valid);
      
      if (!data.valid) {
        setError('Invalid or expired invitation code');
        return false;
      }
      
      return true;
    } catch (error: any) {
      setError(error.message || 'Failed to validate invitation code');
      setIsCodeValid(false);
      return false;
    } finally {
      setValidatingCode(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate invitation code first
    const isInviteValid = await validateInviteCode();
    if (!isInviteValid) {
      return;
    }

    // Basic validation
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password);

      if (error) {
        throw error;
      }

      // Initialize user resources
      await setupUserResources();
      
      // Mark invitation as used
      await useInvitation();

      setMessage("Check your email to confirm your account");
      
      // Redirect to login after successful signup
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const setupUserResources = async () => {
    try {
      const response = await fetch('/api/auth/setup-new-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to set up user resources');
      }
    } catch (error) {
      console.error('Error setting up user resources:', error);
      // Continue with signup even if resource setup fails
      // We'll try again later
    }
  };

  const useInvitation = async () => {
    try {
      const response = await fetch('/api/auth/use-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: inviteCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to use invitation');
      }
    } catch (error) {
      console.error('Error using invitation:', error);
      // Continue with signup even if using invitation fails
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create a new account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              sign in to your existing account
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-green-700">{message}</p>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="invite-code" className="sr-only">
                Invitation Code
              </label>
              <input
                id="invite-code"
                name="inviteCode"
                type="text"
                required
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value);
                  setIsCodeValid(false);
                }}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  isCodeValid 
                    ? 'border-green-300 focus:border-green-500' 
                    : 'border-gray-300 focus:border-indigo-500'
                } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Invitation Code"
              />
            </div>
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || validatingCode}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing up...' : validatingCode ? 'Validating code...' : 'Sign up'}
            </button>
          </div>

          <div className="text-sm text-center text-gray-600">
            Need an invitation? Contact an administrator to get an invitation code.
          </div>
        </form>
      </div>
    </div>
  );
} 