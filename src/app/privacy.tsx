import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, MarkdownText, Screen } from '@/components/ui';
import { isAppLocale } from '@/i18n';
import { POLICY } from '@/features/privacy/policy';
import { spacing } from '@/theme/tokens';

/** Datenschutzerklärung – öffentlich erreichbar (Login, Einwilligung, Konto). */
export default function PrivacyScreen() {
  const { t, i18n } = useTranslation();
  const policy = POLICY[isAppLocale(i18n.language) ? i18n.language : 'de'];

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <AppText tone="muted">{t('privacy.version', { version: policy.version })}</AppText>
      <AppText>{policy.intro}</AppText>
      {policy.sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <AppText variant="heading" accessibilityRole="header">
            {section.title}
          </AppText>
          <MarkdownText text={section.body} />
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
});
