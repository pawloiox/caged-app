import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, isRouteErrorResponse, Link, Navigate, useParams, useRouteError } from 'react-router';
import { nextStep } from './store/criteria';
import { useProgress } from './store/app';
import { Layout } from './ui/Layout';
import { PageHead } from './ui/controls';

// Every page is its own chunk, so the first visit downloads only the shell and the page it lands on.
const Step1 = lazy(() => import('./lessons/Step1'));
const Step2 = lazy(() => import('./lessons/Step2'));
const Step3 = lazy(() => import('./lessons/Step3'));
const Step4 = lazy(() => import('./lessons/Step4'));
const Step5 = lazy(() => import('./lessons/Step5'));
const Explore = lazy(() => import('./explore/Explore'));
const Practice = lazy(() => import('./practice/Practice'));
const Train = lazy(() => import('./train/Train'));
const Tuner = lazy(() => import('./listen/Tuner'));
const Diagnostics = lazy(() => import('./listen/Diagnostics'));
const PrintCharts = lazy(() => import('./print/PrintCharts'));

function Page({ C }: { C: ComponentType }) {
  return (
    <Suspense
      fallback={
        <p className="muted" role="status">
          Loading…
        </p>
      }
    >
      <C />
    </Suspense>
  );
}

/** Shown instead of a blank screen if a page fails to render. Progress is safe in IndexedDB. */
function RouteError() {
  const err = useRouteError();
  const msg = isRouteErrorResponse(err)
    ? `${err.status} ${err.statusText}`
    : err instanceof Error
      ? err.message
      : String(err);
  return (
    <main id="main" style={{ padding: 24, maxWidth: 640 }}>
      <PageHead
        eyebrow="Something went wrong"
        title="This page hit a problem"
        lede="Your progress is saved on this device. Reloading usually fixes it."
      />
      <p className="muted">Details: {msg}</p>
      <div className="actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn primary" onClick={() => location.reload()}>
          Reload
        </button>
        <a className="btn" href="/">
          Go to your next step
        </a>
      </div>
    </main>
  );
}

const STEPS = [Step1, Step2, Step3, Step4, Step5];

function Learn() {
  const { n } = useParams();
  const i = Number(n);
  const C = STEPS[i - 1];
  return C ? (
    <Suspense
      key={i}
      fallback={
        <p className="muted" role="status">
          Loading…
        </p>
      }
    >
      <C />
    </Suspense>
  ) : (
    <Navigate to="/learn/1" replace />
  );
}

function Home() {
  const p = useProgress();
  return <Navigate to={`/learn/${nextStep(p) ?? 1}`} replace />;
}

function NotFound() {
  return (
    <>
      <PageHead eyebrow="Not found" title="That page isn't here" lede="The link may be old." />
      <p>
        <Link className="btn" to="/">
          Go to your next step
        </Link>
      </p>
    </>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      { path: 'learn/:n', element: <Learn /> },
      { path: 'explore', element: <Page C={Explore} /> },
      { path: 'practice', element: <Page C={Practice} /> },
      { path: 'train', element: <Navigate to="/train/shape" replace /> },
      { path: 'train/:mode', element: <Page C={Train} /> },
      { path: 'tuner', element: <Page C={Tuner} /> },
      { path: 'diagnostics', element: <Page C={Diagnostics} /> },
      { path: 'print', element: <Page C={PrintCharts} /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
