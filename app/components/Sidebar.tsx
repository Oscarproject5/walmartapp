'use client';

import { Fragment, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import {
  HomeIcon,
  XMarkIcon,
  Squares2X2Icon,
  ShoppingCartIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Inventory', href: '/inventory', icon: Squares2X2Icon },
  { name: 'Orders', href: '/orders', icon: ShoppingCartIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Product Performance', href: '/product-performance', icon: Squares2X2Icon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

const adminNavigation = [
  { name: 'Manage Invitations', href: '/admin/invitations', icon: UserCircleIcon },
  { name: 'Database Migrations', href: '/admin/migrations', icon: Cog6ToothIcon },
  { name: 'User Management', href: '/admin/users', icon: UserCircleIcon },
  { name: 'System Settings', href: '/admin/settings', icon: Cog6ToothIcon },
  { name: 'Activity Logs', href: '/admin/logs', icon: ChartBarIcon },
  { name: 'Batch Operations', href: '/admin/batch', icon: Squares2X2Icon },
  { name: 'Import/Export', href: '/admin/import-export', icon: ShoppingCartIcon },
  { name: 'Admin Analytics', href: '/admin/analytics', icon: ChartBarIcon },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();
          
        setIsAdmin(!!profile?.is_admin);
      }
    };
    
    checkAdminStatus();
  }, [supabase]);

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button
                      type="button"
                      className="-m-2.5 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                
                {/* Sidebar component for mobile */}
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white/80 backdrop-blur-sm px-6 pb-4 shadow-modern-lg">
                  <div className="flex h-16 shrink-0 items-center">
                    <h1 className="gradient-text text-2xl">WalmartApp</h1>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul className="-mx-2 space-y-1">
                          {navigation.map((item) => (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                className={classNames(
                                  pathname === item.href
                                    ? 'bg-primary-50 text-primary-600'
                                    : 'text-slate-700 hover:text-primary-600 hover:bg-slate-50',
                                  'group flex gap-x-3 rounded-lg p-2 text-sm leading-6 font-medium transition-all duration-150'
                                )}
                              >
                                <item.icon
                                  className={classNames(
                                    pathname === item.href ? 'text-primary-600' : 'text-slate-400 group-hover:text-primary-600',
                                    'h-5 w-5 shrink-0 transition-colors'
                                  )}
                                  aria-hidden="true"
                                />
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                      
                      {/* Admin Section - Mobile */}
                      {isAdmin && (
                        <li>
                          <div className="text-xs font-semibold leading-6 text-gray-500 mb-1 ml-1">Admin</div>
                          <ul className="-mx-2 space-y-1">
                            {adminNavigation.map((item) => (
                              <li key={item.name}>
                                <Link
                                  href={item.href}
                                  className={classNames(
                                    pathname === item.href
                                      ? 'bg-primary-50 text-primary-600'
                                      : 'text-slate-700 hover:text-primary-600 hover:bg-slate-50',
                                    'group flex gap-x-3 rounded-lg p-2 text-sm leading-6 font-medium transition-all duration-150'
                                  )}
                                >
                                  <item.icon
                                    className={classNames(
                                      pathname === item.href ? 'text-primary-600' : 'text-slate-400 group-hover:text-primary-600',
                                      'h-5 w-5 shrink-0 transition-colors'
                                    )}
                                    aria-hidden="true"
                                  />
                                  {item.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </li>
                      )}
                      
                      <li className="mt-auto">
                        <Link
                          href="/profile"
                          className="group -mx-2 flex gap-x-3 rounded-lg p-2 text-sm font-medium leading-6 text-slate-700 hover:bg-slate-50 hover:text-primary-600 transition-all duration-150"
                        >
                          <UserCircleIcon
                            className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-primary-600 transition-colors"
                            aria-hidden="true"
                          />
                          Profile
                        </Link>
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-slate-200 bg-white/80 backdrop-blur-sm px-6 pb-4 shadow-modern">
          <div className="flex h-16 shrink-0 items-center">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gradient-to-br from-primary-500 to-accent-500 text-white font-bold">W</div>
              <h1 className="gradient-text text-xl font-bold">WalmartApp</h1>
            </div>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={classNames(
                          pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
                            ? 'bg-primary-50 text-primary-600 shadow-sm'
                            : 'text-slate-700 hover:text-primary-600 hover:bg-slate-50',
                          'group flex gap-x-3 rounded-lg p-2 text-sm leading-6 font-medium transition-all duration-150'
                        )}
                      >
                        <item.icon
                          className={classNames(
                            pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
                              ? 'text-primary-600' 
                              : 'text-slate-400 group-hover:text-primary-600',
                            'h-5 w-5 shrink-0 transition-colors'
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              
              {/* Admin Section - Desktop */}
              {isAdmin && (
                <li>
                  <div className="text-xs font-semibold leading-6 text-gray-500 mb-1 ml-1">Admin</div>
                  <ul className="-mx-2 space-y-1">
                    {adminNavigation.map((item) => (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={classNames(
                            pathname === item.href || pathname?.startsWith(item.href)
                              ? 'bg-primary-50 text-primary-600 shadow-sm'
                              : 'text-slate-700 hover:text-primary-600 hover:bg-slate-50',
                            'group flex gap-x-3 rounded-lg p-2 text-sm leading-6 font-medium transition-all duration-150'
                          )}
                        >
                          <item.icon
                            className={classNames(
                              pathname === item.href || pathname?.startsWith(item.href)
                                ? 'text-primary-600' 
                                : 'text-slate-400 group-hover:text-primary-600',
                              'h-5 w-5 shrink-0 transition-colors'
                            )}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              )}
              
              <li className="mt-auto">
                <div className="rounded-xl bg-gradient-to-r from-primary-500/10 to-accent-500/10 p-4 mb-4">
                  <h3 className="text-sm font-medium text-primary-700 mb-2">Need Help?</h3>
                  <p className="text-xs text-slate-600 mb-3">View documentation or contact support for assistance</p>
                  <Link href="/documentation" className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors">
                    View Documentation →
                  </Link>
                </div>
                <Link
                  href="/profile"
                  className="group -mx-2 flex gap-x-3 rounded-lg p-2 text-sm font-medium leading-6 text-slate-700 hover:bg-slate-50 hover:text-primary-600 transition-all duration-150"
                >
                  <UserCircleIcon
                    className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-primary-600 transition-colors"
                    aria-hidden="true"
                  />
                  Profile
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
} 