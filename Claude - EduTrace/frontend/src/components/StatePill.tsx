import type { StateTone } from '../types';

const CLASS: Record<StateTone, string> = {
  accent: 'state-accent',
  neutral: 'state-neutral',
  dark: 'state-dark',
  alert: 'state-alert',
  quiet: 'state-quiet',
};

export default function StatePill({
  tone,
  children,
}: {
  tone: StateTone;
  children: React.ReactNode;
}) {
  return <span className={`state-pill ${CLASS[tone]}`}>{children}</span>;
}
