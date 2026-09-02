'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney, formatNumber } from '@/lib/format';

export interface SeriesPoint {
  date: string;
  orders: number;
  revenue: number;
}

const AXIS = { stroke: '#3a3e49', fontSize: 11 } as const;

function ChartTooltip({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  money?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="rounded-xl border border-ink-600 bg-ink-900/95 px-3 py-2 text-xs shadow-card backdrop-blur">
      <div className="text-zinc-500">{label}</div>
      <div className="mt-1 font-semibold text-white">
        {money ? formatMoney(value) : `${formatNumber(value)} заказ.`}
      </div>
    </div>
  );
}

/** График динамики заказов по дням. */
export function OrdersChart({ data }: { data: SeriesPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="#1e2027" vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={AXIS} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} />
          <Tooltip cursor={{ fill: 'rgba(200,169,106,.07)' }} content={<ChartTooltip />} />
          <Bar dataKey="orders" fill="#c8a96a" radius={[6, 6, 0, 0]} maxBarSize={34} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** График выручки по дням. */
export function RevenueChart({ data }: { data: SeriesPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c8a96a" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#c8a96a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1e2027" vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={AXIS} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={AXIS}
            width={64}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}к` : String(v))}
          />
          <Tooltip content={<ChartTooltip money />} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#c8a96a"
            strokeWidth={2}
            fill="url(#revenueFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
