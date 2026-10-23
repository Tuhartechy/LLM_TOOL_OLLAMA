import React from 'react';
import { Wrench, CheckCircle2 } from 'lucide-react';

export default function ToolCard({ name, args, result }) {
  return (
    <div className="my-2 border border-gray-800 bg-gray-900/80 rounded-md overflow-hidden text-xs">
      <div className="bg-gray-800/60 px-3 py-1.5 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center space-x-2 text-indigo-400 font-mono font-medium">
          <Wrench size={12} />
          <span>tool: {name}</span>
        </div>
        {result && (
          <div className="flex items-center space-x-1 text-green-400">
            <CheckCircle2 size={12} />
            <span className="text-[10px]">executed</span>
          </div>
        )}
      </div>
      <div className="p-2 space-y-1 font-mono">
        <div className="text-gray-400">
          <span className="text-gray-500">args:</span> {JSON.stringify(args)}
        </div>
        {result && (
          <div className="text-gray-200 pt-1 border-t border-gray-800/50">
            <span className="text-gray-500">result:</span> {result}
          </div>
        )}
      </div>
    </div>
  );
}
