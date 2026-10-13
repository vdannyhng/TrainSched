import { useEffect, useRef, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  /** Wird true → ans Ende scrollen (z. B. Konfliktwarnung unter dem Speichern-Knopf) */
  scrollToEnd?: boolean;
};

const MAX_CONTENT_WIDTH = 640;

export function Screen({
  children,
  scroll = false,
  edges = ['top', 'bottom', 'left', 'right'],
  scrollToEnd = false,
}: Props) {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (scrollToEnd) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [scrollToEnd]);
  const content = <View style={styles.content}>{children}</View>;

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
});
