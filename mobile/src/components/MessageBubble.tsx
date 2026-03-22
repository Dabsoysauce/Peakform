import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../theme';

interface Props {
  message: any;
  isOwn: boolean;
}

export default function MessageBubble({ message, isOwn }: Props) {
  const time = message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <View style={[styles.row, isOwn && styles.rowOwn]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {!isOwn && message.sender_name ? (
          <Text style={styles.sender}>{message.sender_name}</Text>
        ) : null}
        <Text style={styles.text}>{message.content}</Text>
        {time ? <Text style={styles.time}>{time}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: spacing.sm, paddingHorizontal: spacing.md },
  rowOwn: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '75%',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
  },
  bubbleOwn: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  sender: { fontSize: 11, color: colors.primaryLight, fontWeight: '700', marginBottom: 2 },
  text: { fontSize: 14, color: colors.text },
  time: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, alignSelf: 'flex-end' },
});
