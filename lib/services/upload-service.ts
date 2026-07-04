// Upload Service
// Handles file uploads to Supabase Storage with validation and optimization
// Implements Requirements 22.1, 22.2, 22.3, 22.4, 22.5

import { supabase } from '@/lib/supabase'
import * as FileSystem from 'expo-file-system'
import * as ImageManipulator from 'expo-image-manipulator'
import { decode } from 'base64-arraybuffer'

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
  filePath?: string
}

export interface FileValidationResult {
  isValid: boolean
  error?: string
  fileInfo?: {
    size: number
    type: string
  }
}

export class UploadService {
  private static instance: UploadService

  private constructor() {}

  public static getInstance(): UploadService {
    if (!UploadService.instance) {
      UploadService.instance = new UploadService()
    }
    return UploadService.instance
  }

  /**
   * Upload profile image with compression and validation
   */
  async uploadProfileImage(userId: string, imageUri: string): Promise<UploadResult> {
    try {
      // Validate image
      const validation = await this.validateImage(imageUri, 5 * 1024 * 1024) // 5MB limit
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Compress image for profile use
      const compressedImage = await this.compressImage(imageUri, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8
      })

      if (!compressedImage.success) {
        return {
          success: false,
          error: compressedImage.error || 'Failed to process image'
        }
      }

      // Generate unique filename
      const fileExtension = this.getFileExtension(imageUri) || 'jpg'
      const fileName = `${userId}-${Date.now()}.${fileExtension}`
      const filePath = `profiles/avatars/${fileName}`

      // Upload to Supabase Storage
      return await this.uploadToStorage('profile-images', filePath, compressedImage.uri!)
    } catch (error) {
      console.error('Upload profile image error:', error)
      return {
        success: false,
        error: 'Failed to upload profile image'
      }
    }
  }

  /**
   * Upload device photos for job documentation
   */
  async uploadDevicePhotos(jobId: string, imageUris: string[]): Promise<UploadResult[]> {
    try {
      if (!imageUris || imageUris.length === 0) {
        return [{
          success: false,
          error: 'No images provided'
        }]
      }

      if (imageUris.length > 3) {
        return [{
          success: false,
          error: 'Maximum 3 photos allowed per job'
        }]
      }

      const uploadPromises = imageUris.map(async (imageUri, index) => {
        try {
          // Validate each image
          const validation = await this.validateImage(imageUri, 5 * 1024 * 1024) // 5MB limit
          if (!validation.isValid) {
            return {
              success: false,
              error: validation.error
            }
          }

          // Compress for device photos
          const compressedImage = await this.compressImage(imageUri, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 0.85
          })

          if (!compressedImage.success) {
            return {
              success: false,
              error: compressedImage.error || 'Failed to process image'
            }
          }

          // Generate filename
          const fileExtension = this.getFileExtension(imageUri) || 'jpg'
          const fileName = `${jobId}-${index + 1}-${Date.now()}.${fileExtension}`
          const filePath = `jobs/device-photos/${fileName}`

          // Upload to storage
          return await this.uploadToStorage('job-photos', filePath, compressedImage.uri!)
        } catch (error) {
          console.error(`Upload device photo ${index} error:`, error)
          return {
            success: false,
            error: `Failed to upload photo ${index + 1}`
          }
        }
      })

      return await Promise.all(uploadPromises)
    } catch (error) {
      console.error('Upload device photos error:', error)
      return [{
        success: false,
        error: 'Failed to upload device photos'
      }]
    }
  }

  /**
   * Upload document for technician verification
   */
  async uploadVerificationDocument(
    technicianId: string, 
    documentUri: string, 
    documentType: 'nin' | 'id_card' | 'other'
  ): Promise<UploadResult> {
    try {
      // Validate document image
      const validation = await this.validateImage(documentUri, 10 * 1024 * 1024) // 10MB limit for documents
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Compress document with higher quality
      const compressedImage = await this.compressImage(documentUri, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.9
      })

      if (!compressedImage.success) {
        return {
          success: false,
          error: compressedImage.error || 'Failed to process document'
        }
      }

      // Generate filename
      const fileExtension = this.getFileExtension(documentUri) || 'jpg'
      const fileName = `${technicianId}-${documentType}-${Date.now()}.${fileExtension}`
      const filePath = `verification/documents/${fileName}`

      // Upload to storage
      return await this.uploadToStorage('verification-docs', filePath, compressedImage.uri!)
    } catch (error) {
      console.error('Upload verification document error:', error)
      return {
        success: false,
        error: 'Failed to upload verification document'
      }
    }
  }

  /**
   * Upload chat attachment
   */
  async uploadChatAttachment(jobId: string, messageId: string, fileUri: string): Promise<UploadResult> {
    try {
      // Validate image for chat
      const validation = await this.validateImage(fileUri, 10 * 1024 * 1024) // 10MB limit for chat images
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Compress for chat sharing
      const compressedImage = await this.compressImage(fileUri, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8
      })

      if (!compressedImage.success) {
        return {
          success: false,
          error: compressedImage.error || 'Failed to process attachment'
        }
      }

      // Generate filename
      const fileExtension = this.getFileExtension(fileUri) || 'jpg'
      const fileName = `${jobId}-${messageId}-${Date.now()}.${fileExtension}`
      const filePath = `messages/attachments/${fileName}`

      // Upload to storage
      return await this.uploadToStorage('chat-attachments', filePath, compressedImage.uri!)
    } catch (error) {
      console.error('Upload chat attachment error:', error)
      return {
        success: false,
        error: 'Failed to upload attachment'
      }
    }
  }

  /**
   * Validate image file
   */
  private async validateImage(imageUri: string, maxSizeBytes: number): Promise<FileValidationResult> {
    try {
      if (!imageUri) {
        return {
          isValid: false,
          error: 'No image provided'
        }
      }

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(imageUri)
      
      if (!fileInfo.exists) {
        return {
          isValid: false,
          error: 'Image file not found'
        }
      }

      if (!fileInfo.size || fileInfo.size > maxSizeBytes) {
        const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024))
        return {
          isValid: false,
          error: `Image must be smaller than ${maxSizeMB}MB`
        }
      }

      // Check file extension
      const extension = this.getFileExtension(imageUri)?.toLowerCase()
      if (!extension || !['jpg', 'jpeg', 'png'].includes(extension)) {
        return {
          isValid: false,
          error: 'Only JPEG and PNG images are supported'
        }
      }

      return {
        isValid: true,
        fileInfo: {
          size: fileInfo.size,
          type: extension
        }
      }
    } catch (error) {
      console.error('Image validation error:', error)
      return {
        isValid: false,
        error: 'Failed to validate image'
      }
    }
  }

  /**
   * Compress image for optimal upload
   */
  private async compressImage(
    imageUri: string,
    options: {
      maxWidth: number
      maxHeight: number
      quality: number
    }
  ): Promise<UploadResult> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            resize: {
              width: options.maxWidth,
              height: options.maxHeight
            }
          }
        ],
        {
          compress: options.quality,
          format: ImageManipulator.SaveFormat.JPEG
        }
      )

      return {
        success: true,
        uri: result.uri
      }
    } catch (error) {
      console.error('Image compression error:', error)
      return {
        success: false,
        error: 'Failed to compress image'
      }
    }
  }

  /**
   * Upload file to Supabase Storage
   */
  private async uploadToStorage(bucket: string, filePath: string, fileUri: string): Promise<UploadResult> {
    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64
      })

      // Convert to ArrayBuffer
      const arrayBuffer = decode(base64)

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        })

      if (error) {
        console.error('Supabase storage upload error:', error)
        return {
          success: false,
          error: 'Failed to upload file to storage'
        }
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      return {
        success: true,
        url: urlData.publicUrl,
        filePath
      }
    } catch (error) {
      console.error('Storage upload error:', error)
      return {
        success: false,
        error: 'Network error occurred during upload'
      }
    }
  }

  /**
   * Get file extension from URI
   */
  private getFileExtension(uri: string): string | null {
    try {
      const match = uri.match(/\.([a-zA-Z0-9]+)(\?|$)/)
      return match ? match[1] : null
    } catch {
      return null
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(bucket: string, filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath])

      if (error) {
        console.error('Delete file error:', error)
        return {
          success: false,
          error: 'Failed to delete file'
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Delete file error:', error)
      return {
        success: false,
        error: 'Network error occurred'
      }
    }
  }
}

// Export singleton instance
export const uploadService = UploadService.getInstance()