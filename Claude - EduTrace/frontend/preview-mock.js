/* Backend simulado para preview.html. Intercepta fetch('/api/v1/...') y responde según el contrato v0.4.
   Los datos viven en memoria: al recargar la página vuelven al estado inicial. */
(function () {
  const H = 3600e3, D = 24 * H;
  const now = () => new Date().toISOString();
  const ago = (ms) => new Date(Date.now() - ms).toISOString();
  const ahead = (ms) => new Date(Date.now() + ms).toISOString();
  let seq = 100;
  const uid = (p) => `${p}-${++seq}`;

  const USUARIOS = [
    { id: 'u-doc', nombre: 'Pepito Perez', correo: 'pperez@javeriana.edu.co', rol: 'docente', iniciales: 'PP' },
    { id: 'u-juan', nombre: 'Juan Perez Gomez', correo: 'jperezg@javeriana.edu.co', rol: 'estudiante', iniciales: 'JP' },
    { id: 'u-ana', nombre: 'Ana López', correo: 'alopez@javeriana.edu.co', rol: 'estudiante', iniciales: 'AL' },
  ];
  const OTROS = [
    { id: 'u-maria', nombre: 'María Rodríguez', correo: 'mrodriguez@javeriana.edu.co' },
    { id: 'u-carlos', nombre: 'Carlos Díaz', correo: 'cdiaz@javeriana.edu.co' },
  ];
  const resumenUsuario = (u) => ({ id: u.id, nombre: u.nombre, correo: u.correo });
  const DOC = USUARIOS[0];

  const CURSO = {
    id: 'c-intro', nombre: 'Introducción a la Programación', periodo: '2026-1',
    semanaActual: 8, semanasTotales: 16, docentes: [resumenUsuario(DOC)],
  };

  const baseTarea = { lenguaje: 'cpp', permitirRevisionPrevia: true, cursoId: CURSO.id };
  const TAREAS = [
    { ...baseTarea, id: 't-4', titulo: 'Tarea 4 — Promedio de un arreglo', fechaLimite: ahead(2 * D), maxIntentos: 3, estado: 'abierta' },
    { ...baseTarea, id: 't-5', titulo: 'Tarea 5 — Funciones y paso de parámetros', fechaLimite: ahead(6 * D), maxIntentos: 3, estado: 'abierta' },
    { ...baseTarea, id: 't-3', titulo: 'Tarea 3 — Condicionales anidados', fechaLimite: ago(12 * D), maxIntentos: 3, estado: 'cerrada', aprobadaPara: ['u-juan'] },
    { ...baseTarea, id: 't-2', titulo: 'Taller 2 — Trazas de ejecución', fechaLimite: ago(19 * D), maxIntentos: 1, estado: 'cerrada' },
  ];

  const CODIGO_V2 = `#include <iostream>
using namespace std;

int main() {
    const int N = 5;
    int notas[N] = {40, 35, 50, 28, 45};
    int suma = 0;

    for (int i = 0; i <= N; i++) {
        suma += notas[i];
    }

    cout << "Promedio: " << suma / N << endl;
    return 0;
}`;
  const CODIGO_V1 = `#include <iostream>
using namespace std;

int main() {
    int notas[5] = {40, 35, 50, 28, 45};
    int suma;
    int i = 0;
    while (i < 5) {
        suma += notas[i];
        i++;
    }
    cout << suma / 5 << endl;
}`;
  const CODIGO_ANA = `#include <iostream>
using namespace std;

double promedio(int a[], int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s += a[i];
    return s / n;
}

int main() {
    int notas[] = {40, 35, 50, 28, 45};
    cout << promedio(notas, 5) << endl;
    return 0;
}`;

  const secciones = (queSigue, comoVoy, pistas) => ({
    haciaDondeVoy: 'Recorrer un arreglo con un ciclo y calcular un promedio correcto, sin salir de sus límites.',
    comoVoy, queSigue, pistas,
  });

  const ENTREGAS = [];
  function nuevaEntrega(o) {
    const e = {
      id: o.id || uid('e'), tareaId: o.tareaId, estudiante: o.estudiante, tipo: o.tipo || 'oficial',
      numeroIntento: o.tipo === 'revision' ? null : o.numeroIntento, estado: o.estado || 'pendiente_revision',
      fechaEntrega: o.fechaEntrega || now(), fechaEnvio: o.fechaEnvio || null,
      archivos: o.archivos, analisis: o.analisis || {}, leida: !!o.leida,
      retro: o.retro || null,
    };
    ENTREGAS.push(e);
    return e;
  }
  const juan = resumenUsuario(USUARIOS[1]), ana = resumenUsuario(USUARIOS[2]);

  nuevaEntrega({
    tareaId: 't-4', estudiante: juan, numeroIntento: 1, estado: 'enviada', fechaEntrega: ago(3 * D), fechaEnvio: ago(3 * D - 5 * H), leida: true,
    archivos: [{ nombre: 'promedio_notas.cpp', contenido: CODIGO_V1, lenguaje: 'C++' }],
    analisis: { compilacion: { ok: true, advertencias: ['variable suma sin inicializar'] }, lineasMarcadas: [{ archivo: 'promedio_notas.cpp', linea: 6, severidad: 'error', mensaje: 'Acumulador sin inicializar' }], resumenCambios: 'Primera versión con el ciclo while' },
    retro: { origen: 'ia_editada', secciones: secciones('Antes de sumar, piensa con qué valor empieza la variable que acumula.', 'El ciclo recorre bien el arreglo, pero la suma arranca con un valor indefinido.', ['¿Qué valor tiene suma en la primera vuelta del ciclo?']), comentarioDocente: 'Buen recorrido del arreglo. Revisa la inicialización.', generadoEn: ago(3 * D), actualizadoEn: ago(3 * D - 5 * H) },
  });
  nuevaEntrega({
    tareaId: 't-4', estudiante: juan, tipo: 'revision', estado: 'enviada', fechaEntrega: ago(2 * D), fechaEnvio: ago(2 * D - 2 * H), leida: true,
    archivos: [{ nombre: 'promedio_notas.cpp', contenido: CODIGO_V2, lenguaje: 'C++' }],
    analisis: { compilacion: { ok: true }, resumenCambios: 'Subió el código sin entregar' },
    retro: { origen: 'ia', secciones: secciones('Traza a mano el ciclo con N = 5 y anota el último valor de i.', 'Ya inicializas la suma en 0.', []), comentarioDocente: null, generadoEn: ago(2 * D), actualizadoEn: ago(2 * D) },
  });
  nuevaEntrega({
    tareaId: 't-4', estudiante: juan, numeroIntento: 2, fechaEntrega: ago(5 * H),
    archivos: [{ nombre: 'promedio_notas.cpp', contenido: CODIGO_V2, lenguaje: 'C++' }],
    analisis: { compilacion: { ok: true, advertencias: ['acceso fuera de rango en notas[5]'] }, lineasMarcadas: [{ archivo: 'promedio_notas.cpp', linea: 9, severidad: 'error', mensaje: 'Índice fuera de rango' }], resumenCambios: 'Corrigió el tipo de la variable acumuladora' },
    retro: { origen: 'ia', secciones: secciones('Revisa la condición de parada del ciclo for: ¿cuántas veces debe repetirse para un arreglo de N elementos?', 'La suma ya se inicializa en 0, pero la condición i <= N accede a notas[5], que no existe.', ['Los índices de un arreglo de tamaño N van de 0 a N-1.', 'Compara < con <= en la línea 9.']), comentarioDocente: '', generadoEn: ago(4 * H), actualizadoEn: ago(4 * H) },
  });
  nuevaEntrega({
    tareaId: 't-4', estudiante: ana, numeroIntento: 1, fechaEntrega: ago(3 * H),
    archivos: [{ nombre: 'promedio.cpp', contenido: CODIGO_ANA, lenguaje: 'C++' }],
    analisis: { compilacion: { ok: true }, lineasMarcadas: [{ archivo: 'promedio.cpp', linea: 7, severidad: 'error', mensaje: 'División entera' }] },
    retro: { origen: 'ia', secciones: secciones('Fíjate en el tipo de s y n al dividir: ¿qué resultado da 198 / 5 en enteros?', 'La función recorre bien el arreglo, pero el promedio pierde los decimales.', ['Prueba imprimir s / n con valores que no den exacto.']), comentarioDocente: '', generadoEn: ago(2 * H), actualizadoEn: ago(2 * H) },
  });
  for (const [i, est] of OTROS.entries()) {
    nuevaEntrega({
      tareaId: 't-4', estudiante: est, numeroIntento: 1, fechaEntrega: ago((2 - i * 0.5) * H),
      archivos: [{ nombre: 'promedio.cpp', contenido: CODIGO_V2, lenguaje: 'C++' }],
      analisis: { compilacion: { ok: true }, lineasMarcadas: [{ archivo: 'promedio.cpp', linea: 9, severidad: 'error', mensaje: 'Índice fuera de rango' }] },
      retro: { origen: 'ia', secciones: secciones('Revisa cuántas vueltas da el ciclo for.', 'El programa compila, pero lee una posición fuera del arreglo.', ['¿Cuál es el último índice válido?']), comentarioDocente: '', generadoEn: ago(H), actualizadoEn: ago(H) },
    });
  }
  nuevaEntrega({
    tareaId: 't-3', estudiante: juan, numeroIntento: 2, estado: 'enviada', fechaEntrega: ago(14 * D), fechaEnvio: ago(13 * D), leida: true,
    archivos: [{ nombre: 'notas.cpp', contenido: '// ...', lenguaje: 'C++' }],
    retro: { origen: 'ia', secciones: secciones('Listo.', 'Cumple la meta.', []), generadoEn: ago(13 * D), actualizadoEn: ago(13 * D) },
  });

  // ───────── vistas según el contrato ─────────
  const tarea = (id) => TAREAS.find((t) => t.id === id);
  const publica = (t) => { const { aprobadaPara, ...r } = t; return r; };
  const resumen = (e) => ({
    id: e.id, tareaId: e.tareaId, estudiante: e.estudiante, tipo: e.tipo, numeroIntento: e.numeroIntento,
    maxIntentos: tarea(e.tareaId).maxIntentos, estado: e.estado, fechaEntrega: e.fechaEntrega, fechaEnvio: e.fechaEnvio,
  });
  const retroDocente = (e) => e.retro && {
    entregaId: e.id, estado: e.estado === 'enviada' ? 'enviada' : 'pendiente_revision', origen: e.retro.origen,
    secciones: e.retro.secciones, comentarioDocente: e.retro.comentarioDocente, generadoEn: e.retro.generadoEn, actualizadoEn: e.retro.actualizadoEn,
  };
  const retroEstudiante = (e) => e.estado === 'enviada' && e.retro ? {
    secciones: e.retro.secciones, comentarioDocente: e.retro.comentarioDocente || null, origen: e.retro.origen,
    aviso: e.retro.origen === 'docente'
      ? { participoIA: false, texto: 'Redactada por tu profesor' }
      : { participoIA: true, texto: 'EduTrace generó un borrador con IA; tu profesor lo revisó y aprobó' },
    revisadoPor: resumenUsuario(DOC), fechaEnvio: e.fechaEnvio, leida: e.leida,
  } : null;
  const vistaEntrega = (e, u) => u.rol === 'docente'
    ? { ...resumen(e), archivos: e.archivos, analisis: e.analisis, retroalimentacion: retroDocente(e), dificultadPercibida: null, errorAnalisis: null }
    : { ...resumen(e), retroalimentacion: retroEstudiante(e), pruebas: null };

  const deEstudiante = (tareaId, estId) =>
    ENTREGAS.filter((e) => e.tareaId === tareaId && e.estudiante.id === estId).sort((a, b) => b.fechaEntrega.localeCompare(a.fechaEntrega));

  function tareaEstudiante(t, u) {
    const mias = deEstudiante(t.id, u.id);
    const oficiales = mias.filter((e) => e.tipo === 'oficial');
    const ultima = oficiales[0];
    let estado;
    if ((t.aprobadaPara || []).includes(u.id)) estado = 'aprobada';
    else if (!ultima) estado = t.estado === 'cerrada' ? 'vencida' : 'pendiente';
    else estado = ultima.estado === 'enviada' ? 'retroalimentada' : 'en_revision';
    return {
      tareaId: t.id, titulo: t.titulo, fechaLimite: t.fechaLimite, estado,
      intentosUsados: oficiales.length, maxIntentos: t.maxIntentos,
      ultimaEntregaId: ultima ? ultima.id : null, ultimaEntregaFecha: ultima ? ultima.fechaEntrega : null,
    };
  }

  function intento(e) {
    return {
      entregaId: e.id, etiqueta: e.tipo === 'revision' ? 'Revisión' : `Intento ${e.numeroIntento}`, tipo: e.tipo, fecha: e.fechaEntrega,
      titulo: e.estado === 'enviada' ? (e.analisis && e.analisis.resumenCambios) || null : null,
      nota: e.estado === 'enviada' ? (e.retro && e.retro.secciones.comoVoy) || null : null,
      estado: e.estado === 'enviada' ? (e.tipo === 'revision' ? 'sin_nota' : 'retroalimentado') : 'en_revision',
    };
  }
  // El panel busca 'retroalimentado' también en revisiones previas: se expone así.
  const intentoPanel = (e) => { const i = intento(e); if (e.estado === 'enviada') i.estado = 'retroalimentado'; return i; };

  // ───────── router ─────────
  class Resp { constructor(status, body) { this.status = status; this.body = body; } }
  const err = (status, codigo, mensaje) => new Resp(status, { error: { codigo, mensaje, detalles: [] } });
  const ok = (body, status = 200) => new Resp(status, body);

  function usuarioDe(headers) {
    const a = headers.Authorization || headers.authorization || '';
    const id = a.replace('Bearer mock-', '');
    return USUARIOS.find((u) => u.id === id) || null;
  }

  const rutas = [
    ['POST', /^\/auth\/login$/, (m, b) => {
      const u = USUARIOS.find((x) => x.correo.toLowerCase() === String(b.correo || '').toLowerCase());
      if (!u || !b.contrasena) return err(401, 'NO_AUTENTICADO', 'Correo o contraseña incorrectos.');
      return ok({ token: 'mock-' + u.id, expiraEn: ahead(D), usuario: u });
    }, true],
    ['GET', /^\/auth\/me$/, (m, b, u) => ok(u)],
    ['POST', /^\/auth\/logout$/, () => ok(undefined, 204)],
    ['GET', /^\/cursos$/, () => ok([CURSO])],
    ['GET', /^\/notificaciones/, (m, b, u) => {
      const n = u.rol === 'docente'
        ? ENTREGAS.filter((e) => e.estado === 'pendiente_revision').length
        : ENTREGAS.filter((e) => e.estudiante.id === u.id && e.estado === 'enviada' && !e.leida).length;
      return ok({ noLeidas: n, items: [] });
    }],
    ['GET', /^\/cursos\/[^/]+\/tareas$/, () => ok(TAREAS.map(publica))],
    ['GET', /^\/tareas\/([^/]+)\/resumen$/, (m) => {
      const es = ENTREGAS.filter((e) => e.tareaId === m[1]);
      return ok({ estudiantes: 41, entregasRecibidas: es.filter((e) => e.tipo === 'oficial').length, pendientesRevision: es.filter((e) => e.estado === 'pendiente_revision').length, tiempoMedioRespuestaHoras: 4.2 });
    }],
    ['GET', /^\/tareas\/([^/]+)\/entregas$/, (m) => ok(ENTREGAS.filter((e) => e.tareaId === m[1]).map(resumen))],
    ['POST', /^\/tareas\/([^/]+)\/entregas$/, (m, b, u) => {
      const t = tarea(m[1]);
      const usados = deEstudiante(t.id, u.id).filter((e) => e.tipo === 'oficial').length;
      if (b.tipo === 'oficial' && usados >= t.maxIntentos) return err(409, 'INTENTOS_AGOTADOS', 'Ya usaste todos los intentos de esta tarea.');
      const arch = (b.archivos || []).map((a) => ({ ...a, lenguaje: 'C++', lineas: a.contenido.split('\n').length }));
      const e = nuevaEntrega({
        tareaId: t.id, estudiante: resumenUsuario(u), tipo: b.tipo, numeroIntento: b.tipo === 'oficial' ? usados + 1 : null, archivos: arch,
        analisis: { compilacion: { ok: true }, lineasMarcadas: [] },
        retro: { origen: 'ia', secciones: secciones('Revisa tu solución contra los casos de prueba del enunciado.', 'El código compila.', []), comentarioDocente: '', generadoEn: now(), actualizadoEn: now() },
      });
      return ok(vistaEntrega(e, u), 202);
    }],
    ['GET', /^\/tareas\/([^/]+)\/intentos/, (m, b, u, q) => {
      const est = q.get('estudianteId') || u.id;
      return ok(deEstudiante(m[1], est).map(u.rol === 'docente' ? intento : intentoPanel));
    }],
    ['GET', /^\/entregas\/([^/]+)$/, (m, b, u) => {
      const e = ENTREGAS.find((x) => x.id === m[1]);
      return e ? ok(vistaEntrega(e, u)) : err(404, 'NO_ENCONTRADO', 'La entrega no existe.');
    }],
    ['PATCH', /^\/entregas\/([^/]+)\/retroalimentacion$/, (m, b) => {
      const e = ENTREGAS.find((x) => x.id === m[1]);
      if (e.estado === 'enviada') return err(409, 'ESTADO_INVALIDO', 'La retroalimentación ya fue enviada.');
      if (b.secciones) { e.retro.secciones = b.secciones; if (e.retro.origen === 'ia') e.retro.origen = 'ia_editada'; }
      if ('comentarioDocente' in b) e.retro.comentarioDocente = b.comentarioDocente;
      e.retro.actualizadoEn = now();
      return ok(retroDocente(e));
    }],
    ['POST', /^\/entregas\/([^/]+)\/retroalimentacion\/descartar$/, (m) => {
      const e = ENTREGAS.find((x) => x.id === m[1]);
      e.retro = { ...e.retro, origen: 'docente', secciones: { haciaDondeVoy: '', comoVoy: '', queSigue: '', pistas: [] }, actualizadoEn: now() };
      return ok(retroDocente(e));
    }],
    ['POST', /^\/entregas\/([^/]+)\/retroalimentacion\/aprobar$/, (m, b, u) => {
      const e = ENTREGAS.find((x) => x.id === m[1]);
      if (e.estado === 'enviada') return err(409, 'ESTADO_INVALIDO', 'Esta retroalimentación ya fue enviada.');
      e.estado = 'enviada'; e.fechaEnvio = now(); e.leida = false;
      return ok(vistaEntrega(e, u));
    }],
    ['POST', /^\/entregas\/([^/]+)\/retroalimentacion\/leida$/, (m) => {
      const e = ENTREGAS.find((x) => x.id === m[1]); e.leida = true; return ok(undefined, 204);
    }],
    ['GET', /^\/estudiantes\/me\/cursos\/[^/]+\/tareas$/, (m, b, u) =>
      ok(TAREAS.map((t) => tareaEstudiante(t, u)).sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite)).reverse())],
    ['GET', /^\/estudiantes\/me\/cursos\/[^/]+\/progreso$/, (m, b, u) => {
      const env = ENTREGAS.filter((e) => e.estudiante.id === u.id && e.estado === 'enviada');
      return ok({
        entregasAlDia: { hechas: 7, total: 9 },
        retroalimentacionesLeidas: { leidas: 4 + env.filter((e) => e.leida).length, total: 4 + env.length },
        erroresCorregidos: 5, intentosPromedio: 1.8,
        temas: [
          { temaId: '3', titulo: 'Arreglos y ciclos', tropiezos: 3, nivel: 'alto' },
          { temaId: '2', titulo: 'Condicionales anidados', tropiezos: 1, nivel: 'medio' },
          { temaId: '4', titulo: 'Funciones y parámetros', tropiezos: 0, nivel: 'bajo' },
        ],
      });
    }],
  ];

  const fetchReal = window.fetch.bind(window);
  window.fetch = async function (input, init = {}) {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.startsWith('/api/v1')) return fetchReal(input, init);
    const u = new URL(url, location.origin);
    const ruta = u.pathname.replace('/api/v1', '');
    const metodo = (init.method || 'GET').toUpperCase();
    const cuerpo = init.body ? JSON.parse(init.body) : {};
    await new Promise((r) => setTimeout(r, 120));
    let res = err(404, 'NO_IMPLEMENTADO', `El backend MVP no implementa ${metodo} ${ruta}.`);
    for (const [m, re, fn, publico] of rutas) {
      const match = metodo === m && ruta.match(re);
      if (!match) continue;
      const usuario = usuarioDe(init.headers || {});
      if (!publico && !usuario) { res = err(401, 'NO_AUTENTICADO', 'Sesión vencida.'); break; }
      res = fn(match, cuerpo, usuario, u.searchParams);
      break;
    }
    console.debug('[mock]', metodo, ruta, res.status);
    return new Response(res.status === 204 || res.body === undefined ? null : JSON.stringify(res.body), {
      status: res.status, headers: { 'Content-Type': 'application/json' },
    });
  };
})();
