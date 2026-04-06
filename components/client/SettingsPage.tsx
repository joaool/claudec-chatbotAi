'use client';
import { useState, useEffect, useRef } from 'react';

export default function ClientSettingsPage({ slug }: { slug: string }) {
  const base = `/c/${slug}/api`;
  const [label, setLabel]               = useState('');
  const [iconDataUrl, setIconDataUrl]   = useState('');
  const [newPassword, setNewPassword]   = useState('');
  const [confirmPw, setConfirmPw]       = useState('');
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [savingPw, setSavingPw]         = useState(false);
  const [successBrand, setSuccessBrand] = useState(false);
  const [successPw, setSuccessPw]       = useState(false);
  const [error, setError]               = useState('');
  const [errorPw, setErrorPw]           = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${base}/config`).then(r => r.json()).then(d => { setLabel(d.label); setIconDataUrl(d.iconDataUrl); setLoading(false); });
  }, [base]);

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      const res = await fetch(`${base}/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label, iconDataUrl }) });
      if (res.ok) { setSuccessBrand(true); setTimeout(() => setSuccessBrand(false), 3000); }
      else { const d = await res.json(); setError(d.error ?? 'Save failed'); }
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  const handleSavePw = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorPw('');
    if (newPassword !== confirmPw) { setErrorPw('Passwords do not match.'); return; }
    if (newPassword.length < 6)    { setErrorPw('Minimum 6 characters.'); return; }
    setSavingPw(true);
    try {
      const res = await fetch(`${base}/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientPassword: newPassword }) });
      if (res.ok) { setNewPassword(''); setConfirmPw(''); setSuccessPw(true); setTimeout(() => setSuccessPw(false), 3000); }
      else { const d = await res.json(); setErrorPw(d.error ?? 'Save failed'); }
    } catch { setErrorPw('Network error'); }
    finally { setSavingPw(false); }
  };

  const handleIcon = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) { setError('Icon must be under 512 KB.'); return; }
    const reader = new FileReader();
    reader.onload = ev => setIconDataUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="space-y-12 max-w-lg">
      {/* Branding */}
      <section>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Settings</h1>
        <p className="text-sm text-gray-500 mb-6">Update your chatbot label and icon.</p>
        <form onSubmit={handleSaveBrand} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chatbot Label</label>
            <input value={label} onChange={e => setLabel(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                {iconDataUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={iconDataUrl} alt="icon" className="w-full h-full object-contain" />
                  : <span className="text-2xl">🤖</span>}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">Upload</button>
                {iconDataUrl && <button type="button" onClick={() => setIconDataUrl('')}
                  className="px-3 py-1.5 border border-red-200 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors">Remove</button>}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleIcon} className="hidden" />
            </div>
          </div>
          {/* Preview */}
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Preview</p>
            <div className="flex items-center gap-2">
              {iconDataUrl && <img src={iconDataUrl} alt="" className="w-7 h-7 object-contain rounded" />}
              <span className="text-base font-semibold text-gray-900">{label || 'Chatbot AI'}</span>
            </div>
          </div>
          {error        && <p className="text-sm text-red-600   bg-red-50   px-3 py-2 rounded-lg">{error}</p>}
          {successBrand && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">Branding saved.</p>}
          <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save Branding'}
          </button>
        </form>
      </section>

      <hr className="border-gray-200" />

      {/* Password */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Change Admin Password</h2>
        <p className="text-sm text-gray-500 mb-6">Update the password used to log into this admin panel.</p>
        <form onSubmit={handleSavePw} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="Min 6 characters"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required placeholder="Repeat password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {errorPw  && <p className="text-sm text-red-600   bg-red-50   px-3 py-2 rounded-lg">{errorPw}</p>}
          {successPw && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">Password updated.</p>}
          <button type="submit" disabled={savingPw} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {savingPw ? 'Saving…' : 'Change Password'}
          </button>
        </form>
      </section>
    </div>
  );
}
