import { SupabaseClient } from '@supabase/supabase-js';

export interface ErrorResponse {
  message: string;
  code?: string | number;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
}

export interface BaseError {
  message: string;
  name?: string;
  stack?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
}

export interface FileUploadResult {
  success: boolean;
  fileName: string;
  fileSize: number;
  error?: string;
}

export interface ColumnMapping {
  [key: string]: string;
}

export interface ImportResult {
  success: boolean;
  rowsProcessed: number;
  errors: string[];
}

export interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  supabase: SupabaseClient;
  loading: boolean;
}

export interface ProductPerformance {
  id: string;
  product_id: string;
  sales_count: number;
  revenue: number;
  period: string;
}

export interface BatchDetails {
  id: string;
  product_id: string;
  quantity: number;
  expiration_date?: string;
  created_at: string;
}

export interface DiagnosticResult {
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: unknown;
} 