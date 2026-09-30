import { useState } from 'react'
import faceIcon from '../assets/face.png'

export default function Sidebar({ conversations, activeId, onSelect, onNew, onRename }) {
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')

  const startEdit = (c) => {
    setEditingId(c.id)
    setDraft(c.title)
  }

  const commitRename = () => {
    if (editingId) onRename(editingId, draft)
    setEditingId(null)
  }

  const cancelRename = () => setEditingId(null)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelRename()
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">
          <img src={faceIcon} alt="" />
        </span>
        <div className="brand-text">
          <h1>Personal AI</h1>
          <p>Trully Yours</p>
        </div>
      </div>

      <button className="new-chat-btn" onClick={onNew} type="button">
        <span className="plus">+</span> New conversation
      </button>

      <p className="sidebar-label">History</p>
      <nav className="conversation-list">
        {conversations.map((c) =>
          editingId === c.id ? (
            <input
              key={c.id}
              className="conversation-rename-input"
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <div key={c.id} className={`conversation-row${c.id === activeId ? ' active' : ''}`}>
              <button
                type="button"
                className={`conversation-item${c.id === activeId ? ' active' : ''}`}
                onClick={() => onSelect(c.id)}
              >
                {c.title}
              </button>
              <button
                type="button"
                className="conversation-rename-btn"
                aria-label="Rename conversation"
                onClick={(e) => {
                  e.stopPropagation()
                  startEdit(c)
                }}
              >
                ✎
              </button>
            </div>
          )
        )}
      </nav>
    </aside>
  )
}
