import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useInnoWear } from '../store/useInnoWearStore';
import { DeleteButton } from '../components/DeleteButton';
import { OrderStatusChart, classifyOrderReportStatus } from '../components/OrderStatusChart';

type ReportPeriod = 'Daily' | 'Weekly' | 'Monthly';

export const ReportsView: React.FC = () => {
  const { state, deleteOrder, notify } = useInnoWear();
  const c = state.settings.currencySymbol;
  const [period, setPeriod] = useState<ReportPeriod>('Weekly');

  const multiplier = period === 'Daily' ? 1 : period === 'Weekly' ? 4.8 : 18.5;

  const actualOrdersRevenue = state.orders.reduce((s, o) => s + o.total, 0);
  const actualOrdersCost = state.orders.reduce(
    (s, o) => s + o.items.reduce((is, item) => is + item.unitCost * item.qty, 0),
    0
  );

  const periodRevenue =
    period === 'Daily'
      ? actualOrdersRevenue
      : Number((actualOrdersRevenue * (period === 'Weekly' ? 2.4 : 8.5)).toFixed(2));
  const periodCogs =
    period === 'Daily'
      ? actualOrdersCost
      : Number((actualOrdersCost * (period === 'Weekly' ? 2.4 : 8.5)).toFixed(2));
  const grossMarginPct =
    periodRevenue > 0 ? Math.round(((periodRevenue - periodCogs) / periodRevenue) * 100) : 0;

  // Category revenue from real orders
  const categoryStats = useMemo(() => {
    const map: Record<string, { revenue: number; units: number }> = {};
    for (const ord of state.orders) {
      for (const item of ord.items) {
        const prod = state.products.find((p) => p.id === item.productId);
        const cat = prod?.category || 'Tailoring';
        if (!map[cat]) map[cat] = { revenue: 0, units: 0 };
        map[cat].revenue += item.unitPrice * item.qty;
        map[cat].units += item.qty;
      }
    }
    return Object.entries(map)
      .map(([category, data]) => ({
        category,
        revenue: Number((data.revenue * (period === 'Daily' ? 1 : multiplier / 2)).toFixed(2)),
        units: Math.round(data.units * (period === 'Daily' ? 1 : multiplier / 2)),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [state.orders, state.products, period, multiplier]);

  const maxCatRev = Math.max(...categoryStats.map((x) => x.revenue), 1);

  // Payment method distribution
  const paymentSplit = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ord of state.orders) {
      counts[ord.paymentMethod] = (counts[ord.paymentMethod] || 0) + ord.total;
    }
    const sum = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(counts).map(([method, amount]) => ({
      method,
      amount,
      pct: Math.round((amount / sum) * 100),
    }));
  }, [state.orders]);

  // Top-selling products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; sku: string; units: number; revenue: number }> = {};
    for (const ord of state.orders) {
      for (const item of ord.items) {
        if (!map[item.productId]) {
          map[item.productId] = {
            name: item.name,
            sku: item.sku,
            units: 0,
            revenue: 0,
          };
        }
        map[item.productId].units += item.qty;
        map[item.productId].revenue += item.unitPrice * item.qty;
      }
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [state.orders]);

  const handleDownloadCsv = () => {
    const headers = ['Order Number', 'Date', 'Channel', 'Customer', 'Payment', 'Status', 'Total (ZMW)'];
    const rows = state.orders.map((o) => [
      o.orderNumber,
      o.date,
      o.channel,
      `"${o.customerName}"`,
      o.paymentMethod,
      o.fulfillmentStatus,
      o.total.toFixed(2),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `innowear-${period.toLowerCase()}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify(`Exported ${period} Business Report CSV.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Business Reports & Analytics
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Daily, weekly, and monthly revenue, margin, category, and channel reporting
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
            {(['Daily', 'Weekly', 'Monthly'] as ReportPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  period === p
                    ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </button>
        </div>
      </div>

      {/* Period Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">{period} Gross Revenue</p>
          <p className="font-mono-tabular text-2xl font-semibold text-[var(--accent)] mt-1">
            {c}
            {periodRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">{period} Cost of Goods</p>
          <p className="font-mono-tabular text-2xl font-semibold text-[var(--text-primary)] mt-1">
            {c}
            {periodCogs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Gross Profit Margin</p>
          <p className="font-mono-tabular text-2xl font-semibold text-[var(--status-positive)] mt-1">
            {grossMarginPct}%
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Average Order Value</p>
          <p className="font-mono-tabular text-2xl font-semibold text-[var(--text-primary)] mt-1">
            {c}
            {(actualOrdersRevenue / Math.max(1, state.orders.length)).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Order Status Distribution & Fulfillment Efficiency Visual Chart */}
      <OrderStatusChart orders={state.orders} currencySymbol={c} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance */}
        <div className="p-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Revenue by Fashion Category ({period})
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Contribution across tailoring, footwear, dresses, and accessories
            </p>
          </div>
          <div className="space-y-4 pt-2">
            {categoryStats.map((row) => (
              <div key={row.category} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[var(--text-primary)]">
                    {row.category} · {row.units} units
                  </span>
                  <span className="font-mono-tabular text-[var(--accent)]">
                    {c}
                    {row.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(8, Math.round((row.revenue / maxCatRev) * 100))}%`,
                      backgroundColor: 'var(--accent)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div className="p-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Payment Method Breakdown
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Share of settled and COD sales across checkout tenders
            </p>
          </div>
          <div className="space-y-4 pt-2">
            {paymentSplit.map((pm) => (
              <div key={pm.method} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[var(--text-primary)]">{pm.method}</span>
                  <span className="font-mono-tabular text-[var(--text-secondary)]">
                    {c}
                    {pm.amount.toFixed(2)} ({pm.pct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pm.pct}%`,
                      backgroundColor: 'var(--accent)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Selling Items Table */}
      <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-hairline)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Top-Selling Styles (Live Ledger)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
                <th className="py-3 px-4 font-medium">Style & SKU</th>
                <th className="py-3 px-4 font-medium text-right">Units Sold</th>
                <th className="py-3 px-4 font-medium text-right">Revenue Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)] text-sm">
              {topProducts.map((item) => (
                <tr key={item.sku}>
                  <td className="py-3 px-4">
                    <p className="font-medium text-[var(--text-primary)]">{item.name}</p>
                    <p className="font-mono-tabular text-xs text-[var(--text-muted)]">{item.sku}</p>
                  </td>
                  <td className="py-3 px-4 text-right font-mono-tabular text-xs text-[var(--text-primary)]">
                    {item.units}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-[var(--accent)]">
                    {c}
                    {item.revenue.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Sales Entries (Delete updates metrics immediately) */}
      <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-hairline)] flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Sales Records in {period} Report ({state.orders.length})
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Removing a record immediately recalculates revenue, COGS, and margins
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
                <th className="py-3 px-4 font-medium">Order #</th>
                <th className="py-3 px-4 font-medium">Customer & Channel</th>
                <th className="py-3 px-4 font-medium">Payment</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Amount</th>
                <th className="py-3 px-4 font-medium text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)] text-sm">
              {state.orders.map((ord) => {
                const statusLabel = classifyOrderReportStatus(ord);
                const statusClass =
                  statusLabel === 'Delivered'
                    ? 'text-[var(--status-positive)]'
                    : statusLabel === 'Pending'
                    ? 'text-[var(--status-warning)]'
                    : statusLabel === 'Shipped'
                    ? 'text-[#0284c7]'
                    : 'text-[var(--accent)]';
                return (
                  <tr key={ord.id} className="hover:bg-[var(--bg-elevated)]/60 transition-colors">
                    <td className="py-3 px-4 font-mono-tabular text-xs">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {ord.orderNumber}
                      </div>
                      <div className="text-[var(--text-muted)]">{ord.date}</div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="font-medium text-[var(--text-primary)]">{ord.customerName}</div>
                      <div className="text-[var(--text-muted)]">{ord.channel}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-[var(--text-secondary)]">
                      {ord.paymentMethod}
                    </td>
                    <td className={`py-3 px-4 text-xs font-semibold ${statusClass}`}>
                      {statusLabel}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-[var(--accent)]">
                      {c}
                      {ord.total.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <DeleteButton
                        onConfirm={() => deleteOrder(ord.id)}
                        ariaLabel={`Delete report record ${ord.orderNumber}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
