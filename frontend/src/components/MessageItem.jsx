import React, { useState } from 'react';
import { Copy, Check, User, Bot, FileText } from 'lucide-react';
import ToolCard from './ToolCard';

export default function MessageItem({ role, content, toolCalls, citations }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Safe client-side markdown code block rendering
  const renderFormattedContent = (rawText) => {
    if (!rawText) return null;
    const parts = rawText.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const lang = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
        const code = lang ? lines.slice(1).join('\n') : lines.join('\n');

        return (
          <div key={index} className="my-2 rounded bg-black/60 border border-gray-800 overflow-hidden font-mono text-xs">
            <div className="flex justify-between items-center px-3 py-1 bg-gray-900 border-b border-gray-800 text-gray-400 text-[10px]">
              <span>{lang || 'code'}</span>
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="hover:text-white flex items-center space-x-1"
              >
                <Copy size={10} />
                <span>Copy</span>
              </button>
            </div>
            <pre className="p-3 overflow-x-auto text-emerald-400">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Convert inline backticks safely
      const inlineSegments = part.split(/(`[^`]+`)/g);
      return (
        <span key={index} className="whitespace-pre-wrap leading-relaxed">
          {inlineSegments.map((seg, sIdx) => {
            if (seg.startsWith('`') && seg.endsWith('`')) {
              return (
                <code key={sIdx} className="bg-gray-800 text-indigo-300 px-1 py-0.5 rounded text-xs font-mono">
                  {seg.slice(1, -1)}
                </code>
              );
            }
            return seg;
          })}
        </span>
      );
    });
  };

  return (
    <div className={`py-4 px-4 flex space-x-3 ${role === 'user' ? 'bg-gray-900/30' : 'bg-gray-950/40'}`}>
      <div className="shrink-0 pt-0.5">
        {role === 'user' ? (
          <div className="w-6 h-6 rounded bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
            <User size={14} />
          </div>
        ) : (
          <div className="w-6 h-6 rounded bg-emerald-600/30 text-emerald-400 flex items-center justify-center">
            <Bot size={14} />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-hidden text-sm text-gray-200">
        {citations && citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {citations.map((c, i) => (
              <div key={i} className="flex items-center space-x-1 bg-gray-800/80 border border-gray-700 px-2 py-0.5 rounded text-[10px] text-indigo-300">
                <FileText size={10} />
                <span>{c.filename}</span>
              </div>
            ))}
          </div>
        )}

        {toolCalls && toolCalls.map((tc, idx) => (
          <ToolCard key={idx} name={tc.name} args={tc.arguments} result={tc.result} />
        ))}

        <div>{renderFormattedContent(content)}</div>

        {role === 'assistant' && content && (
          <div className="pt-2">
            <button
              onClick={copyToClipboard}
              className="text-gray-500 hover:text-gray-300 text-xs flex items-center space-x-1 transition"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy output'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
