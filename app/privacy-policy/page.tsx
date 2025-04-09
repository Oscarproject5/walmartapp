'use client';

import Link from 'next/link';

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl font-bold mb-6 text-gray-900">Privacy Policy</h1>
          
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Information We Collect</h2>
              <p className="text-gray-700">
                We collect information you provide directly to us, such as when you create an account, submit your 
                Walmart seller information, or contact customer service. This may include your name, email address, 
                phone number, business information, and other data necessary to provide our services.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">2. How We Use Your Information</h2>
              <p className="text-gray-700">
                We use the information we collect to provide, maintain, and improve our services, such as processing 
                your inventory data, analyzing your sales performance, and facilitating order management. We may also 
                use your information to communicate with you about service-related matters and updates.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Data Sharing and Disclosure</h2>
              <p className="text-gray-700">
                We do not sell your personal information. We may share your information with third-party service 
                providers who perform services on our behalf, such as hosting, data analytics, and customer service. 
                These service providers are contractually obligated to use your information only as directed by us.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Data Security</h2>
              <p className="text-gray-700">
                We employ industry-standard security measures to protect your personal information from unauthorized 
                access, alteration, disclosure, or destruction. However, no method of transmission over the Internet 
                or electronic storage is 100% secure, so we cannot guarantee absolute security.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Your Rights and Choices</h2>
              <p className="text-gray-700">
                You can access, update, or delete your account information at any time by logging into your account 
                settings. You may also contact us directly to request access to, correction of, or deletion of your 
                personal information.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Cookies and Tracking Technologies</h2>
              <p className="text-gray-700">
                We use cookies and similar tracking technologies to track activity on our service and hold certain 
                information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being 
                sent, but this may affect your ability to use certain features of our service.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Children's Privacy</h2>
              <p className="text-gray-700">
                Our service is not directed to children under the age of 13, and we do not knowingly collect personal 
                information from children under 13. If we discover that a child under 13 has provided us with personal 
                information, we will promptly delete it.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Changes to Privacy Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time to reflect changes in our practices or for other 
                operational, legal, or regulatory reasons. We will notify you of any material changes through our 
                website or by other means.
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
              <Link href="/privacy-policy" className="text-gray-300 hover:text-white">Privacy Policy</Link>
              <Link href="/terms-of-service" className="text-gray-300 hover:text-white">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 