'use client';

import { useState, useEffect } from 'react';
import { History, Loader2, Trash2, ChevronDown, ChevronRight, DollarSign } from 'lucide-react';

// Average cost per million tokens for Claude API (input + output blended)
const COST_PER_MILLION_TOKENS = 8;

const calculateCost = (tokens: number): string => {
  const cost = (tokens / 1_000_000) * COST_PER_MILLION_TOKENS;
  if (cost === 0) return '$0.00';
  return cost < 0.01 ? '< $0.01' : `$${cost.toFixed(2)}`;
};

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
    monthlyGenerations: number;
    monthlyTokensUsed: number;
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
      setData(prev => prev ? {
        ...prev,
        history: [],
        stats: {
          totalGenerations: 0,
          totalTokensUsed: 0,
          monthlyGenerations: 0,
          monthlyTokensUsed: 0
        }
      } : null);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'story-chat': 'bg-purple-500/20 text-purple-500',
      'story-extract': 'bg-purple-500/20 text-purple-500',
      'analysis': 'bg-blue-500/20 text-blue-500',
      'scene-plan': 'bg-blue-500/20 text-blue-500',
      'shots': 'bg-green-500/20 text-green-500',
      'style': 'bg-pink-500/20 text-pink-500',
      'characters': 'bg-amber-500/20 text-amber-500',
      'backgrounds': 'bg-emerald-500/20 text-emerald-500',
      'items': 'bg-orange-500/20 text-orange-500',
      'frames': 'bg-indigo-500/20 text-indigo-500',
      'animation': 'bg-violet-500/20 text-violet-500',
    };
    return colors[stage] || 'bg-theme-tertiary text-theme-secondary';
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Generation History</h1>
          {data && (
            <p className="text-sm text-theme-muted mt-1">
              {data.stats.totalGenerations} generations total
            </p>
          )}
        </div>
        {data && data.history.length > 0 && (
          <button
            onClick={clearHistory}
            className="px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear History
          </button>
        )}
      </div>

      {/* Cost Statistics */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-theme-secondary rounded-xl border border-theme-primary p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold text-theme-secondary">All Time</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-theme-primary">{data.stats.totalTokensUsed.toLocaleString()}</p>
                <p className="text-xs text-theme-muted">tokens used</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-500">{calculateCost(data.stats.totalTokensUsed)}</p>
                <p className="text-xs text-theme-muted">estimated cost</p>
              </div>
            </div>
          </div>
          <div className="bg-theme-secondary rounded-xl border border-theme-primary p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold text-theme-secondary">This Month</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-theme-primary">{(data.stats.monthlyTokensUsed || 0).toLocaleString()}</p>
                <p className="text-xs text-theme-muted">tokens used</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-500">{calculateCost(data.stats.monthlyTokensUsed || 0)}</p>
                <p className="text-xs text-theme-muted">estimated cost</p>
              </div>
            </div>
            <p className="text-xs text-theme-muted mt-2">{data.stats.monthlyGenerations || 0} generations this month</p>
          </div>
        </div>
      )}

      {!data || data.history.length === 0 ? (
        <div className="text-center py-16 bg-theme-secondary rounded-xl border border-theme-primary">
          <History className="w-16 h-16 text-theme-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-theme-secondary mb-2">No history yet</h2>
          <p className="text-theme-muted">Your AI generation history will appear here</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {data.history.map(entry => (
              <div key={entry.id} className="bg-theme-secondary rounded-xl border border-theme-primary overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-theme-tertiary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStageColor(entry.stage)}`}>
                      {entry.stage}
                    </span>
                    <span className="text-sm text-theme-muted">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                    {entry.tokensUsed && (
                      <span className="text-xs text-theme-muted">
                        {entry.tokensUsed.toLocaleString()} tokens
                      </span>
                    )}
                  </div>
                  {expandedId === entry.id ? (
                    <ChevronDown className="w-5 h-5 text-theme-muted" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-theme-muted" />
                  )}
                </button>

                {expandedId === entry.id && (
                  <div className="px-4 pb-4 border-t border-theme-primary">
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <h4 className="text-sm font-semibold text-theme-secondary mb-2">Prompt</h4>
                        <pre className="text-xs text-theme-muted bg-theme-tertiary p-3 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap">
                          {entry.prompt.length > 1000 ? entry.prompt.slice(0, 1000) + '...' : entry.prompt}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-theme-secondary mb-2">Response</h4>
                        <pre className="text-xs text-theme-muted bg-theme-tertiary p-3 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap">
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
                className="px-4 py-2 bg-theme-tertiary text-theme-secondary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-secondary"
              >
                Previous
              </button>
              <span className="text-sm text-theme-muted">
                Page {page} of {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
                className="px-4 py-2 bg-theme-tertiary text-theme-secondary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-secondary"
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
