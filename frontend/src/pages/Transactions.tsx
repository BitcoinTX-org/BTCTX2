// FILE: frontend/src/pages/Transactions.tsx

import React, { useEffect, useState } from "react";
import TransactionPanel from "../components/TransactionPanel";
import "../styles/transactions.css";
import api from "../api"; // Our custom Axios instance with baseURL="/api"

import {
  parseTransaction,
  formatUsd,
  formatBtc,
  formatTimestamp,
  parseDecimal,
} from "../utils/format";

// Because `global.d.ts` declares ITransaction, ITransactionRaw, SortMode, etc. globally,
// we can use those types here without importing.

// Avoid “unused import” warnings (if your linter complains):
void formatTimestamp;
void parseDecimal;

// ----------------------------------------------------
// Helper to map account IDs to display names
// ----------------------------------------------------
function accountIdToName(id: number | null): string {
  if (id === null) return "N/A";
  switch (id) {
    case 1:
      return "Bank";
    case 2:
      return "Wallet";
    case 3:
      return "Exchange";
    case 4:
      return "Exchange";
    case 99:
      return "External";
    default:
      return `Acct #${id}`;
  }
}

// ----------------------------------------------------
// Decide how to display the "account" label
// ----------------------------------------------------
function resolveDisplayAccount(tx: ITransaction): string {
  const { type, from_account_id, to_account_id } = tx;

  switch (type) {
    case "Deposit":
      return accountIdToName(to_account_id);
    case "Withdrawal":
      return accountIdToName(from_account_id);
    case "Transfer":
      return `${accountIdToName(from_account_id)} -> ${accountIdToName(to_account_id)}`;
    case "Buy":
    case "Sell":
      return "Exchange";
    default:
      return "Unknown";
  }
}

// ----------------------------------------------------
// Format the "Amount" column
// ----------------------------------------------------
function formatAmount(tx: ITransaction): string {
  const { type, amount, cost_basis_usd, proceeds_usd, from_account_id, to_account_id } = tx;

  switch (type) {
    case "Deposit":
      // If depositing into Bank(1) or Exchange(3), show USD
      if (to_account_id === 1 || to_account_id === 3) {
        return formatUsd(amount);
      } else {
        return formatBtc(amount);
      }

    case "Withdrawal":
      // If withdrawing from Bank(1) or Exchange(3), show USD
      if (from_account_id === 1 || from_account_id === 3) {
        return formatUsd(amount);
      } else {
        return formatBtc(amount);
      }

    case "Transfer":
      // If transferring from Bank(1) or Exchange(3), show USD
      if (from_account_id === 1 || from_account_id === 3) {
        return formatUsd(amount);
      } else {
        return formatBtc(amount);
      }

    case "Buy":
      // Show "spent USD -> gained BTC"
      return cost_basis_usd
        ? `${formatUsd(cost_basis_usd)} -> ${formatBtc(amount)}`
        : `${formatUsd(amount)}`;

    case "Sell":
      // Show "spent BTC -> gained USD"
      return proceeds_usd
        ? `${formatBtc(amount)} -> ${formatUsd(proceeds_usd)}`
        : `${formatBtc(amount)}`;

    default:
      // Fallback: just show the raw amount
      return `${amount}`;
  }
}

// ----------------------------------------------------
// Format "Extra" label (e.g. deposit source or withdrawal purpose)
// ----------------------------------------------------
function formatExtra(tx: ITransaction): string {
  const { type, source, purpose } = tx;
  if (type === "Deposit" && source && source !== "N/A") {
    return source;
  }
  if (type === "Withdrawal" && purpose && purpose !== "N/A") {
    return purpose;
  }
  return "";
}

// ----------------------------------------------------
// Build disposal label for Sell/Withdrawal (gains/losses)
// ----------------------------------------------------
function buildDisposalLabel(tx: ITransaction): string {
  // Only applies to Sell or Withdrawal
  if (tx.type !== "Sell" && tx.type !== "Withdrawal") return "";
  if (tx.cost_basis_usd == null || tx.realized_gain_usd == null) return "";

  const costBasis = parseDecimal(tx.cost_basis_usd);
  const gainVal = parseDecimal(tx.realized_gain_usd);
  const hp = tx.holding_period ? ` (${tx.holding_period})` : "";

  // Decide prefix: "Gain" or "Loss"
  const label = gainVal >= 0 ? "Gain" : "Loss";

  // If cost basis = 0, show just the gain/loss $ if nonzero
  if (costBasis === 0) {
    if (gainVal === 0) return "";
    const sign = gainVal >= 0 ? "+" : "-";
    return `${label}: ${sign}${formatUsd(Math.abs(gainVal))}${hp}`;
  }

  // Otherwise, show “Gain: ±$X (±YY%)”
  const gainPerc = (gainVal / costBasis) * 100;
  const sign = gainVal >= 0 ? "+" : "-";
  const absGain = Math.abs(gainVal);
  const absPerc = Math.abs(gainPerc).toFixed(2);

  return `${label}: ${sign}${formatUsd(absGain)} (${sign}${absPerc}%)${hp}`;
}

