interface Props {
  title: string;
  backLabel: string;
  onBack: () => void;
}

export default function Placeholder({ title, backLabel, onBack }: Props) {
  return (
    <div className="placeholder">
      <span className="kicker">Fuera del alcance de esta entrega</span>
      <h1>{title}</h1>
      <p>
        Esta sección está prevista en la arquitectura de EduTrace pero no se diseñó para la fase
        analítica. Los mockups de esta entrega son el tablero del docente y el panel del estudiante.
      </p>
      <button type="button" className="btn btn-primary btn-compact" onClick={onBack}>
        {backLabel}
      </button>
    </div>
  );
}
