// Part Request Notifications Component
// Shows notification badge and list of notifications
// Requirements: 25.5

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '@/constants/theme'
import { PartRequestService } from '@/lib/services/part-request-service'
import type { PartRequestNotificationDB } from '@/types/parts-request.types'

interface PartRequestNotificationsProps {
  userId: string
  onNotificationPress?: (notification: PartRequestNotificationDB) => void
  onClose?: () => void
}

export function PartRequestNotifications({
  userId,
  onNotificationPress,
  onClose
}: PartRequestNotificationsProps) {
  const [notifications, setNotifications] = useState<PartRequestNotificationDB[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
    
    // Subscribe to real-time updates
    const unsubscribe = PartRequestService.subscribeToNotifications(
      userId,
      (newNotification) => {
        setNotifications(prev => [newNotification, ...prev])
      }
    )

    return () => {
      unsubscribe()
    }
  }, [userId])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const result = await PartRequestService.getNotifications(userId, false)

      if (result.success && result.data) {
        setNotifications(result.data)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationPress = async (notification: PartRequestNotificationDB) => {
    // Mark as read
    if (!notification.read) {
      await PartRequestService.markNotificationRead(notification.id)
      setNotifications(prev =>
        prev.map(n => (n.id === notification.id ? { ...n, read: true } : n))
      )
    }

    onNotificationPress?.(notification)
  }

  const handleMarkAllRead = async () => {
    const result = await PartRequestService.markAllNotificationsRead(userId)
    if (result.success) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric'
    })
  }

  const renderNotification = ({ item }: { item: PartRequestNotificationDB }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.notificationUnread]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.iconContainer,
        { backgroundColor: item.type === 'approved' ? theme.colors.success + '20' : theme.colors.warning + '20' }
      ]}>
        <Ionicons
          name={item.type === 'approved' ? 'checkmark-circle' : 'information-circle'}
          size={24}
          color={item.type === 'approved' ? theme.colors.success : theme.colors.warning}
        />
      </View>
      
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.notificationTime}>{formatDate(item.created_at)}</Text>
      </View>

      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-off-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyText}>
        You'll see notifications here when your part requests are reviewed
      </Text>
    </View>
  )

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  )
}

/**
 * Notification Badge Component
 * Shows unread count badge
 */
interface NotificationBadgeProps {
  userId: string
  onPress?: () => void
}

export function NotificationBadge({ userId, onPress }: NotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    loadUnreadCount()

    // Subscribe to real-time updates
    const unsubscribe = PartRequestService.subscribeToNotifications(
      userId,
      () => {
        loadUnreadCount()
      }
    )

    return () => {
      unsubscribe()
    }
  }, [userId])

  const loadUnreadCount = async () => {
    const result = await PartRequestService.getUnreadNotificationCount(userId)
    if (result.success && typeof result.data === 'number') {
      setUnreadCount(result.data)
    }
  }

  return (
    <TouchableOpacity onPress={onPress} style={styles.badgeButton}>
      <Ionicons name="notifications-outline" size={28} color={theme.colors.text} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 12
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: '#fff'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  markAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500'
  },
  closeButton: {
    padding: 4
  },
  listContent: {
    padding: 16,
    flexGrow: 1
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  notificationUnread: {
    borderColor: theme.colors.primary,
    borderWidth: 2
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  notificationContent: {
    flex: 1
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4
  },
  notificationBody: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 6,
    lineHeight: 18
  },
  notificationTime: {
    fontSize: 12,
    color: theme.colors.textSecondary
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginLeft: 8
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20
  },
  badgeButton: {
    position: 'relative',
    marginRight: 8
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff'
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff'
  }
})
