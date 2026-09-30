import { renderMarkdown } from '../lib/markdown'
import faceIcon from '../assets/face.png'
import userIcon from '../assets/user-avatar.png'

export default function ChatMessage({ message, isStreaming }) {
  const isUser = message.role === 'user'

  return (
    <div className={`message-row ${isUser ? 'from-user' : 'from-assistant'}`}>
      <div className={`message-avatar${isStreaming ? ' is-active' : ''}`}>
        <img src={isUser ? userIcon : faceIcon} alt="" />
      </div>
      <div className="message-body">
        <span className="message-author">{isUser ? 'You' : 'Personal AI'}</span>
        {isUser ? (
          <p className="message-text">{message.content}</p>
        ) : (
          <div
            className="message-text markdown"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        )}
        {isStreaming && <span className="cursor-blink" />}
      </div>
    </div>
  )
}
