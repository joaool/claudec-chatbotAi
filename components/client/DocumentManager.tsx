'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

interface FileItem { id: string; filename: string; size: number; status: string; createdAt: number; }
interface AssistantOption { _id: string; name: string; isDefault: boolean; }

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ClientDocumentManager({ slug }: { slug: string }) {
  const base = `/c/${slug}/api`;
  const [files, setFiles]           = useState<FileItem[]>([]);
  const [assistants, setAssistants] = useState<AssistantOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [uploading, setUploading]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [deleting, setDeleting]     = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deletedIds   = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetch(`${base}/assistants`).then(r => r.json()).then(d => {
      const list: AssistantOption[] = d.assistants ?? [];
      setAssistants(list);
      const def = list.find(a => a.isDefault) ?? list[0];
      if (def) setSelectedId(def._id);
      else setLoading(false);
    });
  }, [base]);

  const fetchFiles = useCallback((aId: string) =>
    fetch(`${base}/documents?assistantId=${aId}`).then(r => r.json()).then(d => {
      const fresh = (d.files ?? []) as FileItem[];
      const visible = fresh.filter(f => !deletedIds.current.has(f.id));
      setFiles(visible); return visible;
    }), [base]);

  useEffect(() => {
    if (!selectedId) return;
    deletedIds.current.clear(); setLoading(true);
    fetchFiles(selectedId).finally(() => setLoading(false));
  }, [selectedId, fetchFiles]);

  useEffect(() => {
    if (!selectedId) return;
    if (!files.some(f => f.status === 'in_progress')) return;
    const t = setTimeout(() => fetchFiles(selectedId), 3000);
    return () => clearTimeout(t);
  }, [files, selectedId, fetchFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedId) { setError('Create an assistant first.'); return; }
    setUploading(true); setError('');
    const fd = new FormData(); fd.append('file', file); fd.append('assistantId', selectedId);
    try {
      const res = await fetch(`${base}/documents`, { method: 'POST', body: fd });
      if (res.ok) await fetchFiles(selectedId);
      else { const d = await res.json(); setError(d.error ?? 'Upload failed'); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Remove this document?')) return;
    setDeleting(fileId); setError('');
    const res = await fetch(`${base}/documents?fileId=${fileId}&assistantId=${selectedId}`, { method: 'DELETE' });
    if (res.ok) { deletedIds.current.add(fileId); setFiles(prev => prev.filter(f => f.id !== fileId)); }
    else { const d = await res.json(); setError(d.error ?? 'Delete failed'); }
    setDeleting(null);
  };

  if (!loading && assistants.length === 0) return (
    <div className="text-center py-16 text-gray-500">
      <p className="font-medium">No assistants configured yet.</p>
      <p className="text-sm mt-1">Create an assistant first.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Assistant:</label>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {assistants.map(a => <option key={a._id} value={a._id}>{a.name}{a.isDefault ? ' (default)' : ''}</option>)}
        </select>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-blue-400 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}>
        <input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden" accept=".pdf,.txt,.md,.docx,.csv" />
        {uploading ? <p className="text-sm text-gray-500 animate-pulse">Uploading…</p> : (
          <><p className="text-sm font-medium text-gray-700">Click to upload a document</p>
          <p className="text-xs text-gray-400 mt-1">PDF, TXT, MD, DOCX, CSV</p></>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {loading ? <p className="text-sm text-gray-400">Loading…</p>
      : files.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No documents yet.</p>
      : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">File Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 whitespace-nowrap">Date Modified</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Size</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {files.map(file => (
                <tr key={file.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{file.filename}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {file.createdAt ? new Date(file.createdAt * 1000).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatSize(file.size)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${file.status === 'completed' ? 'bg-green-50 text-green-700' : file.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
                      {file.status === 'in_progress' && <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />}
                      {file.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(file.id)} disabled={deleting === file.id}
                      className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-40">
                      {deleting === file.id ? 'Removing…' : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
