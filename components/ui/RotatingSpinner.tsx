import React, { useEffect, useRef } from "react";
import { Animated, Easing, ViewStyle } from "react-native";

interface RotatingSpinnerProps {
  size?: number;
  children: React.ReactNode;
  style?: ViewStyle;
  isAnimating?: boolean;
}

const RotatingSpinner = ({
  children,
  size = 24,
  style,
  isAnimating = true,
}: RotatingSpinnerProps) => {
  const rotateValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isAnimating) {
      // Stop any existing animation
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }

      // Reset to 0
      rotateValue.setValue(0);

      // Use a small delay to ensure the reset takes effect
      const startAnimation = () => {
        animationRef.current = Animated.loop(
          Animated.timing(rotateValue, {
            toValue: 1,
            duration: 1000,
            easing: Easing.linear,
            useNativeDriver: false, // Set to false for rotate to work reliably on all platforms
          })
        );

        animationRef.current.start();
      };

      // Start immediately
      startAnimation();
    } else {
      // Stop animation
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
      rotateValue.setValue(0);
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [isAnimating, rotateValue]);

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          justifyContent: "center",
          alignItems: "center",
          transform: [{ rotate }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default RotatingSpinner;
export { RotatingSpinner };
