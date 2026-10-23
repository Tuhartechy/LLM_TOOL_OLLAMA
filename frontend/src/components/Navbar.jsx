import React from 'react';
import { Activity, Settings, Database, Key } from 'lucide-react';

export default function Navbar({
  health,
  models,
  selectedModel,
  setSelectedModel,
  onOpenSettings,
  onOpenRAG,
  onOpenAccessCode
}) {
  return (
    <header className="h-14 border-b border-gray-800 bg-gray-950 px-4 flex items-center justify-between z-10 select-none">
      <div className="flex items-center space-x-3">
        <span className="font-bold tracking-wide text-indigo-400 text-lg">Ollama LLM Tool</span>
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-xs bg-gray-900 border border-gray-800">
          <span className={`w-2 h-2 rounded-full ${health?.ollama ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-gray-300 font-medium">{health?.ollama ? 'Connected' : 'Offline'}</span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
        >
          {models.length === 0 && <option value="llama3.2:1b">llama3.2:1b (default)</option>}
          {models.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>

        <button
          onClick={onOpenRAG}
          title="RAG Knowledge Center"
          className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-indigo-400 rounded-md transition-colors"
        >
          <Database size={18} />
        </button>

        <button
          onClick={onOpenSettings}
          title="Inference Parameters & Backend URL"
          className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-indigo-400 rounded-md transition-colors"
        >
          <Settings size={18} />
        </button>

        <button
          onClick={onOpenAccessCode}
          title="Set Access Code"
          className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-indigo-400 rounded-md transition-colors"
        >
          <Key size={18} />
        </button>
      </div>
    </header>
  );
}
