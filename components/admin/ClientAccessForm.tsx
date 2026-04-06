'use client';
import { useState, useEffect } from 'react';

export default function ClientAccessForm() {
  const [hasPassword, setHasPassword]     = useState(false);
  const [newPassword, setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [success, setSuccess]             = useState('');
  const [error, setError]                 = useState('');

  useEffect(() => {
    fetch('/api/admin/config')
      .then((r) => r.json())
      .then((data) => {
        setHasPassword(!!data.hasClientPassword);
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/config/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientPassword: newPassword }),
      });

      if (res.ok) {
        setHasPassword(true);
        setNewPassword('');
        setConfirmPassword('');
        setSuccess('Client password saved.');
        setTimeout(() => setSuccess(''), 3000);
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

  const handleRemove = async () => {
    if (!confirm('Remove the client password? Clients will no longer be able to log in with it.')) return;
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch('/api/admin/config/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remove: true }),
      });

      if (res.ok) {
        setHasPassword(false);
        setSuccess('Client password removed.');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await res.json();
        setError(data.error ?? 'Remove failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="space-y-5 max-w-lg">
      {/* Current status */}
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${hasPassword ? 'bg-green-500' : 'bg-gray-300'}`} />
        <span className="text-sm text-gray-600">
          {hasPassword ? 'Client password is set.' : 'No client password set.'}
        </span>
        {hasPassword && (
          <button
            onClick={handleRemove}
            disabled={saving}
            className="ml-2 text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
          >
            Remove
          </button>
        )}
      </div>

      {/* Set / change password */}
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {hasPassword ? 'New password' : 'Set password'}
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 6 characters"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat password"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {error   && <p className="text-sm text-red-600   bg-red-50   px-3 py-2 rounded-lg">{error}</p>}
        {success && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : hasPassword ? 'Change Password' : 'Set Password'}
        </button>
      </form>
    </div>
  );
}
