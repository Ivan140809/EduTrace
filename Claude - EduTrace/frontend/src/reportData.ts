export type Dimension = 'rae' | 'tema';
export type Corte = 'I' | 'II' | 'III';

export interface Rae {
  id: number;
  short: string;
  text: string;
  tags: string;
}

export interface Tema {
  id: number;
  title: string;
  subtemas: string[];
}

export const RAES: Rae[] = [
  {
    id: 1,
    short: 'Caracterizar problemas',
    text: 'Identificar información que permite caracterizar un problema informático de complejidad baja, mediante el uso de los principios básicos de Lógica e Ingeniería de Sistemas',
    tags: 'Disciplinar 1 · CDIO 2.1',
  },
  {
    id: 2,
    short: 'Diseñar algoritmos',
    text: 'Conocer las construcciones básicas de programación para diseñar soluciones a problemas informáticos de complejidad baja, mediante algoritmos, utilizando el pensamiento computacional',
    tags: 'Disciplinar 1, 2 · CDIO 4.4',
  },
  {
    id: 3,
    short: 'Organizar los datos',
    text: 'Conocer los procedimientos para diseñar la organización de los datos requeridos para solucionar el problema utilizando colecciones de datos y archivos',
    tags: 'Disciplinar 1, 3, 4 · CDIO 4.4',
  },
  {
    id: 4,
    short: 'Implementar y modificar',
    text: 'Determinar las herramientas necesarias para implementar, en un lenguaje de programación, los algoritmos diseñados, permitiendo su modificación',
    tags: 'Disciplinar 1, 2, 3, 4 · CDIO 4.5',
  },
];

export const TEMAS: Tema[] = [
  {
    id: 1,
    title: 'Solución de problemas',
    subtemas: ['Ciclo de vida', 'Pensamiento computacional', 'Abstracción', 'Algoritmos'],
  },
  {
    id: 2,
    title: 'Construcciones básicas de programación',
    subtemas: [
      'Elementos básicos de un programa',
      'Estilo de programación',
      'Manejo de lenguaje de programación',
      'Flujo de control',
      'Funciones',
    ],
  },
  {
    id: 3,
    title: 'Manejo de memoria con colecciones de datos',
    subtemas: ['Memoria estática', 'Arreglos', 'Otras colecciones de datos'],
  },
  {
    id: 4,
    title: 'Manejo de datos en archivos',
    subtemas: ['Secuenciales', 'Aleatorios'],
  },
];

export const CORTES: Corte[] = ['I', 'II', 'III'];

/** Fricción de cada RAE / tema en el corte dado, para comparar contra el seleccionado. */
export function friccionHistorica(
  dimension: Dimension,
  corte: Corte,
): { id: number; label: string; pct: number }[] {
  const items = dimension === 'rae' ? RAES : TEMAS;
  return items.map((it) => {
    const pts = buildPoints(dimension, it.id, corte);
    const n = pts.filter((p) => p.intentos > 2).length;
    return {
      id: it.id,
      label: dimension === 'rae' ? (it as Rae).short : (it as Tema).title,
      pct: Math.round((n / pts.length) * 100),
    };
  });
}

/** Ejes del mapa: X = desempeño (nota 1–5), Y = dificultad percibida. */
export const X_TICKS = [1, 3, 3.75, 5];
export const X_BANDS = ['Bajo', 'Medio', 'Alto'];
export const Y_BANDS = ['Alto', 'Medio', 'Bajo'];

export interface Point {
  id: number;
  name: string;
  /** nota 1–5 */
  nota: number;
  /** dificultad 0 (baja) – 1 (alta) */
  dificultad: number;
  /** posición en el corte anterior, para el recorrido */
  prev: { nota: number; dificultad: number } | null;
  /** sin movimiento respecto al corte anterior */
  estancado: boolean;
  /** intentos usados hasta alcanzar 3,0; null si aún no lo alcanza */
  intentosASuficiencia: number | null;
  /** intentos entregados en este corte */
  intentos: number;
  /** salto anómalo: de bajo a casi 5,0 en un solo intento */
  anomalia: boolean;
}

const NOMBRES = [
  'Ana','Bruno','Camila','Daniel','Elena','Felipe','Gabriela','Hugo','Isabel','Julián',
  'Karen','Lucas','María','Nicolás','Olivia','Pablo','Quenia','Ricardo','Sofía','Tomás',
  'Ursula','Valentina','Wilson','Ximena','Yesid','Zulma','Alejandro','Beatriz','Carlos','Diana',
  'Emilio','Fernanda','Gustavo','Helena','Iván','Jimena','Kevin','Laura','Mateo','Natalia','Óscar',
];

