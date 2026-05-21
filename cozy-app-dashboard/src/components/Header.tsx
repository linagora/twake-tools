import { Activity, Home, Package, Rocket, Star } from 'lucide-react';
import { useRepositoryFilter } from '../context/RepositoryFilterContext';
import { NavLink } from './layout/NavLink';
import type { GitHubRepository } from '../types/github';

interface HeaderProps {
  repositories?: GitHubRepository[];
}

export default function Header({ repositories = [] }: HeaderProps) {
  const { showFavoritesOnly, toggleShowFavorites } = useRepositoryFilter();

  // Filter repositories based on favorites setting
  const filteredRepositories = showFavoritesOnly
    ? repositories.filter((repo) => repo.favorite)
    : repositories;

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-gray-900 text-white shadow-2xl z-50 flex flex-col">
      <nav className="flex-1 p-4 overflow-y-auto" aria-label="Main navigation">
        <NavLink
          to="/"
          icon={<Home size={20} />}
          label="Repository Dashboard"
        />
        <NavLink to="/releases" icon={<Rocket size={20} />} label="Releases" />
        <NavLink to="/cicd" icon={<Activity size={20} />} label="CI/CD" />
        <NavLink to="/packages" icon={<Package size={20} />} label="Packages" />
      </nav>
      <div className="p-4 border-t border-gray-700">
        <button
          type="button"
          onClick={toggleShowFavorites}
          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700 transition-colors mb-4"
        >
          <Star
            size={16}
            className={
              showFavoritesOnly
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-400'
            }
          />
          <span className="text-sm">
            {showFavoritesOnly
              ? 'Show all packages'
              : 'Show only favorite packages'}
          </span>
        </button>

        {filteredRepositories.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Displayed Repositories ({filteredRepositories.length})
            </h3>
            <ul className="space-y-1 text-sm max-h-48 overflow-y-auto">
              {filteredRepositories.map((repo) => (
                <li key={repo.id} className="flex items-center gap-2 truncate">
                  {repo.favorite && (
                    <Star
                      size={12}
                      className="text-yellow-400 fill-yellow-400 flex-shrink-0"
                    />
                  )}
                  <span className="truncate" title={repo.full_name}>
                    {repo.full_name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
