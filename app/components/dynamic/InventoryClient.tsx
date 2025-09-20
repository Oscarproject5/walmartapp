'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

interface InventoryClientProps {
  onItemDeleted?: () => void;
}

// Import the InventoryTable component dynamically to avoid SSR issues
const DynamicInventoryTable = dynamic(() => import('../InventoryTable'), {
  ssr: false,
  loading: () => <InventoryTableSkeleton />
});

// Export the InventoryClient component that wraps the dynamic import
export function InventoryClient({ onItemDeleted }: InventoryClientProps) {
  return (
    <Suspense fallback={<InventoryTableSkeleton />}>
      <DynamicInventoryTable onItemDeleted={onItemDeleted} />
    </Suspense>
  );
}

// Skeleton loader for the inventory table
function InventoryTableSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 bg-slate-200 rounded w-full"></div>
      <div className="space-y-2">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="h-12 bg-slate-200 rounded w-full"></div>
        ))}
      </div>
    </div>
  );
} 