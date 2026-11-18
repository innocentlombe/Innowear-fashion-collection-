import React, { useState } from 'react';
import { Award, Gift } from 'lucide-react';
import { useInnoWear } from '../store/useInnoWearStore';
import { Modal } from '../components/Modal';
import { DeleteButton } from '../components/DeleteButton';

export const LoyaltyView: React.FC = () => {
  const {
    state,
    redeemLoyaltyReward,
    awardBonusPoints,
    deleteLoyaltyReward,
    deleteCustomer,
  } = useInnoWear();
  const c = state.settings.currencySymbol;

  const [selectedCustomerId, setSelectedCustomerId] = useState(state.customers[0]?.id || '');
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusPoints, setBonusPoints] = useState('100');
  const [bonusReason, setBonusReason] = useState('VIP Styling Referral');

  const selectedCustomer = state.customers.find((cust) => cust.id === selectedCustomerId);
  const sortedCustomers = [...state.customers].sort((a, b) => b.points - a.points);

  const handleAward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const pts = parseInt(bonusPoints, 10);
    if (!pts || pts <= 0) return;
    awardBonusPoints(selectedCustomer.id, pts, bonusReason.trim() || 'Loyalty Bonus');
    setShowBonusModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Customer Loyalty & Rewards
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Earn {state.settings.pointsPerDollar} point per {c}1 spent · Redeemable in POS &
            Storefront ({c}
            {state.settings.pointValueDollars.toFixed(2)} per point)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowBonusModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap shrink-0"
        >
          <Award className="w-4 h-4" />
          Award Bonus Points
        </button>
      </div>

      {/* Tier Threshold Reference */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { tier: 'Bronze', rule: `Spend ${c}0+`, perk: '1x points earning' },
          { tier: 'Silver', rule: `Spend ${c}400+`, perk: 'Early collection access' },
          { tier: 'Gold', rule: `Spend ${c}800+`, perk: 'Free express courier' },
          { tier: 'Obsidian', rule: `Spend ${c}1,500+`, perk: 'Private tailoring credit' },
        ].map((t) => (
          <div
            key={t.tier}
            className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]"
          >
            <p className="text-sm font-semibold text-[var(--accent)]">{t.tier} Tier</p>
            <p className="font-mono-tabular text-xs text-[var(--text-primary)] mt-1">{t.rule}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{t.perk}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Rewards Redemption Catalog */}
        <div className="xl:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Redeemable Reward Vouchers
            </h2>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-md bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            >
              {state.customers.map((cust) => (
                <option key={cust.id} value={cust.id}>
                  Redeem for: {cust.name} ({cust.points} pts)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {state.loyaltyRewards.map((rew) => {
              const canAfford = (selectedCustomer?.points ?? 0) >= rew.pointsCost;
              return (
                <div
                  key={rew.id}
                  className="p-5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-[var(--accent)] shrink-0" />
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        {rew.title}
                      </h3>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{rew.description}</p>
                    <p className="font-mono-tabular text-xs text-[var(--text-muted)] mt-1.5">
                      {rew.pointsCost} pts required · {rew.redemptions} total redemptions
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() =>
                        selectedCustomer && redeemLoyaltyReward(selectedCustomer.id, rew.id)
                      }
                      className="px-4 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] disabled:opacity-35 transition-colors whitespace-nowrap shrink-0"
                    >
                      Redeem ({rew.pointsCost} pts)
                    </button>
                    <DeleteButton
                      onConfirm={() => deleteLoyaltyReward(rew.id)}
                      ariaLabel={`Delete reward ${rew.title}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Member Points Leaderboard */}
        <div className="xl:col-span-5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-hairline)]">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Loyalty Leaderboard
            </h2>
          </div>
          <div className="divide-y divide-[var(--border-hairline)]">
            {sortedCustomers.map((cust, index) => (
              <div
                key={cust.id}
                className="flex items-center justify-between px-5 py-3.5 text-xs"
              >
                <div>
                  <p className="font-medium text-[var(--text-primary)]">
                    0{index + 1}. {cust.name}
                  </p>
                  <p className="text-[var(--text-muted)] mt-0.5">
                    {cust.tier} Tier · Lifetime {c}
                    {cust.totalSpent.toFixed(0)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right font-mono-tabular">
                    <p className="text-sm font-semibold text-[var(--accent)]">
                      {cust.points.toLocaleString()} pts
                    </p>
                    <p className="text-[var(--text-muted)]">
                      Value {c}
                      {(cust.points * state.settings.pointValueDollars).toFixed(2)}
                    </p>
                  </div>
                  <DeleteButton
                    onConfirm={() => deleteCustomer(cust.id)}
                    ariaLabel={`Delete loyalty member ${cust.name}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Award Bonus Points Modal */}
      <Modal
        open={showBonusModal}
        onClose={() => setShowBonusModal(false)}
        title="Award Loyalty Bonus Points"
        subtitle="Credit extra points to a VIP customer account"
      >
        <form onSubmit={handleAward} className="space-y-4 text-xs">
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            >
              {state.customers.map((cust) => (
                <option key={cust.id} value={cust.id}>
                  {cust.name} ({cust.points} pts)
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Points to Add</label>
              <input
                type="number"
                min="10"
                required
                value={bonusPoints}
                onChange={(e) => setBonusPoints(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Reason</label>
              <input
                required
                value={bonusReason}
                onChange={(e) => setBonusReason(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowBonusModal(false)}
              className="px-4 py-2 rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)]"
            >
              Credit Points
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
