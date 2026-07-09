// Technician messages list screen
// Displays all active customer conversations

import React from 'react'
import { View, Text, StyleSheet, SafeAreaView } from 'react-native'
import { colors, spacing, typography } from '@/constants/theme'

export default function TechnicianMessagesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Customer conversations</Text>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>💬 Messaging coming soon</Text>
          <Text style={styles.placeholderSubtext}>
            {'• Chat with customers\n• Share repair updates\n• Send photos and videos'}
          </Text>
        </View>
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
  },
  title: {
    ...typography.headlineMd,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  placeholder: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    width: '100%',
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
