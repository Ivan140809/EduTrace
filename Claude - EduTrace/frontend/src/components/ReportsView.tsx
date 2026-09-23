import { useMemo, useState } from 'react';
import { COURSE } from '../data';
import {
  CORTES,
  RAES,
  TEMAS,
  analyze,
  buildPoints,
  friccionHistorica,
  type Corte,
  type Dimension,
} from '../reportData';
import StatePill from './StatePill';
import TrajectoryChart from './TrajectoryChart';

export default function ReportsView() {
  const [dimension, setDimension] = useState<Dimension>('rae');
  const [filtro, setFiltro] = useState(1);
  const [corte, setCorte] = useState<Corte>('II');
  const [showPath, setShowPath] = useState(false);
  const [focused, setFocused] = useState<number | null>(null);

  const points = useMemo(() => buildPoints(dimension, filtro, corte), [dimension, filtro, corte]);
  const stats = useMemo(() => analyze(points), [points]);
  const friccion = useMemo(() => friccionHistorica(dimension, corte), [dimension, corte]);
  const focusedPoint = points.find((p) => p.id === focused) ?? null;
  const shownPoints = focusedPoint ? [focusedPoint] : points;

  const items = dimension === 'rae' ? RAES : TEMAS;
  const activo = dimension === 'rae' ? RAES[filtro - 1] : TEMAS[filtro - 1];

  const pickDimension = (d: Dimension) => {
    setDimension(d);
    setFiltro(1);
    setFocused(null);
  };

  return (
    <div className="page">
      <div>
        <h1 className="page-title">Trayectoria de Aprendizaje y Mapeo de Desempeño</h1>
        <p className="page-sub">
          Estudiantes de {COURSE} · {stats.total} estudiantes · {corte} Corte
        </p>
      </div>

      {/* Pendiente: conectar con GET /cursos/{id}/reportes/trayectoria cuando el backend lo implemente
          (ver GUIA_FRONTEND.md, sección 8). Mientras tanto usa los datos generados en reportData.ts. */}
      <p className="aviso">
        Datos de demostración: el backend todavía no implementa los reportes de trayectoria.
      </p>

      <div className="report-cols">
        <div className="report-main">
          <section className="chart-card">
            <div className="chart-head">
              <div>
                <h2>
                  {dimension === 'rae' ? `RAE ${activo.id}` : `Tema ${activo.id}`} ·{' '}
                  {dimension === 'rae' ? RAES[filtro - 1].short : TEMAS[filtro - 1].title}
                </h2>
                <p className="chart-sub">
                  {focusedPoint
                    ? `Enfocado en ${focusedPoint.name} · nota ${focusedPoint.nota.toFixed(2)}`
                    : 'Cada punto es un estudiante. Eje X nota, eje Y dificultad percibida.'}
                </p>
              </div>
              <label className="switch">
                <span>Ver recorrido</span>
                <input
                  type="checkbox"
                  checked={showPath}
                  onChange={(e) => setShowPath(e.target.checked)}
                  disabled={corte === 'I'}
                />
                <span className="switch-track" aria-hidden="true">
                  <span className="switch-knob" />
                </span>
              </label>
            </div>

            <TrajectoryChart
              points={shownPoints}
              showPath={showPath}
              labelPoints={!!focusedPoint}
            />

            {focusedPoint && (
              <button type="button" className="clear-focus" onClick={() => setFocused(null)}>
                Ver a todo el curso
              </button>
            )}

            <div className="legend">
              <span className="legend-item">
                <i style={{ background: 'var(--alert)' }} />
                Nota bajo 3,0
              </span>
              <span className="legend-item">
                <i style={{ background: 'var(--primary)' }} />
                Entre 3,0 y 3,75
              </span>
              <span className="legend-item">
                <i style={{ background: 'var(--secondary)' }} />
                3,75 o más
              </span>
              <span className="legend-item">
                <i className="ring" />
                Estancado desde el corte anterior
              </span>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Análisis del curso</h2>
              <span className="hint">
                {dimension === 'rae' ? `RAE ${activo.id}` : `Tema ${activo.id}`} · {corte} Corte
              </span>
            </div>

            <div className="an-group">
              <div className="an-head">
                <span className="an-num">1</span>
                <div>
                  <h3>Efectividad de la retroalimentación</h3>
                  <p>Qué cambió en el curso desde el corte anterior.</p>
                </div>
              </div>
              <div className="an-metrics">
                <div className="an-metric">
                  <b className={stats.deltaX >= 0 ? '' : 'is-alert'}>
                    {stats.deltaX >= 0 ? '+' : ''}
                    {stats.deltaX.toFixed(2)}
                  </b>
                  <span>
                    Mejora promedio en nota tras el feedback
                    {corte === 'I' ? ' — sin corte anterior con el cual comparar' : ''}
                  </span>
                </div>
                <div className="an-metric">
                  <b>{Math.abs(Math.round(stats.deltaY * 100))}%</b>
                  <span>
                    {stats.deltaY >= 0 ? 'Incremento' : 'Descenso'} en la complejidad del ejercicio
                  </span>
                </div>
                <div className="an-metric">
                  <b>{stats.migraron}</b>
                  <span>
                    {stats.migraron === 1 ? 'Estudiante pasó' : 'Estudiantes pasaron'} de
                    rendimiento bajo a aprobado gracias a la retroalimentación
                  </span>
                </div>
                <div className="an-metric">
                  <b>{stats.intentosMedios.toFixed(1)}</b>
                  <span>
                    Intentos promedio para alcanzar la nota mínima de aprobación (3,0) ·{' '}
                    {stats.convertidos}{' '}
                    {stats.convertidos === 1 ? 'estudiante lo logró' : 'estudiantes lo lograron'}
                  </span>
                </div>
                {stats.retrocedieron > 0 && (
                  <div className="an-metric">
                    <b className="is-alert">{stats.retrocedieron}</b>
                    <span>
                      {stats.retrocedieron === 1 ? 'Bajó' : 'Bajaron'} de nota respecto al corte
                      anterior
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="an-group">
              <div className="an-head">
                <span className="an-num">2</span>
                <div>
                  <h3>
                    {dimension === 'rae'
                      ? `Resistencia por RAE · RAE ${activo.id}`
                      : `Resistencia por tema · ${(activo as { title: string }).title}`}
                  </h3>
                  <p>
                    Cuánta fricción genera {dimension === 'rae' ? 'este RAE' : 'este tema'} frente a
                    los demás del curso.
                  </p>
                </div>
              </div>

              <div className={`friction friction-${stats.friccion.toLowerCase()}`}>
                <div className="friction-top">
                  <div>
                    <b>{stats.pctMasDeDos}%</b>
                    <span>
                      de los estudiantes requiere más de 2 intentos en{' '}
                      {dimension === 'rae' ? 'este RAE' : 'este tema'}
                    </span>
                  </div>
                  <span className="friction-level">Fricción {stats.friccion}</span>
                </div>
                <div className="bar">
                  <i style={{ width: `${stats.pctMasDeDos}%` }} />
                </div>
                <div className="friction-scale">
                  <span>Baja</span>
                  <span>Media</span>
                  <span>Alta</span>
                </div>
              </div>

              <div className="friction-compare">
                <div className="friction-compare-label">
                  Comparado con los demás {dimension === 'rae' ? 'RAE' : 'temas'} en el {corte}{' '}
                  Corte
                </div>
                {friccion.map((f) => (
                  <div
                    key={f.id}
                    className={`friction-row${f.id === activo.id ? ' is-active' : ''}`}
                  >
                    <span className="friction-row-name">
                      {f.id} · {f.label}
                    </span>
                    <span className="bar thin">
                      <i style={{ width: `${f.pct}%` }} />
                    </span>
                    <span className="friction-row-pct">{f.pct}%</span>
                  </div>
                ))}
              </div>

              <div className="an-metrics an-metrics-tight">
                <div className="an-metric">
                  <b>{stats.intentosPromedio.toFixed(1)}</b>
                  <span>
                    Intentos promedio por estudiante en{' '}
                    {dimension === 'rae' ? 'este RAE' : 'este tema'}
                  </span>
                </div>
                <div className="an-metric">
                  <b className={stats.pctResistencia >= 25 ? 'is-alert' : ''}>
                    {stats.pctResistencia}%
                  </b>
                  <span>
                    De los estudiantes está en zona de riesgo: {stats.resistencia} con dificultad
                    media o alta y nota bajo 3,0
                  </span>
                </div>
                <div className="an-metric">
                  <b className={stats.caidaExigencia >= 50 ? 'is-alert' : ''}>
                    {stats.caidaExigencia}%
                  </b>
                  <span>
                    De los estudiantes que reportan dificultad alta no logra aprobar
                    {stats.caidaExigencia >= 50
                      ? ' — la exigencia de esta guía está mal calibrada'
                      : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="an-group">
              <div className="an-head">
                <span className="an-num">3</span>
                <div>
                  <h3>Patrones de riesgo y alerta temprana</h3>
                  <p>Estudiantes que no avanzan y entregas que ameritan una segunda mirada.</p>
                </div>
              </div>
              <div className="an-metrics">
                <div className="an-metric">
                  <b className="is-alert">{stats.estancados.length}</b>
                  <span>
                    {stats.estancados.length === 1 ? 'Estudiante estancado' : 'Estudiantes estancados'}
                    , no {stats.estancados.length === 1 ? 'presenta' : 'presentan'} mejora entre
                    intentos
                  </span>
                </div>
                <div className="an-metric">
                  <b className={stats.anomalias.length > 0 ? 'is-alert' : ''}>
                    {stats.anomalias.length}
                  </b>
                  <span>
                    {stats.anomalias.length === 1 ? 'Alerta' : 'Alertas'} de código copiado o
                    generado por IA, sin pasos intermedios
                  </span>
                </div>
                <div className="an-metric">
                  <b className="is-alert">{stats.dificil}</b>
                  <span>
                    {stats.dificil === 1 ? 'Reporta' : 'Reportan'} alta dificultad y aún no{' '}
                    {stats.dificil === 1 ? 'alcanza' : 'alcanzan'} 3,75
                  </span>
                </div>
              </div>
              {stats.estancados.length > 0 && (
                <div className="stuck">
                  <div className="stuck-label">
                    Estudiantes estancados · clic para enfocar el gráfico
                  </div>
                  <div className="stuck-names">
                    {stats.estancados.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`stuck-name${focused === p.id ? ' is-active' : ''}`}
                        aria-pressed={focused === p.id}
                        onClick={() => setFocused(focused === p.id ? null : p.id)}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {stats.anomalias.length > 0 && (
                <div className="stuck">
                  <div className="stuck-label">Revisión sugerida</div>
                  <div className="stuck-names">
                    {stats.anomalias.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`stuck-name${focused === p.id ? ' is-active' : ''}`}
                        aria-pressed={focused === p.id}
                        onClick={() => setFocused(focused === p.id ? null : p.id)}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="an-group is-last">
              <div className="an-head">
                <span className="an-num">4</span>
                <div>
                  <h3>Intervenciones pedagógicas diferenciadas</h3>
                  <p>Agrupación dinámica por cuadrante para decidir en clase.</p>
                </div>
              </div>
              <div className="clusters">
                {stats.clusters.map((c) => (
                  <div key={c.key} className="cluster">
                    <div className="cluster-head">
                      <StatePill tone={c.tone}>{c.label}</StatePill>
                      <span className="cluster-count">
                        {c.members.length} {c.members.length === 1 ? 'estudiante' : 'estudiantes'}
                      </span>
                    </div>
                    <p className="cluster-hint">{c.hint}</p>
                    <div className="stuck-names">
                      {c.members.slice(0, 6).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={`cluster-name${focused === p.id ? ' is-active' : ''}`}
                          aria-pressed={focused === p.id}
                          onClick={() => setFocused(focused === p.id ? null : p.id)}
                        >
                          {p.name}
                        </button>
                      ))}
                      {c.members.length > 6 && (
                        <span className="cluster-more">+{c.members.length - 6} más</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="an-foot">
                Si la matriz del curso se sesga a la izquierda a 24 horas de un examen, este es el
                tema a repasar en la siguiente sesión presencial.
              </p>
            </div>
          </section>
        </div>

        <aside className="report-side">
          <section className="panel">
            <div className="tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={dimension === 'rae'}
                className={`tab${dimension === 'rae' ? ' is-active' : ''}`}
                onClick={() => pickDimension('rae')}
              >
                RAE's
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={dimension === 'tema'}
                className={`tab${dimension === 'tema' ? ' is-active' : ''}`}
                onClick={() => pickDimension('tema')}
              >
                Temas
              </button>
            </div>
            <ol className="rae-list">
              {items.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    className={`rae-item${filtro === it.id ? ' is-active' : ''}`}
                    onClick={() => {
                      setFiltro(it.id);
                      setFocused(null);
                    }}
                  >
                    <span className="rae-num">{it.id}</span>
                    {dimension === 'rae' ? (
                      <span className="rae-body">
                        <strong>{(it as (typeof RAES)[number]).short}</strong>
                        <span className="rae-text">{(it as (typeof RAES)[number]).text}</span>
                        <span className="rae-tags">{(it as (typeof RAES)[number]).tags}</span>
                      </span>
                    ) : (
                      <span className="rae-body">
                        <strong>{(it as (typeof TEMAS)[number]).title}</strong>
                        <span className="rae-text">
                          {(it as (typeof TEMAS)[number]).subtemas.join(' · ')}
                        </span>
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      <section className="card focus-card">
        <h2>Enfoque de la trayectoria</h2>
        <div className="focus-opts">
          {CORTES.map((c) => (
            <button
              key={c}
              type="button"
              className={`focus-opt${corte === c ? ' is-active' : ''}`}
              onClick={() => {
                setCorte(c);
                setShowPath(c !== 'I' && showPath);
              }}
            >
              {c} Corte
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
