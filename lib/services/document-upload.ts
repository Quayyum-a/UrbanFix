// Document upload service for Supabase Storage
// Handles secure file uploads for verification documents and photos

import { supabase } from '@/lib/supabase'
import { DocumentValidationService } from './nin-validation'

export interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

export type DocumentType = 
  | 'id_card' 
  | 'address_proof' 
  | 'job_photo' 
  | 'progress_photo' 
  | 'profile_photo'

export class DocumentUploadService {
  // Storage bucket names
  private static readonly DOCUMENTS_BUCKET = 'technician-documents'
  private static readonly PHOTOS_BUCKET = 'job-photos'
  private static readonly PROFILES_BUCKET = 'profile-photos'

  /**
   * Upload technician verification document
   * Requirements: 4.2 - Document upload
   */
  public static async uploadDocument(
    file: { uri: string; type: string; size: number; name: string },
    userId: string,
    documentType: 'id_card' | 'address_proof'
  ): Promise<UploadResult> {
    try {
      console.log(`📤 [Upload] Uploading ${documentType} for user ${userId}`)

      // Validate file
      const validation = DocumentValidationService.validateDocument(file)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Generate safe filename
      const filename = DocumentValidationService.generateSafeFilename(file.name, userId)
      const path = `${userId}/${documentType}/${filename}`

      // Read file as blob for upload
      const response = await fetch(file.uri)
      const blob = await response.blob()

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.DOCUMENTS_BUCKET)
        .upload(path, blob, {
          contentType: file.type,
          upsert: false // Don't overwrite existing files
        })

      if (error) {
        console.error(`❌ [Upload] Storage error:`, error)
        return {
          success: false,
          error: 'Failed to upload document. Please try again.'
        }
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.DOCUMENTS_BUCKET)
        .getPublicUrl(path)

      console.log(`✅ [Upload] Document uploaded successfully:`, path)

      return {
        success: true,
        url: urlData.publicUrl,
        path: path
      }
    } catch (error) {
      console.error(`❌ [Upload] Unexpected error:`, error)
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      }
    }
  }

  /**
   * Upload job or progress photo
   * Requirements: 5.5 - Photo upload
   */
  public static async uploadPhoto(
    file: { uri: string; type: string; size: number; name: string },
    userId: string,
    photoType: 'job_photo' | 'progress_photo',
    jobId?: string
  ): Promise<UploadResult> {
    try {
      console.log(`📤 [Upload] Uploading ${photoType} for user ${userId}`)

      // Validate file
      const validation = DocumentValidationService.validatePhoto(file)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Generate safe filename
      const filename = DocumentValidationService.generateSafeFilename(file.name, userId)
      const path = jobId 
        ? `${userId}/${jobId}/${photoType}/${filename}`
        : `${userId}/${photoType}/${filename}`

      // Read file as blob
      const response = await fetch(file.uri)
      const blob = await response.blob()

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.PHOTOS_BUCKET)
        .upload(path, blob, {
          contentType: file.type,
          upsert: false
        })

      if (error) {
        console.error(`❌ [Upload] Storage error:`, error)
        return {
          success: false,
          error: 'Failed to upload photo. Please try again.'
        }
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.PHOTOS_BUCKET)
        .getPublicUrl(path)

      console.log(`✅ [Upload] Photo uploaded successfully:`, path)

      return {
        success: true,
        url: urlData.publicUrl,
        path: path
      }
    } catch (error) {
      console.error(`❌ [Upload] Unexpected error:`, error)
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      }
    }
  }

  /**
   * Upload profile photo
   * Requirements: 3.2 - Avatar upload
   */
  public static async uploadProfilePhoto(
    file: { uri: string; type: string; size: number; name: string },
    userId: string
  ): Promise<UploadResult> {
    try {
      console.log(`📤 [Upload] Uploading profile photo for user ${userId}`)

      // Validate file
      const validation = DocumentValidationService.validatePhoto(file)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Generate safe filename
      const filename = DocumentValidationService.generateSafeFilename(file.name, userId)
      const path = `${userId}/avatar/${filename}`

      // Read file as blob
      const response = await fetch(file.uri)
      const blob = await response.blob()

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.PROFILES_BUCKET)
        .upload(path, blob, {
          contentType: file.type,
          upsert: true // Allow overwriting old avatar
        })

      if (error) {
        console.error(`❌ [Upload] Storage error:`, error)
        return {
          success: false,
          error: 'Failed to upload photo. Please try again.'
        }
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.PROFILES_BUCKET)
        .getPublicUrl(path)

      console.log(`✅ [Upload] Profile photo uploaded successfully:`, path)

      return {
        success: true,
        url: urlData.publicUrl,
        path: path
      }
    } catch (error) {
      console.error(`❌ [Upload] Unexpected error:`, error)
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.'
      }
    }
  }

  /**
   * Delete document from storage
   */
  public static async deleteDocument(path: string, bucket: 'documents' | 'photos' | 'profiles'): Promise<boolean> {
    try {
      const bucketName = bucket === 'documents' 
        ? this.DOCUMENTS_BUCKET 
        : bucket === 'photos'
        ? this.PHOTOS_BUCKET
        : this.PROFILES_BUCKET

      const { error } = await supabase.storage
        .from(bucketName)
        .remove([path])

      if (error) {
        console.error(`❌ [Upload] Delete error:`, error)
        return false
      }

      console.log(`✅ [Upload] Document deleted:`, path)
      return true
    } catch (error) {
      console.error(`❌ [Upload] Unexpected delete error:`, error)
      return false
    }
  }
}
