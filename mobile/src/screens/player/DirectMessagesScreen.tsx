import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchConversations, fetchDMs, sendDM, fetchContacts } from '../../store/slices/dmSlice';
import { colors, spacing, radius } from '../../theme';

export default function DirectMessagesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { conversations, messages, contacts, loading } = useSelector((state: RootState) => state.dm);
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [activeName, setActiveName] = useState('');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => { dispatch(fetchConversations()); }, []);

  useEffect(() => {
    if (activeChat) dispatch(fetchDMs(activeChat));
  }, [activeChat]);

  useEffect(() => {
    if (search.length > 1) dispatch(fetchContacts(search));
  }, [search]);

  function handleSend() {
    if (!input.trim() || !activeChat) return;
    dispatch(sendDM({ userId: activeChat, content: input.trim() }));
    setInput('');
  }

  function startChat(contact: any) {
    setActiveChat(contact.id);
    setActiveName(`${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email);
    setShowSearch(false);
    setSearch('');
  }

  if (activeChat) {
    const chatMessages = messages[activeChat] || [];
    return (
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setActiveChat(null)}>
            <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
          <Text style={styles.chatName}>{activeName}</Text>
        </View>
        <FlatList
          data={chatMessages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.msgBubble, item.sender_id === activeChat ? styles.msgOther : styles.msgOwn]}>
              <Text style={styles.msgText}>{item.content}</Text>
              <Text style={styles.msgTime}>{new Date(item.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
            </View>
          )}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 10 }}
          inverted={false}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.chatInput}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Text style={styles.sendBtnText}>→</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
          <Text style={styles.newBtn}>+</Text>
        </TouchableOpacity>
      </View>

      {showSearch && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search people..."
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
          {contacts.map((c: any) => (
            <TouchableOpacity key={c.id} style={styles.contactItem} onPress={() => startChat(c)}>
              <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarText}>{(c.first_name?.[0] || c.email[0]).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.contactName}>{c.first_name ? `${c.first_name} ${c.last_name || ''}` : c.email}</Text>
                <Text style={styles.contactRole}>{c.role}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading && conversations.length === 0 ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>Tap + to start a new message</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.partner_id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.convoCard} onPress={() => { setActiveChat(item.partner_id); setActiveName(item.partner_name); }}>
              {item.partner_photo ? (
                <Image source={{ uri: item.partner_photo }} style={styles.convoAvatar} />
              ) : (
                <View style={styles.convoAvatarPlaceholder}>
                  <Text style={styles.convoAvatarText}>{(item.partner_name?.[0] || '?').toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.convoInfo}>
                <Text style={styles.convoName}>{item.partner_name}</Text>
                <Text style={styles.convoLast} numberOfLines={1}>{item.last_message}</Text>
              </View>
              {item.unread_count > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{item.unread_count}</Text></View>
              )}
            </TouchableOpacity>
          )}
          contentContainerStyle={{ padding: spacing.md }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  newBtn: { fontSize: 28, color: colors.primary, fontWeight: '600' },
  searchContainer: { paddingHorizontal: spacing.md },
  searchInput: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.text, fontSize: 15, marginBottom: spacing.sm },
  contactItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, gap: 10 },
  contactAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  contactAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  contactName: { fontSize: 14, fontWeight: '600', color: colors.text },
  contactRole: { fontSize: 11, color: colors.textMuted, textTransform: 'capitalize' },
  convoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  convoAvatar: { width: 44, height: 44, borderRadius: 22 },
  convoAvatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  convoAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  convoInfo: { flex: 1, marginLeft: spacing.sm },
  convoName: { fontSize: 15, fontWeight: '700', color: colors.text },
  convoLast: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  badge: { backgroundColor: colors.primary, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  backBtn: { fontSize: 24, color: colors.primary },
  chatName: { fontSize: 17, fontWeight: '700', color: colors.text },
  msgBubble: { maxWidth: '80%', borderRadius: radius.md, padding: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.xs },
  msgOwn: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  msgOther: { backgroundColor: colors.card, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border },
  msgText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  msgTime: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4, alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
  chatInput: { flex: 1, backgroundColor: colors.card, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  sendBtn: { backgroundColor: colors.primary, width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
