// Splash screen with UrbanFix branding
// Entry point that shows for 5 seconds before transitioning to login

import React, { useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Image
} from 'react-native'
import { useRouter } from 'expo-router'

const { width, height } = Dimensions.get('window')

export default function SplashScreen() {
  const router = useRouter()
  const fadeOut = useRef(new Animated.Value(1)).current

  useEffect(() => {
    console.log('Splash screen mounted')
    
    // Start fade-out transition after 5 seconds
    const transitionTimer = setTimeout(() => {
      console.log('Starting fade-out animation')
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Navigate to login screen after animation completes
        console.log('Navigating to login screen')
        router.replace('/auth/login')
      })
    }, 5000) // 5 seconds display time

    // Cleanup timer on unmount
    return () => {
      console.log('Splash screen unmounted')
      clearTimeout(transitionTimer)
    }
  }, [router, fadeOut])

  return (
    <>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#031636"
        translucent={false}
      />
      <Animated.View 
        testID="splash-screen-container"
        style={[
          styles.container,
          {
            opacity: fadeOut
          }
        ]}
      >
        <Image
          source={require('@/assets/splash.png')}
          style={styles.splashImage}
          resizeMode="cover"
        />
      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#031636', // Deep Trust Blue
  },
  splashImage: {
    width: width,
    height: height,
  },
})