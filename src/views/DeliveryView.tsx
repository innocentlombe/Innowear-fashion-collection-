import React, { useMemo, useState } from 'react';
import { Plus, ArrowRight } from 'lucide-react';
import { DeliveryStatus, DeliveryType } from '../types';
import { useInnoWear } from '../store/useInnoWearStore';
import { Modal } from '../components/Modal';
import { DeleteButton } from '../components/DeleteButton';

const NEXT_DELIVERY: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  'Awaiting Pickup': 'In Transit',
  'In Transit': 'Delivered',
  'Ready for Collection': 'Collected',
};

export const DeliveryView: React.FC = () => {
  const { state, advanceDeliveryStatus, addDelivery, deleteDelivery } = useInnoWear();
  const c = state.settings.currencySymbol;

  const [typeFilter, setTypeFilter] = useState<'All' | DeliveryType>('All');
  const [showModal, setShowModal] = useState(false);

  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [destination, setDestination] = useState('');
  const [type, setType] = useState<DeliveryType>('Courier Dispatch');
  const [courierName, setCourierName] = useState('SwiftLine Express');
  const [fee, setFee] = useState('15');
  const [eta, setEta] = useState('Tomorrow, 14:00');

  const filtered = useMemo(() => {
    if (typeFilter === 'All') return state.deliveries;
    return state.deliveries.filter((d) => d.type === typeFilter);
  }, [state.deliveries, typeFilter]);

  const totalFees = state.deliveries.reduce((s, d) => s + d.fee, 0);

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !destination.trim()) return;
    addDelivery({
      orderNumber: orderNumber.trim() || `INW-MAN-${Date.now().toString().slice(-4)}`,
      customerName: customerName.trim(),
      phone: phone.trim() || '+260 97 000 0000',
      destination: destination.trim(),
      type,
      courierName: courierName.trim() || 'In-House Rider',
      fee: parseFloat(fee) || 0,
      status: type === 'Store Collection' ? 'Ready for Collection' : 'Awaiting Pickup',
      eta,
    });
    setOrderNumber('');
    setCustomerName('');
    setPhone('');
    setDestination('');
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Delivery & Dispatch Management
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Track parcels, courier riders, delivery fees, and boutique customer collections
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Schedule Dispatch
        </button>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Active Parcels In Progress</p>
          <p className="font-mono-tabular text-xl font-semibold text-[var(--text-primary)] mt-1">
            {
              state.deliveries.filter(
                (d) => d.status !== 'Delivered' && d.status !== 'Collected'
              ).length
            }
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Completed Deliveries</p>
          <p className="font-mono-tabular text-xl font-semibold text-[var(--status-positive)] mt-1">
            {
              state.deliveries.filter(
                (d) => d.status === 'Delivered' || d.status === 'Collected'
              ).length
            }
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Cumulative Delivery Fees</p>
          <p className="font-mono-tabular text-xl font-semibold text-[var(--accent)] mt-1">
            {c}
            {totalFees.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Type Tabs */}
      <div className="flex items-center gap-1.5">
        {(['All', 'Courier Dispatch', 'Store Collection'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              typeFilter === t
                ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Parcels Table */}
      <div className="overflow-x-auto rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
              <th className="py-3 px-4 font-medium">Tracking & Order</th>
              <th className="py-3 px-4 font-medium">Customer & Destination</th>
              <th className="py-3 px-4 font-medium">Channel & Courier</th>
              <th className="py-3 px-4 font-medium text-right">Fee</th>
              <th className="py-3 px-4 font-medium">Status & ETA</th>
              <th className="py-3 px-4 font-medium text-right">Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-hairline)] text-sm">
            {filtered.map((del) => {
              const next = NEXT_DELIVERY[del.status];
              return (
                <tr key={del.id} className="hover:bg-[var(--bg-elevated)]/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono-tabular text-xs">
                    <div className="font-semibold text-[var(--text-primary)]">
                      {del.trackingCode}
                    </div>
                    <div className="text-[var(--text-muted)]">{del.orderNumber}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div className="font-medium text-[var(--text-primary)]">
                      {del.customerName} · {del.phone}
                    </div>
                    <div className="text-[var(--text-muted)] mt-0.5">{del.destination}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div className="text-[var(--text-primary)]">{del.type}</div>
                    <div className="text-[var(--text-muted)]">{del.courierName}</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-tabular text-xs text-[var(--text-primary)]">
                    {del.fee === 0 ? 'Free' : `${c}${del.fee.toFixed(2)}`}
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div
                      className={`font-medium ${
                        del.status === 'Delivered' || del.status === 'Collected'
                          ? 'text-[var(--status-positive)]'
                          : 'text-[var(--accent)]'
                      }`}
                    >
                      {del.status}
                    </div>
                    <div className="text-[var(--text-muted)]">{del.eta}</div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      {next ? (
                        <button
                          type="button"
                          onClick={() => advanceDeliveryStatus(del.id, next)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] transition-colors whitespace-nowrap"
                        >
                          {next}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">Completed</span>
                      )}
                      <DeleteButton
                        onConfirm={() => deleteDelivery(del.id)}
                        ariaLabel={`Delete delivery ${del.trackingCode}`}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Schedule Dispatch Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Schedule New Parcel Dispatch"
        subtitle="Creates a tracked courier dispatch or customer boutique collection"
      >
        <form onSubmit={handleSchedule} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Order Number</label>
              <input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="INW-2026-..."
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Delivery Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DeliveryType)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              >
                <option value="Courier Dispatch">Courier Dispatch</option>
                <option value="Store Collection">Store Collection</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Customer Name</label>
              <input
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Contact Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[var(--text-secondary)] mb-1">Destination Address</label>
            <input
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Street, area or Flagship Boutique"
              className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Courier</label>
              <input
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Fee ({c})</label>
              <input
                type="number"
                min="0"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Estimated ETA</label>
              <input
                value={eta}
                onChange={(e) => setEta(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
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
              Schedule Dispatch
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
