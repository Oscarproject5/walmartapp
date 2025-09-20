'use client';

import { useState, ReactNode } from 'react';
import { Bars3Icon, HomeIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Sidebar from './Sidebar';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

// Map paths to page titles
const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/inventory': 'Inventory Management',
  '/orders': 'Order History',
  '/analytics': 'Analytics & Reporting',
  '/settings': 'Settings',
  '/profile': 'User Profile',
  '/login': 'Sign In',
  '/signup': 'Create Account',
};

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  
  // Get the current page title based on the pathname
  const pageTitle = pageTitles[pathname] || 'Profit Tracker';

  // Create breadcrumbs based on the pathname
  const getBreadcrumbs = () => {
    if (pathname === '/') {
      return [{ name: 'Dashboard', href: '/', current: true }];
    }
    
    const path = pathname.substring(1); // Remove leading slash
    return [
      { name: 'Dashboard', href: '/', current: false },
      { name: pageTitles[pathname], href: pathname, current: true },
    ];
  };
  
  const breadcrumbs = getBreadcrumbs();

  // Check if we're on an auth page (login/signup)
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-blue-50">
      {/* Only show sidebar on non-auth pages */}
      {!isAuthPage && <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}

      <div className={!isAuthPage ? "lg:pl-72" : ""}>
        {!isAuthPage && (
          <div className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-x-4 backdrop-blur-sm bg-white/70 border-b border-slate-200 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-slate-700 hover:bg-slate-100 rounded-md transition-colors lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>

            {/* Page title and breadcrumbs */}
            <div className="flex flex-col justify-center py-2">
              <h1 className="gradient-text text-xl font-bold mb-0.5">{pageTitle}</h1>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2 text-sm text-slate-500">
                  {breadcrumbs.map((breadcrumb, index) => (
                    <li key={`${index}-${breadcrumb.name}`}>
                      <div className="flex items-center">
                        {index > 0 && (
                          <ChevronRightIcon className="h-3 w-3 flex-shrink-0 text-slate-400 mx-1" aria-hidden="true" />
                        )}
                        <Link
                          href={breadcrumb.href}
                          className={`${
                            breadcrumb.current ? 'text-primary-600 font-medium' : 'text-slate-500 hover:text-slate-700'
                          } text-xs transition-colors`}
                          aria-current={breadcrumb.current ? 'page' : undefined}
                        >
                          {breadcrumb.name}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </div>
        )}

        <main className={isAuthPage ? "py-0" : "py-6 pt-16"}>
          <div className={isAuthPage ? "" : "px-4 sm:px-6 lg:px-8"}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 