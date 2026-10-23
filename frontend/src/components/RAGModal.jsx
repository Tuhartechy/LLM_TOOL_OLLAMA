import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { uploadRAGDocument } from '../services/api';

export default function RAGModal({ isOpen, onClose }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setStatus('');
    try {
      const res = await uploadRAGDocument(file);
      if (res.chunks_stored) {
        setStatus(`Success! Indexed ${res.chunks_stored} chunks into vector knowledge base.`);
      } else if (res.detail) {
        setStatus(`Upload failed: ${res.detail}`);
      } else {
        setStatus('Uploaded and indexed successfully.');
      }
      setFile(null);
    } catch (err) {
      setStatus(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl text-xs">
        <div className="flex justify-between items-center border-b border-gray-800 pb-3">
          <h3 className="font-semibold text-gray-200 text-sm">Knowledge Base Ingestion (RAG)</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <p className="text-gray-400">
          Upload plain text (<code>.txt</code>, <code>.md</code>) documents. Contents are chunked, transformed via <code>nomic-embed-text</code>, and indexed into SQLite for cosine similarity search.
        </p>

        <div className="border border-dashed border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center space-y-2 bg-gray-950/40">
          <Upload size={24} className="text-gray-500" />
          <input
            type="file"
            accept=".txt,.md"
            onChange={(e) => setFile(e.target.files[0])}
            className="text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-800 file:text-indigo-400 cursor-pointer"
          />
        </div>

        {status && (
          <div className="p-2 rounded bg-gray-950 border border-gray-800 text-gray-300">
            {status}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded font-medium"
        >
          {loading ? 'Embedding & Indexing...' : 'Index Document'}
        </button>
      </div>
    </div>
  );
}
