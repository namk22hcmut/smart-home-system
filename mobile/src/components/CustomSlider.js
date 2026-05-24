import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  PanResponder,
  Animated,
  Text,
  StyleSheet,
} from 'react-native';
import { theme } from '../styles/theme';

const CustomSlider = ({ min = 0, max = 100, value = 0, onChange, style, thumbSize = 28, containerHeight = 48 }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const sliderLayout = useRef({ width: 0 });
  const animatedValue = useRef(new Animated.Value(value));
  const pendingValue = useRef(value);
  const dragStartValue = useRef(value);

  // Sync external value changes
  useEffect(() => {
    setDisplayValue(value);
    animatedValue.current.setValue(value);
  }, [value]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartValue.current = pendingValue.current;
      },
      onPanResponderMove: (event, { dx }) => {
        // Calculate new position smoothly
        if (sliderLayout.current.width > 0) {
          const valuePerPixel = (max - min) / sliderLayout.current.width;
          const newValue = dragStartValue.current + dx * valuePerPixel;
          const clampedValue = Math.max(min, Math.min(max, newValue));
          
          // Update animated value directly (smooth, non-blocking)
          animatedValue.current.setValue(clampedValue);
          
          // Update display value (rounded)
          const roundedValue = Math.round(clampedValue);
          setDisplayValue(roundedValue);
          pendingValue.current = roundedValue;
        }
      },
      onPanResponderRelease: () => {
        onChange?.(pendingValue.current);
      },
      onPanResponderTerminate: () => {
        onChange?.(pendingValue.current);
      },
    })
  ).current;

  const handleLayout = (e) => {
    sliderLayout.current.width = e.nativeEvent.layout.width;
  };

  // Use animated value for smooth tracking
  const animatedPercentage = animatedValue.current.interpolate({
    inputRange: [min, max],
    outputRange: ['0%', '100%'],
  });

  const thumbHalf = Math.round(thumbSize / 2);
  const thumbStyle = {
    width: thumbSize,
    height: thumbSize,
    borderRadius: thumbHalf,
    top: (containerHeight - thumbSize) / 2,
  };

  return (
    <View style={[styles.container, { height: containerHeight }, style]}>
      <View style={[styles.sliderContainer, { height: containerHeight }]} onLayout={handleLayout} {...panResponder.panHandlers}>
        <View style={[styles.track, { height: Math.max(4, Math.round(containerHeight / 8)) }]}>
          <Animated.View
            style={[
              styles.fill,
              {
                width: animatedPercentage,
                height: '100%',
              },
            ]}
          />
        </View>
        <Animated.View
          style={[
            styles.thumb,
            thumbStyle,
            {
              left: animatedPercentage,
              marginLeft: -thumbHalf,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },
  sliderContainer: {
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    backgroundColor: theme.colors.gray1,
    borderRadius: 8,
    width: '100%',
  },
  fill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 8,
  },
  thumb: {
    position: 'absolute',
    backgroundColor: theme.colors.accent,
  },
  value: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.gray1,
    fontWeight: '500',
  },
});

export default CustomSlider;
