'use client';

import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <header className="flex justify-between items-center mb-16">
          <Link href="/" className="text-3xl font-bold text-blue-700">WalmartApp</Link>
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
        
        <main className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">Terms of Service</h1>
          
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-700">
                By accessing or using the WalmartApp service, you agree to be bound by these Terms of Service. 
                If you do not agree to all the terms and conditions, you may not access or use our services.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Description of Service</h2>
              <p className="text-gray-700">
                WalmartApp provides tools for inventory management, sales analytics, and order management
                for Walmart sellers. We reserve the right to modify, suspend, or discontinue the service
                at any time without notice.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">3. User Accounts</h2>
              <p className="text-gray-700">
                You are responsible for maintaining the confidentiality of your account information and
                for all activities that occur under your account. You agree to notify us immediately of
                any unauthorized use of your account.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">4. User Conduct</h2>
              <p className="text-gray-700">
                You agree not to use the service for any illegal or unauthorized purpose. You must not
                attempt to gain unauthorized access to our systems or disrupt the service for other users.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Intellectual Property</h2>
              <p className="text-gray-700">
                All content included in the service, such as text, graphics, logos, and software, is the
                property of WalmartApp or its content suppliers and is protected by copyright and intellectual
                property laws.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Limitation of Liability</h2>
              <p className="text-gray-700">
                WalmartApp shall not be liable for any indirect, incidental, special, consequential, or
                punitive damages resulting from your use of or inability to use the service.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Changes to Terms</h2>
              <p className="text-gray-700">
                We reserve the right to modify these Terms of Service at any time. We will provide notice
                of significant changes by posting the updated terms on our website.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Governing Law</h2>
              <p className="text-gray-700">
                These Terms of Service are governed by the laws of the United States. Any disputes arising
                under these terms will be subject to the exclusive jurisdiction of the courts in the United States.
              </p>
            </section>
          </div>
          
          <div className="mt-8">
            <p className="text-gray-600">Last updated: May 2023</p>
          </div>
        </main>
      </div>
      
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="text-xl font-bold">WalmartApp</div>
              <div className="text-gray-400 text-sm">© 2025 All Rights Reserved</div>
            </div>
            <div className="flex gap-6">
              <Link href="/login" className="text-gray-300 hover:text-white">Login</Link>
              <Link href="/signup" className="text-gray-300 hover:text-white">Sign Up</Link>
              <Link href="#" className="text-gray-300 hover:text-white">Privacy Policy</Link>
              <Link href="/terms-of-service" className="text-gray-300 hover:text-white">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 