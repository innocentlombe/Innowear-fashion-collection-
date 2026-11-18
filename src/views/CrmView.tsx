import React, { useMemo, useState } from 'react';
import { Plus, Search, Mail, Phone, MapPin } from 'lucide-react';
import { Customer, LoyaltyTier } from '../types';
import { useInnoWear } from '../store/useInnoWearStore';
import { Modal } from '../components/Modal';

export const CrmView: React.FC = () => {
  const { state, addCustomer } = useInnoWear();
  const c = state.settings.currencySymbol;

  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'All' | LoyaltyTier>('All');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [preferredSize, setPreferredSize] = useState('M');
  const [preferredStyle, setPreferredStyle] = useState('Tailoring & Footwear');

  const filtered = useMemo(() => {
    return state.customers.filter((cust) => {
      if (tierFilter !== 'All' && cust.tier !== tierFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        cust.name.toLowerCase().includes(q) ||
        cust.phone.toLowerCase().includes(q) ||
        cust.email.toLowerCase().includes(q) ||
        cust.preferredStyle.toLowerCase().includes(q)
      );
    });
  }, [state.customers, tierFilter, search]);

  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return state.orders.filter(
      (o) =>
        o.customerId === selectedCustomer.id ||
        o.customerName.toLowerCase() === selectedCustomer.name.toLowerCase()
    );
  }, [selectedCustomer, state.orders]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addCustomer({
      name: name.trim(),
      phone: phone.trim() || 'Not provided',
      email: email.trim() || 'client@innowear.co',
      address: address.trim() || 'Lusaka',
      preferredSize,
      preferredStyle,
    });
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Customer Management (CRM)
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Client profiles, purchase history, sizing preferences, and lifetime spend
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['All', 'Obsidian', 'Gold', 'Silver', 'Bronze'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setTierFilter(tier)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                tierFilter === tier
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, style..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="overflow-x-auto rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
              <th className="py-3 px-4 font-medium">Customer</th>
              <th className="py-3 px-4 font-medium">Contact</th>
              <th className="py-3 px-4 font-medium">Size & Style Preference</th>
              <th className="py-3 px-4 font-medium text-right">Orders</th>
              <th className="py-3 px-4 font-medium text-right">Lifetime Spend</th>
              <th className="py-3 px-4 font-medium text-right">Loyalty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-hairline)] text-sm">
            {filtered.map((cust) => (
              <tr
                key={cust.id}
                onClick={() => setSelectedCustomer(cust)}
                className="hover:bg-[var(--bg-elevated)]/70 transition-colors cursor-pointer"
              >
                <td className="py-3.5 px-4">
                  <p className="font-medium text-[var(--text-primary)]">{cust.name}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Member since {cust.joinedDate}
                  </p>
                </td>
                <td className="py-3.5 px-4 text-xs text-[var(--text-secondary)]">
                  <p>{cust.phone}</p>
                  <p className="text-[var(--text-muted)] mt-0.5">{cust.email}</p>
                </td>
                <td className="py-3.5 px-4 text-xs text-[var(--text-secondary)]">
                  Size {cust.preferredSize} · {cust.preferredStyle}
                </td>
                <td className="py-3.5 px-4 text-right font-mono-tabular text-xs text-[var(--text-primary)]">
                  {cust.ordersCount}
                </td>
                <td className="py-3.5 px-4 text-right font-mono-tabular text-sm font-semibold text-[var(--text-primary)]">
                  {c}
                  {cust.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3.5 px-4 text-right text-xs">
                  <div className="font-semibold text-[var(--accent)]">{cust.tier}</div>
                  <div className="font-mono-tabular text-[var(--text-muted)]">
                    {cust.points.toLocaleString()} pts
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Customer Profile & Purchase History Modal */}
      <Modal
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer?.name || ''}
        subtitle={
          selectedCustomer
            ? `${selectedCustomer.tier} Member · ${selectedCustomer.points.toLocaleString()} points`
            : ''
        }
        maxWidth="max-w-xl"
      >
        {selectedCustomer && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)]">
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Phone className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>{selectedCustomer.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Mail className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>{selectedCustomer.email}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-secondary)] sm:col-span-2">
                <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>{selectedCustomer.address}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[var(--text-secondary)]">
              <span>Preferred Size: {selectedCustomer.preferredSize}</span>
              <span>Style Profile: {selectedCustomer.preferredStyle}</span>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                Purchase History ({customerOrders.length})
              </h3>
              {customerOrders.length === 0 ? (
                <p className="text-[var(--text-muted)] py-4">
                  No orders recorded for this customer yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {customerOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="flex items-center justify-between p-3 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)]"
                    >
                      <div>
                        <p className="font-mono-tabular font-semibold text-[var(--text-primary)]">
                          {ord.orderNumber}
                        </p>
                        <p className="text-[var(--text-muted)] mt-0.5">
                          {ord.date} · {ord.channel} · {ord.items.length} item(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono-tabular font-semibold text-[var(--accent)]">
                          {c}
                          {ord.total.toFixed(2)}
                        </p>
                        <p className="text-[var(--text-muted)]">{ord.fulfillmentStatus}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add Customer Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Register New Customer"
        subtitle="Creates a CRM record enrolled in InnoWear Loyalty"
      >
        <form onSubmit={handleAdd} className="space-y-4 text-xs">
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Full Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Natasha Mulenga"
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+260 97 ..."
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address & city"
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Preferred Size</label>
              <input
                value={preferredSize}
                onChange={(e) => setPreferredSize(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Style Preference</label>
              <input
                value={preferredStyle}
                onChange={(e) => setPreferredStyle(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
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
              Save Customer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
