import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Modal, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchMedia, fetchAnalyses } from '../../store/slices/mediaSlice';
import api from '../../services/api';
import { colors, spacing, radius } from '../../theme';

export default function FilmRoomScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { list, analyses, loading } = useSelector((state: RootState) => state.media);
  const [selected, setSelected] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => { dispatch(fetchMedia()); }, []);

  function isImage(url: string) {
    return /\.(jpg|jpeg|png|gif|webp)/i.test(url);
  }

  async function handleAnalyze(media: any) {
    setSelected(media);
    setAnalyzing(true);
    setShowAnalysis(true);
    setAnalysis('');
    try {
      const body: any = { title: media.title, description: media.description, focus: 'both' };
      if (isImage(media.url)) {
        body.media_url = media.url;
      }
      const res = await api.post('/ai/analyze-film', body);
      setAnalysis(res.data.analysis);
      // Save analysis
      try { await api.post(`/media/${media.id}/analyses`, { analysis: res.data.analysis, focus: 'both', player_focus: null, chat_history: [] }); } catch {}
    } catch (err: any) {
      setAnalysis('Analysis failed. Please try again.');
    }
    setAnalyzing(false);
  }

  async function viewSavedAnalyses(media: any) {
    setSelected(media);
    dispatch(fetchAnalyses({ mediaId: media.id, isTrainer: false }));
    setShowAnalysis(true);
    setAnalysis('');
  }

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => viewSavedAnalyses(item)}>
      {item.thumbnail_url ? (
        <Image source={{ uri: item.thumbnail_url }} style={styles.thumb} />
      ) : (
        <View style={styles.thumbPlaceholder}>
          <Text style={styles.thumbIcon}>🎬</Text>
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
        <Text style={styles.cardDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
        {item.tags?.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.slice(0, 3).map((tag: string, i: number) => (
              <View key={i} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
            ))}
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.analyzeBtn} onPress={() => handleAnalyze(item)}>
        <Text style={styles.analyzeBtnText}>AI</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Film Room</Text>
      {loading && list.length === 0 ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎬</Text>
          <Text style={styles.emptyText}>No film uploaded yet</Text>
          <Text style={styles.emptySubtext}>Upload game film from the web app</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.md }}
        />
      )}

      <Modal visible={showAnalysis} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selected?.title || 'Analysis'}</Text>
              <TouchableOpacity onPress={() => { setShowAnalysis(false); setAnalysis(''); }}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {analyzing ? (
                <View style={styles.analyzingContainer}>
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text style={styles.analyzingText}>Analyzing film...</Text>
                </View>
              ) : analysis ? (
                <Text style={styles.analysisText}>{analysis}</Text>
              ) : analyses.length > 0 ? (
                analyses.map((a: any, i: number) => (
                  <TouchableOpacity key={a.id} style={styles.analysisCard} onPress={() => setAnalysis(a.analysis)}>
                    <Text style={styles.analysisCardTitle}>Analysis {i + 1}</Text>
                    <Text style={styles.analysisCardDate}>{new Date(a.created_at).toLocaleDateString()} · {a.focus}</Text>
                    <Text style={styles.analysisCardPreview} numberOfLines={2}>{a.analysis}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyAnalysis}>No analyses yet. Tap the AI button to analyze this film.</Text>
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
  thumb: { width: 70, height: 50, borderRadius: radius.sm, backgroundColor: colors.border },
  thumbPlaceholder: { width: 70, height: 50, borderRadius: radius.sm, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  thumbIcon: { fontSize: 20 },
  cardInfo: { flex: 1, marginLeft: spacing.sm },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  tagsRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  tag: { backgroundColor: 'rgba(37,99,235,0.15)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  tagText: { fontSize: 10, color: colors.primaryLight },
  analyzeBtn: { backgroundColor: colors.primary, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  analyzeBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: spacing.sm },
  emptyText: { color: colors.textMuted, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', minHeight: '50%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 },
  closeBtn: { fontSize: 20, color: colors.textMuted, padding: 4 },
  modalBody: { padding: spacing.lg },
  analyzingContainer: { alignItems: 'center', paddingVertical: 40 },
  analyzingText: { color: colors.textMuted, marginTop: spacing.md, fontSize: 14 },
  analysisText: { fontSize: 14, color: colors.text, lineHeight: 22 },
  analysisCard: { backgroundColor: colors.card, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  analysisCardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  analysisCardDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  analysisCardPreview: { fontSize: 13, color: colors.textSub, marginTop: 4 },
  emptyAnalysis: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 40 },
});
