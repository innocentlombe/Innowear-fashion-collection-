import React, { useMemo, useState } from 'react';
import { BarChart3, PieChart } from 'lucide-react';
import { Order } from '../types';

export type OrderReportStatus = 'Pending' | 'Paid' | 'Shipped' | 'Delivered';

interface StatusBucket {
  status: OrderReportStatus;
  description: string;
  count: number;
  revenue: number;
  pct: number;
  color: string;
}

interface OrderStatusChartProps {
  orders: Order[];
  currencySymbol: string;
}

export function classifyOrderReportStatus(order: Order): OrderReportStatus {
  if (order.fulfillmentStatus === 'Delivered' || order.fulfillmentStatus === 'Collected') {
    return 'Delivered';
  }
  if (order.fulfillmentStatus === 'Dispatched') {
    return 'Shipped';
  }
  if (order.paymentStatus === 'Paid') {
    return 'Paid';
  }
  return 'Pending';
}

const STATUS_META: Array<{
  status: OrderReportStatus;
  description: string;
  color: string;
}> = [
  {
    status: 'Pending',
    description: 'Awaiting payment or COD confirmation',
    color: 'var(--status-warning)',
  },
  {
    status: 'Paid',
    description: 'Payment settled, packing for dispatch',
    color: 'var(--accent)',
  },
  {
    status: 'Shipped',
    description: 'Dispatched & currently in transit',
    color: '#0284c7',
  },
  {
    status: 'Delivered',
    description: 'Delivered to customer or collected',
    color: 'var(--status-positive)',
  },
];

