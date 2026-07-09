// Technician profile screen
// Displays and allows editing of technician profile information

import React from 'react'
import { View, Text, StyleSheet, SafeAreaView } from 'react-native'
import { colors, spacing, typography } from '@/constants/theme'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'

export default function TechnicianProfileScreen() {
  const { signOut, userProfile } = useAuth()

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>
        {userProfile?.full_name && (
          <Text style={styles.name}>{userProfile.full_name}</Text>
        )}

        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>👤 Profile settings coming soon</Text>
          <Text style={styles.placeholderSubtext}>
            {'• Edit personal information\n• Manage verification documents\n• Update bank details\n• View earnings history'}
          </Text>
        </View>

        <Button
          title="Sign Out"
          variant="danger"
          size="medium"
          onPress={signOut}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.headlineMd,
    color: colors.text.primary,
    textAlign: 'center',
  },
  name: {
    ...typography.bodyLg,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  placeholder: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    width: '100%',
    marginVertical: spacing.sm,
  },
  placeholderText: {
    ...typography.headlineSm,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  placeholderSubtext: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
})
