import { Linking, StyleSheet, View } from 'react-native';

import { parseMarkdownLight, type Inline } from '@/lib/markdown';
import { spacing } from '@/theme/tokens';

import { AppText } from './AppText';

function renderInline(nodes: Inline[], keyPrefix: string): React.ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (node.type) {
      case 'text':
        return node.text;
      case 'bold':
        return (
          <AppText key={key} variant="bodyStrong">
            {renderInline(node.children, key)}
          </AppText>
        );
      case 'italic':
        return (
          <AppText key={key} style={styles.italic}>
            {renderInline(node.children, key)}
          </AppText>
        );
      case 'link':
        return (
          <AppText
            key={key}
            tone="primary"
            accessibilityRole="link"
            style={styles.link}
            onPress={() => void Linking.openURL(node.url).catch(() => undefined)}
          >
            {node.text}
          </AppText>
        );
    }
  });
}

/** Rendert „Markdown light“ (fett, kursiv, Listen, Links) als native Texte. */
export function MarkdownText({ text, numberOfLines }: { text: string; numberOfLines?: number }) {
  const blocks = parseMarkdownLight(text);
  // Vorschau mit Zeilenbegrenzung: nur den ersten Block kompakt anzeigen
  if (numberOfLines) {
    const first = blocks[0];
    if (!first) return null;
    const inline = first.type === 'paragraph' ? first.children : (first.items[0] ?? []);
    return (
      <AppText numberOfLines={numberOfLines} selectable>
        {first.type === 'list' ? '• ' : ''}
        {renderInline(inline, 'p')}
      </AppText>
    );
  }
  return (
    <View style={styles.container}>
      {blocks.map((block, b) =>
        block.type === 'paragraph' ? (
          <AppText key={b} selectable>
            {renderInline(block.children, `p${b}`)}
          </AppText>
        ) : (
          <View key={b} style={styles.list}>
            {block.items.map((item, i) => (
              <View key={i} style={styles.item}>
                <AppText accessibilityElementsHidden importantForAccessibility="no">
                  {block.ordered ? `${i + 1}.` : '•'}
                </AppText>
                <AppText selectable style={styles.flex}>
                  {renderInline(item, `l${b}-${i}`)}
                </AppText>
              </View>
            ))}
          </View>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  list: { gap: 2 },
  item: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  italic: { fontStyle: 'italic' },
  link: { textDecorationLine: 'underline' },
});
