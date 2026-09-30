import { useState } from 'react'

export default function ChatInput({ onSend, onStop, isStreaming }) {
  const [value, setValue] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!value.trim() || isStreaming) return
    onSend(value)
    setValue('')
  }

  return (
    <form className="chat-input-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Start Conversation..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={isStreaming}
      />
      {isStreaming ? (
        <button type="button" className="is-stop" onClick={onStop}>
          Stop
        </button>
      ) : (
        <button type="submit" disabled={!value.trim()}>
          Send
        </button>
      )}
    </form>
  )
}
