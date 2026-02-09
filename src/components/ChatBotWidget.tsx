import React from 'react'
import { sendChatMessage } from '../services/chatbotAPI'

type Msg = { id: string; role: 'user' | 'assistant'; content: string; ts: number }

const ChatBotWidget: React.FC = () => {
  const [open, setOpen] = React.useState(false)
  const [input, setInput] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [msgs, setMsgs] = React.useState<Msg[]>([
    { id: 'welcome', role: 'assistant', content: 'Hi! Ask me anything.', ts: Date.now() }
  ])

  const send = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    const user: Msg = { id: Math.random().toString(36).slice(2), role: 'user', content: text, ts: Date.now() }
    setMsgs(prev => [...prev, user])
    setSending(true)
    try {
      const { reply } = await sendChatMessage(text)
      const bot: Msg = { id: Math.random().toString(36).slice(2), role: 'assistant', content: reply || 'Sorry, I could not respond.', ts: Date.now() }
      setMsgs(prev => [...prev, bot])
    } catch (e: any) {
      const bot: Msg = { id: Math.random().toString(36).slice(2), role: 'assistant', content: e?.message || 'Request failed.', ts: Date.now() }
      setMsgs(prev => [...prev, bot])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed right-4 z-50 bottom-24 lg:bottom-4">
      {!open && (
        <button onClick={() => setOpen(true)} className="rounded-full bg-blue-600 text-white w-12 h-12 sm:w-14 sm:h-14 shadow-lg hover:bg-blue-700">
          <span className="text-lg sm:text-xl">💬</span>
        </button>
      )}
      {open && (
        <div className="w-[calc(100vw-1.5rem)] max-w-xs sm:w-80 h-[70vh] max-h-[26rem] sm:h-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">AI Assistant</div>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">✕</button>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {msgs.map(m => (
              <div key={m.id} className={`text-sm whitespace-pre-wrap ${m.role === 'user' ? 'text-gray-900 dark:text-white text-right' : 'text-gray-800 dark:text-gray-200'}`}>
                {m.role === 'user' ? (<span className="inline-block px-3 py-2 rounded-lg bg-blue-600 text-white">{m.content}</span>) : (<span className="inline-block px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700">{m.content}</span>)}
              </div>
            ))}
            {sending && (
              <div className="text-xs text-gray-500 dark:text-gray-400">Assistant is typing…</div>
            )}
          </div>
          <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex items-center space-x-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send() }}
              placeholder="Type a message"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <button onClick={send} disabled={sending || !input.trim()} className="px-3 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">Send</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatBotWidget
