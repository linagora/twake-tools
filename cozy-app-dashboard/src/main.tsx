import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RepositoryFilterProvider } from './context/RepositoryFilterContext';
import { routeTree } from './routeTree.gen';
import './styles.css';

// Base path for GitHub Pages - must match vite.config.ts base path
const BASE_PATH = '/repo-dashboard';

// Clear cache when page loads to ensure fresh data after reload
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    import('./data/cache').then(({ clearCache }) => clearCache());
  });
}

// Create router instance with base path
const router = createRouter({
  routeTree,
  scrollRestoration: true,
  defaultPreloadStaleTime: 30 * 60 * 1000, // 30 minutes
  defaultPreload: 'intent',
  basepath: BASE_PATH,
});

// Register the router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <RepositoryFilterProvider>
      <RouterProvider router={router} />
    </RepositoryFilterProvider>
  </StrictMode>,
);
