import { createBrowserRouter, Navigate, useParams } from 'react-router';
import { nextStep } from './store/criteria';
import { useProgress } from './store/app';
import { Layout } from './ui/Layout';
import Step1 from './lessons/Step1';
import Step2 from './lessons/Step2';
import Step3 from './lessons/Step3';
import Step4 from './lessons/Step4';
import Step5 from './lessons/Step5';
import Explore from './explore/Explore';
import Practice from './practice/Practice';
import Train from './train/Train';
import Tuner from './listen/Tuner';
import Diagnostics from './listen/Diagnostics';
import PrintCharts from './print/PrintCharts';
import { PageHead } from './ui/controls';
import { Link } from 'react-router';

const STEPS = [Step1, Step2, Step3, Step4, Step5];

function Learn() {
  const { n } = useParams();
  const i = Number(n);
  const C = STEPS[i - 1];
  return C ? <C key={i} /> : <Navigate to="/learn/1" replace />;
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
    children: [
      { index: true, element: <Home /> },
      { path: 'learn/:n', element: <Learn /> },
      { path: 'explore', element: <Explore /> },
      { path: 'practice', element: <Practice /> },
      { path: 'train', element: <Navigate to="/train/shape" replace /> },
      { path: 'train/:mode', element: <Train /> },
      { path: 'tuner', element: <Tuner /> },
      { path: 'diagnostics', element: <Diagnostics /> },
      { path: 'print', element: <PrintCharts /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
