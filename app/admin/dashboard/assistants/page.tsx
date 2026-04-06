'use client';
import { useState, useEffect } from 'react';
import AssistantForm from '@/components/admin/AssistantForm';

interface Assistant {
  _id: string;
  name: string;
  instructions: string;
  model: string;
  vectorStoreId: string;
  isDefault: boolean;
}

export default function AssistantsPage() {
  const [assistants, setAssistants]         = useState<Assistant[]>([]);
  const [showForm, setShowForm]             = useState(false);
  const [editTarget, setEditTarget]         = useState<Assistant | undefined>();
  const [loading, setLoading]               = useState(true);
  const [deleteError, setDeleteError]       = useState('');

  const loadAssistants = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/assistants');
    if (res.ok) {
      const data = await res.json();
      setAssistants(data.assistants);
    }
    setLoading(false);
  };

  useEffect(() => { loadAssistants(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this assistant and its vector store? This cannot be undone.')) return;
    setDeleteError('');

    const res = await fetch(`/api/admin/assistants?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setAssistants((prev) => prev.filter((a) => a._id !== id));
    } else {
      const data = await res.json();
      setDeleteError(data.error ?? 'Delete failed');
    }
  };

  const handleEdit = (assistant: Assistant) => {
    setEditTarget(assistant);
    setShowForm(true);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditTarget(undefined);
    loadAssistants();
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditTarget(undefined);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Assistants</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + New Assistant
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-8">
        Each assistant has its own knowledge base (vector store) and system instructions.
      </p>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {editTarget ? 'Edit Assistant' : 'New Assistant'}
          </h2>
          <AssistantForm assistant={editTarget} onSave={handleSaved} onCancel={handleCancel} />
        </div>
      )}

      {deleteError && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">{deleteError}</p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : assistants.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-16">
          No assistants yet. Create one to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {assistants.map((a) => (
            <div key={a._id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{a.name}</h3>
                    {a.isDefault && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium border border-blue-100">
                        Default
                      </span>
                    )}
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {a.model}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.instructions}</p>
                  <p className="text-xs text-gray-400 mt-1">Vector store: {a.vectorStoreId}</p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button
                    onClick={() => handleEdit(a)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(a._id)}
                    className="text-sm text-red-500 hover:text-red-700 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
