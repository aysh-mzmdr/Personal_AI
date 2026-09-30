import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import { useChat } from './hooks/useChat'

export default function App() {
  const {
    conversations,
    active,
    activeId,
    isStreaming,
    newConversation,
    selectConversation,
    renameConversation,
    sendMessage,
    stopGeneration,
  } = useChat()

  return (
    <div className="app-shell">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNew={newConversation}
        onRename={renameConversation}
      />
      <ChatWindow conversation={active} isStreaming={isStreaming} onSend={sendMessage} onStop={stopGeneration} />
    </div>
  )
}
