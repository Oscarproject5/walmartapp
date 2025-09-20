-- Add upload_batch_id column to orders table

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS upload_batch_id UUID NULL;

COMMENT ON COLUMN public.orders.upload_batch_id IS 'Identifier for grouping orders uploaded in the same batch, used for targeted deletion.';