export const OrderStatusChart: React.FC<OrderStatusChartProps> = ({
  orders,
  currencySymbol,
}) => {
  const [chartType, setChartType] = useState<'donut' | 'bar'>('donut');
  const [activeStatus, setActiveStatus] = useState<OrderReportStatus | null>(null);

  const totalOrders = orders.length;

  const buckets: StatusBucket[] = useMemo(() => {
    const counts: Record<OrderReportStatus, { count: number; revenue: number }> = {
      Pending: { count: 0, revenue: 0 },
      Paid: { count: 0, revenue: 0 },
      Shipped: { count: 0, revenue: 0 },
      Delivered: { count: 0, revenue: 0 },
    };

    for (const ord of orders) {
      const key = classifyOrderReportStatus(ord);
      counts[key].count += 1;
      counts[key].revenue += ord.total;
    }

    return STATUS_META.map((meta) => {
      const entry = counts[meta.status];
      return {
        ...meta,
        count: entry.count,
        revenue: entry.revenue,
        pct: totalOrders > 0 ? Math.round((entry.count / totalOrders) * 100) : 0,
      };
    });
  }, [orders, totalOrders]);

  const deliveredBucket = buckets.find((b) => b.status === 'Delivered');
  const shippedBucket = buckets.find((b) => b.status === 'Shipped');
  const pendingBucket = buckets.find((b) => b.status === 'Pending');
  const paidBucket = buckets.find((b) => b.status === 'Paid');

  const fulfillmentRate = deliveredBucket?.pct ?? 0;
  const awaitingDispatch = (pendingBucket?.count ?? 0) + (paidBucket?.count ?? 0);
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  const focusedBucket = activeStatus
    ? buckets.find((b) => b.status === activeStatus) ?? null
    : null;

  // SVG Donut geometry
  const size = 216;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const donutSegments = useMemo(() => {
    if (totalOrders === 0) return [];
    let cumulativeFraction = 0;
    return buckets
      .filter((b) => b.count > 0)
      .map((bucket) => {
        const fraction = bucket.count / totalOrders;
        const rawLength = fraction * circumference;
        const gap = buckets.filter((b) => b.count > 0).length > 1 ? 3 : 0;
        const dashLength = Math.max(2, rawLength - gap);
        const offset = -cumulativeFraction * circumference;
        cumulativeFraction += fraction;
        return {
          bucket,
          dashArray: `${dashLength} ${circumference - dashLength}`,
          dashOffset: offset,
        };
      });
  }, [buckets, totalOrders, circumference]);

  return (
    <section className="p-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-6">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Order Status Distribution &amp; Fulfillment Efficiency
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Live breakdown of orders across Pending, Paid, Shipped, and Delivered stages
          </p>
        </div>

        <div
          className="inline-flex items-center gap-1 p-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] self-start sm:self-auto"
          role="group"
          aria-label="Chart visualization style"
        >
          <button
            type="button"
            onClick={() => setChartType('donut')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              chartType === 'donut'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-hairline)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            Donut
          </button>
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              chartType === 'bar'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-hairline)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Bar Chart
          </button>
        </div>
      </div>

      {/* Main Chart + Interactive Legend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Visual Chart Canvas */}
        <div className="lg:col-span-5 flex items-center justify-center">
          {totalOrders === 0 ? (
            <div className="w-full py-12 text-center rounded-md border border-dashed border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
              No orders recorded yet. Place a POS, Online, or WhatsApp order to populate fulfillment
              analytics.
            </div>
          ) : chartType === 'donut' ? (
            <div className="relative flex items-center justify-center">
              <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="overflow-visible"
                role="img"
                aria-label={`Order status donut chart: ${buckets
                  .map((b) => `${b.status} ${b.count} (${b.pct}%)`)
                  .join(', ')}`}
              >
                {/* Background Track */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="var(--bg-elevated)"
                  strokeWidth={strokeWidth}
                />

                {/* Status Arcs */}
                <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
                  {donutSegments.map(({ bucket, dashArray, dashOffset }) => {
                    const isActive = activeStatus === bucket.status;
                    const isDimmed = activeStatus !== null && !isActive;
                    return (
                      <circle
                        key={bucket.status}
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={bucket.color}
                        strokeWidth={isActive ? strokeWidth + 4 : strokeWidth}
                        strokeDasharray={dashArray}
                        strokeDashoffset={dashOffset}
                        opacity={isDimmed ? 0.35 : 1}
                        className="cursor-pointer transition-all duration-200"
                        onMouseEnter={() => setActiveStatus(bucket.status)}
                        onMouseLeave={() => setActiveStatus(null)}
                        onClick={() =>
                          setActiveStatus((prev) =>
                            prev === bucket.status ? null : bucket.status
                          )
                        }
                      />
                    );
                  })}
                </g>
              </svg>

              {/* Center Metric Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-8">
                {focusedBucket ? (
                  <>
                    <span className="text-[11px] font-medium text-[var(--text-muted)]">
                      {focusedBucket.status}
                    </span>
                    <span className="font-mono-tabular text-3xl font-bold text-[var(--text-primary)] leading-tight mt-0.5">
                      {focusedBucket.count}
                    </span>
                    <span className="font-mono-tabular text-xs font-medium text-[var(--text-secondary)] mt-0.5">
                      {focusedBucket.pct}% · {currencySymbol}
                      {focusedBucket.revenue.toFixed(0)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] font-medium text-[var(--text-muted)]">
                      Fulfillment Rate
                    </span>
                    <span className="font-mono-tabular text-3xl font-bold text-[var(--text-primary)] leading-tight mt-0.5">
                      {fulfillmentRate}%
                    </span>
                    <span className="font-mono-tabular text-xs text-[var(--text-secondary)] mt-0.5">
                      {totalOrders} total {totalOrders === 1 ? 'order' : 'orders'}
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Vertical Bar Chart */
            <div className="w-full pt-2">
              <div className="relative h-52 flex items-end justify-between gap-4 px-2 sm:px-4 pt-6 pb-2 border-b border-[var(--border-hairline)]">
                {/* Subtle horizontal reference gridlines */}
                <div className="pointer-events-none absolute inset-x-0 top-6 bottom-2 flex flex-col justify-between">
                  <div className="border-t border-dashed border-[var(--border-hairline)]" />
                  <div className="border-t border-dashed border-[var(--border-hairline)]" />
                  <div className="border-t border-dashed border-[var(--border-hairline)]" />
                </div>

                {buckets.map((bucket) => {
                  const heightPct =
                    bucket.count === 0
                      ? 4
                      : Math.max(14, Math.round((bucket.count / maxCount) * 100));
                  const isActive = activeStatus === bucket.status;
                  const isDimmed = activeStatus !== null && !isActive;

                  return (
                    <button
                      key={bucket.status}
                      type="button"
                      onMouseEnter={() => setActiveStatus(bucket.status)}
                      onMouseLeave={() => setActiveStatus(null)}
                      onClick={() =>
                        setActiveStatus((prev) =>
                          prev === bucket.status ? null : bucket.status
                        )
                      }
                      className="relative z-10 flex-1 h-full flex flex-col items-center justify-end group focus:outline-none"
                      aria-label={`${bucket.status}: ${bucket.count} orders (${bucket.pct}%)`}
                    >
                      <span className="font-mono-tabular text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                        {bucket.count}
                      </span>
                      <div className="w-full max-w-[48px] flex-1 flex items-end">
                        <div
                          className="w-full rounded-t-md transition-all duration-200"
                          style={{
                            height: `${heightPct}%`,
                            backgroundColor: bucket.color,
                            opacity: bucket.count === 0 ? 0.25 : isDimmed ? 0.35 : 1,
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-4 gap-2 px-2 sm:px-4 pt-2.5 text-center">
                {buckets.map((bucket) => (
                  <div key={bucket.status} className="min-w-0">
                    <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                      {bucket.status}
                    </p>
                    <p className="font-mono-tabular text-[11px] text-[var(--text-muted)]">
                      {bucket.pct}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status Distribution Breakdown List */}
        <div className="lg:col-span-7 space-y-3">
          {buckets.map((bucket) => {
            const isActive = activeStatus === bucket.status;
            return (
              <div
                key={bucket.status}
                onMouseEnter={() => setActiveStatus(bucket.status)}
                onMouseLeave={() => setActiveStatus(null)}
                onClick={() =>
                  setActiveStatus((prev) => (prev === bucket.status ? null : bucket.status))
                }
                className={`p-3.5 rounded-md border transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[var(--bg-elevated)] border-[var(--border-strong)]'
                    : 'bg-[var(--bg-surface)] border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)]/60'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-xs shrink-0"
                      style={{ backgroundColor: bucket.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)]">
                        {bucket.status}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">
                        {bucket.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono-tabular text-xs font-semibold text-[var(--text-primary)]">
                      {bucket.count} {bucket.count === 1 ? 'order' : 'orders'}{' '}
                      <span className="text-[var(--text-muted)] font-normal">({bucket.pct}%)</span>
                    </p>
                    <p className="font-mono-tabular text-[11px] text-[var(--text-secondary)]">
                      {currencySymbol}
                      {bucket.revenue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>

                <div className="w-full h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden mt-2.5">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${bucket.count === 0 ? 0 : Math.max(4, bucket.pct)}%`,
                      backgroundColor: bucket.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fulfillment Efficiency Summary Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[var(--border-hairline)] text-xs">
        <div className="flex items-center justify-between sm:block p-3 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)]">
          <span className="text-[var(--text-muted)]">Fulfillment Completion</span>
          <p className="font-mono-tabular text-sm font-semibold text-[var(--status-positive)] sm:mt-0.5">
            {fulfillmentRate}% ({deliveredBucket?.count ?? 0}/{totalOrders})
          </p>
        </div>
        <div className="flex items-center justify-between sm:block p-3 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)]">
          <span className="text-[var(--text-muted)]">In-Transit Shipments</span>
          <p className="font-mono-tabular text-sm font-semibold text-[var(--text-primary)] sm:mt-0.5">
            {shippedBucket?.count ?? 0} {shippedBucket?.count === 1 ? 'order' : 'orders'} (
            {shippedBucket?.pct ?? 0}%)
          </p>
        </div>
        <div className="flex items-center justify-between sm:block p-3 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)]">
          <span className="text-[var(--text-muted)]">Awaiting Dispatch (Pending + Paid)</span>
          <p
            className={`font-mono-tabular text-sm font-semibold sm:mt-0.5 ${
              awaitingDispatch > 0 ? 'text-[var(--status-warning)]' : 'text-[var(--text-primary)]'
            }`}
          >
            {awaitingDispatch} {awaitingDispatch === 1 ? 'order' : 'orders'}
          </p>
        </div>
      </div>
    </section>
  );
};
