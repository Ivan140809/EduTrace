import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ApiError } from '../api/cliente';
import {
  crearEntrega,
  listarIntentos,
  listarMisTareas,
  marcarRetroalimentacionLeida,
  obtenerEntrega,
  obtenerMiProgreso,
} from '../api/servicios';
import type { Curso, EntregaEstudiante, Intento, TareaEstudiante, TipoEntrega } from '../api/tipos';
import { useConsulta } from '../hooks/useConsulta';
import { IconClock, IconMessage, IconUpload } from '../icons';
import { useSesion } from '../sesion/SesionContext';
import type { StateTone } from '../types';
import { fechaCorta, fechaLarga, haceCuanto } from '../utilidades/fechas';
import FeedbackDraft from './FeedbackDraft';
import StatePill from './StatePill';

// ANTES: recibía `sent` / `read` de App y mostraba datos fijos de data.ts.
// AHORA: recibe el curso y pide todo al backend.
interface Props {
  curso: Curso;
}

/** Texto, color y botón que la UI muestra para cada estado que manda el backend. */
const ESTADO_TAREA: Record<TareaEstudiante['estado'], { texto: string; tono: StateTone; accion: string }> = {
  pendiente: { texto: 'Pendiente', tono: 'dark', accion: 'Empezar' },
  en_revision: { texto: 'En revisión', tono: 'neutral', accion: 'Abrir' },
  retroalimentada: { texto: 'Retroalimentada', tono: 'accent', accion: 'Abrir' },
  aprobada: { texto: 'Aprobada', tono: 'neutral', accion: 'Ver' },
  vencida: { texto: 'Vencida', tono: 'alert', accion: 'Ver' },
};

const ESTADO_INTENTO: Record<Intento['estado'], { texto: string; tono: StateTone }> = {
  en_revision: { texto: 'En revisión', tono: 'neutral' },
  retroalimentado: { texto: 'Retroalimentado', tono: 'accent' },
  sin_nota: { texto: 'Sin nota', tono: 'quiet' },
};

const EXTENSIONES = '.cpp,.cc,.c,.h,.hpp,.py,.java';

/** Qué tarea mostrar primero: la que tiene novedades; si no, la próxima pendiente. */
function tareaInicial(tareas: TareaEstudiante[]): string | null {
  const prioridad: TareaEstudiante['estado'][] = ['retroalimentada', 'en_revision', 'pendiente'];
  for (const estado of prioridad) {
    const t = tareas.find((x) => x.estado === estado);
    if (t) return t.tareaId;
  }
  return tareas[0]?.tareaId ?? null;
}

