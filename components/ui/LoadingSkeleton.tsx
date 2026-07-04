import React, { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet, ViewStyle } from 'react-native'
import { colors, radius } from '@/constants/theme'

interface LoadingSkeletonProps {
  width?: number | string
  height?: number
  borderRadius?: number
  style?: ViewStyle
}

export function LoadingSkeleton({
  width = '100%',
  height = 20,
  borderRadius = radius.sm,
  style,
}: LoadingSkeletonProps) {
  const animatedValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    )
    
    animation.start()
    
    return () => animation.stop()
  }, [animatedValue])

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surfaceContainer, colors.surfaceContainerHigh],
  })

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  )
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <LoadingSkeleton width={40} height={40} borderRadius={radius.full} />
        <View style={styles.cardHeaderText}>
          <LoadingSkeleton width="60%" height={16} />
          <LoadingSkeleton width="40%" height={12} style={styles.marginTop} />
        </View>
      </View>
      <LoadingSkeleton width="80%" height={14} style={styles.marginTop} />
      <LoadingSkeleton width="100%" height={12} style={styles.marginTop} />
    </View>
  )
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.surfaceContainer,
  },
  
  card: {
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: 12,
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  
  marginTop: {
    marginTop: 8,
  },
})