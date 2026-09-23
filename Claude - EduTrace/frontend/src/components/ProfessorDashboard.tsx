import { useEffect, useState } from 'react';
import { ApiError } from '../api/cliente';
import {
  aprobarRetroalimentacion,
  descartarRetroalimentacion,
  editarRetroalimentacion,
  listarEntregasTarea,
  listarTareas,
  obtenerEntrega,
  obtenerResumenTarea,
} from '../api/servicios';
import { esEntregaDocente, type Curso, type EstadoEntrega } from '../api/tipos';
import { PIPELINE } from '../data';
import { useConsulta } from '../hooks/useConsulta';
import { IconCheck, IconCode, IconMessage, IconSend } from '../icons';
import BorradorEditable, { aBorrador, aSecciones, hayCambios, type Borrador } from './BorradorEditable';
import FeedbackDraft from './FeedbackDraft';

const STEP_ICONS = [IconCheck, IconCode, IconMessage, IconSend];

/** Qué paso del pipeline se ilumina según el estado de la entrega que manda el backend. */
const PASO_POR_ESTADO: Record<EstadoEntrega, number> = {
  recibida: 0,
  en_analisis: 1,
  error_analisis: 1,
  pendiente_revision: 2,
  enviada: 3,
};

// ANTES: recibía `sent`, `comment`, `onApprove` desde App y mostraba datos fijos de data.ts.
// AHORA: recibe solo el curso y pide todo lo demás al backend.
interface Props {
  curso: Curso;
}

