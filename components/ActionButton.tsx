import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
  ViewStyle,
  TextStyle
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  // Animation type options
  animation?: 'chevron-sequence' | 'double-pulse' | 'none';
  // Icon options
  icon?: 'chevron' | 'plus' | 'none';
  // Optional styling
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onPress,
  animation = 'none',
  icon = 'chevron',
  style,
  textStyle,
  disabled = false
}) => {
  // Animation values
  const chevron1Opacity = useRef(new Animated.Value(0.2)).current;
  const chevron2Opacity = useRef(new Animated.Value(0.2)).current;
  const chevron3Opacity = useRef(new Animated.Value(0.2)).current;
  const chevron1Scale = useRef(new Animated.Value(1)).current;
  const chevron2Scale = useRef(new Animated.Value(1)).current;
  const chevron3Scale = useRef(new Animated.Value(1)).current;
  const iconScale = useRef(new Animated.Value(1)).current;

  // Setup animations when component mounts
  useEffect(() => {
    switch (animation) {
      case 'chevron-sequence':
        animateChevronSequence();
        break;
      case 'double-pulse':
        animateDoublePulse();
        break;
      default:
        // No animation
        break;
    }

    return () => {
      // Cleanup animations
      chevron1Opacity.stopAnimation();
      chevron2Opacity.stopAnimation();
      chevron3Opacity.stopAnimation();
      chevron1Scale.stopAnimation();
      chevron2Scale.stopAnimation();
      chevron3Scale.stopAnimation();
      iconScale.stopAnimation();
    };
  }, [animation]);

  // Animation for the chevron sequence (BEGIN SCAN button)
  const animateChevronSequence = () => {
    Animated.sequence([
      // First chevron lights up with pulse
      Animated.parallel([
        Animated.timing(chevron1Opacity, { 
          toValue: 1, 
          duration: 80, 
          useNativeDriver: true 
        }),
        Animated.sequence([
          // Scale up quickly
          Animated.timing(chevron1Scale, {
            toValue: 1.3,
            duration: 60,
            useNativeDriver: true
          }),
          // Scale back down
          Animated.timing(chevron1Scale, {
            toValue: 1,
            duration: 60,
            useNativeDriver: true
          })
        ])
      ]),
      // Shorter pause
      Animated.delay(10),
      
      // Second chevron lights up with pulse
      Animated.parallel([
        Animated.timing(chevron2Opacity, { 
          toValue: 1, 
          duration: 80, 
          useNativeDriver: true 
        }),
        Animated.sequence([
          // Scale up quickly
          Animated.timing(chevron2Scale, {
            toValue: 1.3,
            duration: 60,
            useNativeDriver: true
          }),
          // Scale back down
          Animated.timing(chevron2Scale, {
            toValue: 1,
            duration: 60,
            useNativeDriver: true
          })
        ])
      ]),
      // Shorter pause
      Animated.delay(10),
      
      // Third chevron lights up with pulse
      Animated.parallel([
        Animated.timing(chevron3Opacity, { 
          toValue: 1, 
          duration: 80, 
          useNativeDriver: true 
        }),
        Animated.sequence([
          // Scale up quickly
          Animated.timing(chevron3Scale, {
            toValue: 1.3,
            duration: 60,
            useNativeDriver: true
          }),
          // Scale back down
          Animated.timing(chevron3Scale, {
            toValue: 1,
            duration: 60,
            useNativeDriver: true
          })
        ])
      ]),
      // Longer pause when all are lit
      Animated.delay(1000),
      
      // All chevrons turn off at the same time
      Animated.parallel([
        // First chevron
        Animated.parallel([
          Animated.timing(chevron1Opacity, { 
            toValue: 0.2, 
            duration: 120, 
            useNativeDriver: true 
          }),
          Animated.sequence([
            // Scale down quickly
            Animated.timing(chevron1Scale, {
              toValue: 0.7,
              duration: 80,
              useNativeDriver: true
            }),
            // Scale back to normal
            Animated.timing(chevron1Scale, {
              toValue: 1,
              duration: 80,
              useNativeDriver: true
            })
          ])
        ]),
        
        // Second chevron
        Animated.parallel([
          Animated.timing(chevron2Opacity, { 
            toValue: 0.2, 
            duration: 120, 
            useNativeDriver: true 
          }),
          Animated.sequence([
            // Scale down quickly
            Animated.timing(chevron2Scale, {
              toValue: 0.7,
              duration: 80,
              useNativeDriver: true
            }),
            // Scale back to normal
            Animated.timing(chevron2Scale, {
              toValue: 1,
              duration: 80,
              useNativeDriver: true
            })
          ])
        ]),
        
        // Third chevron
        Animated.parallel([
          Animated.timing(chevron3Opacity, { 
            toValue: 0.2, 
            duration: 120, 
            useNativeDriver: true 
          }),
          Animated.sequence([
            // Scale down quickly
            Animated.timing(chevron3Scale, {
              toValue: 0.7,
              duration: 80,
              useNativeDriver: true
            }),
            // Scale back to normal
            Animated.timing(chevron3Scale, {
              toValue: 1,
              duration: 80,
              useNativeDriver: true
            })
          ])
        ])
      ]),
      
      // Longer pause before restarting
      Animated.delay(1000),
    ]).start(() => {
      animateChevronSequence();
    });
  };

  // Animation for double pulse (ADD PIECE button)
  const animateDoublePulse = () => {
    Animated.sequence([
      // First pulse
      Animated.sequence([
        // Scale up quickly
        Animated.timing(iconScale, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true
        }),
        // Scale back down
        Animated.timing(iconScale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true
        }),
      ]),
      
      // Short pause between pulses
      Animated.delay(100),
      
      // Second pulse
      Animated.sequence([
        // Scale up quickly
        Animated.timing(iconScale, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true
        }),
        // Scale back down
        Animated.timing(iconScale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true
        }),
      ]),
      
      // Longer pause before repeating
      Animated.delay(2000)
    ]).start(() => {
      animateDoublePulse();
    });
  };

  // Render icon based on type
  const renderIcon = () => {
    switch (icon) {
      case 'chevron':
        if (animation === 'chevron-sequence') {
          return (
            <View style={styles.chevronContainer}>
              <Animated.View style={[
                styles.chevronWrapper, 
                { 
                  opacity: chevron1Opacity,
                  transform: [{ scale: chevron1Scale }]
                }
              ]}>
                <Ionicons name="chevron-forward" size={24} color="black" />
              </Animated.View>
              <Animated.View style={[
                styles.chevronWrapper, 
                { 
                  opacity: chevron2Opacity,
                  transform: [{ scale: chevron2Scale }]
                }
              ]}>
                <Ionicons name="chevron-forward" size={24} color="black" />
              </Animated.View>
              <Animated.View style={[
                styles.chevronWrapper, 
                { 
                  opacity: chevron3Opacity,
                  transform: [{ scale: chevron3Scale }]
                }
              ]}>
                <Ionicons name="chevron-forward" size={24} color="black" />
              </Animated.View>
            </View>
          );
        } else {
          return (
            <Animated.View style={{ transform: [{ scale: iconScale }] }}>
              <Ionicons name="chevron-forward-outline" size={24} color="black" style={styles.icon} />
            </Animated.View>
          );
        }
      case 'plus':
        return (
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <Ionicons name="add-outline" size={24} color="black" style={styles.icon} />
          </Animated.View>
        );
      default:
        return null;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, textStyle]}>{label}</Text>
      {renderIcon()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF77',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
    position: 'relative',
  },
  buttonText: {
    color: 'black',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'RobotoMono-Regular',
    textAlign: 'center',
  },
  icon: {
    marginLeft: 8,
  },
  chevronContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 24,
  },
  chevronWrapper: {
    marginLeft: -17, // Negative margin for overlap
  },
});

export default ActionButton; 