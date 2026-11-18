import React, { useMemo, useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { TransactionType } from '../types';
import { useInnoWear } from '../store/useInnoWearStore';
import { Modal } from '../components/Modal';
import { DeleteButton } from '../components/DeleteButton';

export const AccountingView: React.FC = () => {
  const { state, addTransaction, settleTransaction, deleteTransaction } = useInnoWear();
  const c = state.settings.currencySymbol;

  const [typeFilter, setTypeFilter] = useState<'All' | TransactionType>('All');
  const [showModal, setShowModal] = useState(false);

  const [type, setType] = useState<TransactionType>('Expense');
  const [category, setCategory] = useState('Boutique Operations');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState<'Settled' | 'Pending'>('Settled');

  const incomeTotal = state.transactions
    .filter((t) => t.type === 'Income')
    .reduce((s, t) => s + t.amount, 0);
  const expenseTotal = state.transactions
    .filter((t) => t.type === 'Expense')
    .reduce((s, t) => s + t.amount, 0);
  const receivablesTotal = state.transactions
    .filter((t) => t.type === 'Debt Receivable' && t.status === 'Pending')
    .reduce((s, t) => s + t.amount, 0);
  const payablesTotal = state.transactions
    .filter((t) => t.type === 'Supplier Payable' && t.status === 'Pending')
    .reduce((s, t) => s + t.amount, 0);

  const netProfit = incomeTotal - expenseTotal;

  const filtered = useMemo(() => {
    if (typeFilter === 'All') return state.transactions;
    return state.transactions.filter((t) => t.type === typeFilter);
  }, [state.transactions, typeFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = parseFloat(amount);
    if (!description.trim() || !numeric || numeric <= 0) return;

    addTransaction({
      date: new Date().toISOString().slice(0, 10),
      type,
      category: category.trim() || 'General',
      description: description.trim(),
      amount: numeric,
      reference: reference.trim() || `ACC-${Date.now().toString().slice(-4)}`,
      status,
    });
    setDescription('');
    setAmount('');
    setReference('');
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Accounting & Financial Ledger
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Track revenue, operating expenses, net profit, COD receivables, and supplier debts
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Record Entry
        </button>
      </div>

      {/* Financial KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Total Income</p>
          <p className="font-mono-tabular text-xl font-semibold text-emerald-400 mt-1">
            {c}
            {incomeTotal.toFixed(2)}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Total Expenses</p>
          <p className="font-mono-tabular text-xl font-semibold text-[var(--text-primary)] mt-1">
            {c}
            {expenseTotal.toFixed(2)}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Net Profit</p>
          <p
            className={`font-mono-tabular text-xl font-semibold mt-1 ${
              netProfit >= 0 ? 'text-[var(--accent)]' : 'text-red-400'
            }`}
          >
            {netProfit >= 0 ? '' : '-'}
            {c}
            {Math.abs(netProfit).toFixed(2)}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Pending Debts / Payables</p>
          <p className="font-mono-tabular text-sm font-semibold text-amber-400 mt-1.5">
            In {c}
            {receivablesTotal.toFixed(2)} · Out {c}
            {payablesTotal.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {(['All', 'Income', 'Expense', 'Debt Receivable', 'Supplier Payable'] as const).map(
          (tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTypeFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                typeFilter === tab
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab}
            </button>
          )
        )}
      </div>

      {/* Financial Ledger Table */}
      <div className="overflow-x-auto rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
              <th className="py-3 px-4 font-medium">Date & Ref</th>
              <th className="py-3 px-4 font-medium">Type & Category</th>
              <th className="py-3 px-4 font-medium">Description</th>
              <th className="py-3 px-4 font-medium text-right">Amount</th>
              <th className="py-3 px-4 font-medium text-right">Status / Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-hairline)] text-sm">
            {filtered.map((txn) => {
              const isCredit = txn.type === 'Income' || txn.type === 'Debt Receivable';
              return (
                <tr key={txn.id} className="hover:bg-[var(--bg-elevated)]/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono-tabular text-xs">
                    <div className="text-[var(--text-primary)]">{txn.date}</div>
                    <div className="text-[var(--text-muted)]">{txn.reference}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div
                      className={`font-medium ${
                        txn.type === 'Income'
                          ? 'text-emerald-400'
                          : txn.type === 'Expense'
                          ? 'text-[var(--text-primary)]'
                          : 'text-amber-400'
                      }`}
                    >
                      {txn.type}
                    </div>
                    <div className="text-[var(--text-muted)]">{txn.category}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-[var(--text-secondary)]">
                    {txn.description}
                  </td>
                  <td
                    className={`py-3.5 px-4 text-right font-mono-tabular text-sm font-semibold ${
                      isCredit ? 'text-emerald-400' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {isCredit ? '+' : '-'}
                    {c}
                    {txn.amount.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-xs">
                    <div className="inline-flex items-center justify-end gap-2">
                      {txn.status === 'Pending' ? (
                        <button
                          type="button"
                          onClick={() => settleTransaction(txn.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] transition-colors whitespace-nowrap"
                        >
                          <Check className="w-3 h-3" />
                          Mark Settled
                        </button>
                      ) : (
                        <span className="text-[var(--text-muted)]">Settled</span>
                      )}
                      <DeleteButton
                        onConfirm={() => deleteTransaction(txn.id)}
                        ariaLabel={`Delete transaction ${txn.reference}`}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Financial Record Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Record Financial Transaction"
        subtitle="Logs income, expenses, receivables, or supplier payables"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Entry Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              >
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
                <option value="Debt Receivable">Debt Receivable</option>
                <option value="Supplier Payable">Supplier Payable</option>
              </select>
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Settled' | 'Pending')}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              >
                <option value="Settled">Settled</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Category</label>
              <input
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Amount ({c})</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>
          </div>

          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Description</label>
            <input
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Boutique packaging boxes & garment bags"
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Reference Code</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional invoice or receipt number"
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)]"
            >
              Save Entry
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
