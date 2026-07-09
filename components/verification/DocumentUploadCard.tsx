// Document upload card component
// Allows users to take photo or pick from gallery for verification documents

import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { colors, typography, spacing, radius, shadows } from '@/constants/theme'
import { DocumentUploadService, type UploadResult } from '@/lib/services/document-upload'
import { DocumentValidationService } from '@/lib/services/nin-validation'

export interface DocumentUploadCardProps {
  title: string
  description: string
  documentType: 'id_card' | 'address_proof'
  userId: string
  onUploadComplete: (result: UploadResult) => void
  initialUrl?: string
}

export function DocumentUploadCard({
  title,
  description,
  documentType,
  userId,
  onUploadComplete,
  initialUrl
}: DocumentUploadCardProps) {
  const [uploading, setUploading] = useState(false)
  const [imageUri, setImageUri] = useState<string | undefined>(initialUrl)
  const [uploadedUrl, setUploadedUrl] = useState<string | undefined>(initialUrl)

  const requestPermissions = async () => {
    // Request camera permissions
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync()
    const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (cameraPermission.status !== 'granted' || libraryPermission.status !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'We need camera and photo library access to upload documents.',
        [{ text: 'OK' }]
      )
      return false
    }

    return true
  }

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      const hasPermission = await requestPermissions()
      if (!hasPermission) return

      let result: ImagePicker.ImagePickerResult

      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8 // Compress to reduce file size
        })
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8
        })
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]
        
        // Validate file size (estimate from dimensions)
        const estimatedSize = asset.width * asset.height * 4 // Rough estimate in bytes
        
        if (estimatedSize > 10 * 1024 * 1024) {
          Alert.alert(
            'File Too Large',
            'Please select an image smaller than 10MB',
            [{ text: 'OK' }]
          )
          return
        }

        setImageUri(asset.uri)
        await uploadDocument(asset.uri, asset.fileName || 'document.jpg')
      }
    } catch (error) {
      console.error('❌ [DocumentUpload] Error picking image:', error)
      Alert.alert(
        'Error',
        'Failed to pick image. Please try again.',
        [{ text: 'OK' }]
      )
    }
  }

  const uploadDocument = async (uri: string, fileName: string) => {
    try {
      setUploading(true)

      // Create file object for upload
      const file = {
        uri,
        type: 'image/jpeg',
        size: 1024 * 1024, // Placeholder size
        name: fileName
      }

      const result = await DocumentUploadService.uploadDocument(
        file,
        userId,
        documentType
      )

      if (result.success) {
        setUploadedUrl(result.url)
        onUploadComplete(result)
        Alert.alert(
          'Upload Successful',
          'Your document has been uploaded successfully.',
          [{ text: 'OK' }]
        )
      } else {
        Alert.alert(
          'Upload Failed',
          result.error || 'Failed to upload document. Please try again.',
          [{ text: 'OK' }]
        )
        setImageUri(undefined)
      }
    } catch (error) {
      console.error('❌ [DocumentUpload] Upload error:', error)
      Alert.alert(
        'Upload Failed',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      )
      setImageUri(undefined)
    } finally {
      setUploading(false)
    }
  }

  const showUploadOptions = () => {
    Alert.alert(
      'Upload Document',
      'Choose how to upload your document',
      [
        {
          text: 'Take Photo',
          onPress: () => pickImage('camera')
        },
        {
          text: 'Choose from Library',
          onPress: () => pickImage('library')
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      {/* Upload Area */}
      <Pressable
        style={[
          styles.uploadArea,
          imageUri && styles.uploadAreaWithImage,
          uploading && styles.uploadAreaDisabled
        ]}
        onPress={showUploadOptions}
        disabled={uploading}
      >
        {uploading ? (
          <View style={styles.uploadingState}>
            <ActivityIndicator size="large" color={colors.secondary} />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        ) : imageUri ? (
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            <View style={styles.changeOverlay}>
              <Ionicons name="camera" size={24} color={colors.onPrimary} />
              <Text style={styles.changeText}>Tap to change</Text>
            </View>
            {uploadedUrl && (
              <View style={styles.successBadge}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.iconContainer}>
              <Ionicons name="camera" size={32} color={colors.secondary} />
            </View>
            <Text style={styles.uploadText}>Tap to upload document</Text>
            <Text style={styles.uploadHint}>Take photo or choose from library</Text>
          </View>
        )}
      </Pressable>

      {/* Guidelines */}
      <View style={styles.guidelines}>
        <Text style={styles.guidelinesTitle}>Guidelines:</Text>
        <View style={styles.guidelineItem}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.guidelineText}>Image must be clear and readable</Text>
        </View>
        <View style={styles.guidelineItem}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.guidelineText}>Maximum file size: 10MB</Text>
        </View>
        <View style={styles.guidelineItem}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.guidelineText}>Accepted formats: JPEG, PNG, PDF</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg
  },
  header: {
    marginBottom: spacing.md
  },
  title: {
    ...typography.headlineSm,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2
  },
  description: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    lineHeight: 20
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: colors.outline,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  uploadAreaWithImage: {
    borderStyle: 'solid',
    borderColor: colors.success,
    backgroundColor: colors.surface
  },
  uploadAreaDisabled: {
    opacity: 0.6
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md
  },
  uploadText: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs / 2
  },
  uploadHint: {
    ...typography.bodyMd,
    color: colors.text.secondary
  },
  uploadingState: {
    alignItems: 'center',
    padding: spacing.lg
  },
  uploadingText: {
    ...typography.bodyLg,
    color: colors.text.secondary,
    marginTop: spacing.sm
  },
  imagePreviewContainer: {
    width: '100%',
    height: 200,
    position: 'relative'
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: radius.lg
  },
  changeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.lg
  },
  changeText: {
    ...typography.bodyMd,
    color: colors.onPrimary,
    marginTop: spacing.xs / 2,
    fontWeight: '600'
  },
  successBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.xs / 2,
    ...shadows.level2
  },
  guidelines: {
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary
  },
  guidelinesTitle: {
    ...typography.bodyLg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs / 2
  },
  guidelineText: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    flex: 1
  }
})
