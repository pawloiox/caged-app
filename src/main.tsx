// Archivo (Latin, variable width and weight) is declared in styles.css, so it is self-hosted and precached.
import './ui/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { registerSW } from 'virtual:pwa-register';
import { router } from './routes';
import { hydrate, notify } from './store/app';

// The opening moment (styles.css, "Opening the site"): the page waits, then settles in as the guitar lands (Layout
// times it). Cleared once it has played, so later page changes render at rest; the fallback never leaves it hidden.
document.documentElement.dataset.intro = '';
setTimeout(() => delete document.documentElement.dataset.intro, 4000);

void hydrate().then(({ imported }) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
  if (imported) setTimeout(() => notify('Imported your progress from the previous version.'), 600);
});

if (import.meta.env.PROD) registerSW({ immediate: true });
