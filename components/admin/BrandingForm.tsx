'use client';
import { useState, useEffect, useRef } from 'react';

export default function BrandingForm() {
  const [label, setLabel]           = useState('');
  const [iconDataUrl, setIconDataUrl] = useState('');
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/admin/config')
      .then((r) => r.json())
      .then((data) => {
        setLabel(data.label ?? '');
        setIconDataUrl(data.iconDataUrl ?? '');
        setLoading(false);
      });
  }, []);

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 512 * 1024) {
      setError('Icon image must be under 512 KB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setIconDataUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, iconDataUrl }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error ?? 'Save failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-lg">
      {/* Label */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Chatbot Label</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Chatbot AI"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <p className="text-xs text-gray-400 mt-1">Displayed at the top of the chat window.</p>
      </div>

      {/* Icon */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>

        <div className="flex items-center gap-4">
          {/* Preview box */}
          <div className="w-12 h-12 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
            {iconDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={iconDataUrl} alt="icon preview" className="w-full h-full object-contain" />
            ) : (
              <span className="text-2xl">🤖</span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Upload image
            </button>
            {iconDataUrl && (
              <button
                type="button"
                onClick={() => {
                  setIconDataUrl('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-3 py-1.5 border border-red-200 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleIconUpload}
            className="hidden"
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">PNG, JPG, SVG, WEBP — max 512 KB.</p>
      </div>

      {/* Live preview */}
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Preview</p>
        <div className="flex items-center gap-2">
          {iconDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={iconDataUrl} alt="icon" className="w-7 h-7 object-contain rounded" />
          )}
          <span className="text-base font-semibold text-gray-900">{label || 'Chatbot AI'}</span>
        </div>
      </div>

      {error   && <p className="text-sm text-red-600   bg-red-50   px-3 py-2 rounded-lg">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">Settings saved successfully.</p>}

      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  );
}
