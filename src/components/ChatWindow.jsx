import { useEffect, useRef } from 'react'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'

function getGreeting() {
  const hour = new Date().getHours()
  const isNight = hour < 5 || hour >= 21
  if (isNight) return { text: 'You should go to sleep now.', isNight: true }
  if (hour < 12) return { text: 'Good morning.', isNight: false }
  if (hour < 17) return { text: 'Good afternoon.', isNight: false }
  return { text: 'Good evening.', isNight: false }
}

export default function ChatWindow({ conversation, isStreaming, onSend, onStop }) {
  const scrollRef = useRef(null)
  const userScrolledUpRef = useRef(false)
  const autoScrollingRef = useRef(false)

  // Tracks whether the user has deliberately scrolled away from the bottom,
  // so the streaming reveal (which updates ~40x/sec) never fights a manual
  // scroll attempt. A plain distance-from-bottom threshold isn't enough:
  // smooth-scroll calls fire faster than a user can out-scroll them.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const handleWheel = (e) => {
      if (e.deltaY < 0) userScrolledUpRef.current = true
    }
    const handleScroll = () => {
      if (autoScrollingRef.current) return
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      if (distanceFromBottom < 40) userScrolledUpRef.current = false
    }

    el.addEventListener('wheel', handleWheel, { passive: true })
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    userScrolledUpRef.current = false
  }, [conversation.id])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || userScrolledUpRef.current) return

    autoScrollingRef.current = true
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })

    if ('onscrollend' in el) {
      el.addEventListener('scrollend', () => { autoScrollingRef.current = false }, { once: true })
    } else {
      setTimeout(() => { autoScrollingRef.current = false }, 400)
    }
  }, [conversation.messages])

  const lastMessage = conversation.messages[conversation.messages.length - 1]
  const greeting = getGreeting()

  return (
    <main className="chat-window">
      <header className="chat-header">
        <span className="chat-header-label">
          <span className="status-dot" />
          Local AI
        </span>
      </header>

      <div className="chat-scroll" ref={scrollRef}>
        <div className="chat-scroll-inner">
          {conversation.messages.length === 0 ? (
            <div className="empty-state">
              <h3>{greeting.text}</h3>
              {!greeting.isNight && <p>What shall we explore today?</p>}
            </div>
          ) : (
            conversation.messages.map((m) => (
              <ChatMessage
                key={m.id}
                message={m}
                isStreaming={isStreaming && m.id === lastMessage?.id && m.role === 'assistant'}
              />
            ))
          )}
        </div>
      </div>

      <ChatInput onSend={onSend} onStop={onStop} isStreaming={isStreaming} />
    </main>
  )
}
