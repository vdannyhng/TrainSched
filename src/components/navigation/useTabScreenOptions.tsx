import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabNavigationOptions } from 'expo-router/tabs';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontFamily } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export type TabIconName = ComponentProps<typeof Ionicons>['name'];

export function tabIcon(name: TabIconName): BottomTabNavigationOptions['tabBarIcon'] {
  return function TabIcon({ color, size }) {
    return <Ionicons name={name} color={color} size={size} />;
  };
}

/** Höhe der Tab-Leiste im Web ohne Safe-Area: Icon 24 + Beschriftung 16 + Innenabstand des Tabs 10 + Luft. */
export const WEB_TAB_BAR_HEIGHT = 56;

export function useTabScreenOptions(): BottomTabNavigationOptions {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      // Web: Standardhöhe (49) ist für Be Vietnam Pro zu knapp – Beschriftung wurde abgeschnitten.
      // Unten Platz für den Home-Balken, wenn die Seite als Home-Bildschirm-App läuft.
      ...(Platform.OS === 'web'
        ? { height: WEB_TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }
        : null),
    },
    // Feste Zeilenhöhe und nicht schrumpfen: Unterlängen (g, p) und vietnamesische Diakritika bleiben sichtbar
    tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16, flexShrink: 0 },
  };
}
