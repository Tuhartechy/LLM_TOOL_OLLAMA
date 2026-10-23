import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import SettingsModal from './components/SettingsModal';
import RAGModal from './components/RAGModal';
import {
  fetchHealth,
  fetchModels,
  fetchConversations,
  fetchConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  getApiBaseUrl
} from './services/api';

export default function App() {
  const [health, setHealth] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('llama3.2:1b');
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);

  // Inference state
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [systemPrompt, setSystemPrompt] = useState('You are a concise, helpful assistant.');
  const [useRAG, setUseRAG] = useState(false);

  // Streaming lifecycle
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [activeToolCalls, setActiveToolCalls] = useState([]);
  const [streamingCitations, setStreamingCitations] = useState([]);
  const abortControllerRef = useRef(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRAGOpen, setIsRAGOpen] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      const h = await fetchHealth();
      setHealth(h);
      const m = await fetchModels();
      if (m.models && m.models.length > 0) {
        setModels(m.models);
        setSelectedModel(m.models[0].name);
      }
      await refreshConversations();
    } catch (e) {
      console.warn('Initialization note: Ollama backend may still be starting or requires access code / tunnel URL:', e);
    }
  };

  const refreshConversations = async () => {
    try {
      const list = await fetchConversations();
      if (Array.isArray(list)) {
        setConversations(list);
        if (list.length > 0 && !activeConvId) {
          loadConversation(list[0].id);
        }
      }
    } catch (e) {
      console.warn('Failed to load conversations:', e);
    }
  };

  const loadConversation = async (id) => {
    try {
      setActiveConvId(id);
      const detail = await fetchConversation(id);
      setMessages(detail.messages || []);
    } catch (e) {
      console.warn('Failed to load conversation details:', e);
    }
  };

  const handleCreateConv = async () => {
    try {
      const res = await createConversation('New Conversation');
      await refreshConversations();
      if (res && res.id) {
        setActiveConvId(res.id);
        setMessages([]);
      }
    } catch (e) {
      console.error('Failed to create conversation:', e);
    }
  };

  const handleRenameConv = async (id, title) => {
    try {
      await updateConversation(id, title);
      await refreshConversations();
    } catch (e) {
      console.error('Failed to rename conversation:', e);
    }
  };

  const handleDeleteConv = async (id) => {
    try {
      await deleteConversation(id);
      if (activeConvId === id) {
        setActiveConvId(null);
        setMessages([]);
      }
      await refreshConversations();
    } catch (e) {
      console.error('Failed to delete conversation:', e);
    }
  };

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  const handleSendMessage = async (text) => {
    let convId = activeConvId;
    if (!convId) {
      try {
        const newConv = await createConversation(text.slice(0, 24));
        convId = newConv.id;
        setActiveConvId(convId);
        await refreshConversations();
      } catch (e) {
        console.error('Failed to auto-create conversation:', e);
        return;
      }
    }

    // Optimistic user message rendering
    const userMsg = {
      id: String(Date.now()),
      conversation_id: convId,
      role: 'user',
      content: text
    };
    setMessages((prev) => [...prev, userMsg]);

    setIsStreaming(true);
    setStreamingMessage('');
    setActiveToolCalls([]);
    setStreamingCitations([]);

    abortControllerRef.current = new AbortController();
    const code = localStorage.getItem('access_code') || '';
    const baseUrl = getApiBaseUrl();

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Code': code
        },
        body: JSON.stringify({
          conversation_id: convId,
          model: selectedModel,
          message: text,
          temperature,
          max_tokens: maxTokens,
          system_prompt: systemPrompt,
          use_rag: useRAG
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop();

        for (const evt of events) {
          if (!evt.trim()) continue;
          const lines = evt.split('\n');
          const eventLine = lines.find((l) => l.startsWith('event: '));
          const dataLine = lines.find((l) => l.startsWith('data: '));

          if (!eventLine || !dataLine) continue;
          const eventType = eventLine.replace('event: ', '').trim();
          const data = JSON.parse(dataLine.replace('data: ', '').trim());

          if (eventType === 'token') {
            setStreamingMessage((prev) => prev + data.text);
          } else if (eventType === 'tool_call') {
            setActiveToolCalls((prev) => [...prev, { name: data.name, arguments: data.arguments, result: null }]);
          } else if (eventType === 'tool_result') {
            setActiveToolCalls((prev) =>
              prev.map((tc) => (tc.name === data.name && tc.result === null ? { ...tc, result: data.result } : tc))
            );
          } else if (eventType === 'citation') {
            setStreamingCitations((prev) => [...prev, data]);
          } else if (eventType === 'done') {
            await loadConversation(convId);
          } else if (eventType === 'error') {
            setStreamingMessage((prev) => prev + `\n\n[Error: ${data.error}]`);
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setStreamingMessage((prev) => prev + `\n\n[Stream Failure: ${err.message}]`);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content);
    }
  };

  const promptAccessCode = () => {
    const current = localStorage.getItem('access_code') || '';
    const updated = prompt('Enter evaluator Access Code (Leave blank if not configured):', current);
    if (updated !== null) {
      localStorage.setItem('access_code', updated.trim());
      initApp();
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Navbar
        health={health}
        models={models}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenRAG={() => setIsRAGOpen(true)}
        onOpenAccessCode={promptAccessCode}
      />

      <div className="flex flex-1 h-[calc(100vh-3.5rem)] overflow-hidden">
        <Sidebar
          conversations={conversations}
          activeId={activeConvId}
          onSelect={loadConversation}
          onCreate={handleCreateConv}
          onDelete={handleDeleteConv}
          onRename={handleRenameConv}
        />

        <ChatWindow
          messages={messages}
          streamingMessage={streamingMessage}
          activeToolCalls={activeToolCalls}
          streamingCitations={streamingCitations}
          isStreaming={isStreaming}
          onSend={handleSendMessage}
          onStop={handleStopStream}
          onRegenerate={handleRegenerate}
        />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        temperature={temperature}
        setTemperature={setTemperature}
        maxTokens={maxTokens}
        setMaxTokens={setMaxTokens}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        useRAG={useRAG}
        setUseRAG={setUseRAG}
        onSaveBackendUrl={() => initApp()}
      />

      <RAGModal isOpen={isRAGOpen} onClose={() => setIsRAGOpen(false)} />
    </div>
  );
}
