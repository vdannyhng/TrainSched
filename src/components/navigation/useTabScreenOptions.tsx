import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabNavigationOptions } from 'expo-router/tabs';
import type { ComponentProps } from 'react';

import { fontFamily } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type TabIconName = ComponentProps<typeof Ionicons>['name'];

export function tabIcon(name: TabIconName): BottomTabNavigationOptions['tabBarIcon'] {
  return function TabIcon({ color, size }) {
    return <Ionicons name={name} color={color} size={size} />;
  };
}

export function useTabScreenOptions(): BottomTabNavigationOptions {
  const { colors } = useTheme();
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
    tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: 12 },
  };
}
