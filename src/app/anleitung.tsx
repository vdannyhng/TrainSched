import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, MarkdownText, Screen, Segmented } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { GUIDE, type GuideRole, type GuideSection } from '@/features/help/guide';
import { isAppLocale, SUPPORTED_LOCALES, type AppLocale } from '@/i18n';
import { MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * Anleitung für Lehrkräfte und Schüler – öffentlich unter /anleitung (auch vor dem Login).
 * Sprache folgt der App, lässt sich hier aber umschalten (z. B. Deutsch für Lehrerin, Vietnamesisch für Schüler).
 * Angemeldete sehen zuerst den Teil für ihre Rolle; `?rolle=schueler|lehrer` wählt ihn per Link.
 */
export default function GuideScreen() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ rolle?: string }>();

  const initialRole: GuideRole =
    params.rolle === 'schueler'
      ? 'student'
      : params.rolle === 'lehrer'
        ? 'teacher'
        : profile?.role === 'student'
          ? 'student'
          : 'teacher';
  const [role, setRole] = useState<GuideRole>(initialRole);
  const [locale, setLocale] = useState<AppLocale>(isAppLocale(i18n.language) ? i18n.language : 'de');
  const [open, setOpen] = useState<number | null>(0);

  const guide = GUIDE[locale];
  const part = guide.parts[role];

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <Segmented
        label={t('account.language')}
        value={locale}
        onChange={setLocale}
        options={SUPPORTED_LOCALES.map((l) => ({ value: l, label: t(`account.languages.${l}`) }))}
      />
      <Segmented
        label={guide.roleLabel}
        value={role}
        onChange={(r) => {
          setRole(r);
          setOpen(0);
        }}
        options={(['teacher', 'student'] as const).map((r) => ({ value: r, label: guide.parts[r].title }))}
      />

      <AppText>{guide.intro}</AppText>
      <AppText tone="muted">{part.intro}</AppText>

      <View style={styles.sections}>
        {part.sections.map((section, i) => (
          <GuideItem
            key={`${locale}-${role}-${i}`}
            index={i + 1}
            section={section}
            expanded={open === i}
            onToggle={() => setOpen(open === i ? null : i)}
          />
        ))}
      </View>
    </Screen>
  );
}

function GuideItem({
  index,
  section,
  expanded,
  onToggle,
}: {
  index: number;
  section: GuideSection;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={styles.header}
      >
        <AppText variant="bodyStrong" tone="primary" style={styles.index}>
          {index}
        </AppText>
        <AppText variant="bodyStrong" style={styles.flex}>
          {section.title}
        </AppText>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textMuted}
          accessibilityElementsHidden
        />
      </Pressable>
      {expanded ? (
        <View style={styles.body}>
          <MarkdownText text={section.body} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sections: { gap: spacing.sm },
  item: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: MIN_TOUCH + 8,
  },
  index: { minWidth: 22 },
  flex: { flex: 1 },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
});
