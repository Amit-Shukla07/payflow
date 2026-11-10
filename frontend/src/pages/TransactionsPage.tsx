import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  SlidersHorizontal,
  Download,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  RotateCcw,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { transactionApi } from '../services/api.js';
import { Transaction, Pagination } from '../types/index.js';
import { formatDate } from '../utils/currency.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const TransactionsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentType = searchParams.get('type') || 'ALL';
  const currentSearch = searchParams.get('search') || '';

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [selectedType, setSelectedType] = useState(currentType);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await transactionApi.getTransactions({
        page: currentPage,
        limit: 10,
        type: currentType,
        search: currentSearch || undefined,
      });

      if (res.success && res.data) {
        setTransactions(res.data.items);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, currentType, currentSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      params.set('search', searchInput.trim());
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleTypeSelect = (typeVal: string) => {
    setSelectedType(typeVal);
    const params = new URLSearchParams(searchParams);
    params.set('type', typeVal);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleExport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Date,Type,Counterparty,Amount,Status']
        .concat(
          transactions.map(
            (t) =>
              `"${t.createdAt}","${t.type}","${t.receiver?.email || t.sender?.email || 'N/A'}","${t.formattedAmount}","${t.status}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'payflow_transactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Transaction statement downloaded', 'info');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* 1. TITLE: Transactions (Exact Screenshot 2)                               */}
      {/* ========================================================================= */}
      <h1 className="text-3xl sm:text-4xl font-extrabold text-black tracking-tight font-sans">
        Transactions
      </h1>

      {/* ========================================================================= */}
      {/* 2. UNIFIED FILTER & SEARCH BAR (Exact Screenshot 2)                       */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Left Combined Pill: [Dropdown All v | Search...] */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 flex items-center bg-white border border-gray-300 rounded-full hover:border-gray-400 focus-within:border-black transition-colors px-4 py-2"
        >
          {/* Dropdown 'All' */}
          <div className="relative flex items-center pr-3 border-r border-gray-300">
            <select
              value={selectedType}
              onChange={(e) => handleTypeSelect(e.target.value)}
              className="appearance-none bg-transparent pr-5 text-sm font-semibold text-gray-800 cursor-pointer outline-none"
            >
              <option value="ALL">All</option>
              <option value="DEBIT">Sent</option>
              <option value="CREDIT">Received</option>
              <option value="TOPUP">Deposits</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-500 absolute right-0 pointer-events-none" />
          </div>

          {/* Search Input */}
          <div className="flex-1 flex items-center pl-3">
            <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
            />
          </div>
        </form>

        {/* Right Actions: Filter Pill Button + Download Button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleTypeSelect(selectedType === 'ALL' ? 'DEBIT' : 'ALL')}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-900 transition-colors shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filter</span>
          </button>

          <button
            onClick={handleExport}
            className="w-10 h-10 rounded-full border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-700 transition-colors shadow-sm"
            title="Download CSV Statement"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TRANSACTIONS TABLE / CONTAINER (Exact Screenshot 2)                    */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm min-h-[350px] flex flex-col justify-between">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            Loading ledger transactions...
          </div>
        ) : transactions.length === 0 ? (
          /* Empty state matching Screenshot 2: receipt icon + exact message */
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-200/60">
              <FileText className="w-6 h-6 stroke-[1.5]" />
            </div>
            <p className="text-sm font-medium text-gray-600 max-w-md">
              We couldn't find any transactions matching your search criteria
            </p>
          </div>
        ) : (
          /* Transaction Rows */
          <div className="divide-y divide-gray-100">
            {transactions.map((tx) => {
              const isTopup = tx.type === 'TOPUP';
              const isDebit = tx.sender?.id === user?.id && !isTopup;
              const counterparty = isTopup
                ? 'Bank Deposit (State Bank of India)'
                : isDebit
                ? tx.receiver?.name || tx.receiver?.email
                : tx.sender?.name || tx.sender?.email;
              const counterpartyEmail = isDebit ? tx.receiver?.email : tx.sender?.email;

              return (
                <div
                  key={tx.id}
                  onClick={() => navigate(`/transactions/${tx.id}`)}
                  className="p-5 hover:bg-gray-50/80 transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700 flex-shrink-0">
                      {isTopup ? (
                        <Plus className="w-5 h-5 text-gray-700" />
                      ) : isDebit ? (
                        <ArrowUpRight className="w-5 h-5 text-gray-700" />
                      ) : (
                        <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-gray-900 truncate group-hover:text-[#0047BA] transition-colors">
                          {counterparty}
                        </span>
                        {tx.status === 'PENDING_UNDO' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold animate-pulse">
                            Undo Window (10s)
                          </span>
                        )}
                        {tx.status === 'CANCELLED' && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold">
                            Undone
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center space-x-2">
                        <span>{formatDate(tx.createdAt)}</span>
                        {counterpartyEmail && (
                          <>
                            <span>·</span>
                            <span className="truncate">{counterpartyEmail}</span>
                          </>
                        )}
                        {tx.note && (
                          <>
                            <span>·</span>
                            <span className="italic truncate">"{tx.note}"</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-4">
                    <div
                      className={`text-base font-bold tabular-numbers ${
                        isDebit ? 'text-black' : 'text-emerald-600'
                      }`}
                    >
                      {isDebit ? `- ${tx.formattedAmount}` : `+ ${tx.formattedAmount}`}
                    </div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">
                      {tx.status === 'SETTLED' ? 'Completed' : tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={!pagination.hasPrevPage}
                onClick={() => {
                  const p = new URLSearchParams(searchParams);
                  p.set('page', (currentPage - 1).toString());
                  setSearchParams(p);
                }}
                className="px-3 py-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 font-semibold text-gray-700"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                disabled={!pagination.hasNextPage}
                onClick={() => {
                  const p = new URLSearchParams(searchParams);
                  p.set('page', (currentPage + 1).toString());
                  setSearchParams(p);
                }}
                className="px-3 py-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 font-semibold text-gray-700"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
