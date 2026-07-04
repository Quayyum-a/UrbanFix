import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { colors, typography, spacing } from '@/constants/theme'

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: number
  showRating?: boolean
  style?: ViewStyle
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 16,
  showRating = true,
  style,
}: StarRatingProps) {
  const stars = []
  
  for (let i = 1; i <= maxRating; i++) {
    const filled = i <= rating
    const halfFilled = i - 0.5 <= rating && i > rating
    
    stars.push(
      <Text
        key={i}
        style={[
          styles.star,
          { fontSize: size },
          filled && styles.filledStar,
          halfFilled && styles.halfFilledStar,
        ]}
      >
        ★
      </Text>
    )
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.stars}>
        {stars}
      </View>
      {showRating && (
        <Text style={styles.ratingText}>
          {rating.toFixed(1)}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  stars: {
    flexDirection: 'row',
  },
  
  star: {
    color: colors.outline,
    marginRight: 1,
  },
  
  filledStar: {
    color: colors.warning,
  },
  
  halfFilledStar: {
    color: colors.warning,
  },
  
  ratingText: {
    ...typography.bodyMd,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
})