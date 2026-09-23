import type { SeccionesFeedback } from '../api/tipos';

interface Props {
  /** Secciones reales del backend. Si no se pasan, muestra el texto de demo (StudentPanel aún no está conectado). */
  secciones?: SeccionesFeedback;
}

export default function FeedbackDraft({ secciones }: Props) {
  if (secciones) {
    // Estructura de Hattie & Timperley (RF-02). "¿Qué sigue?" va de primero porque es la prioridad (RF-03).
    return (
      <>
        <p>
          <strong>¿Qué sigue?</strong> {secciones.queSigue}
        </p>
        {secciones.pistas && secciones.pistas.length > 0 && (
          <ul>
            {secciones.pistas.map((pista) => (
              <li key={pista}>{pista}</li>
            ))}
          </ul>
        )}
        <p>
          <strong>¿Hacia dónde voy?</strong> {secciones.haciaDondeVoy}
        </p>
        <p>
          <strong>¿Cómo voy?</strong> {secciones.comoVoy}
        </p>
      </>
    );
  }

  return (
    <>
      <p>Error de Lógica: Índice fuera de límites (Línea 9)</p>
      <p>
        La condición <code>{'i <= N'}</code> provoca un acceso fuera de rango al evaluar{' '}
        <code>notas[5]</code>, generando comportamiento indefinido en la acumulación de{' '}
        <code>suma</code>. Ajustar la condición de parada del bucle <code>for</code> a estricta{' '}
        <code>{'(<)'}</code> para iterar en el rango [0, N-1].
      </p>
    </>
  );
}
