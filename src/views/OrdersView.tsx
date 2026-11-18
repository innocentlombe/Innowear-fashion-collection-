import React, { useMemo, useState } from 'react';
import { ArrowRight, Eye } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { useInnoWear } from '../store/useInnoWearStore';
import { Modal } from '../components/Modal';

const NEXT_STAGE: Partial<Record<OrderStatus, OrderStatus>> = {
  Confirmed: 'Packing',
  Packing: 'Dispatched',
  Dispatched: 'Delivered',
};

export const OrdersView: React.FC = () => {
  const { state, advanceOrderStatus } = useInnoWear();
  const c = state.settings.currencySymbol;

  const [channelFilter, setChannelFilter] = useState<'All' | 'POS' | 'Online'>('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    if (channelFilter === 'All') return state.orders;
    return state.orders.filter((o) => o.channel === channelFilter);
  }, [state.orders, channelFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Order Management
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Track every POS and online order from payment through packing to final delivery
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {(['All', 'Online', 'POS'] as const).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => setChannelFilter(ch)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                channelFilter === ch
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {ch === 'All' ? `All Orders (${state.orders.length})` : ch}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(['Confirmed', 'Packing', 'Dispatched', 'Delivered'] as const).map((stage) => {
          const count = state.orders.filter((o) =>
            stage === 'Delivered'
              ? o.fulfillmentStatus === 'Delivered' || o.fulfillmentStatus === 'Collected'
              : o.fulfillmentStatus === stage
          ).length;
          return (
            <div
              key={stage}
              className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]"
            >
              <p className="text-xs text-[var(--text-muted)]">
                {stage === 'Delivered' ? 'Delivered / Collected' : stage}
              </p>
              <p className="font-mono-tabular text-2xl font-semibold text-[var(--text-primary)] mt-1">
                {count}
              </p>
            </div>
          );
        })}
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
              <th className="py-3 px-4 font-medium">Order #</th>
              <th className="py-3 px-4 font-medium">Customer & Channel</th>
              <th className="py-3 px-4 font-medium">Payment</th>
              <th className="py-3 px-4 font-medium">Fulfillment Stage</th>
              <th className="py-3 px-4 font-medium text-right">Total</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-hairline)] text-sm">
            {filtered.map((ord) => {
              const next = NEXT_STAGE[ord.fulfillmentStatus];
              return (
                <tr key={ord.id} className="hover:bg-[var(--bg-elevated)]/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono-tabular text-xs">
                    <div className="font-semibold text-[var(--text-primary)]">
                      {ord.orderNumber}
                    </div>
                    <div className="text-[var(--text-muted)]">{ord.date}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div className="font-medium text-[var(--text-primary)]">
                      {ord.customerName}
                    </div>
                    <div className="text-[var(--text-muted)]">
                      {ord.channel} · {ord.items.reduce((s, i) => s + i.qty, 0)} item(s)
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div className="text-[var(--text-primary)]">{ord.paymentMethod}</div>
                    <div
                      className={
                        ord.paymentStatus === 'Paid' ? 'text-emerald-400' : 'text-amber-400'
                      }
                    >
                      {ord.paymentStatus}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-[var(--text-primary)]">
                    {ord.fulfillmentStatus}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-[var(--accent)]">
                    {c}
                    {ord.total.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(ord)}
                        className="p-1.5 rounded-md border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        aria-label={`View invoice ${ord.orderNumber}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {next && (
                        <button
                          type="button"
                          onClick={() => advanceOrderStatus(ord.id, next)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap"
                        >
                          {next}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Order Invoice Modal */}
      <Modal
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order ${selectedOrder.orderNumber}` : ''}
        subtitle={
          selectedOrder
            ? `${selectedOrder.channel} · ${selectedOrder.date} · ${selectedOrder.fulfillmentStatus}`
            : ''
        }
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] space-y-1">
              <p className="text-[var(--text-primary)] font-medium">
                Customer: {selectedOrder.customerName}
              </p>
              <p className="text-[var(--text-muted)]">
                Payment: {selectedOrder.paymentMethod} ({selectedOrder.paymentStatus})
              </p>
              {selectedOrder.deliveryAddress && (
                <p className="text-[var(--text-muted)]">
                  Address: {selectedOrder.deliveryAddress}
                </p>
              )}
            </div>

            <div className="space-y-2">
              {selectedOrder.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between py-2 border-b border-[var(--border-hairline)]"
                >
                  <div>
                    <p className="text-[var(--text-primary)] font-medium">{item.name}</p>
                    <p className="text-[var(--text-muted)]">
                      {item.sku} · Size {item.size} · {item.colour} · Qty {item.qty}
                    </p>
                  </div>
                  <span className="font-mono-tabular text-[var(--text-primary)]">
                    {c}
                    {(item.unitPrice * item.qty).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Subtotal</span>
                <span className="font-mono-tabular">
                  {c}
                  {selectedOrder.subtotal.toFixed(2)}
                </span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount</span>
                  <span className="font-mono-tabular">
                    -{c}
                    {selectedOrder.discount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Delivery Fee</span>
                <span className="font-mono-tabular">
                  {c}
                  {selectedOrder.deliveryFee.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Tax</span>
                <span className="font-mono-tabular">
                  {c}
                  {selectedOrder.tax.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-[var(--text-primary)] pt-2 border-t border-[var(--border-hairline)]">
                <span>Order Total</span>
                <span className="font-mono-tabular text-[var(--accent)]">
                  {c}
                  {selectedOrder.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
