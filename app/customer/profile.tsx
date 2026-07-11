import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, typography, spacing, radius, shadows } from '@/constants/theme'
import { useAuth } from '@/hooks/useAuth'

export default function ProfileScreen() {
  const { userProfile, signOut } = useAuth()

  const handleSettingPress = (setting: string) => {
    // TODO: Navigate to setting screens
    console.log('Setting pressed:', setting)
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const settings = [
    { id: 'personal', icon: 'person-outline', title: 'Personal Information', subtitle: 'Update your details' },
    { id: 'addresses', icon: 'location-outline', title: 'Saved Addresses', subtitle: 'Manage your locations' },
    { id: 'payments', icon: 'card-outline', title: 'Payment Methods', subtitle: 'Cards and billing' },
    { id: 'notifications', icon: 'notifications-outline', title: 'Notifications', subtitle: 'App preferences' },
    { id: 'security', icon: 'shield-outline', title: 'Security & Privacy', subtitle: 'Account protection' },
    { id: 'support', icon: 'help-circle-outline', title: 'Help & Support', subtitle: 'Get assistance' },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userProfile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.editAvatarButton}
              onPress={() => handleSettingPress('avatar')}
              accessibilityLabel="Edit profile picture"
            >
              <Ionicons name="camera" size={16} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>
            {userProfile?.full_name || 'Guest User'}
          </Text>
          <Text style={styles.userPhone}>
            {userProfile?.phone || '+234 XXX XXX XXXX'}
          </Text>
        </View>

        {/* Settings List */}
        <View style={styles.settingsContainer}>
          {settings.map((setting) => (
            <TouchableOpacity
              key={setting.id}
              style={styles.settingItem}
              onPress={() => handleSettingPress(setting.id)}
              accessibilityLabel={setting.title}
              accessibilityHint={setting.subtitle}
            >
              <View style={styles.settingIcon}>
                <Ionicons 
                  name={setting.icon as any} 
                  size={24} 
                  color={colors.primary} 
                />
              </View>
              
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{setting.title}</Text>
                <Text style={styles.settingSubtitle}>{setting.subtitle}</Text>
              </View>
              
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={colors.text.secondary} 
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View style={styles.appInfoSection}>
          <Text style={styles.appVersion}>UrbanFix v1.0.0</Text>
          <TouchableOpacity onPress={() => handleSettingPress('terms')}>
            <Text style={styles.appLink}>Terms & Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityLabel="Sign out of account"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.level2,
  },
  avatarText: {
    ...typography.headlineMd,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  userName: {
    ...typography.headlineMd,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  userPhone: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  settingsContainer: {
    paddingHorizontal: spacing.md,
    gap: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.level1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  settingIcon: {
    width: 40,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...typography.bodyLg,
    color: colors.text.primary,
    marginBottom: 2,
  },
  settingSubtitle: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  appInfoSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  appVersion: {
    ...typography.bodyMd,
    color: colors.text.secondary,
  },
  appLink: {
    ...typography.bodyMd,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.error,
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  logoutText: {
    ...typography.buttonText,
    color: colors.error,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
})
