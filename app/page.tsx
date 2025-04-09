'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LandingPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    // Check if user is already signed in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      }
    };
    
    checkSession();
  }, [router, supabase]);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <header className="flex justify-between items-center mb-16">
          <div className="text-3xl font-bold text-blue-700">WalmartApp</div>
          <div className="space-x-4">
            <Link 
              href="/login" 
              className="px-4 py-2 text-blue-700 border border-blue-700 rounded hover:bg-blue-50 transition"
            >
              Log In
            </Link>
            <Link 
              href="/signup" 
              className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition"
            >
              Sign Up
            </Link>
          </div>
        </header>
        
        <main className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-gray-900">
              Manage Your Walmart Business <span className="text-blue-700">Efficiently</span>
            </h1>
            <p className="text-xl text-gray-700 mb-8">
              Streamline your inventory, track sales, and maximize profits with our comprehensive dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/signup" 
                className="px-6 py-3 bg-blue-700 text-white rounded-lg text-center font-medium hover:bg-blue-800 transition"
              >
                Get Started Now
              </Link>
              <Link 
                href="#features" 
                className="px-6 py-3 border border-gray-300 rounded-lg text-center font-medium hover:bg-gray-50 transition"
              >
                Learn More
              </Link>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="bg-white p-4 rounded-lg shadow-xl">
              <img 
                src="/images/dashboard-preview.png" 
                alt="Dashboard Preview" 
                className="rounded"
                onError={(e) => {
                  // Fallback if image doesn't exist
                  e.currentTarget.style.display = 'none';
                }}
              />
              {/* Fallback diagram if image doesn't exist */}
              <div className="bg-blue-50 h-64 rounded flex items-center justify-center">
                <div className="text-center p-6">
                  <div className="text-2xl font-bold text-blue-700 mb-2">Powerful Dashboard</div>
                  <p className="text-gray-600">Track inventory, sales, and profits in real-time</p>
                </div>
              </div>
            </div>
          </div>
        </main>
        
        <section id="features" className="py-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
              <div className="text-blue-700 text-xl font-bold mb-3">Inventory Management</div>
              <p className="text-gray-600">Keep track of all your products, stock levels, and automatically calculate profit margins.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
              <div className="text-blue-700 text-xl font-bold mb-3">Sales Analytics</div>
              <p className="text-gray-600">Visualize your sales data with powerful charts and insights to make better business decisions.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
              <div className="text-blue-700 text-xl font-bold mb-3">Order Management</div>
              <p className="text-gray-600">Track all your Walmart orders in one place with detailed profitability breakdowns.</p>
            </div>
          </div>
        </section>
      </div>
      
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="text-xl font-bold">WalmartApp</div>
              <div className="text-gray-400 text-sm">© 2025 All Rights Reserved</div>
            </div>
            <div className="flex gap-6">
              <Link href="/login" className="text-gray-300 hover:text-white">Login</Link>
              <Link href="/signup" className="text-gray-300 hover:text-white">Sign Up</Link>
              <Link href="/privacy-policy" className="text-gray-300 hover:text-white">Privacy Policy</Link>
              <Link href="/terms-of-service" className="text-gray-300 hover:text-white">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 