import { useState, useEffect } from 'react';
import Header from '../components/Header';
import {
  getHistory,
  getHistoryItem,
  deleteHistoryItem,
  getPPEHistory,
  getPPEHistoryItem,
  deletePPEHistoryItem,
  type HistorySummary,
  type HistoryEntry,
  type PPEHistorySummary,
  type PPEHistoryEntry,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  Hash,
  ArrowLeft,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ResultsList from '../components/ResultsList';

type Tab = 'all' | 'cpcb' | 'dgms' | 'ppe';

function formatDate(dateString: string) {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// ── Search history item ───────────────────────────────────────────────────────

interface SearchItemProps {
  item: HistorySummary;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onExpand: (id: string) => void;
  isExpanded: boolean;
  isLoadingDetails: boolean;
  expandedData: HistoryEntry | null;
}

function SearchHistoryItem({
  item,
  onDelete,
  onExpand,
  isExpanded,
  isLoadingDetails,
  expandedData,
}: SearchItemProps) {
  const isCpcb = item.domain.toLowerCase() === 'cpcb';

  return (
    <motion.div
      key={item.id}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden glass rounded-xl border border-[var(--color-border)] transition-colors hover:border-[var(--color-border-strong)]"
    >
      <div
        className="p-5 cursor-pointer flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
        onClick={() => onExpand(item.id)}
      >
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <span
            className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-md border ${
              isCpcb
                ? 'bg-[var(--color-cpcb-dim)] text-[var(--color-cpcb)] border-[var(--color-cpcb)]/20'
                : 'bg-[var(--color-dgms-dim)] text-[var(--color-dgms)] border-[var(--color-dgms)]/20'
            }`}
          >
            {item.domain.toUpperCase()}
          </span>
          <h3 className="text-base font-medium text-white truncate" title={item.query}>
            {item.query}
          </h3>
        </div>

        <div className="flex items-center gap-6 flex-shrink-0 text-sm text-[var(--color-muted)] w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5" title="Date">
              <Calendar className="w-4 h-4 opacity-70" />
              {formatDate(item.timestamp)}
            </span>
            <span className="flex items-center gap-1.5" title="Results">
              <Hash className="w-4 h-4 opacity-70" />
              {item.result_count}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => onDelete(e, item.id)}
              className="p-2 text-[var(--color-muted)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              aria-label="Delete history item"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="p-2 text-[var(--color-muted-strong)]">
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[var(--color-border)] bg-[var(--color-background-raised)]"
          >
            <div className="p-5">
              {isLoadingDetails ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
                </div>
              ) : expandedData ? (
                isCpcb ? (
                  <ResultsList
                    domain="cpcb"
                    cpcbData={{
                      query: expandedData.query,
                      total_result: expandedData.result_count,
                      recomendations: expandedData.results,
                    }}
                    dgmsData={null}
                  />
                ) : (
                  <ResultsList
                    domain="dgms"
                    cpcbData={null}
                    dgmsData={{
                      query: expandedData.query,
                      total: expandedData.result_count,
                      results: expandedData.results,
                    }}
                  />
                )
              ) : (
                <p className="text-[var(--color-muted)] text-center py-8">Failed to load details</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── PPE history item ──────────────────────────────────────────────────────────

interface PPEItemProps {
  item: PPEHistorySummary;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onExpand: (id: string) => void;
  isExpanded: boolean;
  isLoadingDetails: boolean;
  expandedData: PPEHistoryEntry | null;
}

function PPEHistoryItem({
  item,
  onDelete,
  onExpand,
  isExpanded,
  isLoadingDetails,
  expandedData,
}: PPEItemProps) {
  return (
    <motion.div
      key={item.id}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden glass rounded-xl border border-[var(--color-border)] transition-colors hover:border-[var(--color-border-strong)]"
    >
      <div
        className="p-5 cursor-pointer flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
        onClick={() => onExpand(item.id)}
      >
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <span className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-md border bg-[var(--color-ppe-dim)] text-[var(--color-ppe)] border-[var(--color-ppe)]/20 flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3" />
            PPE
          </span>
          <h3 className="text-base font-medium text-white">
            Detection Session
          </h3>
        </div>

        <div className="flex items-center gap-6 flex-shrink-0 text-sm text-[var(--color-muted)] w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5" title="Date">
              <Calendar className="w-4 h-4 opacity-70" />
              {formatDate(item.timestamp)}
            </span>
            <span className="flex items-center gap-1.5" title="Duration">
              <Clock className="w-4 h-4 opacity-70" />
              {formatDuration(item.duration)}
            </span>
            <span className="flex items-center gap-1.5" title="Unique classes detected">
              <Hash className="w-4 h-4 opacity-70" />
              {item.detection_count}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => onDelete(e, item.id)}
              className="p-2 text-[var(--color-muted)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              aria-label="Delete PPE session"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="p-2 text-[var(--color-muted-strong)]">
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[var(--color-border)] bg-[var(--color-background-raised)]"
          >
            <div className="p-5">
              {isLoadingDetails ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full" />
                </div>
              ) : expandedData && expandedData.detections.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--color-muted)] mb-3">
                    Unique classes detected (highest confidence per class):
                  </p>
                  {expandedData.detections.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-4 py-2 rounded-lg border border-[var(--color-ppe)]/20 bg-[var(--color-ppe-dim)]"
                    >
                      <span className="text-sm font-medium text-white capitalize">
                        {d.class_name.replace(/_/g, ' ')}
                      </span>
                      <span
                        className="text-xs font-mono font-semibold"
                        style={{ color: 'var(--color-ppe)' }}
                      >
                        {(d.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--color-muted)] text-center py-8">No detections recorded</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main HistoryPage ──────────────────────────────────────────────────────────

export default function HistoryPage() {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('all');

  // Search history state
  const [history, setHistory] = useState<HistorySummary[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [expandedSearchId, setExpandedSearchId] = useState<string | null>(null);
  const [expandedSearchData, setExpandedSearchData] = useState<HistoryEntry | null>(null);
  const [isLoadingSearchDetails, setIsLoadingSearchDetails] = useState(false);

  // PPE history state
  const [ppeHistory, setPpeHistory] = useState<PPEHistorySummary[]>([]);
  const [isLoadingPPE, setIsLoadingPPE] = useState(true);
  const [expandedPPEId, setExpandedPPEId] = useState<string | null>(null);
  const [expandedPPEData, setExpandedPPEData] = useState<PPEHistoryEntry | null>(null);
  const [isLoadingPPEDetails, setIsLoadingPPEDetails] = useState(false);

  // Fetch on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await getHistory();
        setHistory(data);
      } catch {
        toast.error('Failed to load search history');
      } finally {
        setIsLoadingHistory(false);
      }
    })();

    (async () => {
      try {
        const data = await getPPEHistory();
        setPpeHistory(data);
      } catch {
        toast.error('Failed to load PPE history');
      } finally {
        setIsLoadingPPE(false);
      }
    })();
  }, []);

  // Search history handlers
  const handleExpandSearch = async (id: string) => {
    if (expandedSearchId === id) {
      setExpandedSearchId(null);
      setExpandedSearchData(null);
      return;
    }
    try {
      setExpandedSearchId(id);
      setIsLoadingSearchDetails(true);
      const data = await getHistoryItem(id);
      setExpandedSearchData(data);
    } catch {
      toast.error('Failed to load history details');
      setExpandedSearchId(null);
    } finally {
      setIsLoadingSearchDetails(false);
    }
  };

  const handleDeleteSearch = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteHistoryItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
      if (expandedSearchId === id) {
        setExpandedSearchId(null);
        setExpandedSearchData(null);
      }
      toast.success('Deleted from history');
    } catch {
      toast.error('Failed to delete item');
    }
  };

  // PPE history handlers
  const handleExpandPPE = async (id: string) => {
    if (expandedPPEId === id) {
      setExpandedPPEId(null);
      setExpandedPPEData(null);
      return;
    }
    try {
      setExpandedPPEId(id);
      setIsLoadingPPEDetails(true);
      const data = await getPPEHistoryItem(id);
      setExpandedPPEData(data);
    } catch {
      toast.error('Failed to load PPE session details');
      setExpandedPPEId(null);
    } finally {
      setIsLoadingPPEDetails(false);
    }
  };

  const handleDeletePPE = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deletePPEHistoryItem(id);
      setPpeHistory((prev) => prev.filter((item) => item.id !== id));
      if (expandedPPEId === id) {
        setExpandedPPEId(null);
        setExpandedPPEData(null);
      }
      toast.success('PPE session deleted');
    } catch {
      toast.error('Failed to delete PPE session');
    }
  };

  // Filtered search history by tab
  const filteredSearchHistory = activeTab === 'all'
    ? history
    : activeTab === 'cpcb'
    ? history.filter((h) => h.domain.toLowerCase() === 'cpcb')
    : activeTab === 'dgms'
    ? history.filter((h) => h.domain.toLowerCase() === 'dgms')
    : [];

  const isLoading = isLoadingHistory || isLoadingPPE;

  const TABS: { id: Tab; label: string; count: number; color?: string }[] = [
    { id: 'all', label: 'All', count: history.length + ppeHistory.length },
    { id: 'cpcb', label: 'CPCB', count: history.filter((h) => h.domain.toLowerCase() === 'cpcb').length, color: 'var(--color-cpcb)' },
    { id: 'dgms', label: 'DGMS', count: history.filter((h) => h.domain.toLowerCase() === 'dgms').length, color: 'var(--color-dgms)' },
    { id: 'ppe', label: 'PPE', count: ppeHistory.length, color: 'var(--color-ppe)' },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header user={user} onLogout={logout} currentPath="/history" />

      <main className="flex-1 flex flex-col container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">History</h1>
            <p className="text-[var(--color-muted)] mt-1">Your past searches and PPE detection sessions</p>
          </div>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-sm text-[var(--color-cpcb)] hover:text-cyan-300 transition-colors bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Search
          </Link>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-6 bg-[var(--color-background-raised)] border border-[var(--color-border)] rounded-xl p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[var(--color-surface)] text-white border border-[var(--color-border)]'
                  : 'text-[var(--color-muted-strong)] hover:text-white'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className="text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{
                    color: activeTab === tab.id ? (tab.color ?? 'var(--color-cpcb)') : undefined,
                    background: activeTab === tab.id ? 'transparent' : undefined,
                    opacity: activeTab === tab.id ? 1 : 0.6,
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {/* PPE sessions (shown in All + PPE tabs) */}
              {(activeTab === 'all' || activeTab === 'ppe') &&
                ppeHistory.map((item) => (
                  <PPEHistoryItem
                    key={item.id}
                    item={item}
                    onDelete={handleDeletePPE}
                    onExpand={handleExpandPPE}
                    isExpanded={expandedPPEId === item.id}
                    isLoadingDetails={isLoadingPPEDetails && expandedPPEId === item.id}
                    expandedData={expandedPPEId === item.id ? expandedPPEData : null}
                  />
                ))}

              {/* Search history (shown in All + CPCB + DGMS tabs) */}
              {activeTab !== 'ppe' &&
                filteredSearchHistory.map((item) => (
                  <SearchHistoryItem
                    key={item.id}
                    item={item}
                    onDelete={handleDeleteSearch}
                    onExpand={handleExpandSearch}
                    isExpanded={expandedSearchId === item.id}
                    isLoadingDetails={isLoadingSearchDetails && expandedSearchId === item.id}
                    expandedData={expandedSearchId === item.id ? expandedSearchData : null}
                  />
                ))}

              {/* Empty states */}
              {activeTab === 'ppe' && ppeHistory.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl"
                >
                  <ShieldCheck className="w-12 h-12 text-[var(--color-muted)] mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-white mb-2">No PPE sessions yet</h3>
                  <p className="text-[var(--color-muted)]">
                    Start a detection session on the Dashboard to see results here.
                  </p>
                </motion.div>
              )}

              {activeTab !== 'ppe' && filteredSearchHistory.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl"
                >
                  <Search className="w-12 h-12 text-[var(--color-muted)] mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-white mb-2">No history yet</h3>
                  <p className="text-[var(--color-muted)]">Your recent searches will appear here.</p>
                </motion.div>
              )}

              {activeTab === 'all' && history.length === 0 && ppeHistory.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl"
                >
                  <Search className="w-12 h-12 text-[var(--color-muted)] mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-white mb-2">No history yet</h3>
                  <p className="text-[var(--color-muted)]">
                    Your searches and PPE sessions will appear here.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
