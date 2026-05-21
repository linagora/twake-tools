/**
 * RepositoryListItem component - Display repository information in a list
 */

import {
  AlertCircle,
  Calendar,
  ExternalLink,
  GitFork,
  Star,
} from 'lucide-react';
import type { GitHubRepository } from '../../types/github';
import { formatDate } from '../../utils/dateUtils';
import { formatNumber } from '../../utils/formatUtils';

interface RepositoryListItemProps {
  repository: GitHubRepository;
}

export function RepositoryListItem({
  repository: repo,
}: RepositoryListItemProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4 flex-1">
          <img
            src={repo.owner.avatar_url}
            alt={`${repo.owner.login} avatar`}
            className="w-12 h-12 rounded-full"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <a
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-2xl font-semibold text-white hover:text-cyan-400 transition-colors flex items-center gap-2"
                aria-label={`View ${repo.full_name} on GitHub`}
              >
                {repo.full_name}
                <ExternalLink className="w-5 h-5" aria-hidden="true" />
              </a>
            </div>
            {repo.description && (
              <p className="text-gray-400 mb-3">{repo.description}</p>
            )}
            {repo.topics.length > 0 && (
              <ul
                className="flex flex-wrap gap-2 mb-3 list-none p-0 m-0"
                aria-label="Repository topics"
              >
                {repo.topics.map((topic) => (
                  <li
                    key={topic}
                    className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-sm rounded-full border border-cyan-500/20"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="flex items-center gap-2 text-gray-300">
          <Star className="w-5 h-5 text-yellow-400" aria-hidden="true" />
          <span className="font-semibold">
            {formatNumber(repo.stargazers_count)}
          </span>
          <span className="text-gray-500">stars</span>
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          <GitFork className="w-5 h-5 text-blue-400" aria-hidden="true" />
          <span className="font-semibold">
            {formatNumber(repo.forks_count)}
          </span>
          <span className="text-gray-500">forks</span>
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          <AlertCircle className="w-5 h-5 text-red-400" aria-hidden="true" />
          <span className="font-semibold">
            {formatNumber(repo.open_issues_count)}
          </span>
          <span className="text-gray-500">issues</span>
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          <Calendar className="w-5 h-5 text-green-400" aria-hidden="true" />
          <span className="text-gray-500">
            Updated {formatDate(repo.updated_at)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm text-gray-400 pt-4 border-t border-slate-700">
        {repo.language && (
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 bg-cyan-500 rounded-full"
              aria-hidden="true"
            ></span>
            <span>{repo.language}</span>
          </div>
        )}
        {repo.license && (
          <div className="flex items-center gap-2">
            <span>{repo.license.name}</span>
          </div>
        )}
        {repo.homepage && (
          <a
            href={repo.homepage}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan-400 transition-colors flex items-center gap-1"
          >
            Website <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}
