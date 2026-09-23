import type { SeccionesFeedback } from '../api/tipos';

/**
 * Formulario del borrador de retroalimentación (RF-11: el docente edita antes de enviar).
 *
 * Las pistas se editan como TEXTO (una por línea) y solo se convierten a lista al guardar.
 * Si se convirtieran en cada tecla, no se podría escribir un salto de línea para empezar una
 * pista nueva: la línea vacía desaparecería mientras se escribe.
 */
export interface Borrador {
  queSigue: string;
  haciaDondeVoy: string;
  comoVoy: string;
  pistasTexto: string;
}

/** De lo que manda el backend → a lo que editan las cajas de texto. */
export function aBorrador(s: SeccionesFeedback | undefined): Borrador {
  return {
    queSigue: s?.queSigue ?? '',
    haciaDondeVoy: s?.haciaDondeVoy ?? '',
    comoVoy: s?.comoVoy ?? '',
    pistasTexto: (s?.pistas ?? []).join('\n'),
  };
}

/** De las cajas de texto → a lo que recibe el backend (PATCH …/retroalimentacion). */
export function aSecciones(b: Borrador): SeccionesFeedback {
  return {
    queSigue: b.queSigue.trim(),
    haciaDondeVoy: b.haciaDondeVoy.trim(),
    comoVoy: b.comoVoy.trim(),
    pistas: b.pistasTexto
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p !== ''),
  };
}

/** ¿El docente cambió algo respecto a lo guardado en el backend? */
export function hayCambios(b: Borrador, guardado: SeccionesFeedback | undefined): boolean {
  return JSON.stringify(aSecciones(b)) !== JSON.stringify(aSecciones(aBorrador(guardado)));
}

interface Props {
  valor: Borrador;
  onCambio: (nuevo: Borrador) => void;
  deshabilitado?: boolean;
}

// Orden: "¿Qué sigue?" primero porque es la prioridad (RF-03).
const CAMPOS: { clave: keyof Borrador; etiqueta: string; ayuda: string; filas: number }[] = [
  {
    clave: 'queSigue',
    etiqueta: '¿Qué sigue? (obligatorio)',
    ayuda: 'El siguiente paso concreto para el estudiante. Sin dar la solución.',
    filas: 3,
  },
  { clave: 'pistasTexto', etiqueta: 'Pistas', ayuda: 'Una pista por línea.', filas: 2 },
  { clave: 'haciaDondeVoy', etiqueta: '¿Hacia dónde voy?', ayuda: 'La meta de aprendizaje de la tarea.', filas: 2 },
  { clave: 'comoVoy', etiqueta: '¿Cómo voy?', ayuda: 'Qué logra hoy el código frente a esa meta.', filas: 3 },
];

export default function BorradorEditable({ valor, onCambio, deshabilitado = false }: Props) {
  return (
    <div className="borrador">
      {CAMPOS.map((c) => (
        <div className="borrador-campo" key={c.clave}>
          <label className="borrador-etiqueta" htmlFor={`borrador-${c.clave}`}>
            {c.etiqueta}
          </label>
          <textarea
            id={`borrador-${c.clave}`}
            className="textarea borrador-texto"
            rows={c.filas}
            value={valor[c.clave]}
            placeholder={c.ayuda}
            disabled={deshabilitado}
            // {...valor, [clave]: nuevoTexto} copia el borrador y cambia solo ese campo
            onChange={(e) => onCambio({ ...valor, [c.clave]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}
