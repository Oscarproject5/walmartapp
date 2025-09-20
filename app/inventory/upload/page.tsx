import { Metadata } from 'next';
import UploadInventoryClient from './UploadInventoryClient';

export const metadata: Metadata = {
  title: 'Upload Inventory | Walmart App',
  description: 'Upload inventory data to the Walmart App',
};

export default function UploadInventoryPage() {
  return (
    <main className="flex-1 p-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Upload Inventory Data</h1>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <UploadInventoryClient />
        </div>
      </div>
    </main>
  );
} 