export default function StudentPanel({ curso }: Props) {
  const { usuario } = useSesion();

  const misTareas = useConsulta(() => listarMisTareas(curso.id), [curso.id]);
  const progreso = useConsulta(() => obtenerMiProgreso(curso.id), [curso.id]);

  // Tarea seleccionada (la que se ve en la retroalimentación y el historial).
  const [tareaId, setTareaId] = useState<string | null>(null);
  useEffect(() => {
    if (tareaId === null && misTareas.datos) setTareaId(tareaInicial(misTareas.datos));
  }, [tareaId, misTareas.datos]);
  const tarea = misTareas.datos?.find((t) => t.tareaId === tareaId) ?? null;

  // Historial de la tarea (oficiales y revisiones previas, del más reciente al más antiguo).
  const intentos = useConsulta(tarea ? () => listarIntentos(tarea.tareaId) : null, [tarea?.tareaId]);
  // Qué se muestra arriba (se miran oficiales Y revisiones previas; si solo se mirara la última
  // oficial, la retroalimentación de una revisión previa nunca le llegaría al estudiante):
  //  - la retroalimentación publicada más reciente, y
  //  - un aviso "en revisión" si hay una entrega más nueva que el profesor aún no ha revisado.
  const historial = intentos.datos ?? [];
  const conFeedback = historial.find((i) => i.estado === 'retroalimentado') ?? null;
  const enEspera = historial[0]?.estado === 'en_revision' ? historial[0] : null;
  const ultimaId = conFeedback?.entregaId ?? enEspera?.entregaId ?? null;
  const entrega = useConsulta(ultimaId ? () => obtenerEntrega(ultimaId) : null, [ultimaId]);
  // Como estudiante, el backend siempre responde la vista de estudiante.
  const datosEntrega = entrega.datos as EntregaEstudiante | null;
  const ultima = datosEntrega && datosEntrega.tareaId === tarea?.tareaId ? datosEntrega : null;
  const retro = ultima?.retroalimentacion ?? null;

  // ── Subir código ──
  const selectorArchivos = useRef<HTMLInputElement>(null);
  const [subida, setSubida] = useState<{ tareaId: string; tipo: TipoEntrega } | null>(null);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  function recargarTodo() {
    misTareas.recargar();
    progreso.recargar();
    entrega.recargar();
    intentos.recargar();
  }

  /** Abre el explorador de archivos del sistema para subir código. */
  function pedirArchivos(id: string, tipo: TipoEntrega) {
    setSubida({ tareaId: id, tipo });
    setTareaId(id);
    selectorArchivos.current?.click();
  }

  async function alElegirArchivos(e: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    e.target.value = ''; // permite volver a elegir el mismo archivo después
    if (!subida || archivos.length === 0) return;
    setOcupado(true);
    setMensaje(null);
    try {
      // file.text() lee el archivo como texto: el contrato recibe el código como string.
      const contenido = await Promise.all(archivos.map(async (f) => ({ nombre: f.name, contenido: await f.text() })));
      const nueva = await crearEntrega(subida.tareaId, { tipo: subida.tipo, archivos: contenido });
      setMensaje({
        texto:
          nueva.tipo === 'oficial'
            ? `Intento ${nueva.numeroIntento} enviado. Tu profesor lo revisará antes de que veas la retroalimentación.`
            : 'Código enviado para revisión previa. No cuenta como intento.',
        error: false,
      });
      recargarTodo();
    } catch (err) {
      setMensaje({ texto: err instanceof ApiError ? err.message : 'No se pudo subir el código.', error: true });
    } finally {
      setOcupado(false);
    }
  }

  async function marcarLeida() {
    if (!ultima || !retro || retro.leida) return;
    try {
      await marcarRetroalimentacionLeida(ultima.id);
      entrega.recargar();
      progreso.recargar();
    } catch (err) {
      setMensaje({ texto: err instanceof ApiError ? err.message : 'No se pudo marcar como leída.', error: true });
    }
  }

  // ── Carga / error ──
  const errorCarga = misTareas.error ?? progreso.error ?? entrega.error ?? intentos.error;
  if (errorCarga) return <p className="aviso aviso-error">{errorCarga.message}</p>;
  if (misTareas.cargando && !misTareas.datos) return <p className="aviso">Cargando tus tareas…</p>;

  const p = progreso.datos;
  // En el contrato estos campos no son obligatorios: TypeScript obliga a darles un valor por defecto.
  const hechas = p?.entregasAlDia.hechas ?? 0;
  const totalTareas = p?.entregasAlDia.total ?? 0;
  const pctAlDia = totalTareas > 0 ? Math.round((hechas / totalTareas) * 100) : 0;
  const nombreCorto = usuario?.nombre.split(' ')[0] ?? '';
  const puedeReintentar = tarea ? (tarea.intentosUsados ?? 0) < (tarea.maxIntentos ?? 1) && tarea.estado !== 'vencida' : false;

  return (
    <div className="page">
      <input
        ref={selectorArchivos}
        type="file"
        multiple
        accept={EXTENSIONES}
        hidden
        onChange={alElegirArchivos}
      />

      <div>
        <h1 className="page-title">Hola, {nombreCorto}</h1>
        <p className="page-sub">
          {curso.nombre} ({curso.periodo})
          {curso.semanaActual && curso.semanasTotales
            ? ` · Semana ${curso.semanaActual} de ${curso.semanasTotales}`
            : ''}
        </p>
      </div>

      {mensaje && <p className={`aviso${mensaje.error ? ' aviso-error' : ''}`}>{mensaje.texto}</p>}

      <div className="columns">
        <div className="col-main">
          {tarea && ultima && retro ? (
            <section className="feedback">
              <div className="feedback-banner">
                <div className="left">
                  <span className="icon">
                    <IconMessage />
                  </span>
                  <span>{retro.leida ? 'Retroalimentación de tu profesor' : 'Nueva retroalimentación'}</span>
                </div>
                <span className="attempt">
                  {tarea.titulo} · {etiqueta(ultima)}
                </span>
              </div>
              <div className="feedback-body">
                <div className="feedback-author">
                  <div className="avatar sm">{iniciales(retro.revisadoPor.nombre)}</div>
                  <div>
                    <strong>Prof. {retro.revisadoPor.nombre}</strong>
                    <span>
                      {retro.aviso.texto} · {haceCuanto(retro.fechaEnvio)}
                    </span>
                  </div>
                </div>
                <FeedbackDraft secciones={retro.secciones} />
                {retro.comentarioDocente && (
                  <p>
                    <strong>Comentario de tu profesor:</strong> {retro.comentarioDocente}
                  </p>
                )}
                <div className="actions-row">
                  {puedeReintentar && (
                    <button
                      type="button"
                      className="btn btn-primary btn-compact"
                      disabled={ocupado}
                      onClick={() => {
                        void marcarLeida();
                        pedirArchivos(tarea.tareaId, 'oficial');
                      }}
                    >
                      <span className="icon">
                        <IconUpload />
                      </span>
                      <span>Corregir y volver a intentar</span>
                    </button>
                  )}
                  {!retro.leida && (
                    <button type="button" className="btn btn-outline" onClick={marcarLeida}>
                      Marcar como leída
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled
                    title="Pendiente: el backend aún no implementa /dudas"
                  >
                    Tengo una duda sobre esto
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {tarea && enEspera ? (
            <section className="waiting">
              <span className="icon">
                <IconClock />
              </span>
              <div>
                <strong>
                  Tu {enEspera.tipo === 'revision' ? 'revisión previa' : enEspera.etiqueta.toLowerCase()} de «
                  {tarea.titulo}» está en revisión
                </strong>
                <p>
                  EduTrace ya analizó tu código y preparó un borrador de retroalimentación. Tu
                  profesor lo revisa antes de enviártelo. Te avisamos en cuanto esté disponible.
                </p>
              </div>
            </section>
          ) : null}

          <section className="panel">
            <div className="panel-head">
              <h2>Mis entregas</h2>
              <span className="hint">Ordenadas por fecha límite</span>
            </div>
            {(misTareas.datos ?? []).length === 0 && <p className="task-meta">No tienes tareas en este curso.</p>}
            {(misTareas.datos ?? []).map((t) => {
              const ui = ESTADO_TAREA[t.estado];
              const meta = t.ultimaEntregaFecha
                ? `Entregada ${haceCuanto(t.ultimaEntregaFecha)} · intento ${t.intentosUsados} de ${t.maxIntentos}`
                : t.estado === 'vencida'
                  ? `Cerró el ${fechaLarga(t.fechaLimite)} sin entrega`
                  : `Límite: ${fechaLarga(t.fechaLimite)}`;
              return (
                <div className="task" key={t.tareaId}>
                  <div className="task-grow">
                    <div className="task-title">{t.titulo}</div>
                    <div className="task-meta">{meta}</div>
                  </div>
                  <StatePill tone={ui.tono}>{ui.texto}</StatePill>
                  <button
                    type="button"
                    className="btn btn-quiet"
                    disabled={ocupado}
                    onClick={() => (t.estado === 'pendiente' ? pedirArchivos(t.tareaId, 'oficial') : setTareaId(t.tareaId))}
                  >
                    {ui.accion}
                  </button>
                </div>
              );
            })}
            {tarea && tarea.estado !== 'vencida' && (
              <div className="dry-run">
                <span className="icon">
                  <IconUpload />
                </span>
                <div className="task-grow">
                  <div className="task-title">Subir código para revisión, sin entregar</div>
                  <div className="task-meta">
                    {tarea.titulo}: recibe sugerencias antes de que la entrega cuente como definitiva.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-dark"
                  disabled={ocupado}
                  onClick={() => pedirArchivos(tarea.tareaId, 'revision')}
                >
                  {ocupado ? 'Enviando…' : 'Revisar mi código'}
                </button>
              </div>
            )}
          </section>

          {tarea && (intentos.datos ?? []).length > 0 && (
            <section className="panel">
              <div className="panel-head">
                <h2>Historial de intentos — {tarea.titulo}</h2>
              </div>
              <div className="attempts">
                {(intentos.datos ?? []).map((a) => {
                  const ui = ESTADO_INTENTO[a.estado];
                  return (
                    <div className="attempt-row" key={a.entregaId}>
                      <div className="attempt-when">
                        <div className="label">{a.etiqueta}</div>
                        <div className="date">{fechaCorta(a.fecha)}</div>
                      </div>
                      <div className="attempt-body">
                        <strong>{a.titulo ?? (a.tipo === 'revision' ? 'Revisión previa' : 'Entrega')}</strong>
                        <p>{a.nota ?? (a.estado === 'en_revision' ? 'Esperando la revisión de tu profesor.' : '')}</p>
                      </div>
                      <StatePill tone={ui.tono}>{ui.texto}</StatePill>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <div className="col-side">
          <section className="card">
            <h2>Mi progreso en el curso</h2>
            <div className="progress-value">
              <b>{p ? hechas : '–'}</b>
              <span>de {p ? totalTareas : '–'} entregas al día</span>
            </div>
            <div className="bar">
              <i style={{ width: `${pctAlDia}%` }} />
            </div>
            <div className="metrics">
              <div className="metric">
                <span>Retroalimentaciones leídas</span>
                <strong>
                  {p ? `${p.retroalimentacionesLeidas.leidas} de ${p.retroalimentacionesLeidas.total}` : '–'}
                </strong>
              </div>
              <div className="metric">
                <span>Errores corregidos tras revisar</span>
                <strong>{p?.erroresCorregidos ?? '–'}</strong>
              </div>
              <div className="metric">
                <span>Intentos promedio por tarea</span>
                <strong>{p ? p.intentosPromedio.toLocaleString('es-CO') : '–'}</strong>
              </div>
            </div>
          </section>

          <section className="card">
            <h2>Dónde me cuesta más</h2>
            {p && p.temas.length > 0 ? (
              <div className="topics">
                {p.temas.map((t) => (
                  <div key={t.temaId}>
                    <div className="topic-head">
                      <strong>{t.titulo}</strong>
                      <span>
                        {t.tropiezos === 0 ? 'Sin tropiezos' : `${t.tropiezos} tropiezo${t.tropiezos === 1 ? '' : 's'}`}
                      </span>
                    </div>
                    <div className="bar thin">
                      <i
                        className={t.nivel === 'alto' ? 'alert' : t.nivel === 'bajo' ? 'muted' : undefined}
                        style={{ width: `${Math.min(100, t.tropiezos * 25)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="footnote">Todavía no hay suficientes entregas para calcularlo.</p>
            )}
            <p className="footnote">
              Se calcula con los temas del syllabus del curso y el banco de ejercicios de EduTrace.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function etiqueta(e: EntregaEstudiante): string {
  return e.tipo === 'revision' ? 'Revisión previa' : `Intento ${e.numeroIntento}`;
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}