export default function ProfessorDashboard({ curso }: Props) {
  // 1. Tareas del curso → por ahora se usa la primera abierta (luego vendrá un selector).
  const tareas = useConsulta(() => listarTareas(curso.id), [curso.id]);
  const tarea = tareas.datos?.find((t) => t.estado === 'abierta') ?? tareas.datos?.[0] ?? null;

  // 2. Con la tarea: métricas y cola de entregas. `null` = esperar a que haya tarea.
  const resumen = useConsulta(tarea ? () => obtenerResumenTarea(tarea.id) : null, [tarea?.id]);
  const entregas = useConsulta(tarea ? () => listarEntregasTarea(tarea.id) : null, [tarea?.id]);

  // La cola "por revisar" se filtra aquí: el contrato devuelve todas las entregas.
  // Orden de llegada (la más antigua primero): la cola se atiende como una fila.
  const pendientes = (entregas.datos ?? [])
    .filter((e) => e.estado === 'pendiente_revision')
    .sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega));
  const [entregaId, setEntregaId] = useState<string | null>(null);
  const primeraPendiente = pendientes[0]?.id ?? null;
  // Al llegar la cola, se abre la primera pendiente. Se guarda en el estado para que,
  // al aprobarla (y salir de la cola), siga en pantalla mostrando "Retroalimentación enviada".
  useEffect(() => {
    if (entregaId === null && primeraPendiente) setEntregaId(primeraPendiente);
  }, [entregaId, primeraPendiente]);
  const idActual = entregaId;
  const siguiente = pendientes.find((p) => p.id !== idActual)?.id ?? null;

  // 3. Detalle de la entrega elegida (trae código, análisis y borrador para el docente).
  const detalle = useConsulta(idActual ? () => obtenerEntrega(idActual) : null, [idActual]);
  const entrega = detalle.datos && esEntregaDocente(detalle.datos) ? detalle.datos : null;
  const retro = entrega?.retroalimentacion ?? null;

  // Borrador y comentario: el docente los edita en pantalla y se guardan con PATCH
  // al pulsar "Aprobar y enviar" (RF-11).
  const [borrador, setBorrador] = useState<Borrador>(aBorrador(undefined));
  const [comentario, setComentario] = useState('');
  // Cada vez que llega una versión nueva del backend (otra entrega, o recién guardada/descartada),
  // las cajas de texto se rellenan con lo guardado.
  useEffect(() => {
    setBorrador(aBorrador(retro?.secciones));
    setComentario(retro?.comentarioDocente ?? '');
    // Solo se reinicia cuando cambia la entrega o su fecha de actualización; así no se borra
    // lo que el docente está escribiendo cada vez que la pantalla se vuelve a dibujar.
  }, [idActual, retro?.actualizadoEn]);
  const cambiaronSecciones = retro ? hayCambios(borrador, retro.secciones) : false;
  const cambioComentario = comentario !== (retro?.comentarioDocente ?? '');
  const sinGuardar = cambiaronSecciones || cambioComentario;

  const [ocupado, setOcupado] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  /** Ejecuta una acción contra el backend mostrando "ocupado" y los errores. */
  async function accion(fn: () => Promise<unknown>) {
    setOcupado(true);
    setErrorAccion(null);
    try {
      await fn();
      detalle.recargar();
      entregas.recargar();
      resumen.recargar();
    } catch (e) {
      setErrorAccion(e instanceof ApiError ? e.message : 'Algo salió mal.');
    } finally {
      setOcupado(false);
    }
  }

  /** Envía al backend solo lo que cambió (PATCH …/retroalimentacion). */
  async function guardarCambios(id: string) {
    if (!sinGuardar) return;
    await editarRetroalimentacion(id, {
      ...(cambiaronSecciones ? { secciones: aSecciones(borrador) } : {}),
      ...(cambioComentario ? { comentarioDocente: comentario } : {}),
    });
  }

  const aprobar = () => {
    if (!borrador.queSigue.trim()) {
      setErrorAccion('Escribe «¿Qué sigue?» antes de enviar: es la parte obligatoria (RF-03).');
      return;
    }
    return accion(async () => {
      if (!idActual) return;
      await guardarCambios(idActual); // primero guarda lo editado…
      await aprobarRetroalimentacion(idActual); // …y luego publica (POST …/aprobar)
    });
  };

  const descartar = () => {
    // window.confirm muestra el cuadro "Aceptar / Cancelar" del navegador.
    const seguro = window.confirm(
      'Se borrará el borrador generado por EduTrace y tendrás que escribir la retroalimentación desde cero. ¿Continuar?',
    );
    if (seguro) void accion(async () => idActual && descartarRetroalimentacion(idActual));
  };

  // ── Estados de carga / error ──
  const errorCarga = tareas.error ?? resumen.error ?? entregas.error ?? detalle.error;
  if (errorCarga) return <p className="aviso aviso-error">{errorCarga.message}</p>;
  if (tareas.cargando) return <p className="aviso">Cargando tareas…</p>;
  if (!tarea) return <p className="aviso">Este curso todavía no tiene tareas.</p>;

  const enviada = entrega?.estado === 'enviada';
  const currentStep = entrega ? PASO_POR_ESTADO[entrega.estado] : 0;
  const archivo = entrega?.archivos?.[0];
  const lineas = archivo?.contenido.split('\n') ?? [];
  const marcadas = new Set(
    (entrega?.analisis?.lineasMarcadas ?? [])
      .filter((l) => l.archivo === archivo?.nombre)
      .map((l) => l.linea),
  );
  const advertencias = entrega?.analisis?.compilacion?.advertencias?.length ?? 0;
  const errorPrincipal = entrega?.analisis?.lineasMarcadas?.find((l) => l.severidad === 'error');

  return (
    <div className="page">
      <div>
        <h1 className="page-title">Tablero de Seguimiento de Tareas</h1>
        <p className="page-sub">
          Curso: {curso.nombre} ({curso.periodo}) · {tarea.titulo}
        </p>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-value">{resumen.datos?.estudiantes ?? '–'}</div>
          <div className="stat-label">Estudiantes</div>
        </div>
        <div className="stat">
          <div className="stat-value">{resumen.datos?.entregasRecibidas ?? '–'}</div>
          <div className="stat-label">Entregas recibidas</div>
        </div>
        <div className="stat">
          <div className="stat-value accent">{resumen.datos?.pendientesRevision ?? '–'}</div>
          <div className="stat-label">Por revisar y aprobar</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {resumen.datos?.tiempoMedioRespuestaHoras?.toFixed(1) ?? '–'}
            <small>h</small>
          </div>
          <div className="stat-label">Tiempo medio de respuesta</div>
        </div>
      </div>

      {!idActual && (entregas.cargando || primeraPendiente) ? (
        <p className="aviso">Cargando entregas…</p>
      ) : !idActual ? (
        <p className="aviso">No hay entregas pendientes de revisión en esta tarea. 🎉</p>
      ) : !entrega ? (
        <p className="aviso">Cargando entrega…</p>
      ) : (
        <div className="review">
          <section className="review-main">
            <div className="review-head">
              <div className="student">
                <span>Entrega de</span>
                <span>{entrega.estudiante.nombre}</span>
              </div>
              <div className="attempt-pill">
                {entrega.numeroIntento != null ? (
                  <>
                    Intento {entrega.numeroIntento} <span>de</span> {entrega.maxIntentos ?? tarea.maxIntentos}
                  </>
                ) : (
                  'Revisión previa (no cuenta como intento)'
                )}
              </div>
            </div>

            <div className="pipeline">
              {PIPELINE.map((name, i) => {
                const Icon = STEP_ICONS[i];
                const state = i < currentStep ? 'is-done' : i === currentStep ? 'is-current' : 'is-pending';
                return (
                  <div key={name} className={`step ${state}`}>
                    <div className="step-box">
                      <span className="icon">
                        <Icon />
                      </span>
                    </div>
                    <span className="step-name">{name}</span>
                  </div>
                );
              })}
            </div>

            {archivo && (
              <>
                <div className="code-head">
                  <span className="code-file">{archivo.nombre}</span>
                  <span className="code-warn">
                    {archivo.lenguaje ?? tarea.lenguaje} · {lineas.length} líneas
                    {entrega.analisis?.compilacion?.ok === false
                      ? ' · no compila'
                      : advertencias > 0
                        ? ` · compila con ${advertencias} advertencia${advertencias > 1 ? 's' : ''}`
                        : ''}
                  </span>
                </div>
                <div className="code">
                  {lineas.map((texto, i) => (
                    <div key={i} className={`code-line${marcadas.has(i + 1) ? ' is-flagged' : ''}`}>
                      <span className="ln">{i + 1}</span>
                      <span>{texto}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {errorPrincipal && (
              <div>
                <span className="error-tag">{errorPrincipal.mensaje}</span>
              </div>
            )}
          </section>

          <aside className="review-side">
            <div className="side-head">
              <span className="icon">
                <IconMessage />
              </span>
              <h3>Retroalimentación de EduTrace</h3>
            </div>

            <div className="draft">
              <div className="draft-kicker">
                {enviada
                  ? 'Retroalimentación enviada'
                  : retro?.origen === 'docente'
                    ? 'Redactada por el docente · escribe las secciones'
                    : retro?.origen === 'ia_editada'
                      ? 'Borrador de EduTrace · editado por ti'
                      : 'Borrador generado · editable'}
                {sinGuardar && !enviada && <span className="borrador-sin-guardar"> · cambios sin guardar</span>}
              </div>
              {!retro ? (
                <p>El análisis aún no termina.</p>
              ) : enviada ? (
                // Lo enviado ya no se puede editar (el backend responde 409): se muestra tal cual.
                <FeedbackDraft secciones={retro.secciones} />
              ) : (
                <BorradorEditable
                  valor={borrador}
                  onCambio={(nuevo) => {
                    setBorrador(nuevo);
                    setErrorAccion(null); // al editar, se quita el aviso anterior
                  }}
                  deshabilitado={ocupado}
                />
              )}
            </div>

            <div>
              <label className="field-label" htmlFor="nota-docente">
                Comentario del docente
              </label>
              <textarea
                id="nota-docente"
                className="textarea"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                disabled={enviada}
                placeholder="Ajusta el borrador o añade tu propio comentario antes de aprobar."
              />
            </div>

            {errorAccion && <p className="aviso aviso-error">{errorAccion}</p>}

            {enviada ? (
              <div className="sent-box">
                <div className="sent-box-head">
                  <span className="icon">
                    <IconCheck />
                  </span>
                  <span>Retroalimentación enviada</span>
                </div>
                <p>
                  {entrega.estudiante.nombre} la verá en su panel. Quedan{' '}
                  {resumen.datos?.pendientesRevision ?? pendientes.length} entregas por revisar.
                </p>
                {siguiente && (
                  <button type="button" className="btn btn-primary" onClick={() => setEntregaId(siguiente)}>
                    Siguiente entrega
                  </button>
                )}
              </div>
            ) : (
              <div className="actions">
                <button type="button" className="btn btn-primary" onClick={aprobar} disabled={ocupado || !retro}>
                  <span>{ocupado ? 'Enviando…' : 'Aprobar y enviar al estudiante'}</span>
                  <span className="icon">
                    <IconSend />
                  </span>
                </button>
                {retro?.origen !== 'docente' && (
                  <button type="button" className="btn btn-outline" onClick={descartar} disabled={ocupado || !retro}>
                    Descartar y escribir desde cero
                  </button>
                )}
                <p className="warning-note">
                  El estudiante no ve nada hasta que usted apruebe. EduTrace no publica ni califica
                  por su cuenta.
                </p>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
