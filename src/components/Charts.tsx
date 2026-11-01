import React from 'react';
import { formatMoney, formatNum, monthLabel } from '../services/erpEngine';

const TONES: Record<string, string> = {
  green: '#10b981',
  blue: '#3b82f6',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
  purple: '#8b5cf6',
};

function shortNum(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a % 1e6 ? 1 : 0) + 'm';
  if (a >= 1000) return (n / 1000).toFixed(a % 1000 ? 1 : 0) + 'k';
  return Number(n.toFixed(1)).toString();
}

export interface ChartSeries {
  key: string;
  label: string;
  color: 'green' | 'blue' | 'yellow' | 'orange' | 'red' | 'purple';
  dashed?: boolean;
}

export const Graph21: React.FC<{
  rows: Record<string, any>[];
  series: ChartSeries[];
  line?: boolean;
}> = ({ rows, series, line = false }) => {
  if (!rows || !rows.length) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        No data in this period.
      </div>
    );
  }

  const isInt = series.every((s) => /orders|returned|cancelled|partial|messages/i.test(s.key));
  const values = rows.flatMap((r) =>
    series
      .map((s) => r[s.key])
      .filter((v) => v !== null && v !== undefined && Number.isFinite(Number(v)))
      .map(Number)
  );

  const rawHi = Math.max(1, ...values);
  const rawLo = Math.min(0, ...values);
  const stepY = isInt ? Math.max(1, Math.ceil((rawHi - rawLo) / 4)) : (rawHi - rawLo) / 4;
  const lo = isInt ? Math.floor(rawLo / stepY) * stepY : rawLo;
  const hi = isInt ? lo + stepY * 4 : rawHi || 1;

  const w = 640;
  const h = 240;
  const left = 54;
  const right = 16;
  const top = 24;
  const bottom = 38;
  const scale = (v: number) => top + ((hi - v) / Math.max(1e-6, hi - lo)) * (h - top - bottom);
  const zero = scale(0);
  const step = (w - left - right) / rows.length;

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex flex-wrap items-center gap-4 mb-2 text-xs text-slate-600 dark:text-slate-400">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-xs inline-block"
              style={{ backgroundColor: TONES[s.color] }}
            />
            <span>{s.label}</span>
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto min-w-[320px] select-none"
        role="img"
        aria-label={series.map((s) => s.label).join(', ')}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const v = lo + ((hi - lo) * i) / 4;
          const y = scale(v);
          return (
            <g key={i}>
              <line
                x1={left}
                x2={w - right}
                y1={y}
                y2={y}
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth="1"
              />
              <text
                x={left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
              >
                {isInt ? String(Math.round(v)) : shortNum(v)}
              </text>
            </g>
          );
        })}

        {series.map((s, j) => {
          const segments: string[][] = [];
          let currentSeg: string[] = [];

          rows.forEach((r, i) => {
            const val = r[s.key];
            if (val === null || val === undefined || !Number.isFinite(Number(val))) {
              if (currentSeg.length) {
                segments.push(currentSeg);
                currentSeg = [];
              }
              return;
            }
            const x = left + (i + 0.5) * step;
            const y = scale(Number(val));
            currentSeg.push(`${x},${y}`);
          });
          if (currentSeg.length) segments.push(currentSeg);

          return (
            <g key={s.key}>
              {line &&
                segments.map((pts, idx) => (
                  <polyline
                    key={idx}
                    points={pts.join(' ')}
                    fill="none"
                    stroke={TONES[s.color]}
                    strokeWidth="2.2"
                    strokeDasharray={s.dashed ? '6 4' : undefined}
                  />
                ))}

              {rows.map((r, i) => {
                const value = r[s.key];
                if (value === null || value === undefined || !Number.isFinite(Number(value))) {
                  return null;
                }
                const numVal = Number(value);
                const x = left + (i + 0.5) * step;
                const y = scale(numVal);
                const color = numVal < 0 ? TONES.red : TONES[s.color];
                const tip = `${r.range || r.name} · ${s.label}: ${formatNum(numVal)}`;
                const bw = (step * 0.75) / series.length;

                return (
                  <g key={`${s.key}-${i}`}>
                    {line ? (
                      !s.dashed && (
                        <circle cx={x} cy={y} r="3.2" fill={color}>
                          <title>{tip}</title>
                        </circle>
                      )
                    ) : (
                      <rect
                        x={x - step * 0.375 + j * bw}
                        y={Math.min(y, zero)}
                        width={Math.max(1.5, bw - 1)}
                        height={Math.max(1, Math.abs(y - zero))}
                        rx="2"
                        fill={color}
                      >
                        <title>{tip}</title>
                      </rect>
                    )}
                    {rows.length <= 16 && !s.dashed && numVal !== 0 && (
                      <text
                        x={line ? x : x - step * 0.375 + (j + 0.5) * bw}
                        y={numVal < 0 ? y + 12 : y - 6}
                        textAnchor="middle"
                        className="fill-slate-600 dark:fill-slate-300 text-[9px] font-mono"
                      >
                        {isInt ? String(Math.round(numVal)) : shortNum(numVal)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {rows.map((r, i) => {
          const skip = Math.max(1, Math.ceil(rows.length / 9));
          if (i % skip !== 0) return null;
          const rawLabel =
            r.label || (/^\d{4}-\d{2}$/.test(r.name) ? monthLabel(r.name) : String(r.name).slice(5) || r.name);
          const label = String(rawLabel).length > 11 ? String(rawLabel).slice(0, 10) + '…' : rawLabel;
          return (
            <text
              key={i}
              x={left + (i + 0.5) * step}
              y={h - 12}
              textAnchor="middle"
              className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export const ExpenseBars: React.FC<{
  rows: { name: string; actual: number; projection: number }[];
}> = ({ rows }) => {
  if (!rows.length) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        No expenses or projections in this period.
      </div>
    );
  }
  const max = Math.max(1, ...rows.flatMap((x) => [x.actual, x.projection]));
  const colors = Object.values(TONES);

  return (
    <div className="space-y-3 py-2">
      {rows.map((r, i) => (
        <div key={r.name} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-800 dark:text-slate-200">{r.name}</span>
            <span className="font-mono text-slate-500 dark:text-slate-400">
              Actual {formatMoney(r.actual)} · Accrued {formatMoney(r.projection)}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${Math.min(100, (r.projection / max) * 100)}%`,
                backgroundColor: colors[i % colors.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export const DualAdGraph: React.FC<{
  rows: { name: string; spend: number | null; orders: number }[];
}> = ({ rows }) => {
  if (!rows.length) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        No ad data in selected range.
      </div>
    );
  }

  const w = 640;
  const h = 240;
  const l = 56;
  const r = 44;
  const t = 22;
  const b = 36;
  const maxMoney = Math.max(1, ...rows.map((x) => x.spend || 0));
  const maxOrders = Math.max(4, ...rows.map((x) => x.orders || 0));
  const countMax = Math.ceil(maxOrders / 4) * 4;
  const step = (w - l - r) / rows.length;
  const points = rows.map((x, i) => {
    const cx = l + (i + 0.5) * step;
    const cy = h - b - (x.orders / countMax) * (h - t - b);
    return `${cx},${cy}`;
  });

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
        <span>Left: VAT-inclusive Ad Expense BDT (columns)</span>
        <span>Right: All Orders Created (line)</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto min-w-[320px]">
        {[0, 1, 2, 3, 4].map((i) => {
          const y = h - b - ((h - t - b) * i) / 4;
          return (
            <g key={i}>
              <line
                x1={l}
                x2={w - r}
                y1={y}
                y2={y}
                className="stroke-slate-200 dark:stroke-slate-800"
              />
              <text
                x={l - 6}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
              >
                {shortNum((maxMoney * i) / 4)}
              </text>
              <text
                x={w - r + 6}
                y={y + 4}
                className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
              >
                {(countMax * i) / 4}
              </text>
            </g>
          );
        })}

        {rows.map((x, i) => {
          const cx = l + (i + 0.5) * step;
          const cy = h - b - (x.orders / countMax) * (h - t - b);
          const barY = x.spend !== null ? h - b - (x.spend / maxMoney) * (h - t - b) : h - b;
          const skip = Math.max(1, Math.ceil(rows.length / 8));
          return (
            <g key={x.name}>
              {x.spend !== null && (
                <rect
                  x={cx - step * 0.3}
                  y={barY}
                  width={Math.max(2, step * 0.6)}
                  height={Math.max(1, h - b - barY)}
                  fill="#10b981"
                  rx="2"
                >
                  <title>{`${x.name} · Ad Expense ${formatMoney(x.spend)}`}</title>
                </rect>
              )}
              <circle cx={cx} cy={cy} r="3.2" fill="#3b82f6">
                <title>{`${x.name} · Orders ${x.orders}`}</title>
              </circle>
              {i % skip === 0 && (
                <text
                  x={cx}
                  y={h - 12}
                  textAnchor="middle"
                  className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
                >
                  {x.name.slice(5)}
                </text>
              )}
            </g>
          );
        })}

        <polyline points={points.join(' ')} fill="none" stroke="#3b82f6" strokeWidth="2.2" />
      </svg>
    </div>
  );
};
