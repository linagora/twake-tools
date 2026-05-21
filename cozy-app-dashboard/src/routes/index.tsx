import { createFileRoute } from '@tanstack/react-router';
import { AlertCircle, Clock } from 'lucide-react';
import { RepositoryListItem } from '../components/cards/RepositoryListItem';
import { PageLayout } from '../components/layout/PageLayout';
import { useRepositoryFilter } from '../context/RepositoryFilterContext';
import { getMetadata } from '../data/metadata';
import { getRepositories } from '../data/repositories';

export const Route = createFileRoute('/')({
  component: Dashboard,
  loader: async () => {
    const [repositories, metadata] = await Promise.all([
      getRepositories(),
      getMetadata(),
    ]);
    return { repositories, metadata };
  },
});

function Dashboard() {
  const { repositories, metadata } = Route.useLoaderData();
  const { showFavoritesOnly } = useRepositoryFilter();

  const formatLastUpdated = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter repositories based on favorites setting
  const filteredRepositories = showFavoritesOnly
    ? repositories.filter((repo) => repo.favorite)
    : repositories;

  return (
    <PageLayout>
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Repository Dashboard
        </h1>
        <p className="text-gray-400 text-lg mb-2">
          Monitoring {filteredRepositories.length} public repositories
        </p>
        {metadata.lastUpdated && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span>Last updated: {formatLastUpdated(metadata.lastUpdated)}</span>
          </div>
        )}
      </div>

      {filteredRepositories.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">
            No repositories found
          </h2>
          <p className="text-gray-400 mb-6">
            Run{' '}
            <code className="px-2 py-1 bg-slate-700 rounded text-cyan-400">
              npm run fetch-repos
            </code>{' '}
            to fetch repository data
          </p>
        </div>
      ) : (
        <ul
          className="grid grid-cols-1 gap-6 list-none p-0 m-0"
          aria-label="Repository list"
        >
          {filteredRepositories.map((repo) => (
            <li key={repo.id}>
              <RepositoryListItem repository={repo} />
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
