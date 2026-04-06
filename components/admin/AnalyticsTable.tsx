'use client';
import React, { useState, useEffect, useCallback } from 'react';

interface Conversation {
  _id: string;
  sessionId: string;
  question: string;
  answer: string;
  assistantName: string;
  sources: string[];
  userIp: string;
  timestamp: string;
}

interface Filters {
  search: string;
  dateFrom: string;
  dateTo: string;
}

export default function AnalyticsTable() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [inputSearch, setInputSearch]     = useState('');
  const [inputDateFrom, setInputDateFrom] = useState('');
  const [inputDateTo, setInputDateTo]     = useState('');
  const [filters, setFilters] = useState<Filters>({ search: '', dateFrom: '', dateTo: '' });
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(false);
  const [expanded, setExpanded]     = useState<string | null>(null);

  const fetchData = useCallback(async (f: Filters, p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (f.search)   params.set('search',   f.search);
    if (f.dateFrom) params.set('dateFrom', f.dateFrom);
    if (f.dateTo)   params.set('dateTo',   f.dateTo);

    try {
      const res = await fetch(`/api/admin/analytics?${params}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(filters, page); }, [filters, page, fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newFilters = { search: inputSearch, dateFrom: inputDateFrom, dateTo: inputDateTo };
    setFilters(newFilters);
    setPage(1);
  };

  const handleClear = () => {
    setInputSearch('');
    setInputDateFrom('');
    setInputDateTo('');
    setFilters({ search: '', dateFrom: '', dateTo: '' });
    setPage(1);
  };

  const fmt = (ts: string) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end bg-white border border-gray-200 rounded-xl p-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Search questions</label>
          <input
            value={inputSearch}
            onChange={(e) => setInputSearch(e.target.value)}
            placeholder="Keyword…"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input
            type="date"
            value={inputDateFrom}
            onChange={(e) => setInputDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input
            type="date"
            value={inputDateTo}
            onChange={(e) => setInputDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Clear
        </button>
      </form>

      <p className="text-sm text-gray-500 px-1">
        {loading ? 'Loading…' : `${total} conversation${total !== 1 ? 's' : ''} found`}
      </p>

      {!loading && conversations.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No conversations found.</p>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Question</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 whitespace-nowrap">IP</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 whitespace-nowrap">Session</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 whitespace-nowrap">Assistant</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 whitespace-nowrap">Date</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {conversations.map((conv) => (
                <React.Fragment key={conv._id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800 max-w-sm">
                      <p className="truncate">{conv.question}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">{conv.userIp || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap font-mono text-xs" title={conv.sessionId}>{conv.sessionId?.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{conv.assistantName}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(conv.timestamp)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setExpanded(expanded === conv._id ? null : conv._id)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        {expanded === conv._id ? 'Collapse' : 'View'}
                      </button>
                    </td>
                  </tr>

                  {expanded === conv._id && (
                    <tr className="bg-blue-50">
                      <td colSpan={4} className="px-4 py-4">
                        <div className="space-y-3 max-w-3xl">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Question</p>
                            <p className="text-sm text-gray-800">{conv.question}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Answer</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{conv.answer}</p>
                          </div>
                          {conv.sources?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Sources</p>
                              <div className="flex gap-2 flex-wrap">
                                {conv.sources.map((s, i) => (
                                  <span key={i} className="text-xs bg-white border border-blue-200 text-blue-600 px-2 py-0.5 rounded-full">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex gap-6 text-xs text-gray-400 font-mono pt-1">
                            <span><span className="font-semibold text-gray-500 not-italic">IP:</span> {conv.userIp || '—'}</span>
                            <span><span className="font-semibold text-gray-500 not-italic">Session:</span> {conv.sessionId}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
