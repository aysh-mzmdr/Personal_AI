import { useCallback, useEffect, useRef, useState } from 'react'
import { streamAIResponse } from '../lib/aiClient'

const REVEAL_START_DELAY = 500
const REVEAL_TICK_MS = 24

function createConversation(title = 'New conversation') {
  return { id: crypto.randomUUID(), title, messages: [] }
}

export function useChat() {
  const [conversations, setConversations] = useState(() => [createConversation('Welcome')])
  const [activeId, setActiveId] = useState(() => conversations[0].id)
  const [isStreaming, setIsStreaming] = useState(false)
  const revealStateRef = useRef({})
  const activeControllerRef = useRef(null)
  const activeAssistantIdRef = useRef(null)

  useEffect(() => {
    const timers = revealStateRef.current
    return () => {
      Object.values(timers).forEach((entry) => {
        clearTimeout(entry.startTimeoutId)
        clearInterval(entry.intervalId)
      })
    }
  }, [])

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0]

  const newConversation = useCallback(() => {
    const conv = createConversation()
    setConversations((prev) => [conv, ...prev])
    setActiveId(conv.id)
  }, [])

  const selectConversation = useCallback((id) => setActiveId(id), [])

  const renameConversation = useCallback((id, title) => {
    const trimmed = title.trim()
    if (!trimmed) return
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c)))
  }, [])

  const stopGeneration = useCallback(() => {
    activeControllerRef.current?.abort()

    const assistantId = activeAssistantIdRef.current
    const state = assistantId ? revealStateRef.current[assistantId] : null
    if (state) {
      state.stopped = true
      clearTimeout(state.startTimeoutId)
      clearInterval(state.intervalId)
      delete revealStateRef.current[assistantId]
    }

    activeControllerRef.current = null
    activeAssistantIdRef.current = null
    setIsStreaming(false)
  }, [])

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim()
      if (!trimmed || isStreaming) return

      const userMsg = { id: crypto.randomUUID(), role: 'user', content: trimmed }
      const assistantId = crypto.randomUUID()
      let history = []

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeId) return c
          history = [...c.messages, userMsg].map(({ role, content }) => ({ role, content }))
          return {
            ...c,
            title: c.messages.length === 0 ? trimmed.slice(0, 40) : c.title,
            messages: [...c.messages, userMsg, { id: assistantId, role: 'assistant', content: '' }],
          }
        })
      )

      setIsStreaming(true)

      const controller = new AbortController()
      activeControllerRef.current = controller
      activeAssistantIdRef.current = assistantId

      const revealState = { buffer: '', networkDone: false, intervalId: null, startTimeoutId: null, stopped: false }
      revealStateRef.current[assistantId] = revealState

      const commitPiece = (piece) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantId ? { ...m, content: m.content + piece } : m
                  ),
                }
              : c
          )
        )
      }

      const finishReveal = () => {
        clearInterval(revealState.intervalId)
        delete revealStateRef.current[assistantId]
        if (activeAssistantIdRef.current === assistantId) {
          activeControllerRef.current = null
          activeAssistantIdRef.current = null
        }
        setIsStreaming(false)
      }

      // Reveals text at a steady, readable pace independent of how bursty the
      // network chunks are, and speeds up proportionally if the buffer backs
      // up so a long reply never lags far behind generation.
      const startReveal = () => {
        if (revealState.stopped) return
        revealState.intervalId = setInterval(() => {
          const { buffer, networkDone } = revealState
          if (buffer.length > 0) {
            const size = Math.max(2, Math.floor(buffer.length / 30))
            const piece = buffer.slice(0, size)
            revealState.buffer = buffer.slice(size)
            commitPiece(piece)
          } else if (networkDone) {
            finishReveal()
          }
        }, REVEAL_TICK_MS)
      }

      // Wait a beat before revealing anything, so a first burst of tokens
      // has time to arrive and the reveal doesn't stutter on a cold start.
      revealState.startTimeoutId = setTimeout(startReveal, REVEAL_START_DELAY)

      const appendToken = (token) => {
        revealState.buffer += token
      }

      await streamAIResponse(history, { onToken: appendToken, signal: controller.signal })
      revealState.networkDone = true
    },
    [activeId, isStreaming]
  )

  return {
    conversations,
    active,
    activeId,
    isStreaming,
    newConversation,
    selectConversation,
    renameConversation,
    sendMessage,
    stopGeneration,
  }
}
