// AddressManagement Component
// Interface for saving multiple addresses with custom labels and validation
// Implements Requirements 5.4, 5.5, 5.6, 5.8

import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import { colors, typography, spacing, radius, shadows } from '@/constants/theme'
import { Button } from '@/components/ui/Button'
import { AddressPicker } from './AddressPicker'
import { locationService, type LocationCoordinates } from '@/lib/services'

export interface SavedAddress {
  id: string
  label: string
  text: string
  coordinates: LocationCoordinates
  formattedAddress?: string
  isValidated: boolean
  createdAt: string
  lastUsed?: string
}

export interface AddressManagementProps {
  /** Current user's saved addresses */
  savedAddresses?: SavedAddress[]
  /** Currently selected address */
  selectedAddressId?: string
  /** Callback when address is selected */
  onAddressSelect: (address: SavedAddress) => void
  /** Callback when addresses are updated */
  onAddressesUpdate?: (addresses: SavedAddress[]) => void
  /** Whether to show distance calculations */
  showDistance?: boolean
  /** Reference location for distance calculations */
  referenceLocation?: LocationCoordinates
  /** Maximum number of saved addresses */
  maxAddresses?: number
}

const DEFAULT_ADDRESS_LABELS = ['Home', 'Work', 'Other']
const STORAGE_KEY = '@urbanfix_saved_addresses'
const MAX_ADDRESSES_DEFAULT = 5

