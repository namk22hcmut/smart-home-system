import React, { useState, useRef } from 'react';
import {
  View,
  PanResponder,
  Animated,
  Text,
  StyleSheet,
} from 'react-native';

const CustomSlider = ({ min = 0, max = 100, value = 0, onChange, style }) => {
  const [sliderValue, setSliderValue] = useState(value);
  const pan = useRef(new Animated.ValueXY()).current;
  const sliderWidth = useRef(300);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (event, { dx }) => {
        const newValue = Math.max(
          min,
          Math.min(max, Math.round((dx / sliderWidth.current) * (max - min) + min))
        );
        setSliderValue(newValue);
        onChange?.(newValue);
      },
    })
  ).current;

  const percentage = ((sliderValue - min) / (max - min)) * 100;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.sliderContainer}>
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
      <Text style={styles.value}>{sliderValue}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  sliderContainer: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    width: '100%',
  },
  fill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    position: 'absolute',
    top: 10,
  },
  value: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

export default CustomSlider;
