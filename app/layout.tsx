import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import Layout from './components/Layout';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const poppins = Poppins({ 
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins'
});

export const metadata: Metadata = {
  title: 'Profit Tracker - Amazon & Walmart',
  description: 'Track your Amazon and Walmart sales profit with AI-powered insights',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className={`${inter.variable} ${poppins.variable} font-sans relative min-h-screen`} suppressHydrationWarning={true}>
        <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-slate-50 to-blue-50 -z-10"></div>
        <Layout>{children}</Layout>
        <Toaster position="top-right" />
      </body>
    </html>
  );
} 