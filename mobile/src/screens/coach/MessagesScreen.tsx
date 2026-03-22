import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchMessages } from '../../store/slices/messagesSlice';
import { fetchTeam } from '../../store/slices/teamsSlice';
import { useSocket } from '../../hooks/useSocket';
import MessageBubble from '../../components/MessageBubble';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, spacing, radius } from '../../theme';

export default function CoachMessagesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((state: RootState) => state.auth.token);
  const email = useSelector((state: RootState) => state.auth.email) ?? '';
  const team = useSelector((state: RootState) => state.teams.team);
  const { loading: teamLoading } = useSelector((state: RootState) => state.teams);
  const [text, setText] = useState('');
  const flatRef = useRef<FlatList>(null);

  const roomId = team ? `team_${team.id}` : null;
  const messages = useSelector((state: RootState) => roomId ? (state.messages.rooms[roomId] ?? []) : []);
  const msgLoading = useSelector((state: RootState) => state.messages.loading);

  const { sendMessage } = useSocket(token, roomId ?? undefined);
  const senderName = email.split('@')[0];

  useEffect(() => { dispatch(fetchTeam()); }, []);

  useEffect(() => {
    if (roomId) dispatch(fetchMessages(roomId));
  }, [roomId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  function handleSend() {
    if (!text.trim() || !roomId) return;
    sendMessage(roomId, text.trim(), senderName);
    setText('');
  }

  if (teamLoading && !team) return <LoadingSpinner />;

  if (!team) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>Create a team to access team chat</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      <View style={styles.header}>
        <Text style={styles.title}>Team Chat</Text>
        <Text style={styles.sub}>{team.name}</Text>
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(item, i) => String(item.id ?? i)}
        renderItem={({ item }) => (
          <MessageBubble message={item} isOwn={item.sender_email === email || item.sender_name === senderName} />
        )}
        contentContainerStyle={styles.msgList}
        ListEmptyComponent={!msgLoading ? <Text style={styles.empty}>No messages yet.</Text> : null}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message…"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity style={[styles.sendBtn, !text.trim() && { opacity: 0.4 }]} onPress={handleSend} disabled={!text.trim()}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  header: { padding: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderColor: colors.border },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted },
  msgList: { paddingVertical: spacing.md, flexGrow: 1 },
  empty: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
