import { X_BANDS, X_TICKS, Y_BANDS, type Point } from '../reportData';

const W = 640;
const H = 400;
const PAD = { top: 34, right: 18, bottom: 68, left: 88 };

const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const sx = (nota: number) => PAD.left + ((nota - 1) / 4) * PLOT_W;
/** dificultad 1 (alta) arriba, 0 (baja) abajo */
const sy = (dif: number) => PAD.top + (1 - dif) * PLOT_H;

function color(nota: number) {
  if (nota >= 3.75) return 'var(--secondary)';
  if (nota >= 3) return 'var(--primary)';
  return 'var(--alert)';
}

interface Props {
  points: Point[];
  showPath: boolean;
  labelPoints?: boolean;
}

export default function TrajectoryChart({ points, showPath, labelPoints = false }: Props) {
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Mapa de desempeño por dificultad">
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--primary)" />
          </marker>
        </defs>

        <rect
          x={PAD.left}
          y={PAD.top}
          width={PLOT_W}
          height={PLOT_H}
          fill="var(--bg)"
          stroke="var(--secondary)"
          strokeWidth="1.5"
        />

        {[3, 3.75].map((t) => (
          <line
            key={t}
            x1={sx(t)}
            x2={sx(t)}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            stroke="var(--secondary)"
            strokeWidth="1"
          />
        ))}
        {[1 / 3, 2 / 3].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            x2={PAD.left + PLOT_W}
            y1={PAD.top + f * PLOT_H}
            y2={PAD.top + f * PLOT_H}
            stroke="var(--secondary)"
            strokeWidth="1"
          />
        ))}

        {X_TICKS.map((t) => (
          <text
            key={t}
            className="chart-tick"
            x={sx(t)}
            y={PAD.top - 11}
            textAnchor={t === 1 ? 'start' : t === 5 ? 'end' : 'middle'}
          >
            {t}
          </text>
        ))}

        {Y_BANDS.map((label, i) => (
          <text
            key={label}
            className="chart-axis"
            x={PAD.left - 14}
            y={PAD.top + (i + 0.5) * (PLOT_H / 3)}
            textAnchor="end"
            dominantBaseline="middle"
          >
            {label}
          </text>
        ))}

        {X_BANDS.map((label, i) => {
          const edges = [1, 3, 3.75, 5];
          const mid = (sx(edges[i]) + sx(edges[i + 1])) / 2;
          return (
            <text
              key={label}
              className="chart-axis"
              x={mid}
              y={PAD.top + PLOT_H + 26}
              textAnchor="middle"
            >
              {label}
            </text>
          );
        })}

        {showPath &&
          points.map((p) => {
            if (!p.prev) return null;
            const x1 = sx(p.prev.nota);
            const y1 = sy(p.prev.dificultad);
            const x2 = sx(p.nota);
            const y2 = sy(p.dificultad);
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.hypot(dx, dy);
            if (len < 1) return null;
            const gap = labelPoints ? 13 : 9;
            const t = Math.max(0, (len - gap) / len);
            return (
              <g key={`p${p.id}`}>
                {labelPoints && (
                  <circle cx={x1} cy={y1} r="4" fill="none" stroke="var(--primary)" strokeWidth="1.5" />
                )}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x1 + dx * t}
                  y2={y1 + dy * t}
                  stroke="var(--primary)"
                  strokeWidth={labelPoints ? 2 : 1.25}
                  opacity="0.75"
                  markerEnd="url(#arrow)"
                />
              </g>
            );
          })}

        {points.map((p) => (
          <circle
            key={p.id}
            cx={sx(p.nota)}
            cy={sy(p.dificultad)}
            r={labelPoints ? 7 : p.estancado ? 5 : 4}
            fill={p.estancado ? 'none' : color(p.nota)}
            stroke={p.estancado ? 'var(--alert)' : 'none'}
            strokeWidth="2"
          >
            <title>{`${p.name} · nota ${p.nota.toFixed(2)}`}</title>
          </circle>
        ))}

        {labelPoints &&
          points.map((p) => (
            <text
              key={`l${p.id}`}
              className="chart-point-label"
              x={sx(p.nota) + 12}
              y={sy(p.dificultad) + 4}
            >
              {p.name}
            </text>
          ))}

        <text
          className="chart-axis-title"
          transform={`translate(22 ${PAD.top + PLOT_H / 2}) rotate(-90)`}
          textAnchor="middle"
        >
          Dificultad
        </text>
        <text
          className="chart-axis-title"
          x={PAD.left + PLOT_W / 2}
          y={PAD.top + PLOT_H + 54}
          textAnchor="middle"
        >
          Desempeño
        </text>
      </svg>
    </div>
  );
}
