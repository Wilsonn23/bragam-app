import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import { MatchBadge } from '../components/RecommendationParts';
import { useRecommendations } from '../recommendation/useRecommendations';
import {
  INTERESTS, VISIT_TIMES, ENVIRONMENTS, BUDGETS, FACTORS, WEIGHT_LEVELS,
  DEFAULT_PREFERENCES, normalizePreferences, samePreferences,
} from '../recommendation/preferences';

/** @typedef {import('../recommendation/preferences').Preferences} Preferences */

/**
 * Edit recommendation preferences with a live top-3 preview.
 * The parent remounts this screen per opening so the draft starts from `preferences`.
 */
export default function PreferencesScreen({ preferences, pois, userCoord, context, onBack, onSave }) {
  const [draft, setDraft] = useState(() => normalizePreferences(preferences));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const preview = useRecommendations(pois, draft, userCoord, context).items.slice(0, 3);
  const dirty = !samePreferences(draft, preferences);
  const isDefault = samePreferences(draft, DEFAULT_PREFERENCES);

  /** @param {Partial<Preferences>} patch */
  const update = patch => { setError(null); setDraft(previous => ({ ...previous, ...patch })); };
  const toggleInterest = key => update({
    interests: draft.interests.includes(key) ? draft.interests.filter(item => item !== key) : [...draft.interests, key],
  });
  const setWeight = (key, level) => {
    const weights = { ...draft.weights, [key]: level };
    if (Object.values(weights).every(value => value === 0)) {
      setError('Minimal satu faktor harus aktif.');
      return;
    }
    update({ weights });
  };

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan preferensi.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} disabled={saving} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Kembali">
          <Ionicons name="arrow-back" size={22} color={COLORS.darkPurple} />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">Preferensi Rekomendasi</Text>
        <TouchableOpacity onPress={() => update(normalizePreferences(DEFAULT_PREFERENCES))} disabled={isDefault || saving}
          style={styles.resetBtn} accessibilityRole="button">
          <Text style={[styles.resetText, (isDefault || saving) && styles.muted]}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Section title="Minat kamu" hint={draft.interests.length ? `${draft.interests.length} dipilih` : 'Kosongkan untuk semua kategori'}>
          <View style={styles.wrap}>
            {INTERESTS.map(item => {
              const selected = draft.interests.includes(item.key);
              return (
                <TouchableOpacity key={item.key} onPress={() => toggleInterest(item.key)} activeOpacity={0.85}
                  style={[styles.interest, selected && styles.interestActive]}
                  accessibilityRole="checkbox" accessibilityState={{ checked: selected }}>
                  <Ionicons name={/** @type {any} */ (item.icon)} size={16} color={selected ? COLORS.white : COLORS.primaryPurple} />
                  <Text style={[styles.interestText, selected && styles.activeText]}>{item.label}</Text>
                  {selected && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        <Section title="Waktu kunjungan" hint={draft.visitTime === 'auto' ? 'Mengikuti jam saat ini' : 'Cek jam buka pada waktu tersebut'}>
          <Segmented options={VISIT_TIMES} value={draft.visitTime} onChange={key => update({ visitTime: key })} withIcons />
        </Section>

        <Section title="Suasana tempat">
          <Segmented options={ENVIRONMENTS} value={draft.environment} onChange={key => update({ environment: key })} />
        </Section>

        <Section title="Budget per orang">
          <Segmented options={BUDGETS} value={draft.maxBudget} onChange={key => update({ maxBudget: key })} />
        </Section>

        <View style={[styles.card, styles.switchRow]}>
          <View style={styles.flex}>
            <Text style={styles.switchTitle}>Sembunyikan tempat yang tutup</Text>
            <Text style={styles.switchHint}>Berdasarkan jam operasional di waktu kunjunganmu</Text>
          </View>
          <Switch value={draft.hideClosed} onValueChange={value => update({ hideClosed: value })}
            trackColor={{ false: COLORS.borderSubtle, true: COLORS.mediumPurple }}
            thumbColor={draft.hideClosed ? COLORS.darkPurple : COLORS.white} />
        </View>

        <Section title="Seberapa penting?" hint="Atur bobot setiap faktor">
          <View style={styles.card}>
            {FACTORS.map((factor, index) => (
              <View key={factor.key} style={[styles.factorRow, index > 0 && styles.factorDivider]}>
                <View style={styles.factorLabel}>
                  <Ionicons name={/** @type {any} */ (factor.icon)} size={16} color={COLORS.primaryPurple} />
                  <Text style={styles.factorText}>{factor.label}</Text>
                </View>
                <View style={styles.levels}>
                  {WEIGHT_LEVELS.map((label, level) => {
                    const selected = draft.weights[factor.key] === level;
                    return (
                      <TouchableOpacity key={label} onPress={() => setWeight(factor.key, level)}
                        style={[styles.level, selected && styles.levelActive]}
                        accessibilityRole="radio" accessibilityState={{ checked: selected }}
                        accessibilityLabel={`${factor.label}: ${label}`}>
                        <Text style={[styles.levelText, selected && styles.activeText]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Pratinjau" hint="Top 3 dengan pengaturan ini">
          <View style={styles.card}>
            {preview.length ? preview.map((item, index) => (
              <View key={item.poi.id} style={[styles.previewRow, index > 0 && styles.factorDivider]}>
                <Text style={styles.previewRank}>{index + 1}</Text>
                <View style={styles.flex}>
                  <Text style={styles.previewName} numberOfLines={1}>{item.poi.name}</Text>
                  <Text style={styles.previewReason} numberOfLines={1}>{item.reasons[0]?.text || item.poi.category}</Text>
                </View>
                <MatchBadge percent={item.matchPercent} />
              </View>
            )) : <Text style={styles.previewEmpty}>Tidak ada tempat yang cocok dengan pengaturan ini.</Text>}
          </View>
        </Section>
      </ScrollView>

      <View style={styles.footer}>
        {!!error && (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={16} color="#a52222" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <TouchableOpacity onPress={save} disabled={!dirty || saving} activeOpacity={0.85}
          style={[styles.saveBtn, (!dirty || saving) && styles.saveBtnDisabled]}
          accessibilityRole="button" accessibilityState={{ disabled: !dirty || saving, busy: saving }}>
          {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveText}>{dirty ? 'Simpan Preferensi' : 'Tersimpan'}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Section({ title, hint = undefined, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!hint && <Text style={styles.sectionHint}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

function Segmented({ options, value, onChange, withIcons = false }) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup">
      {options.map(option => {
        const selected = option.key === value;
        return (
          <TouchableOpacity key={String(option.key)} onPress={() => onChange(option.key)} activeOpacity={0.85}
            style={[styles.segment, selected && styles.segmentActive]}
            accessibilityRole="radio" accessibilityState={{ checked: selected }}>
            {withIcons && <Ionicons name={option.icon} size={14} color={selected ? COLORS.white : COLORS.primaryPurple} />}
            <Text style={[styles.segmentText, selected && styles.activeText]} numberOfLines={1}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.softLilacBg },
  flex: { flex: 1, minWidth: 0 },
  muted: { opacity: 0.4 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  resetBtn: { minWidth: 48, height: 40, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 6 },
  resetText: { fontSize: 13, fontWeight: '700', color: COLORS.primaryPurple },
  content: { paddingHorizontal: 20, paddingBottom: 24 },

  section: { marginTop: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  sectionHint: { fontSize: 11, color: COLORS.textMuted, flexShrink: 1, marginLeft: 10, textAlign: 'right' },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.borderSubtle, padding: 14 },

  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interest: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: RADIUS.pill, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.borderSubtle,
  },
  interestActive: { backgroundColor: COLORS.darkPurple, borderColor: COLORS.darkPurple },
  interestText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  activeText: { color: COLORS.white },

  segmented: {
    flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: RADIUS.pill, padding: 4,
    borderWidth: 1, borderColor: COLORS.borderSubtle,
  },
  segment: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 9, borderRadius: RADIUS.pill,
  },
  segmentActive: { backgroundColor: COLORS.darkPurple },
  segmentText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  switchTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  switchHint: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  factorRow: { paddingVertical: 10 },
  factorDivider: { borderTopWidth: 1, borderTopColor: COLORS.borderSubtle },
  factorLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  factorText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  levels: { flexDirection: 'row', gap: 6 },
  level: {
    flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.softLilacBg, borderWidth: 1, borderColor: COLORS.borderSubtle,
  },
  levelActive: { backgroundColor: COLORS.primaryPurple, borderColor: COLORS.primaryPurple },
  levelText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },

  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  previewRank: { width: 22, fontSize: 16, fontWeight: '800', color: COLORS.primaryPurple, textAlign: 'center' },
  previewName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  previewReason: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  previewEmpty: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 8 },

  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: COLORS.borderSubtle, backgroundColor: COLORS.softLilacBg },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10,
    backgroundColor: '#FCEBEB', borderRadius: RADIUS.sm, padding: 10,
  },
  errorText: { flex: 1, fontSize: 12, color: '#a52222' },
  saveBtn: { minHeight: 50, borderRadius: RADIUS.pill, backgroundColor: COLORS.darkPurple, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});
