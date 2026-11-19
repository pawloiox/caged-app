import * as RadioGroup from '@radix-ui/react-radio-group';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router';
import { COL } from '../fretboard/build';
import { LABEL_OPTS, MAJOR_NAMES, ORDER, chordLabel, type Quality, type Shape } from '../theory';
import { setPrefs, usePrefs, useProgress, useUi } from '../store/app';

export function Seg<T extends string | number>({
  value,
  options,
  onChange,
  label,
  className = '',
}: {
  value: T;
  options: ReadonlyArray<readonly [T, ReactNode]>;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <RadioGroup.Root
      className={`seg ${className}`}
      value={String(value)}
      onValueChange={(v) => {
        const opt = options.find(([o]) => String(o) === v);
        if (opt) onChange(opt[0]);
      }}
      aria-label={label}
      orientation="horizontal"
      loop
    >
      {options.map(([v, t]) => (
        <RadioGroup.Item key={String(v)} value={String(v)}>
          {t}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}

export function LabelSeg() {
  const labels = usePrefs((p) => p.labels);
  return <Seg value={labels} options={LABEL_OPTS} onChange={(v) => setPrefs({ labels: v })} label="Dot labels" />;
}

export function KeyPicker({ value, q, onChange }: { value: number; q: Quality; onChange: (pc: number) => void }) {
  const sp = usePrefs((p) => p.minorSpelling);
  return (
    <Seg
      value={value}
      options={MAJOR_NAMES.map((_, pc) => [pc, chordLabel(pc, q, sp)] as const)}
      onChange={onChange}
      label="Key"
      className="keys"
    />
  );
}

export const QUALITY_OPTS: ReadonlyArray<readonly [Quality, string]> = [
  ['major', 'Major'],
  ['minor', 'Minor'],
];

/** Shape buttons as a radio group: C A G E D, never told apart by colour alone. */
export function ShapeRadio({
  value,
  onChange,
  label,
  order = ORDER,
  done,
  suffix = '-shape',
}: {
  value: Shape | null;
  onChange: (s: Shape) => void;
  label: string;
  order?: readonly Shape[];
  done?: ReadonlySet<string>;
  suffix?: string;
}) {
  return (
    <RadioGroup.Root
      className="shape-btns"
      value={value ?? ''}
      onValueChange={(v) => onChange(v as Shape)}
      aria-label={label}
      orientation="horizontal"
      loop
    >
      {order.map((c) => (
        <RadioGroup.Item
          key={c}
          value={c}
          className={`shape-btn${c === 'A' ? ' dark-text' : ''}`}
          style={{ ['--sc' as string]: COL[c] }}
          aria-label={`${c}${suffix}${done?.has(c) ? ', done' : ''}`}
        >
          {c}
          {done?.has(c) ? (
            <span className="tick" aria-hidden="true">
              ✓
            </span>
          ) : null}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}

/** Answer buttons for quizzes (each is an action, not a selection). */
export const ShapeAnswer = forwardRef<
  HTMLButtonElement,
  { shape: Shape; state?: 'right' | 'wrong' | '' } & ButtonHTMLAttributes<HTMLButtonElement>
>(function ShapeAnswer({ shape, state = '', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={`shape-btn${shape === 'A' ? ' dark-text' : ''} ${state}`}
      style={{ ['--sc' as string]: COL[shape] }}
      aria-label={`${shape}-shape${state === 'right' ? ', correct answer' : state === 'wrong' ? ', your answer, wrong' : ''}`}
      {...rest}
    >
      {shape}
    </button>
  );
});

export function Check({
  checked,
  onChange,
  children,
  disabled,
  title,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <label className={`check${disabled ? ' disabled' : ''}`} title={title}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />{' '}
      {children}
    </label>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd aria-hidden="true">{children}</kbd>;
}

export function Head({ n, title, lede }: { n: number; title: string; lede: string }) {
  const done = useProgress((p) => !!p.steps['step-' + n]);
  const just = useUi((u) => u.justCompleted.includes('step-' + n));
  return (
    <header className="lesson-head">
      <p className="eyebrow">
        Step {n} of 5{done ? ' · completed' : ''}
      </p>
      <h1 tabIndex={-1}>{title}</h1>
      <p className="lede">{lede}</p>
      {just ? (
        <div className="callout good">
          <p>
            <strong>Step {n} complete · +50 XP.</strong>{' '}
            {n < 5 ? (
              <Link to={`/learn/${n + 1}`}>Go on to Step {n + 1} →</Link>
            ) : (
              <Link to="/practice">Start your daily routine →</Link>
            )}
          </p>
        </div>
      ) : null}
    </header>
  );
}

export function PageHead({ eyebrow, title, lede }: { eyebrow: string; title: string; lede: ReactNode }) {
  return (
    <header className="lesson-head">
      <p className="eyebrow">{eyebrow}</p>
      <h1 tabIndex={-1}>{title}</h1>
      <p className="lede">{lede}</p>
    </header>
  );
}

export function NextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <div className="next">
      <Link className="btn" to={to}>
        Next: {children} →
      </Link>
    </div>
  );
}

export function Criteria({ items }: { items: Array<[boolean, ReactNode]> }) {
  return (
    <ul className="criteria">
      {items.map(([ok, t], i) => (
        <li key={i} className={ok ? 'ok' : ''}>
          <span className="sr-only">{ok ? 'Done: ' : 'To do: '}</span>
          {t}
        </li>
      ))}
    </ul>
  );
}

export function Card({
  title,
  children,
  className = '',
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`card ${className}`}>
      {title ? <h2 className="card-title">{title}</h2> : null}
      {children}
    </article>
  );
}