function rand(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const CORTE_SHIFT: Record<Corte, number> = { I: 0, II: 0.14, III: 0.26 };

function place(t: number, r: () => number) {
  const nota = Math.min(5, Math.max(1, 1 + 4 * t + (r() - 0.5) * 0.7));
  return { nota };
}

/** La dificultad percibida no depende de la nota: se sortea aparte, con leve sesgo inverso. */
function difficulty(nota: number, r: () => number) {
  const bias = (5 - nota) / 4; // quien saca menos tiende a reportar más dificultad
  const raw = 0.25 * bias + 0.75 * r();
  return Math.min(1, Math.max(0, raw));
}

export function buildPoints(dimension: Dimension, filtro: number, corte: Corte): Point[] {
  const seed = (dimension === 'rae' ? 101 : 307) * (filtro + 3);
  const r = rand(seed);
  const shift = CORTE_SHIFT[corte];
  const prevShift = corte === 'I' ? null : CORTE_SHIFT[corte === 'II' ? 'I' : 'II'];

  return NOMBRES.map((name, i) => {
    const base = Math.min(1, Math.max(0, 0.12 + r() * 0.82));
    const stuck = r() < 0.12;
    const salto = !stuck && corte !== 'I' && r() < 0.06;

    const prevR = rand(seed + i * 31);
    const prevBase = salto ? Math.min(0.4, base * 0.35) : base;
    const prevNota = prevShift === null ? null : place(Math.min(1, prevBase + prevShift), prevR).nota;
    const prevDif = prevShift === null ? null : difficulty(prevNota ?? 3, prevR);

    const nota = salto
      ? Math.min(5, 4.7 + r() * 0.3)
      : place(Math.min(1, base + (stuck ? 0.01 : shift)), r).nota;
    const dificultad = stuck && prevDif !== null ? prevDif : difficulty(nota, r);

    const prev = prevNota === null ? null : { nota: prevNota, dificultad: prevDif as number };
    const intentos = stuck ? 3 : salto ? 1 : 1 + Math.floor(r() * 3);

    return {
      id: i + 1,
      name,
      nota,
      dificultad,
      prev,
      estancado: stuck && corte !== 'I',
      intentos,
      intentosASuficiencia: nota >= 3 ? Math.max(1, intentos - (r() < 0.4 ? 1 : 0)) : null,
      anomalia: salto,
    };
  });
}

export interface Cluster {
  key: string;
  label: string;
  hint: string;
  members: Point[];
  tone: 'alert' | 'accent' | 'neutral' | 'dark';
}

export function analyze(points: Point[]) {
  const total = points.length;
  const alto = points.filter((p) => p.nota >= 3.75).length;
  const bajo = points.filter((p) => p.nota < 3).length;
  const estancados = points.filter((p) => p.estancado);
  const anomalias = points.filter((p) => p.anomalia);
  const dificil = points.filter((p) => p.dificultad >= 0.66 && p.nota < 3.75).length;

  // 1 · Delta de aprendizaje: vector promedio entre el corte anterior y el actual
  const conPrev = points.filter((p) => p.prev);
  const deltaX =
    conPrev.length === 0
      ? 0
      : conPrev.reduce((s, p) => s + (p.nota - p.prev!.nota), 0) / conPrev.length;
  const deltaY =
    conPrev.length === 0
      ? 0
      : conPrev.reduce((s, p) => s + (p.dificultad - p.prev!.dificultad), 0) / conPrev.length;
  const migraron = conPrev.filter((p) => p.prev!.nota < 3 && p.nota >= 3).length;
  const retrocedieron = conPrev.filter((p) => p.nota < p.prev!.nota - 0.1).length;

  // Tasa de conversión: intentos promedio hasta cruzar 3,0
  const convertidos = points.filter((p) => p.intentosASuficiencia !== null);
  const intentosMedios =
    convertidos.length === 0
      ? 0
      : convertidos.reduce((s, p) => s + (p.intentosASuficiencia ?? 0), 0) / convertidos.length;

  // 2 · Resistencia por tema: fricción de la cohorte en este RAE
  const masDeDos = points.filter((p) => p.intentos > 2).length;
  const pctMasDeDos = Math.round((masDeDos / total) * 100);
  const intentosPromedio = points.reduce((s, p) => s + p.intentos, 0) / total;
  const friccion: 'Alta' | 'Media' | 'Baja' =
    pctMasDeDos >= 40 ? 'Alta' : pctMasDeDos >= 20 ? 'Media' : 'Baja';

  // 2 · Cuello de botella: acumulación en la zona inferior izquierda
  const resistencia = points.filter((p) => p.nota < 3 && p.dificultad >= 0.5).length;
  const pctResistencia = Math.round((resistencia / total) * 100);
  const dificultadAlta = points.filter((p) => p.dificultad >= 0.66);
  const caidaExigencia =
    dificultadAlta.length === 0
      ? 0
      : Math.round(
          (dificultadAlta.filter((p) => p.nota < 3).length / dificultadAlta.length) * 100,
        );

  // 4 · Agrupación para intervenciones
  const clusters: Cluster[] = [
    {
      key: 'refuerzo',
      label: 'Grupo de refuerzo',
      hint: 'Desempeño bajo y dificultad alta. Programar monitoría o enviar guía con pistas paso a paso.',
      tone: 'alert',
      members: points.filter((p) => p.nota < 3 && p.dificultad >= 0.5),
    },
    {
      key: 'acompanamiento',
      label: 'Acompañamiento puntual',
      hint: 'Ya pasan, pero no consolidan. Revisar un caso en clase y dejar un ejercicio guiado.',
      tone: 'accent',
      members: points.filter((p) => p.nota >= 3 && p.nota < 3.75),
    },
    {
      key: 'autonomo',
      label: 'Trabajo autónomo',
      hint: 'Desempeño alto con dificultad media o baja. No requieren intervención.',
      tone: 'neutral',
      members: points.filter((p) => p.nota >= 3.75 && p.dificultad < 0.66),
    },
    {
      key: 'avanzado',
      label: 'Grupo avanzado',
      hint: 'Alto desempeño pese a alta dificultad. Asignar retos de optimización de código.',
      tone: 'dark',
      members: points.filter((p) => p.nota >= 3.75 && p.dificultad >= 0.66),
    },
  ];

  return {
    total,
    pctAlto: Math.round((alto / total) * 100),
    pctBajo: Math.round((bajo / total) * 100),
    estancados,
    anomalias,
    dificil,
    deltaX,
    deltaY,
    migraron,
    retrocedieron,
    intentosMedios,
    convertidos: convertidos.length,
    resistencia,
    pctResistencia,
    caidaExigencia,
    masDeDos,
    pctMasDeDos,
    intentosPromedio,
    friccion,
    clusters,
  };
}