// ----------------------------------------------------
// Main Transactions Component
// ----------------------------------------------------
const Transactions: React.FC = () => {
  // Local state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [transactions, setTransactions] = useState<ITransaction[] | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("TIMESTAMP_DESC");
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // For editing
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);

  // --------------------------------------------------
  // Fetch Transactions from the API
  // --------------------------------------------------
  const fetchTransactions = async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      // Because api.ts has baseURL="/api",
      // this call is GET /api/transactions
      const res = await api.get<ITransactionRaw[]>("/transactions");
      console.log("Raw API response (transactions):", res.data);

      // Convert raw string fields into numeric
      const parsedTransactions = res.data.map(raw => parseTransaction(raw));
      console.log("Parsed transactions:", parsedTransactions);

      setTransactions(parsedTransactions);
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? `Failed to load transactions: ${err.message}`
          : "Failed to load transactions: Unknown error";
      console.error(errorMsg, err);
      setFetchError(errorMsg);
      setTransactions(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // --------------------------------------------------
  // Dialog toggles
  // --------------------------------------------------
  const openPanel = () => setIsPanelOpen(true);
  const closePanel = () => {
    setIsPanelOpen(false);
    setEditingTransactionId(null);
  };

  const handleSubmitSuccess = async () => {
    setIsPanelOpen(false);
    setEditingTransactionId(null);
    setIsRefreshing(true);
    try {
      await fetchTransactions();
    } finally {
      setIsRefreshing(false);
    }
  };

  // --------------------------------------------------
  // Sorting
  // --------------------------------------------------
  const sortedTransactions = transactions
    ? [...transactions].sort((a, b) => {
        if (sortMode === "TIMESTAMP_DESC") {
          // Sort by date/time descending
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        } else {
          // CREATION_DESC => sort by ID descending
          return b.id - a.id;
        }
      })
    : [];

  // --------------------------------------------------
  // Group by date
  // --------------------------------------------------
  const groupedByDate: Record<string, ITransaction[]> = {};
  for (const tx of sortedTransactions) {
    const dateLabel = new Date(tx.timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    if (!groupedByDate[dateLabel]) groupedByDate[dateLabel] = [];
    groupedByDate[dateLabel].push(tx);
  }
  const dateGroups = Object.entries(groupedByDate);

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  return (
    <div className="transactions-page">
      {/* Header row with Add button & sort control */}
      <div className="transactions-header">
        <button className="accent-btn" onClick={openPanel}>
          Add Transaction
        </button>

        <div className="sort-wrapper">
          <select
            className="sort-select"
            value={sortMode}
            onChange={e => setSortMode(e.target.value as SortMode)}
          >
            <option value="TIMESTAMP_DESC">Sort by Date</option>
            <option value="CREATION_DESC">Last Added (ID)</option>
          </select>
        </div>
      </div>

      {isLoading && <p>Loading transactions...</p>}

      {fetchError && (
        <div className="error-section">
          <p>{fetchError}</p>
          <button onClick={fetchTransactions} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* No transactions message */}
      {!isLoading && !fetchError && transactions && transactions.length === 0 && (
        <p>No transactions found.</p>
      )}

      {/* Display transactions */}
      {!isLoading && !fetchError && transactions && transactions.length > 0 && (
        <div className="transactions-list">
          {isRefreshing && (
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div className="spinner"></div>
              <p>Refreshing transactions...</p>
            </div>
          )}
          {dateGroups.map(([dayLabel, txArray]) => (
            <div key={dayLabel} className="transactions-day-group">
              <h3 className="date-heading">{dayLabel}</h3>

              {txArray.map(tx => {
                const timeStr = new Date(tx.timestamp).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                });

                const accountLabel = resolveDisplayAccount(tx);
                const amountLabel = formatAmount(tx);

                let feeLabel = "";
                if (tx.fee_amount && tx.fee_amount !== 0) {
                  feeLabel =
                    tx.fee_currency === "BTC"
                      ? `Fee: ${formatBtc(tx.fee_amount)}`
                      : `Fee: ${formatUsd(tx.fee_amount)} ${tx.fee_currency || "USD"}`;
                }

                const extraLabel = formatExtra(tx);
                const disposalLabel = buildDisposalLabel(tx);
                const disposalColor = tx.realized_gain_usd >= 0 ? "gain-green" : "loss-red";

                return (
                  <div key={tx.id} className="transaction-card">
                    <span className="cell time-col">{timeStr}</span>
                    <span className="cell type-col">{tx.type}</span>
                    <span className="cell account-col">{accountLabel}</span>
                    <span className="cell amount-col">{amountLabel}</span>
                    <span className="cell fee-col">{feeLabel}</span>
                    <span className="cell extra-col">{extraLabel}</span>
                    <span className={`cell disposal-col ${disposalColor}`}>
                      {disposalLabel}
                    </span>

                    {/* Edit button */}
                    <button
                      onClick={() => {
                        setEditingTransactionId(tx.id);
                        setIsPanelOpen(true);
                      }}
                      className="edit-button"
                    >
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Slide-in panel for new/edit transaction */}
      <TransactionPanel
        isOpen={isPanelOpen}
        onClose={closePanel}
        onSubmitSuccess={handleSubmitSuccess}
        transactionId={editingTransactionId}
      />
    </div>
  );
};

export default Transactions;
