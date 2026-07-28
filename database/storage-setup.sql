-- Storage RLS Policies for UrbanFix
-- Run this in the Supabase SQL Editor AFTER migration 002 has created the buckets
-- This must be done in Supabase because storage.objects is not queryable via migrations

-- =====================================================
-- ENABLE RLS ON STORAGE
-- =====================================================

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TECHNICIAN-DOCUMENTS BUCKET POLICIES
-- =====================================================

-- Technicians can upload their own documents
CREATE POLICY "Technicians can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'technician-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Technicians can view their own documents
CREATE POLICY "Technicians can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'technician-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can view all technician documents
CREATE POLICY "Admins can view all technician documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'technician-documents'
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =====================================================
-- JOB-PHOTOS BUCKET POLICIES
-- =====================================================

-- Users can upload photos to their own paths
CREATE POLICY "Users can upload job photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'job-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own job photos
CREATE POLICY "Users can view job photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'job-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- PROFILE-PHOTOS BUCKET POLICIES
-- =====================================================

-- Authenticated users can upload their own profile photo
CREATE POLICY "Users can upload own profile photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated users can update their own profile photo
CREATE POLICY "Users can update own profile photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Public access to profile photos
CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

-- =====================================================
-- VERIFY SETUP
-- =====================================================

-- Check if buckets were created
SELECT id, name, public FROM storage.buckets 
WHERE id IN ('technician-documents', 'job-photos', 'profile-photos');

-- Check if policies were created
SELECT tablename, policyname FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
