import React from 'react';
import { Plus, MessageSquare, Trash2, Edit2, Check, X } from 'lucide-react';

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onRename
}) {
  const [editingId, setEditingId] = React.useState(null);
  const [renameTitle, setRenameTitle] = React.useState('');

  const startRename = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setRenameTitle(conv.title);
  };

  const submitRename = (id, e) => {
    e.stopPropagation();
    if (renameTitle.trim()) {
      onRename(id, renameTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <aside className="w-64 border-r border-gray-800 bg-gray-950 flex flex-col h-full select-none">
      <div className="p-3">
        <button
          onClick={onCreate}
          className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-md text-sm font-medium transition"
        >
          <Plus size={16} />
          <span>New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {conversations.map((c) => {
          const isActive = c.id === activeId;
          return (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`group flex items-center justify-between px-3 py-2 rounded-md text-xs cursor-pointer transition ${
                isActive ? 'bg-gray-800 text-white font-medium' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'
              }`}
            >
              {editingId === c.id ? (
                <div className="flex items-center space-x-1 w-full" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={renameTitle}
                    onChange={(e) => setRenameTitle(e.target.value)}
                    className="bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded border border-gray-700 w-full focus:outline-none"
                    autoFocus
                  />
                  <button onClick={(e) => submitRename(c.id, e)} className="text-green-400 hover:text-green-300">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-red-400 hover:text-red-300">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2 truncate">
                    <MessageSquare size={14} className="shrink-0" />
                    <span className="truncate">{c.title}</span>
                  </div>
                  <div className="hidden group-hover:flex items-center space-x-1 shrink-0">
                    <button
                      onClick={(e) => startRename(c, e)}
                      className="p-1 hover:text-gray-200"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(c.id);
                      }}
                      className="p-1 hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
