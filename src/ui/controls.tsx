import * as RadioGroup from '@radix-ui/react-radio-group';
import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router';
import { COL } from '../fretboard/build';
import { LABEL_OPTS, MAJOR_NAMES, ORDER, chordLabel, type Quality, type Shape } from '../theory';
import { setPrefs, usePrefs, useUi } from '../store/app';

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
  // Underlined choices don't show where one group ends and the next begins, so each group carries its name.
  // The name is visible text only; the radio group itself is labelled for assistive tech.
  return (
    <div className="seg-group">
      <span className="seg-label" aria-hidden="true">
        {label}
      </span>
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
    </div>
  );
}

export function LabelSeg() {
  const labels = usePrefs((p) => p.labels);
  return <Seg value={labels} options={LABEL_OPTS} onChange={(v) => setPrefs({ labels: v })} label="Dot labels" />;
}

/**
 * Fade the scaffolding: while a drill or loop plays, the neck shows the whole shape, only its roots, or nothing
 * (play it from memory). Stopped, the neck always shows everything.
 */
export function FadeSeg() {
  const fade = usePrefs((p) => p.fade);
  return (
    <Seg
      value={fade}
      options={[
        ['shapes', 'Whole shapes'],
        ['roots', 'Roots only'],
        ['none', 'Nothing'],
      ]}
      onChange={(v) => setPrefs({ fade: v })}
      label="While it plays, show"
    />
  );
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
  const just = useUi((u) => u.justCompleted.includes('step-' + n));
  return (
    <header className="lesson-head">
      <h1 tabIndex={-1}>{title}</h1>
      <p className="lede">{lede}</p>
      {just ? (
        <div className="callout good">
          <p>
            <strong>Step {n} complete, +50 XP.</strong>{' '}
            {n < 5 ? (
              <Link to={`/learn/${n + 1}`}>Go on to Step {n + 1}</Link>
            ) : (
              <Link to="/practice">Start your daily routine</Link>
            )}
          </p>
        </div>
      ) : null}
    </header>
  );
}

export function PageHead({ title, lede }: { title: string; lede: ReactNode }) {
  return (
    <header className="lesson-head">
      <h1 tabIndex={-1}>{title}</h1>
      <p className="lede">{lede}</p>
    </header>
  );
}

export function NextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <div className="next">
      <Link className="btn" to={to}>
        Next: {children}
      </Link>
    </div>
  );
}

export type Task = {
  title: ReactNode;
  detail: ReactNode;
  /** Set for a task that counts toward finishing the step; left out for practice the app does not track. */
  done?: boolean;
  /** Progress toward the task, under its detail: a count or a row of chips. */
  progress?: ReactNode;
};

/**
 * What to do in a step, in the order the page is used: one numbered list under the title, so the page reads top
 * to bottom. A task that counts toward finishing the step turns into a tick when it is done.
 */
export function StepPlan({ tasks }: { tasks: Task[] }) {
  const id = useId();
  return (
    <section className="plan" aria-labelledby={id}>
      <h2 id={id} className="plan-title">
        What to do
      </h2>
      <ol className="plan-list">
        {tasks.map((t, i) => (
          <li key={i} className={t.done ? 'done' : ''}>
            <span className="plan-n" aria-hidden="true">
              {t.done ? '✓' : i + 1}
            </span>
            <div className="plan-body">
              <p className="plan-task">
                {t.title}
                {t.done == null ? null : <span className="sr-only">{t.done ? ' (done)' : ' (not done yet)'}</span>}
              </p>
              <p className="plan-detail">{t.detail}</p>
              {t.progress}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Background for a step: the reference cards after the workbench, under one heading. */
export function Notes({ children }: { children: ReactNode }) {
  const id = useId();
  return (
    <section className="notes" aria-labelledby={id}>
      <h2 id={id} className="notes-title">
        Good to know
      </h2>
      <div className="cards">{children}</div>
    </section>
  );
}

export function Card({
  title,
  children,
  className = '',
  level = 2,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  /** 3 inside a section that has its own heading (Notes). */
  level?: 2 | 3;
}) {
  const H = level === 3 ? 'h3' : 'h2';
  return (
    <article className={`card ${className}`}>
      {title ? <H className="card-title">{title}</H> : null}
      {children}
    </article>
  );
}
