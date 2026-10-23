import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  temperature,
  setTemperature,
  maxTokens,
  setMaxTokens,
  systemPrompt,
  setSystemPrompt,
  useRAG,
  setUseRAG,
  onSaveBackendUrl
}) {
  const [backendUrl, setBackendUrl] = useState(localStorage.getItem('backend_url') || '');

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('backend_url', backendUrl.trim());
    if (onSaveBackendUrl) onSaveBackendUrl(backendUrl.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl">
        <div className="flex justify-between items-center border-b border-gray-800 pb-3">
          <h3 className="font-semibold text-gray-200 text-sm">System & Model Configuration</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-gray-300 mb-1">Backend Server / Cloudflare Tunnel URL</label>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="e.g. https://xxxx.trycloudflare.com or leave blank for /api"
              className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-gray-200 text-xs focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[10px] text-gray-500">
              When deployed on GitHub Pages, set your Cloudflare tunnel or VPS URL here.
            </span>
          </div>

          <div>
            <div className="flex justify-between text-gray-300 mb-1">
              <span>Temperature</span>
              <span className="font-mono">{temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-gray-300 mb-1">
              <span>Max Tokens</span>
              <span className="font-mono">{maxTokens}</span>
            </div>
            <input
              type="range"
              min="64"
              max="2048"
              step="64"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-1">System Instructions</label>
            <textarea
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-gray-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-800">
            <div>
              <span className="text-gray-300 block">Enable RAG Retrieval</span>
              <span className="text-[10px] text-gray-500">Inject context chunks from uploaded documents</span>
            </div>
            <input
              type="checkbox"
              checked={useRAG}
              onChange={(e) => setUseRAG(e.target.checked)}
              className="h-4 w-4 accent-indigo-500 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium"
          >
            Apply & Save
          </button>
        </div>
      </div>
    </div>
  );
}
