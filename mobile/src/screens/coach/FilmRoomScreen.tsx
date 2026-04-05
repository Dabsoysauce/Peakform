import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Modal, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchTrainerMedia, fetchAnalyses } from '../../store/slices/mediaSlice';
import api from '../../services/api';
import { colors, spacing, radius } from '../../theme';

export default function FilmRoomScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { trainerMedia, analyses, loading } = useSelector((state: RootState) => state.media);
  const [selected, setSelected] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { dispatch(fetchTrainerMedia()); }, []);

  async function handleAnalyze(media: any) {
    setSelected(media);
    setAnalyzing(true);
    setShowModal(true);
    setAnalysis('');
    try {
      const body: any = { title: media.title, description: media.description, focus: 'both' };
      if (/\.(jpg|jpeg|png|gif|webp)/i.test(media.url)) {
        body.media_url = media.url;
      }
      const res = await api.post('/ai/analyze-film', body);
      setAnalysis(res.data.analysis);
      try { await api.post(`/trainer-media/${media.id}/analyses`, { analysis: res.data.analysis, focus: 'both', player_focus: null, chat_history: [] }); } catch {}
    } catch {
      setAnalysis('Analysis failed. Please try again.');
    }
    setAnalyzing(false);
  }

  async function handleShare() {
    if (!analysis || !selected) return;
    try {
      const res = await api.post('/ai/share-to-team', { content: analysis, title: selected.title, type: 'film' });
      if (res.data.success) {
        // Could show alert but keeping simple
      }
    } catch {}
  }

  function viewSaved(media: any) {
    setSelected(media);
    dispatch(fetchAnalyses({ mediaId: media.id, isTrainer: true }));
    setShowModal(true);
    setAnalysis('');
  }

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => viewSaved(item)}>
      {item.thumbnail_url ? (
        <Image source={{ uri: item.thumbnail_url }} style={styles.thumb} />
      ) : (
        <View style={styles.thumbPlaceholder}><Text style={{ fontSize: 20 }}>🎬</Text></View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
        <Text style={styles.cardMeta}>{item.user_name || 'Unknown'} · {new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <TouchableOpacity style={styles.aiBtn} onPress={() => handleAnalyze(item)}>
        <Text style={styles.aiBtnText}>AI</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Film Room</Text>
      {loading && trainerMedia.length === 0 ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : trainerMedia.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48, marginBottom: spacing.sm }}>🎬</Text>
          <Text style={styles.emptyText}>No team film yet</Text>
        </View>
      ) : (
        <FlatList data={trainerMedia} keyExtractor={i => i.id.toString()} renderItem={renderItem} contentContainerStyle={{ padding: spacing.md }} />
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>{selected?.title || 'Analysis'}</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setAnalysis(''); }}>
                <Text style={{ fontSize: 20, color: colors.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: spacing.lg }}>
              {analyzing ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text style={{ color: colors.textMuted, marginTop: spacing.md }}>Analyzing film with AI...</Text>
                </View>
              ) : analysis ? (
                <>
                  <Text style={styles.analysisText}>{analysis}</Text>
                  <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                    <Text style={styles.shareBtnText}>Share with Team</Text>
                  </TouchableOpacity>
                </>
              ) : analyses.length > 0 ? (
                analyses.map((a: any, i: number) => (
                  <TouchableOpacity key={a.id} style={styles.savedCard} onPress={() => setAnalysis(a.analysis)}>
                    <Text style={styles.savedTitle}>Analysis {i + 1}</Text>
                    <Text style={styles.savedDate}>{new Date(a.created_at).toLocaleDateString()} · {a.focus}</Text>
                    <Text style={styles.savedPreview} numberOfLines={2}>{a.analysis}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 40 }}>No analyses yet. Tap AI to analyze.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, padding: spacing.lg, paddingBottom: spacing.sm },
  card: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  thumb: { width: 70, height: 50, borderRadius: radius.sm },
  thumbPlaceholder: { width: 70, height: 50, borderRadius: radius.sm, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: spacing.sm },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  aiBtn: { backgroundColor: colors.primary, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  aiBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', minHeight: '50%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 },
  analysisText: { fontSize: 14, color: colors.text, lineHeight: 22 },
  shareBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  savedCard: { backgroundColor: colors.card, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  savedTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  savedDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  savedPreview: { fontSize: 13, color: colors.textSub, marginTop: 4 },
});
