import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  Dimensions, 
  Platform,
  Modal,
  Pressable
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { TOUR_SLIDES, MARKETING_COPY } from '@scheduleit/core';

const { width, height } = Dimensions.get('window');

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [showTour, setShowTour] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const logoY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    logoY.value = withRepeat(
      withTiming(-15, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    opacity.value = withTiming(1, { duration: 1000 });
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: logoY.value }],
  }));

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const nextSlide = () => {
    if (currentSlide < TOUR_SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      setShowTour(false);
      setCurrentSlide(0);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.background}
      />
      
      <Animated.View style={[styles.content, fadeStyle]}>
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <View style={styles.logoCircle}>
             <Image 
              source={require('../../assets/icon.png')} 
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
        </Animated.View>

        <View style={styles.textSection}>
          <Text style={styles.title}>{MARKETING_COPY.hero.title}</Text>
          <Text style={styles.tagline}>{MARKETING_COPY.footer.tagline}</Text>
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity 
            style={styles.googleButton} 
            onPress={onLogin}
            activeOpacity={0.8}
          >
            <View style={styles.googleIconContainer}>
               <Ionicons name="logo-google" size={20} color="#fff" />
            </View>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tourButton} 
            onPress={() => setShowTour(true)}
          >
            <Text style={styles.tourButtonText}>Take a quick tour</Text>
            <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms & Privacy Policy.
          </Text>
        </View>
      </Animated.View>

      <Modal
        visible={showTour}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTour(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#2a2a4e', '#1a1a2e']}
              style={styles.modalGradient}
            />
            
            <View style={styles.slideHeader}>
              <View style={[styles.iconBox, { backgroundColor: `${TOUR_SLIDES[currentSlide].color}20` }]}>
                <Ionicons name={TOUR_SLIDES[currentSlide].icon as any} size={40} color={TOUR_SLIDES[currentSlide].color} />
              </View>
              <Text style={styles.slideTitle}>{TOUR_SLIDES[currentSlide].title}</Text>
              <Text style={styles.slideDesc}>{TOUR_SLIDES[currentSlide].description}</Text>
            </View>

            <View style={styles.slideFooter}>
              <View style={styles.pagination}>
                {TOUR_SLIDES.map((_, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.dot, 
                      i === currentSlide && styles.activeDot,
                      { backgroundColor: i === currentSlide ? TOUR_SLIDES[currentSlide].color : 'rgba(255,255,255,0.2)' }
                    ]} 
                  />
                ))}
              </View>

              <TouchableOpacity style={[styles.nextButton, { backgroundColor: TOUR_SLIDES[currentSlide].color }]} onPress={nextSlide}>
                <Text style={styles.nextButtonText}>
                  {currentSlide === TOUR_SLIDES.length - 1 ? "Got it!" : "Next"}
                </Text>
              </TouchableOpacity>

              <Pressable onPress={() => setShowTour(false)}>
                <Text style={styles.skipText}>Skip tour</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 30,
    paddingTop: height * 0.1,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(164, 140, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(164, 140, 255, 0.3)',
    overflow: 'hidden',
  },
  logo: {
    width: 140,
    height: 140,
  },
  textSection: {
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#4285F4',
    width: '100%',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  googleIconContainer: {
    marginRight: 12,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  tourButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    padding: 10,
    gap: 8,
  },
  tourButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 32,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    height: 480,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  slideHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  slideDesc: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  slideFooter: {
    padding: 40,
    paddingTop: 0,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 20,
  },
  nextButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  skipText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '600',
  }
});
