import { TanStackDevtools } from '@tanstack/react-devtools';
import {
  createRootRoute,
  Outlet,
  useRouterState,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

import Header from '../components/Header';
import { getRepositories } from '../data/repositories';
import { useEffect, useState } from 'react';
import type { GitHubRepository } from '../types/github';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const routerState = useRouterState();

  useEffect(() => {
    // Load repositories data
    const loadRepositories = async () => {
      const repos = await getRepositories();
      setRepositories(repos);
    };

    loadRepositories();
  }, []);

  // Check if we're on a route that might have repository data
  const hasRepoData =
    routerState.location.pathname === '/' ||
    routerState.location.pathname.startsWith('/releases') ||
    routerState.location.pathname.startsWith('/cicd') ||
    routerState.location.pathname.startsWith('/packages');

  return (
    <div className="min-h-screen bg-slate-900">
      <Header repositories={hasRepoData ? repositories : undefined} />
      <Outlet />
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'Tanstack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </div>
  );
}
