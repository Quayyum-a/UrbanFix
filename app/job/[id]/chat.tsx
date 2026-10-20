// Chat on a repair between customer, technician and UrbanFix support.
import { Ionicons } from '@expo/vector-icons'
import { Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useRef, useState } from 'react'
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Banner, Empty, tap } from '@/components/ui'
import { colors, font, radius, spacing } from '@/constants/theme'
import { friendlyError, listMessages, sendMessage } from '@/lib/api'
import { useSession } from '@/lib/session'
import type { Message } from '@/lib/types'

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { status, profile } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastId = useRef(0)
  const list = useRef<FlatList<Message>>(null)

  const poll = useCallback(async () => {
    if (!id) return
    try {
      const fresh = await listMessages(id, lastId.current)
      if (fresh.length) {
        lastId.current = fresh[fresh.length - 1]!.id
        setMessages((m) => [...m, ...fresh.filter((f) => !m.some((x) => x.id === f.id))])
      }
      setError(null)
    } catch (e) {
      setError(friendlyError(e))
    }
  }, [id])

  useFocusEffect(useCallback(() => {
    void poll()
    const t = setInterval(() => void poll(), 4000)
    return () => clearInterval(t)
  }, [poll]))

  if (status !== 'ready') return <Redirect href="/" />

  const send = async () => {
    const body = text.trim()
    if (!body || !id || sending) return
    tap()
    setSending(true)
    try {
      const m = await sendMessage(id, body)
      setText('')
      lastId.current = Math.max(lastId.current, m.id)
      setMessages((all) => [...all, m])
      setError(null)
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          ref={list}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={<Empty icon="chatbubbles-outline" title="No messages yet" text="Ask a question or agree on a time. UrbanFix support can see this chat if there's a problem." />}
          renderItem={({ item }) => {
            const mine = item.sender_id === profile?.id
            return (
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={[font.body, { color: mine ? colors.onPrimary : colors.text }]}>{item.body}</Text>
                <Text style={[font.small, { fontSize: 11, color: mine ? '#C9D3E8' : colors.textFaint, marginTop: 2 }]}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )
          }}
        />
        {error ? <View style={{ paddingHorizontal: spacing.lg }}><Banner tone="bad" text={error} /></View> : null}
        <View style={styles.bar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message"
            placeholderTextColor={colors.textFaint}
            multiline
            maxLength={1000}
            accessibilityLabel="Message"
            testID="chat-input"
          />
          <Pressable onPress={send} disabled={!text.trim() || sending} style={[styles.send, (!text.trim() || sending) && { opacity: 0.4 }]}
            accessibilityRole="button" accessibilityLabel="Send" testID="chat-send">
            <Ionicons name="send" size={20} color={colors.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '80%', padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.sm },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  input: { flex: 1, minHeight: 46, maxHeight: 120, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingTop: 12, ...font.body },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
})
