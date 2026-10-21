import { DateTime } from 'luxon';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, Chip, ErrorState, LoadingState, Segmented } from '@/components/ui';
import { LEVEL_COLORS } from '@/lib/colors';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { useStudentProgress } from '../api';
import {
  formatHours,
  formatPercent,
  levelSteps,
  type ProgressPeriod,
  type StudentProgress,
} from '../progress';

const MAX_TOPICS = 8;

type Props = {
  studentId: string | undefined;
  /** Lehrkraft sieht zusätzlich den Hinweis auf noch nicht markierte Termine */
  forTeacher?: boolean;
};

/** Lernfortschritt: Kennzahlen, Level-Verlauf, behandelte Themen. */
export function ProgressCard({ studentId, forTeacher }: Props) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<ProgressPeriod>('3m');
  const progress = useStudentProgress(studentId, period);

  return (
    <Card title={t('progress.title')}>
      <Segmented
        value={period}
        onChange={setPeriod}
        options={[
          { value: '3m', label: t('progress.period.3m') },
          { value: '12m', label: t('progress.period.12m') },
          { value: 'all', label: t('progress.period.all') },
        ]}
      />
      {progress.isPending ? (
        <LoadingState />
      ) : progress.isError ? (
        <ErrorState message={t('errors.loadFailed')} onRetry={() => void progress.refetch()} />
      ) : (
        <ProgressBody data={progress.data} forTeacher={!!forTeacher} />
      )}
    </Card>
  );
}

function ProgressBody({ data, forTeacher }: { data: StudentProgress; forTeacher: boolean }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const counted = data.present + data.absent + data.excused;
  const steps = levelSteps(data.levels);
  const notMarked = data.unmarked + data.open_past;

  return (
    <View style={styles.body}>
      {data.held + data.cancelled === 0 ? (
        <AppText tone="muted">{t('progress.empty')}</AppText>
      ) : (
        <View style={styles.tiles}>
          <StatTile
            label={t('progress.hours')}
            value={formatHours(data.minutes_present, locale)}
            sub={t('progress.lessonsAttended', { count: data.present })}
          />
          <StatTile
            label={t('progress.attendance')}
            value={formatPercent(data.attendance_rate, locale)}
            sub={
              counted
                ? t('progress.attendanceDetail', {
                    present: data.present,
                    absent: data.absent,
                    excused: data.excused,
                  })
                : '–'
            }
          />
          <StatTile
            label={t('progress.cancellations')}
            value={formatPercent(data.cancel_rate, locale)}
            sub={
              data.cancelled
                ? t('progress.cancellationsDetail', {
                    count: data.cancelled,
                    student: data.cancelled_by_student,
                    late: data.cancelled_late,
                  })
                : t('progress.noCancellations')
            }
          />
        </View>
      )}

      {forTeacher && notMarked > 0 ? (
        <AppText variant="caption" tone="danger">
          {t('progress.notMarked', { count: notMarked })}
        </AppText>
      ) : null}

      <View style={styles.section}>
        <AppText variant="label">{t('progress.levels')}</AppText>
        {steps.length === 0 ? (
          <AppText tone="muted">–</AppText>
        ) : (
          <View style={styles.levelRow} accessibilityRole="list">
            {steps.map((step, i) => (
              <View key={`${step.level}-${step.since}`} style={styles.levelStep}>
                {i > 0 ? (
                  <AppText tone="muted" accessibilityElementsHidden>
                    →
                  </AppText>
                ) : null}
                <View style={styles.levelItem}>
                  <Chip label={step.level} color={LEVEL_COLORS[step.level]} />
                  <AppText variant="caption" tone="muted">
                    {t('progress.since', {
                      date: DateTime.fromISO(step.since).setLocale(locale).toLocaleString({
                        month: 'short',
                        year: 'numeric',
                      }),
                    })}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <AppText variant="label">{t('progress.topics')}</AppText>
        {data.topics.length === 0 ? (
          <AppText tone="muted">{t('progress.noTopics')}</AppText>
        ) : (
          <TopicBars topics={data.topics.slice(0, MAX_TOPICS)} />
        )}
      </View>
    </View>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.tile, { backgroundColor: colors.surfaceMuted }]}
      accessible
      accessibilityLabel={`${label}: ${value}. ${sub}`}
    >
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText variant="title">{value}</AppText>
      <AppText variant="caption" tone="muted">
        {sub}
      </AppText>
    </View>
  );
}

/** Ein Wert pro Thema → eine Farbe (Primärfarbe); Identität trägt der beschriftete Themen-Chip. */
function TopicBars({ topics }: { topics: StudentProgress['topics'] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const max = Math.max(...topics.map((x) => x.lessons), 1);
  return (
    <View style={styles.bars}>
      {topics.map((topic) => (
        <View
          key={topic.id}
          style={styles.barRow}
          accessible
          accessibilityLabel={`${topic.label}: ${t('progress.topicLessons', { count: topic.lessons })}`}
        >
          <View style={styles.barLabel}>
            <Chip label={topic.label} color={topic.color} />
          </View>
          <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
            <View
              style={[
                styles.bar,
                { backgroundColor: colors.primary, width: `${(topic.lessons / max) * 100}%` },
              ]}
            />
          </View>
          <AppText variant="bodyStrong" style={styles.barValue}>
            {topic.lessons}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { flexGrow: 1, flexBasis: 140, borderRadius: radius.md, padding: spacing.sm, gap: 2 },
  section: { gap: spacing.sm },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  levelStep: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  levelItem: { alignItems: 'center', gap: 2 },
  bars: { gap: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { width: 130 },
  track: { flex: 1, height: 8, borderRadius: radius.sm, overflow: 'hidden' },
  bar: { height: 8, borderRadius: radius.sm },
  barValue: { minWidth: 24, textAlign: 'right' },
});
