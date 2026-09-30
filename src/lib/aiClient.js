const OLLAMA_BASE = import.meta.env.VITE_AI_API
const MODEL = import.meta.env.VITE_AI_MODEL

// Ollama's /api/chat streams newline-delimited JSON objects, each carrying
// one incremental content delta (not the accumulated text), terminated by
// a final {"done": true} line.
export async function streamAIResponse(messages, { onToken, signal } = {}) {
  let full = ''
  let streamedAny = false

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages, stream: true, think: false }),
      signal,
    })

    if (!res.ok || !res.body) throw new Error('Ollama endpoint unavailable')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let newlineIndex
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim()
        buffer = buffer.slice(newlineIndex + 1)
        if (!line) continue

        const parsed = JSON.parse(line)
        const delta = parsed.message?.content
        if (delta) {
          full += delta
          streamedAny = true
          onToken?.(delta)
        }
      }
    }
    return full
  } catch (err) {
    if (signal?.aborted || err.name === 'AbortError' || streamedAny) return full
    return simulateStream(mockReply(), onToken, signal)
  }
}

function simulateStream(text, onToken, signal) {
  return new Promise((resolve) => {
    let i = 0
    const interval = setInterval(() => {
      if (signal?.aborted || i >= text.length) {
        clearInterval(interval)
        resolve(text.slice(0, i))
        return
      }
      const size = Math.min(3, text.length - i)
      onToken?.(text.slice(i, i + size))
      i += size
    }, 18)
  })
}

function mockReply() {
  return (
    "Couldn't reach Ollama, so here's a preview reply instead.\n\n" +
    'Check that `ollama serve` is running, that `VITE_AI_API` points at it ' +
    '(default `http://localhost:11434`), and that `VITE_AI_MODEL` names a ' +
    'model you have pulled. In the meantime you can preview things like ' +
    '**bold text**, `inline code`, and:\n\n' +
    '- markdown lists\n- code blocks\n- [links](https://example.com)\n\n' +
    '```\nconst ready = true;\n```'
  )
}