export function AddressManagement({
  savedAddresses = [],
  selectedAddressId,
  onAddressSelect,
  onAddressesUpdate,
  showDistance = false,
  referenceLocation,
  maxAddresses = MAX_ADDRESSES_DEFAULT
}: AddressManagementProps) {
  const [addresses, setAddresses] = useState<SavedAddress[]>(savedAddresses)
  const [loading, setLoading] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [showAddressPicker, setShowAddressPicker] = useState(false)
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null)
  const [selectedLabel, setSelectedLabel] = useState('Home')
  const [customLabel, setCustomLabel] = useState('')
  const [pendingAddress, setPendingAddress] = useState<{
    text: string
    coordinates: LocationCoordinates
    formattedAddress?: string
  } | null>(null)
  const [distances, setDistances] = useState<Record<string, number>>({})

  // Monitor network connectivity for offline handling
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? true)
    })

    return unsubscribe
  }, [])

  // Load saved addresses from storage
  useEffect(() => {
    loadSavedAddresses()
  }, [])

  // Calculate distances when addresses or reference location change
  useEffect(() => {
    if (showDistance && referenceLocation && addresses.length > 0) {
      calculateDistances()
    }
  }, [addresses, referenceLocation, showDistance])

  const loadSavedAddresses = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsedAddresses: SavedAddress[] = JSON.parse(stored)
        setAddresses(parsedAddresses)
        onAddressesUpdate?.(parsedAddresses)
      }
    } catch (error) {
      console.error('Error loading saved addresses:', error)
    }
  }

  const saveAddressesToStorage = async (newAddresses: SavedAddress[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newAddresses))
      setAddresses(newAddresses)
      onAddressesUpdate?.(newAddresses)
    } catch (error) {
      console.error('Error saving addresses:', error)
      Alert.alert('Error', 'Failed to save address. Please try again.')
    }
  }

  const calculateDistances = useCallback(async () => {
    if (!referenceLocation) return

    const newDistances: Record<string, number> = {}
    
    for (const address of addresses) {
      const distance = locationService.calculateDistance(
        referenceLocation,
        address.coordinates
      )
      newDistances[address.id] = distance
    }
    
    setDistances(newDistances)
  }, [addresses, referenceLocation])

  const validateAddress = async (address: SavedAddress): Promise<boolean> => {
    if (!isOnline) {
      // Skip validation when offline
      return true
    }

    try {
      setLoading(true)
      
      // Validate Nigerian address format
      const validation = locationService.validateNigerianAddress(address.text)
      if (!validation.isValid) {
        Alert.alert('Invalid Address', validation.error || 'Please provide a valid Nigerian address')
        return false
      }

      // Optional: Re-validate coordinates by reverse geocoding
      const reverseResult = await locationService.reverseGeocode(address.coordinates)
      if (!reverseResult.success) {
        Alert.alert(
          'Address Validation',
          'Unable to validate address location. Save anyway?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Save', onPress: () => true }
          ]
        )
        return false
      }

      return true
    } catch (error) {
      console.error('Address validation error:', error)
      return true // Allow save on validation errors
    } finally {
      setLoading(false)
    }
  }

  const handleAddAddress = () => {
    if (addresses.length >= maxAddresses) {
      Alert.alert(
        'Maximum Addresses Reached',
        `You can save up to ${maxAddresses} addresses. Please remove an existing address first.`,
        [{ text: 'OK', style: 'default' }]
      )
      return
    }

    setShowAddressPicker(true)
  }

  const handleAddressSelected = (addressData: {
    text: string
    coordinates: LocationCoordinates
    formattedAddress?: string
  }) => {
    setPendingAddress(addressData)
    setShowAddressPicker(false)
    setShowLabelPicker(true)
  }

  const handleLabelConfirmed = async () => {
    if (!pendingAddress) return

    const finalLabel = selectedLabel === 'Other' ? customLabel.trim() : selectedLabel
    
    if (!finalLabel) {
      Alert.alert('Label Required', 'Please provide a label for this address')
      return
    }

    // Check for duplicate labels
    const existingLabel = addresses.find(addr => addr.label.toLowerCase() === finalLabel.toLowerCase())
    if (existingLabel) {
      Alert.alert(
        'Label Exists',
        `You already have an address labeled "${finalLabel}". Would you like to replace it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            onPress: () => replacedAddress(existingLabel.id, finalLabel)
          }
        ]
      )
      return
    }

    await saveNewAddress(finalLabel)
  }

  const saveNewAddress = async (label: string) => {
    if (!pendingAddress) return

    const newAddress: SavedAddress = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      label,
      text: pendingAddress.text,
      coordinates: pendingAddress.coordinates,
      formattedAddress: pendingAddress.formattedAddress,
      isValidated: false,
      createdAt: new Date().toISOString()
    }

    // Validate address
    const isValid = await validateAddress(newAddress)
    newAddress.isValidated = isValid

    const updatedAddresses = [...addresses, newAddress]
    await saveAddressesToStorage(updatedAddresses)

    // Reset state
    setPendingAddress(null)
    setShowLabelPicker(false)
    setSelectedLabel('Home')
    setCustomLabel('')

    Alert.alert('Success', 'Address saved successfully!')
  }

  const replacedAddress = async (addressId: string, label: string) => {
    if (!pendingAddress) return

    const newAddress: SavedAddress = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      label,
      text: pendingAddress.text,
      coordinates: pendingAddress.coordinates,
      formattedAddress: pendingAddress.formattedAddress,
      isValidated: await validateAddress({
        id: '',
        label,
        text: pendingAddress.text,
        coordinates: pendingAddress.coordinates,
        isValidated: false,
        createdAt: ''
      }),
      createdAt: new Date().toISOString()
    }

    const updatedAddresses = addresses.filter(addr => addr.id !== addressId)
    updatedAddresses.push(newAddress)
    
    await saveAddressesToStorage(updatedAddresses)

    // Reset state
    setPendingAddress(null)
    setShowLabelPicker(false)
    setSelectedLabel('Home')
    setCustomLabel('')

    Alert.alert('Success', 'Address updated successfully!')
  }

  const handleAddressPress = (address: SavedAddress) => {
    // Update last used timestamp
    const updatedAddress = {
      ...address,
      lastUsed: new Date().toISOString()
    }

    const updatedAddresses = addresses.map(addr => 
      addr.id === address.id ? updatedAddress : addr
    )

    saveAddressesToStorage(updatedAddresses)
    onAddressSelect(updatedAddress)
  }

  const handleEditAddress = (address: SavedAddress) => {
    setEditingAddress(address)
    Alert.alert(
      'Edit Address',
      `What would you like to do with "${address.label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit Location', onPress: () => editAddressLocation(address) },
        { text: 'Rename Label', onPress: () => editAddressLabel(address) },
        { text: 'Delete', style: 'destructive', onPress: () => deleteAddress(address.id) }
      ]
    )
  }

  const editAddressLocation = (address: SavedAddress) => {
    // Set current address data and open picker
    setEditingAddress(address)
    setShowAddressPicker(true)
  }

  const editAddressLabel = (address: SavedAddress) => {
    Alert.prompt(
      'Rename Address',
      'Enter a new label for this address:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (newLabel) => {
            if (newLabel && newLabel.trim()) {
              updateAddressLabel(address.id, newLabel.trim())
            }
          }
        }
      ],
      'plain-text',
      address.label
    )
  }

  const updateAddressLabel = async (addressId: string, newLabel: string) => {
    // Check for duplicate labels
    const existingLabel = addresses.find(addr => 
      addr.id !== addressId && addr.label.toLowerCase() === newLabel.toLowerCase()
    )
    
    if (existingLabel) {
      Alert.alert('Label Exists', `You already have an address labeled "${newLabel}".`)
      return
    }

    const updatedAddresses = addresses.map(addr =>
      addr.id === addressId ? { ...addr, label: newLabel } : addr
    )

    await saveAddressesToStorage(updatedAddresses)
    Alert.alert('Success', 'Address label updated!')
  }

  const deleteAddress = (addressId: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedAddresses = addresses.filter(addr => addr.id !== addressId)
            await saveAddressesToStorage(updatedAddresses)
          }
        }
      ]
    )
  }

  const formatDistance = (distanceKm: number): string => {
    return locationService.formatDistance(distanceKm)
  }

  const renderAddressItem = (address: SavedAddress) => {
    const isSelected = address.id === selectedAddressId
    const distance = distances[address.id]

    return (
      <TouchableOpacity
        key={address.id}
        style={[styles.addressItem, isSelected && styles.selectedAddressItem]}
        onPress={() => handleAddressPress(address)}
        onLongPress={() => handleEditAddress(address)}
        accessibilityRole="button"
        accessibilityLabel={`${address.label}: ${address.text}`}
        accessibilityHint="Tap to select, long press to edit"
      >
        <View style={styles.addressContent}>
          <View style={styles.addressHeader}>
            <View style={styles.labelContainer}>
              <Text style={[styles.addressLabel, isSelected && styles.selectedAddressLabel]}>
                {address.label}
              </Text>
              {!address.isValidated && (
                <Ionicons 
                  name="warning" 
                  size={16} 
                  color={colors.warning} 
                  style={styles.warningIcon}
                />
              )}
            </View>
            {showDistance && distance !== undefined && (
              <Text style={styles.distance}>{formatDistance(distance)}</Text>
            )}
          </View>
          
          <Text 
            style={[styles.addressText, isSelected && styles.selectedAddressText]}
            numberOfLines={2}
          >
            {address.text}
          </Text>

          {!isOnline && (
            <View style={styles.offlineIndicator}>
              <Ionicons name="cloud-offline" size={12} color={colors.text.secondary} />
              <Text style={styles.offlineText}>Offline</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditAddress(address)}
          accessibilityLabel="Edit address"
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="location-outline" size={64} color={colors.text.disabled} />
      <Text style={styles.emptyStateTitle}>No Saved Addresses</Text>
      <Text style={styles.emptyStateText}>
        Add your frequently used addresses for quick selection during booking
      </Text>
      <Button
        title="Add Your First Address"
        onPress={handleAddAddress}
        style={styles.emptyStateButton}
      />
    </View>
  )

  const renderOfflineBanner = () => {
    if (isOnline) return null

    return (
      <View style={styles.offlineBanner}>
        <Ionicons name="cloud-offline" size={16} color={colors.onSecondary} />
        <Text style={styles.offlineBannerText}>
          You're offline. Address validation is disabled.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {renderOfflineBanner()}
      
      <View style={styles.header}>
        <Text style={styles.title}>Saved Addresses</Text>
        {addresses.length > 0 && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddAddress}
            disabled={loading}
            accessibilityLabel="Add new address"
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="add" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {addresses.length === 0 ? (
        renderEmptyState()
      ) : (
        <ScrollView 
          style={styles.addressesList}
          showsVerticalScrollIndicator={false}
        >
          {addresses.map(renderAddressItem)}
        </ScrollView>
      )}

      {/* Address Picker Modal */}
      <Modal
        visible={showAddressPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <AddressPicker
          onAddressSelected={handleAddressSelected}
          onCancel={() => {
            setShowAddressPicker(false)
            setEditingAddress(null)
          }}
          initialAddress={editingAddress?.text}
          initialCoordinates={editingAddress?.coordinates}
          title="Select Address"
          subtitle="Choose the location for this saved address"
        />
      </Modal>

      {/* Label Picker Modal */}
      <Modal
        visible={showLabelPicker}
        animationType="fade"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.labelPickerContainer}>
            <Text style={styles.labelPickerTitle}>Label this address</Text>
            
            {DEFAULT_ADDRESS_LABELS.map(label => (
              <TouchableOpacity
                key={label}
                style={[
                  styles.labelOption,
                  selectedLabel === label && styles.selectedLabelOption
                ]}
                onPress={() => setSelectedLabel(label)}
              >
                <Text style={[
                  styles.labelOptionText,
                  selectedLabel === label && styles.selectedLabelOptionText
                ]}>
                  {label}
                </Text>
                {selectedLabel === label && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            {selectedLabel === 'Other' && (
              <TextInput
                style={styles.customLabelInput}
                placeholder="Enter custom label"
                value={customLabel}
                onChangeText={setCustomLabel}
                maxLength={20}
                autoFocus
              />
            )}

            <View style={styles.labelPickerActions}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => {
                  setShowLabelPicker(false)
                  setPendingAddress(null)
                  setSelectedLabel('Home')
                  setCustomLabel('')
                }}
                style={styles.labelActionButton}
              />
              <Button
                title="Save Address"
                onPress={handleLabelConfirmed}
                style={styles.labelActionButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs
  },
  offlineBannerText: {
    color: colors.onSecondary,
    fontSize: 14,
    fontWeight: '500'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  title: {
    ...typography.headlineSm,
    color: colors.text.primary
  },
  addButton: {
    padding: spacing.xs
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl
  },
  emptyStateTitle: {
    ...typography.headlineSm,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs
  },
  emptyStateText: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl
  },
  emptyStateButton: {
    minWidth: 200
  },
  addressesList: {
    flex: 1
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.level1
  },
  selectedAddressItem: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer
  },
  addressContent: {
    flex: 1
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  addressLabel: {
    ...typography.labelMd,
    color: colors.text.primary,
    fontWeight: '600'
  },
  selectedAddressLabel: {
    color: colors.primary
  },
  warningIcon: {
    marginLeft: spacing.xs
  },
  distance: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    fontWeight: '500'
  },
  addressText: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    lineHeight: 20
  },
  selectedAddressText: {
    color: colors.onPrimaryContainer
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: 4
  },
  offlineText: {
    ...typography.labelMd,
    color: colors.text.secondary
  },
  editButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  labelPickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    ...shadows.level3
  },
  labelPickerTitle: {
    ...typography.headlineSm,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md
  },
  labelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginVertical: 2
  },
  selectedLabelOption: {
    backgroundColor: colors.primaryContainer
  },
  labelOptionText: {
    ...typography.bodyLg,
    color: colors.text.primary
  },
  selectedLabelOptionText: {
    color: colors.primary,
    fontWeight: '600'
  },
  customLabelInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginVertical: spacing.xs,
    fontSize: 16,
    color: colors.text.primary
  },
  labelPickerActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md
  },
  labelActionButton: {
    flex: 1
  }
})