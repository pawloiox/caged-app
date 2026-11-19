// Latin subsets only (the display face is declared in styles.css): smaller CSS and precache.
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import './ui/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { registerSW } from 'virtual:pwa-register';
import { router } from './routes';
import { hydrate, notify } from './store/app';

void hydrate().then(({ imported }) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
  if (imported) setTimeout(() => notify('Imported your progress from the previous version.'), 600);
});

if (import.meta.env.PROD) registerSW({ immediate: true });
