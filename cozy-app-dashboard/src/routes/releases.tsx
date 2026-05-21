import { createFileRoute } from '@tanstack/react-router';
import { RepositoryCard } from '../components/cards/RepositoryCard';
import { VersionStatus } from '../components/cards/VersionStatus';
import { ChartContainer } from '../components/charts/ChartContainer';
import { ReleaseChart } from '../components/charts/ReleaseChart';
import { PageHeader } from '../components/layout/PageHeader';
import { PageLayout } from '../components/layout/PageLayout';
import { useRepositoryFilter } from '../context/RepositoryFilterContext';
import { getReleases } from '../data/releases';
import { getRepositories } from '../data/repositories';
import { calculateMonthlyReleaseStats } from '../data/transforms/calculateMonthlyStats';
import { groupByRepository } from '../data/transforms/groupByRepository';
import {
  getLatestBetaRelease,
  getLatestStableRelease,
} from '../utils/versionUtils';

export const Route = createFileRoute('/releases')({
  component: Releases,
  loader: async () => {
    const [releases, repositories] = await Promise.all([
      getReleases(),
      getRepositories(),
    ]);
    return { releases, repositories };
  },
});

function Releases() {
  const { releases, repositories } = Route.useLoaderData();
  const { showFavoritesOnly } = useRepositoryFilter();

  // Filter repositories based on favorites setting
  const filteredRepositories = showFavoritesOnly
    ? repositories.filter((repo) => repo.favorite)
    : repositories;

  // Group releases by repository, filtering out drafts and sorting by date
  const releasesByRepo = groupByRepository(
    filteredRepositories,
    releases,
    (release) => !release.draft,
    (a, b) =>
      new Date(b.published_at || b.created_at).getTime() -
      new Date(a.published_at || a.created_at).getTime(),
  );

  return (
    <PageLayout>
      <PageHeader
        title="Releases"
        description={`Track releases across ${filteredRepositories.length} monitored repositories`}
      />

      {filteredRepositories.map((repo) => {
        const repoReleases = releasesByRepo[repo.full_name] || [];
        if (repoReleases.length === 0) return null;

        const monthlyStats = calculateMonthlyReleaseStats(repoReleases);
        const latestStableRelease = getLatestStableRelease(repoReleases);
        const latestBetaRelease = getLatestBetaRelease(repoReleases);

        return (
          <RepositoryCard key={repo.id} repository={repo}>
            <VersionStatus
              latestStable={latestStableRelease}
              latestBeta={latestBetaRelease}
            />
            <ChartContainer title="Monthly Release Activity">
              <ReleaseChart data={monthlyStats} />
            </ChartContainer>
          </RepositoryCard>
        );
      })}
    </PageLayout>
  );
}
