'use client';
import { useState, useEffect } from 'react';

interface ClientItem {
  _id: string;
  slug: string;
  name: string;
  label: string;
  isActive: boolean;
  createdAt: string;
}

interface ClientFormData {
  name: string;
  slug: string;
  label: string;
  openaiApiKey: string;
  clientPassword: string;
  isActive: boolean;
}

const emptyForm: ClientFormData = { name: '', slug: '', label: '', openaiApiKey: '', clientPassword: '', isActive: true };

export default function ClientsList() {
  const [clients, setClients]     = useState<ClientItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<ClientItem | null>(null);
  const [form, setForm]           = useState<ClientFormData>(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/clients');
    if (res.ok) { const d = await res.json(); setClients(d.clients); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowForm(true); };
  const openEdit   = (c: ClientItem) => {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug, label: c.label, openaiApiKey: '', clientPassword: '', isActive: c.isActive });
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const res = editing
        ? await fetch('/api/admin/clients', { method: 'PUT',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing._id, ...form }) })
        : await fetch('/api/admin/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { setShowForm(false); load(); }
      else { const d = await res.json(); setError(d.error ?? 'Save failed'); }
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete client "${name}"? This will NOT delete their OpenAI data.`)) return;
    await fetch(`/api/admin/clients?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + New Client
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">{editing ? 'Edit Client' : 'New Client'}</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Client Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Acme Corp" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">URL Slug * {editing && <span className="text-gray-400">(cannot change)</span>}</label>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                required disabled={!!editing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" placeholder="acme" />
              {!editing && <p className="text-xs text-gray-400 mt-1">Chat URL: /c/{form.slug || 'slug'}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Chatbot Label</label>
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Acme Assistant" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">OpenAI API Key {editing && <span className="text-gray-400">(leave blank to keep current)</span>}</label>
            <input type="password" value={form.openaiApiKey} onChange={e => setForm(f => ({ ...f, openaiApiKey: e.target.value }))}
              required={!editing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="sk-..." />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Client Password {editing && <span className="text-gray-400">(leave blank to keep current)</span>}</label>
            <input type="password" value={form.clientPassword} onChange={e => setForm(f => ({ ...f, clientPassword: e.target.value }))}
              required={!editing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Min 6 characters" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? <p className="text-sm text-gray-400">Loading…</p> : clients.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-16">No clients yet.</p>
      ) : (
        <div className="space-y-3">
          {clients.map(c => (
            <div key={c._id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{c.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-mono">{c.slug}</span>
                  {!c.isActive && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Inactive</span>}
                </div>
                <div className="flex gap-4 mt-1 text-xs text-gray-400">
                  <span>Chat: <a href={`/c/${c.slug}`} target="_blank" className="text-blue-500 hover:underline">/c/{c.slug}</a></span>
                  <span>Admin: <a href={`/c/${c.slug}/admin`} target="_blank" className="text-blue-500 hover:underline">/c/{c.slug}/admin</a></span>
                </div>
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => openEdit(c)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                <button onClick={() => handleDelete(c._id, c.name)} className="text-sm text-red-500 hover:text-red-700 font-medium">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
