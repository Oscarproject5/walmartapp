'use client';

import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function Documentation() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/" className="flex items-center text-primary-600 hover:text-primary-700 font-medium text-sm">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white shadow-sm rounded-xl p-6 sm:p-8 mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">WalmartApp Documentation</h1>
          
          <div className="prose max-w-none">
            <h2 className="text-2xl font-semibold text-slate-800 mt-8 mb-4">Getting Started</h2>
            <p className="mb-4">
              Welcome to WalmartApp, your comprehensive solution for inventory management, order processing, 
              and business analytics. This documentation will guide you through the main features and how 
              to use them effectively.
            </p>

            <h2 className="text-2xl font-semibold text-slate-800 mt-8 mb-4">Dashboard</h2>
            <p className="mb-4">
              The dashboard provides an overview of your business performance, including recent orders, 
              inventory status, and key metrics. You can:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li className="mb-2">View sales performance at a glance</li>
              <li className="mb-2">Check low stock alerts</li>
              <li className="mb-2">See recent order activity</li>
              <li className="mb-2">Access quick links to main features</li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-800 mt-8 mb-4">Inventory Management</h2>
            <p className="mb-4">
              The inventory section allows you to manage all your products and stock levels:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li className="mb-2">Add new products with detailed information</li>
              <li className="mb-2">Update existing product details and stock levels</li>
              <li className="mb-2">Set up automatic reorder points</li>
              <li className="mb-2">View inventory history and stock movements</li>
              <li className="mb-2">Categorize and filter products</li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-800 mt-8 mb-4">Order Processing</h2>
            <p className="mb-4">
              The orders section helps you manage customer orders from creation to fulfillment:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li className="mb-2">Create new orders manually or import from external sources</li>
              <li className="mb-2">Track order status and update as needed</li>
              <li className="mb-2">Process payments and generate invoices</li>
              <li className="mb-2">Manage returns and exchanges</li>
              <li className="mb-2">View order history and details</li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-800 mt-8 mb-4">Analytics</h2>
            <p className="mb-4">
              The analytics section provides detailed insights into your business performance:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li className="mb-2">View sales trends and patterns</li>
              <li className="mb-2">Analyze product performance</li>
              <li className="mb-2">Track revenue and profit margins</li>
              <li className="mb-2">Generate custom reports</li>
              <li className="mb-2">Export data for external analysis</li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-800 mt-8 mb-4">Product Performance</h2>
            <p className="mb-4">
              This specialized analytics section focuses on individual product performance:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li className="mb-2">View detailed sales history for specific products</li>
              <li className="mb-2">Identify best and worst performing products</li>
              <li className="mb-2">Track profit margins by product</li>
              <li className="mb-2">Monitor stock turnover rates</li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-800 mt-8 mb-4">Settings</h2>
            <p className="mb-4">
              The settings section allows you to customize your account and application preferences:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li className="mb-2">Update account information</li>
              <li className="mb-2">Manage user access and permissions</li>
              <li className="mb-2">Configure notification preferences</li>
              <li className="mb-2">Set up integrations with other systems</li>
              <li className="mb-2">Customize display options</li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-800 mt-8 mb-4">Admin Features</h2>
            <p className="mb-4">
              For administrators, additional features are available:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li className="mb-2">Manage user invitations and accounts</li>
              <li className="mb-2">Access system settings and configurations</li>
              <li className="mb-2">View activity logs</li>
              <li className="mb-2">Perform batch operations</li>
              <li className="mb-2">Import and export data</li>
            </ul>

            <h2 className="text-2xl font-semibold text-slate-800 mt-8 mb-4">Need Help?</h2>
            <p className="mb-4">
              If you need additional assistance:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li className="mb-2">Contact support at support@walmartapp.com</li>
              <li className="mb-2">Check our FAQ section</li>
              <li className="mb-2">Submit a help ticket through the Support page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 