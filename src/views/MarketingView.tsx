import React, { useState } from 'react';
import { Plus, Power } from 'lucide-react';
import { PromoCampaign } from '../types';
import { useInnoWear } from '../store/useInnoWearStore';
import { Modal } from '../components/Modal';
import { DeleteButton } from '../components/DeleteButton';

export const MarketingView: React.FC = () => {
  const { state, addCampaign, toggleCampaignStatus, deleteCampaign } = useInnoWear();
  const c = state.settings.currencySymbol;

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<PromoCampaign['channel']>('Instagram & TikTok');
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('15');
  const [budget, setBudget] = useState('350');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !promoCode.trim()) return;
    addCampaign({
      name: name.trim(),
      channel,
      promoCode: promoCode.trim().toUpperCase(),
      discountPercent: Math.min(80, Math.max(1, parseInt(discountPercent, 10) || 10)),
      budget: parseFloat(budget) || 0,
      status: 'Active',
    });
    setName('');
    setPromoCode('');
    setShowAdd(false);
  };

  const totalReach = state.campaigns.reduce((s, x) => s + x.reach, 0);
  const totalConversions = state.campaigns.reduce((s, x) => s + x.conversions, 0);
  const totalSpend = state.campaigns.reduce((s, x) => s + x.spend, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Marketing & Promotions
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Active promo codes created here validate live inside both POS Terminal and Online Store
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* Campaign Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Total Audience Reach</p>
          <p className="font-mono-tabular text-xl font-semibold text-[var(--text-primary)] mt-1">
            {totalReach.toLocaleString()}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Tracked Promo Conversions</p>
          <p className="font-mono-tabular text-xl font-semibold text-[var(--accent)] mt-1">
            {totalConversions} orders
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Ad Spend To Date</p>
          <p className="font-mono-tabular text-xl font-semibold text-[var(--text-primary)] mt-1">
            {c}
            {totalSpend.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="overflow-x-auto rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
              <th className="py-3 px-4 font-medium">Campaign & Channel</th>
              <th className="py-3 px-4 font-medium">Promo Code</th>
              <th className="py-3 px-4 font-medium text-right">Budget / Spend</th>
              <th className="py-3 px-4 font-medium text-right">Reach / Orders</th>
              <th className="py-3 px-4 font-medium text-right">Status & Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-hairline)] text-sm">
            {state.campaigns.map((camp) => (
              <tr key={camp.id} className="hover:bg-[var(--bg-elevated)]/60 transition-colors">
                <td className="py-3.5 px-4">
                  <p className="font-medium text-[var(--text-primary)]">{camp.name}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{camp.channel}</p>
                </td>
                <td className="py-3.5 px-4 font-mono-tabular text-xs">
                  <span className="font-semibold text-[var(--accent)]">{camp.promoCode}</span>
                  <span className="text-[var(--text-muted)]"> · {camp.discountPercent}% off</span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono-tabular text-xs">
                  <div className="text-[var(--text-primary)]">
                    {c}
                    {camp.spend} / {c}
                    {camp.budget}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right font-mono-tabular text-xs">
                  <div className="text-[var(--text-primary)]">
                    {camp.reach.toLocaleString()} reach
                  </div>
                  <div className="text-[var(--text-muted)]">{camp.conversions} redemptions</div>
                </td>
                <td className="py-3.5 px-4 text-right text-xs">
                  <div className="inline-flex items-center gap-3">
                    <span
                      className={
                        camp.status === 'Active' ? 'text-[var(--status-positive)] font-medium' : 'text-[var(--text-muted)]'
                      }
                    >
                      {camp.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleCampaignStatus(camp.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap"
                    >
                      <Power className="w-3 h-3" />
                      {camp.status === 'Active' ? 'Pause' : 'Activate'}
                    </button>
                    <DeleteButton
                      onConfirm={() => deleteCampaign(camp.id)}
                      ariaLabel={`Delete campaign ${camp.name}`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Campaign Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Launch Marketing Campaign"
        subtitle="Promo code becomes usable immediately in POS & Online Store checkout"
      >
        <form onSubmit={handleAdd} className="space-y-4 text-xs">
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Campaign Title</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Festive Gala Lookbook Drop"
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as PromoCampaign['channel'])}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              >
                <option value="Instagram & TikTok">Instagram & TikTok</option>
                <option value="Email & SMS">Email & SMS</option>
                <option value="In-Store Event">In-Store Event</option>
                <option value="Paid Search">Paid Search</option>
              </select>
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Promo Code</label>
              <input
                required
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="GALA15"
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] uppercase font-mono-tabular"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Discount %</label>
              <input
                type="number"
                min="1"
                max="80"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Budget ({c})</label>
              <input
                type="number"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)]"
            >
              Launch Campaign
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
