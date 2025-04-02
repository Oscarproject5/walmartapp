'use client';

import dynamic from 'next/dynamic';

// Dynamically import the InventoryClient component with no SSR
const InventoryClientComponent = dynamic(
  () => import('./InventoryClient'),
  { ssr: false }
);

export default function InventoryClientWrapper() {
  return <InventoryClientComponent />;
} 