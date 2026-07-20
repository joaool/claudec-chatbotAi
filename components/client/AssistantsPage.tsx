'use client';
import { useState, useEffect } from 'react';

interface KeywordLink { keyword: string; url: string; }
interface Assistant { _id: string; name: string; instructions: string; model: string; isDefault: boolean; keywordLinks?: KeywordLink[]; }

const MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
const emptyForm = { name: '', instructions: '', model: 'gpt-4o', isDefault: false, keywordLinks: [] as KeywordLink[] };

export default function ClientAssistantsPage({ slug }: { slug: string }) {
  const base = `/c/${slug}/api`;
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<Assistant | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch(`${base}/assistants`);
    if (res.ok) { const d = await res.json(); setAssistants(d.assistants); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [base]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(''); setShowForm(true); };
  const openEdit   = (a: Assistant) => { setEditing(a); setForm({ name: a.name, instructions: a.instructions, model: a.model, isDefault: a.isDefault, keywordLinks: a.keywordLinks ?? [] }); setError(''); setShowForm(true); };

  const addLinkRow    = () => setForm(f => ({ ...f, keywordLinks: [...f.keywordLinks, { keyword: '', url: '' }] }));
  const removeLinkRow = (i: number) => setForm(f => ({ ...f, keywordLinks: f.keywordLinks.filter((_, idx) => idx !== i) }));
  const updateLinkRow = (i: number, field: 'keyword' | 'url', value: string) =>
    setForm(f => ({ ...f, keywordLinks: f.keywordLinks.map((row, idx) => idx === i ? { ...row, [field]: value } : row) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true);
    const keywordLinks = form.keywordLinks
      .map(row => ({ keyword: row.keyword.trim(), url: row.url.trim() }))
      .filter(row => row.keyword && row.url);
    try {
      const res = editing
        ? await fetch(`${base}/assistants`, { method: 'PUT',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing._id, ...form, keywordLinks }) })
        : await fetch(`${base}/assistants`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, keywordLinks, makeDefault: form.isDefault }) });
      if (res.ok) { setShowForm(false); load(); }
      else { const d = await res.json(); setError(d.error ?? 'Save failed'); }
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this assistant and its vector store?')) return;
    await fetch(`${base}/assistants?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Assistants</h1>
        {!showForm && <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">+ New Assistant</button>}
      </div>
      <p className="text-sm text-gray-500 mb-8">Each assistant has its own knowledge base and system instructions.</p>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">{editing ? 'Edit Assistant' : 'New Assistant'}</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <select value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">System Instructions</label>
            <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} required rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Keyword Links</label>
              <button type="button" onClick={addLinkRow} className="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add link</button>
            </div>
            <p className="text-xs text-gray-400 mb-2">Whenever a keyword appears in the assistant&apos;s answer, it will be turned into a real link to the given URL.</p>
            {form.keywordLinks.length === 0 && <p className="text-sm text-gray-400">No keyword links yet.</p>}
            <div className="space-y-2">
              {form.keywordLinks.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={row.keyword} onChange={e => updateLinkRow(i, 'keyword', e.target.value)} placeholder="Keyword, e.g. Pricing"
                    className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input value={row.url} onChange={e => updateLinkRow(i, 'url', e.target.value)} placeholder="https://..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => removeLinkRow(i)} className="text-sm text-red-500 hover:text-red-700 font-medium shrink-0">Remove</button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="def" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} className="rounded" />
            <label htmlFor="def" className="text-sm text-gray-700">Set as default assistant</label>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {loading ? <p className="text-sm text-gray-400">Loading…</p>
      : assistants.length === 0 ? <p className="text-sm text-gray-400 text-center py-16">No assistants yet.</p>
      : (
        <div className="space-y-3">
          {assistants.map(a => (
            <div key={a._id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{a.name}</span>
                  {a.isDefault && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium border border-blue-100">Default</span>}
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{a.model}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.instructions}</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => openEdit(a)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                <button onClick={() => handleDelete(a._id)} className="text-sm text-red-500 hover:text-red-700 font-medium">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
