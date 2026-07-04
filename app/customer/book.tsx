import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, typography, spacing, radius, shadows } from '@/constants/theme'

export default function BookScreen() {
  const handleCategoryPress = (category: string) => {
    // TODO: Navigate to booking flow with category
    console.log('Book repair for:', category)
  }

  const categories = [
    { id: 'smartphone', icon: '📱', title: 'Phone Repair', subtitle: 'Screen, battery, camera' },
    { id: 'laptop', icon: '💻', title: 'Laptop Repair', subtitle: 'Hardware, software, upgrades' },
    { id: 'tablet', icon: '📑', title: 'Tablet Repair', subtitle: 'Screen, charging, performance' },
    { id: 'desktop', icon: '🖥️', title: 'Desktop Repair', subtitle: 'Components, troubleshooting' },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Book a Repair</Text>
          <Text style={styles.subtitle}>Select your device type to get started</Text>
        </View>

        <View style={styles.categoriesContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => handleCategoryPress(category.id)}
              activeOpacity={0.7}
              accessibilityLabel={`Book ${category.title}`}
              accessibilityHint={`Tap to start booking a ${category.title.toLowerCase()}`}
            >
              <View style={styles.categoryIcon}>
                <Text style={styles.categoryEmoji}>{category.icon}</Text>
              </View>
              
              <View style={styles.categoryContent}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categorySubtitle}>{category.subtitle}</Text>
              </View>
              
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={colors.text.secondary} 
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.emergencySection}>
          <TouchableOpacity 
            style={styles.emergencyButton}
            onPress={() => handleCategoryPress('emergency')}
            accessibilityLabel="Emergency repair request"
          >
            <Ionicons name="flash" size={24} color={colors.onSecondary} />
            <Text style={styles.emergencyText}>Emergency Repair</Text>
            <Text style={styles.emergencySubtext}>Urgent device issues</Text>
          </TouchableOpacity>
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
    paddingHorizontal: spacing.md,
  },
  header: {
    paddingVertical: spacing.lg,
  },
  title: {
    ...typography.headlineMd,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.text.secondary,
  },
  categoriesContainer: {
    flex: 1,
    gap: spacing.md,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.level1,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    ...typography.headlineSm,
    color: colors.text.primary,
    marginBottom: 2,
  },
  categorySubtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  emergencySection: {
    paddingVertical: spacing.lg,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.level2,
  },
  emergencyText: {
    ...typography.headlineSm,
    color: colors.onSecondary,
    flex: 1,
  },
  emergencySubtext: {
    ...typography.bodyMd,
    color: colors.onSecondary,
    opacity: 0.9,
  },
})