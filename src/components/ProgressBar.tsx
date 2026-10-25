import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useApp } from '../store/AppContext';
import { heatColors } from '../theme';

interface Props {
  percent: number;
  heatClass?: string;
  isIncome?: boolean;
  height?: number;
}

export default function ProgressBar({ percent, heatClass, isIncome, height = 10 }: Props) {
  const { theme } = useApp();
  const width = Math.min(percent, 100);
  let color = theme?.palette?.primary ?? '#3b82f6';
  if (isIncome) color = theme?.colors?.income ?? '#10b981';
  else if (heatClass && heatColors[heatClass]) color = heatColors[heatClass];

  return (
    <View style={[styles.track, { height, backgroundColor: theme?.colors?.borderLight ?? '#f1f5f9' }]}>
      <View style={[styles.fill, { width: `${width}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 30,
  },
});
