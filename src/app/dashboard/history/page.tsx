'use client';

import { useState, useEffect } from 'react';
import { History, Loader2, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface HistoryEntry {
  id: string;
  projectId: string | null;
  stage: string;
  prompt: string;
  response: string;
  tokensUsed: number | null;
  createdAt: string;
}

interface HistoryData {
  history: HistoryEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    totalGenerations: number;
    totalTokensUsed: number;
  };
}

export default function HistoryPage() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadHistory();
  }, [page]);

  const loadHistory = async () => {
    try {
      const response = await fetch(`/api/history?page=${page}&limit=20`);
      if (response.ok) {
        const historyData = await response.json();
        setData(historyData);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm('Are you sure you want to clear all generation history? This cannot be undone.')) return;

    try {
      await fetch('/api/history', { method: 'DELETE' });
      setData(prev => prev ? { ...prev, history: [], stats: { totalGenerations: 0, totalTokensUsed: 0 } } : null);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'story-chat': 'bg-purple-100 text-purple-700',
      'story-extract': 'bg-purple-100 text-purple-700',
      'analysis': 'bg-blue-100 text-blue-700',
      'scene-plan': 'bg-blue-100 text-blue-700',
      'shots': 'bg-green-100 text-green-700',
      'style': 'bg-pink-100 text-pink-700',
      'characters': 'bg-amber-100 text-amber-700',
      'backgrounds': 'bg-emerald-100 text-emerald-700',
      'items': 'bg-orange-100 text-orange-700',
      'frames': 'bg-indigo-100 text-indigo-700',
      'animation': 'bg-violet-100 text-violet-700',
    };
    return colors[stage] || 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generation History</h1>
          {data && (
            <p className="text-sm text-gray-600 mt-1">
              {data.stats.totalGenerations} generations - {data.stats.totalTokensUsed.toLocaleString()} tokens used
            </p>
          )}
        </div>
        {data && data.history.length > 0 && (
          <button
            onClick={clearHistory}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear History
          </button>
        )}
      </div>

      {!data || data.history.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-lg">
          <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No history yet</h2>
          <p className="text-gray-500">Your AI generation history will appear here</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {data.history.map(entry => (
              <div key={entry.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStageColor(entry.stage)}`}>
                      {entry.stage}
                    </span>
                    <span className="text-sm text-gray-600">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                    {entry.tokensUsed && (
                      <span className="text-xs text-gray-400">
                        {entry.tokensUsed.toLocaleString()} tokens
                      </span>
                    )}
                  </div>
                  {expandedId === entry.id ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {expandedId === entry.id && (
                  <div className="px-4 pb-4 border-t">
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Prompt</h4>
                        <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap">
                          {entry.prompt.length > 1000 ? entry.prompt.slice(0, 1000) + '...' : entry.prompt}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Response</h4>
                        <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap">
                          {entry.response.length > 1000 ? entry.response.slice(0, 1000) + '...' : entry.response}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
                className="px-4 py-2 bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
