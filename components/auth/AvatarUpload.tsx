// Avatar Upload Component
// Handles profile picture selection and upload with image picker
// Implements Requirements 3.2: Profile photo upload

import React, { useState } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
  Platform
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  onAvatarSelected: (imageUri: string) => void
  onAvatarRemoved: () => void
  uploading?: boolean
  size?: number
  showRemove?: boolean
}

export function AvatarUpload({
  currentAvatarUrl,
  onAvatarSelected,
  onAvatarRemoved,
  uploading = false,
  size = 120,
  showRemove = true
}: AvatarUploadProps) {
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null)

  // Request camera permissions
  const requestPermissions = async (): Promise<boolean> => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        setPermissionStatus(status)
        
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please allow access to your photo library to select a profile picture.',
            [{ text: 'OK' }]
          )
          return false
        }
      }
      return true
    } catch (error) {
      console.error('Permission request error:', error)
      Alert.alert('Error', 'Failed to request permissions')
      return false
    }
  }

  // Handle image selection
  const handleImageSelection = async () => {
    try {
      const hasPermission = await requestPermissions()
      if (!hasPermission) return

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio
        quality: 0.8,
        exif: false
      }

      Alert.alert(
        'Select Photo',
        'Choose how you want to add your profile picture',
        [
          {
            text: 'Camera',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync(options)
              if (!result.canceled && result.assets[0]) {
                onAvatarSelected(result.assets[0].uri)
              }
            }
          },
          {
            text: 'Photo Library',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync(options)
              if (!result.canceled && result.assets[0]) {
                onAvatarSelected(result.assets[0].uri)
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      )
    } catch (error) {
      console.error('Image selection error:', error)
      Alert.alert('Error', 'Failed to select image')
    }
  }

  // Handle avatar removal
  const handleRemoveAvatar = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: onAvatarRemoved
        }
      ]
    )
  }

  const avatarSize = { width: size, height: size, borderRadius: size / 2 }

  return (
    <View style={styles.container}>
      <View style={[styles.avatarContainer, avatarSize]}>
        {currentAvatarUrl ? (
          <Image
            source={{ uri: currentAvatarUrl }}
            style={[styles.avatar, avatarSize]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeholderAvatar, avatarSize]}>
            <Ionicons name="person" size={size * 0.5} color="#9CA3AF" />
          </View>
        )}
        
        {uploading && (
          <View style={[styles.uploadingOverlay, avatarSize]}>
            <ActivityIndicator color="#3B82F6" size="large" />
          </View>
        )}
        
        <Pressable
          style={styles.editButton}
          onPress={handleImageSelection}
          disabled={uploading}
        >
          <Ionicons name="camera" size={16} color="#FFFFFF" />
        </Pressable>
      </View>
      
      <View style={styles.actions}>
        <Pressable
          style={styles.actionButton}
          onPress={handleImageSelection}
          disabled={uploading}
        >
          <Text style={styles.actionButtonText}>
            {currentAvatarUrl ? 'Change Photo' : 'Add Photo'}
          </Text>
        </Pressable>
        
        {currentAvatarUrl && showRemove && (
          <Pressable
            style={[styles.actionButton, styles.removeButton]}
            onPress={handleRemoveAvatar}
            disabled={uploading}
          >
            <Text style={[styles.actionButtonText, styles.removeButtonText]}>
              Remove
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16
  },
  avatarContainer: {
    position: 'relative'
  },
  avatar: {
    backgroundColor: '#F3F4F6'
  },
  placeholderAvatar: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed'
  },
  uploadingOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF'
  },
  actions: {
    flexDirection: 'row',
    gap: 12
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3B82F6'
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6'
  },
  removeButton: {
    borderColor: '#EF4444'
  },
  removeButtonText: {
    color: '#EF4444'
  }
})