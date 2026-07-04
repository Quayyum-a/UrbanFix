// Example integration of AddressManagement component
// This demonstrates how to use AddressManagement with customer profile and booking flows

import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, typography, spacing, radius } from '@/constants/theme'
import { AddressManagement, type SavedAddress } from './AddressManagement'
import { Button } from '@/components/ui/Button'

interface AddressManagementExampleProps {
  /** Current user ID for storing addresses */
  userId: string
  /** Selected address for current booking */
  selectedAddress?: SavedAddress
  /** Callback when address is selected for booking */
  onAddressSelected: (address: SavedAddress) => void
  /** Whether to show distance calculations */
  showDistance?: boolean
  /** Reference location for distance calculations (e.g., technician location) */
  referenceLocation?: { latitude: number; longitude: number }
}

export function AddressManagementExample({
  userId,
  selectedAddress,
  onAddressSelected,
  showDistance = false,
  referenceLocation
}: AddressManagementExampleProps) {
  const [showAddressManager, setShowAddressManager] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])

  const handleAddressSelect = (address: SavedAddress) => {
    onAddressSelected(address)
    setShowAddressManager(false)
  }

  const handleAddressesUpdate = (addresses: SavedAddress[]) => {
    setSavedAddresses(addresses)
  }

  const getAddressDisplayText = (address?: SavedAddress): string => {
    if (!address) return 'Select pickup address'
    return `${address.label}: ${address.text}`
  }

  const truncateAddress = (text: string, maxLength: number = 40): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <>
      {/* Address Selection Button */}
      <TouchableOpacity
        style={[
          styles.addressSelector,
          selectedAddress && styles.addressSelectorSelected
        ]}
        onPress={() => setShowAddressManager(true)}
        accessibilityRole="button"
        accessibilityLabel={`Current address: ${getAddressDisplayText(selectedAddress)}`}
        accessibilityHint="Tap to select a different address"
      >
        <View style={styles.addressSelectorContent}>
          <Ionicons
            name="location"
            size={20}
            color={selectedAddress ? colors.primary : colors.text.secondary}
            style={styles.locationIcon}
          />
          
          <View style={styles.addressTextContainer}>
            <Text style={styles.addressLabel}>
              {selectedAddress ? 'Pickup Address' : 'Select Address'}
            </Text>
            <Text
              style={[
                styles.addressText,
                !selectedAddress && styles.addressTextPlaceholder
              ]}
              numberOfLines={1}
            >
              {truncateAddress(getAddressDisplayText(selectedAddress))}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.text.secondary}
          />
        </View>

        {selectedAddress && showDistance && referenceLocation && (
          <View style={styles.distanceInfo}>
            <Ionicons name="navigate" size={14} color={colors.text.secondary} />
            <Text style={styles.distanceText}>
              Distance will be calculated
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Quick Address Actions */}
      {savedAddresses.length > 0 && (
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Quick Select:</Text>
          <View style={styles.quickAddressList}>
            {savedAddresses.slice(0, 3).map((address) => (
              <TouchableOpacity
                key={address.id}
                style={[
                  styles.quickAddressItem,
                  selectedAddress?.id === address.id && styles.quickAddressItemSelected
                ]}
                onPress={() => handleAddressSelect(address)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${address.label}`}
              >
                <Text style={[
                  styles.quickAddressLabel,
                  selectedAddress?.id === address.id && styles.quickAddressLabelSelected
                ]}>
                  {address.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Address Management Modal */}
      <Modal
        visible={showAddressManager}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Manage Addresses</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAddressManager(false)}
              accessibilityRole="button"
              accessibilityLabel="Close address manager"
            >
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <AddressManagement
            savedAddresses={savedAddresses}
            selectedAddressId={selectedAddress?.id}
            onAddressSelect={handleAddressSelect}
            onAddressesUpdate={handleAddressesUpdate}
            showDistance={showDistance}
            referenceLocation={referenceLocation}
            maxAddresses={5}
          />
        </View>
      </Modal>
    </>
  )
}

// Example usage in a booking flow component
export function BookingAddressExample() {
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | undefined>()
  const [technicianLocation] = useState({ latitude: 6.5244, longitude: 3.3792 })

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Device Pickup</Text>
      
      <AddressManagementExample
        userId="user-123"
        selectedAddress={selectedAddress}
        onAddressSelected={setSelectedAddress}
        showDistance={true}
        referenceLocation={technicianLocation}
      />

      <View style={styles.bookingActions}>
        <Button
          title="Continue Booking"
          onPress={() => {
            if (selectedAddress) {
              console.log('Proceeding with address:', selectedAddress)
            }
          }}
          disabled={!selectedAddress}
        />
      </View>
    </View>
  )
}

// Example usage in customer profile
export function ProfileAddressExample() {
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | undefined>()

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Default Address</Text>
      
      <AddressManagementExample
        userId="user-123"
        selectedAddress={selectedAddress}
        onAddressSelected={setSelectedAddress}
        showDistance={false}
      />

      <Text style={styles.helperText}>
        This address will be used as default for new repair bookings
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md
  },
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.text.primary,
    marginBottom: spacing.md
  },
  addressSelector: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  addressSelectorSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer
  },
  addressSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  locationIcon: {
    marginRight: spacing.sm
  },
  addressTextContainer: {
    flex: 1
  },
  addressLabel: {
    ...typography.labelMd,
    color: colors.text.secondary,
    marginBottom: 2
  },
  addressText: {
    ...typography.bodyMd,
    color: colors.text.primary
  },
  addressTextPlaceholder: {
    color: colors.text.disabled,
    fontStyle: 'italic'
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 4
  },
  distanceText: {
    ...typography.labelMd,
    color: colors.text.secondary
  },
  quickActions: {
    marginBottom: spacing.md
  },
  quickActionsTitle: {
    ...typography.labelMd,
    color: colors.text.secondary,
    marginBottom: spacing.xs
  },
  quickAddressList: {
    flexDirection: 'row',
    gap: spacing.xs
  },
  quickAddressItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  quickAddressItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  quickAddressLabel: {
    ...typography.labelMd,
    color: colors.text.primary
  },
  quickAddressLabelSelected: {
    color: colors.onPrimary
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  modalTitle: {
    ...typography.headlineSm,
    color: colors.text.primary
  },
  closeButton: {
    padding: spacing.xs
  },
  bookingActions: {
    marginTop: spacing.xl
  },
  helperText: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    fontStyle: 'italic'
  }
})