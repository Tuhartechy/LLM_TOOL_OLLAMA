import React, { useRef, useEffect } from 'react';
import { Send, Square, RefreshCw } from 'lucide-react';
import MessageItem from './MessageItem';

export default function ChatWindow({
  messages,
  streamingMessage,
  activeToolCalls,
  streamingCitations,
  isStreaming,
  onSend,
  onStop,
  onRegenerate
}) {
  const [input, setInput] = React.useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage, activeToolCalls]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-900/60 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && !isStreaming && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500 space-y-2 select-none">
            <h3 className="text-lg font-semibold text-gray-400">Ollama Demonstration Workspace</h3>
            <p className="max-w-md text-xs">
              Select a model, execute safe mathematical calculations, retrieve ISO times, or search the offline knowledge database.
            </p>
          </div>
        )}

        {messages.map((m) => (
          <MessageItem
            key={m.id}
            role={m.role}
            content={m.content}
            toolCalls={m.tool_calls}
          />
        ))}

        {isStreaming && (
          <MessageItem
            role="assistant"
            content={streamingMessage}
            toolCalls={activeToolCalls}
            citations={streamingCitations}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-gray-800 bg-gray-950">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message or ask for a calculation..."
            disabled={isStreaming}
            className="w-full bg-gray-900 border border-gray-800 text-gray-200 text-xs rounded-lg pl-3 pr-20 py-3 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          />
          <div className="absolute right-2 flex items-center space-x-1">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-md transition"
                title="Stop Generation"
              >
                <Square size={14} />
              </button>
            ) : (
              <>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={onRegenerate}
                    className="p-1.5 text-gray-400 hover:text-white rounded-md transition"
                    title="Regenerate Last Prompt"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-md transition"
                >
                  <Send size={14} />
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
