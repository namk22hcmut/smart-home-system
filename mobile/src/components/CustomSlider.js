import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  PanResponder,
  Animated,
  Text,
  StyleSheet,
} from 'react-native';
import { theme } from '../styles/theme';

const CustomSlider = ({ min = 0, max = 100, value = 0, onChange, style }) => {
  const [sliderValue, setSliderValue] = useState(value);
  const sliderLayout = useRef({ width: 0, x: 0 });
  const panStartValue = useRef(0);

  // Sync external value changes
  useEffect(() => {
    setSliderValue(value);
  }, [value]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event, { dx }) => {
        panStartValue.current = sliderValue;
      },
      onPanResponderMove: (event, { dx }) => {
        if (sliderLayout.current.width > 0) {
          const ratio = dx / sliderLayout.current.width;
          const newValue = Math.max(
            min,
            Math.min(max, Math.round(panStartValue.current + ratio * (max - min)))
          );
          setSliderValue(newValue);
          onChange?.(newValue);
        }
      },
    })
  ).current;

  const handleLayout = (e) => {
    sliderLayout.current = {
      width: e.nativeEvent.layout.width,
      x: e.nativeEvent.layout.x,
    };
  };

  const percentage = ((sliderValue - min) / (max - min)) * 100;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.sliderContainer} onLayout={handleLayout}>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${percentage}%`,
              },
            ]}
          />
        </View>
        <View
          style={[
            styles.thumb,
            {
              left: `${percentage}%`,
              marginLeft: -10,
            },
          ]}
          {...panResponder.panHandlers}
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
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 4,
    backgroundColor: theme.colors.gray1,
    borderRadius: 2,
    width: '100%',
  },
  fill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.accent,
    position: 'absolute',
    top: 10,
  },
  value: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.gray1,
    fontWeight: '500',
  },
});

export default CustomSlider;
