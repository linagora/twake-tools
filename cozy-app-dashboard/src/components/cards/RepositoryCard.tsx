/**
 * RepositoryCard component - Container for repository information sections
 */

import type { GitHubRepository } from '../../types/github';

interface RepositoryCardProps {
  repository: GitHubRepository;
  children: React.ReactNode;
}

export function RepositoryCard({ repository, children }: RepositoryCardProps) {
  return (
    <div className="mb-12 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <img
            src={repository.owner.avatar_url}
            alt={`${repository.owner.login} avatar`}
            className="w-10 h-10 rounded-full"
          />
          <h2 className="text-3xl font-bold text-white">
            {repository.full_name}
          </h2>
        </div>
      </div>
      {children}
    </div>
  );
}
