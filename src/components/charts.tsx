// Hand-rolled SVG charts — no chart library in the Preview package set.

interface Pt {
  m: string
  v: number
}

export function TrendLine({
  points,
  color = 'hsl(222 68% 46%)',
  height = 64,
  showArea = true,
  suffix = '',
}: {
  points: Pt[]
  color?: string
  height?: number
  showArea?: boolean
  suffix?: string
}) {
  const w = 100
  const h = 36
  const vals = points.map((p) => p.v)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const pad = 2
  const x = (i: number) => (i / (points.length - 1)) * (w - pad * 2) + pad
  const y = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2)
  const line = points.map((p, i) => `${x(i).toFixed(2)},${y(p.v).toFixed(2)}`).join(' ')
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`
  const last = points[points.length - 1]
  const first = points[0]
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={height} preserveAspectRatio="none">
        {showArea && <polygon points={area} fill={color} opacity={0.08} />}
        <polyline points={line} fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(points.length - 1)} cy={y(last.v)} r={1.8} fill={color} />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>
          {first.m} · {first.v}
          {suffix}
        </span>
        <span className="font-medium text-slate-500">
          {last.m} · {last.v}
          {suffix}
        </span>
      </div>
    </div>
  )
}

export function SurvivalCurve({
  data,
}: {
  data: { day: number; withEngine: number; baseline: number }[]
}) {
  const w = 320
  const h = 170
  const padL = 30
  const padB = 22
  const padT = 10
  const padR = 8
  const maxDay = 100
  const yMin = 40
  const yMax = 100
  const x = (d: number) => padL + (d / maxDay) * (w - padL - padR)
  const y = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * (h - padT - padB)
  const toLine = (key: 'withEngine' | 'baseline') =>
    data.map((p) => `${x(p.day).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')
  const engine = toLine('withEngine')
  const baseline = toLine('baseline')
  const gridY = [40, 60, 80, 100]
  const gridX = [0, 30, 60, 90]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="auto" className="overflow-visible">
      {gridY.map((g) => (
        <g key={g}>
          <line x1={padL} y1={y(g)} x2={w - padR} y2={y(g)} stroke="#e2e8f0" strokeWidth={1} />
          <text x={padL - 6} y={y(g) + 3} textAnchor="end" className="fill-slate-400 text-[9px]">
            {g}%
          </text>
        </g>
      ))}
      {gridX.map((g) => (
        <text key={g} x={x(g)} y={h - 6} textAnchor="middle" className="fill-slate-400 text-[9px]">
          d{g}
        </text>
      ))}
      <polyline points={baseline} fill="none" stroke="#94a3b8" strokeWidth={1.6} strokeDasharray="4 3" />
      <polyline points={engine} fill="none" stroke="hsl(222 68% 46%)" strokeWidth={2.2} strokeLinejoin="round" />
      {data.map((p) => (
        <circle key={p.day} cx={x(p.day)} cy={y(p.withEngine)} r={2} fill="hsl(222 68% 46%)" />
      ))}
    </svg>
  )
}

export function Ring({
  value,
  size = 92,
  stroke = 9,
  color = 'hsl(222 68% 46%)',
  track = '#e8edf5',
  label,
  sublabel,
  labelColor,
  sublabelColor,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  label?: string
  sublabel?: string
  labelColor?: string
  sublabelColor?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const dash = (pct / 100) * c
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold text-slate-800" style={labelColor ? { color: labelColor } : undefined}>
          {label ?? `${Math.round(pct)}%`}
        </span>
        {sublabel && (
          <span
            className="text-[10px] uppercase tracking-wide text-slate-400"
            style={sublabelColor ? { color: sublabelColor } : undefined}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  )
}

// Horizontal proportional bar used for reason breakdowns.
export function HBars({
  items,
  color = 'hsl(222 68% 46%)',
}: {
  items: { label: string; value: number; hint?: string }[]
  color?: string
}) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="space-y-2.5">
      {items.map((it) => (
        <div key={it.label}>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-slate-600">{it.label}</span>
            <span className="font-medium text-slate-500">{it.hint ?? it.value}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full" style={{ width: `${(it.value / max) * 100}%`, backgroundColor: color }} />
          </div>
        </div>
      ))}
    </div>
  )
}
