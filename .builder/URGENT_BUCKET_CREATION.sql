-- URGENT: Run this in Supabase Dashboard → SQL Editor
-- This creates the storage buckets needed for NIN upload to work

-- Create technician-documents bucket (for NIN, verification documents)
INSERT INTO storage.buckets (id, name, public)
VALUES ('technician-documents', 'technician-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Verify the bucket was created
SELECT id, name, public FROM storage.buckets 
WHERE id = 'technician-documents';
