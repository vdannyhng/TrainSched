import Ionicons from '@expo/vector-icons/Ionicons';
import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/** Offline: kleiner Hinweis oben – angezeigt werden die zuletzt geladenen Daten. */
export function OfflineBanner() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const online = useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
  );
  if (online) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.wrap, { top: insets.top + spacing.xs }]}
    >
      <View style={[styles.banner, { backgroundColor: colors.text }]}>
        <Ionicons
          name="cloud-offline-outline"
          size={16}
          color={colors.background}
          accessibilityElementsHidden
        />
        <AppText variant="caption" style={{ color: colors.background }}>
          {t('offline.banner')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
});
