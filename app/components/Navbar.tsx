'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { usePathname } from 'next/navigation';
import { Menu, X, User, ChevronDown, LogOut, Settings, ShoppingCart, Package, Home, BarChart3 } from 'lucide-react';
import Image from 'next/image';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const pathname = usePathname();
  const supabase = createClientComponentClient();

  // Check if the user is logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    checkUser();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          {/* Mobile menu button */}
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              aria-controls="mobile-menu"
              aria-expanded="false"
              onClick={() => setIsOpen(!isOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Logo and desktop menu */}
          <div className="flex-1 flex items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-indigo-600 font-bold text-xl">
                WalmartApp
              </Link>
            </div>
            <div className="hidden sm:block sm:ml-6">
              <div className="flex space-x-4">
                <Link
                  href="/"
                  className={`${
                    isActive('/') 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-gray-700 hover:bg-gray-50'
                  } px-3 py-2 rounded-md text-sm font-medium flex items-center`}
                >
                  <Home className="h-4 w-4 mr-1" />
                  Dashboard
                </Link>
                <Link
                  href="/inventory"
                  className={`${
                    isActive('/inventory') 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-gray-700 hover:bg-gray-50'
                  } px-3 py-2 rounded-md text-sm font-medium flex items-center`}
                >
                  <Package className="h-4 w-4 mr-1" />
                  Inventory
                </Link>
                <Link
                  href="/orders"
                  className={`${
                    isActive('/orders') 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-gray-700 hover:bg-gray-50'
                  } px-3 py-2 rounded-md text-sm font-medium flex items-center`}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Orders
                </Link>
                <Link
                  href="/reports"
                  className={`${
                    isActive('/reports') 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-gray-700 hover:bg-gray-50'
                  } px-3 py-2 rounded-md text-sm font-medium flex items-center`}
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Reports
                </Link>
              </div>
            </div>
          </div>

          {/* Right menu */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            {user ? (
              <div className="ml-3 relative">
                <div>
                  <button
                    type="button"
                    className="flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    id="user-menu-button"
                    aria-expanded="false"
                    aria-haspopup="true"
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-2">
                      <User className="h-5 w-5" />
                    </div>
                    <span className="text-gray-700 text-sm hidden md:block max-w-[150px] truncate">
                      {user.email}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-1 text-gray-500" />
                  </button>
                </div>

                {profileMenuOpen && (
                  <div
                    className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                    tabIndex={-1}
                  >
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      role="menuitem"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Your Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      role="menuitem"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                    <button
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      role="menuitem"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="sm:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/"
              className={`${
                isActive('/') 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-gray-700 hover:bg-gray-50'
              } block px-3 py-2 rounded-md text-base font-medium flex items-center`}
              onClick={() => setIsOpen(false)}
            >
              <Home className="h-5 w-5 mr-2" />
              Dashboard
            </Link>
            <Link
              href="/inventory"
              className={`${
                isActive('/inventory') 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-gray-700 hover:bg-gray-50'
              } block px-3 py-2 rounded-md text-base font-medium flex items-center`}
              onClick={() => setIsOpen(false)}
            >
              <Package className="h-5 w-5 mr-2" />
              Inventory
            </Link>
            <Link
              href="/orders"
              className={`${
                isActive('/orders') 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-gray-700 hover:bg-gray-50'
              } block px-3 py-2 rounded-md text-base font-medium flex items-center`}
              onClick={() => setIsOpen(false)}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Orders
            </Link>
            <Link
              href="/reports"
              className={`${
                isActive('/reports') 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-gray-700 hover:bg-gray-50'
              } block px-3 py-2 rounded-md text-base font-medium flex items-center`}
              onClick={() => setIsOpen(false)}
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              Reports
            </Link>
            {user && (
              <>
                <Link
                  href="/profile"
                  className={`${
                    isActive('/profile') 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-gray-700 hover:bg-gray-50'
                  } block px-3 py-2 rounded-md text-base font-medium flex items-center`}
                  onClick={() => setIsOpen(false)}
                >
                  <User className="h-5 w-5 mr-2" />
                  Your Profile
                </Link>
                <Link
                  href="/settings"
                  className={`${
                    isActive('/settings') 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-gray-700 hover:bg-gray-50'
                  } block px-3 py-2 rounded-md text-base font-medium flex items-center`}
                  onClick={() => setIsOpen(false)}
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Settings
                </Link>
                <button
                  className="text-gray-700 hover:bg-gray-50 block px-3 py-2 rounded-md text-base font-medium w-full text-left flex items-center"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
} 