import { createFileRoute } from '@tanstack/react-router';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { RepositoryCard } from '../components/cards/RepositoryCard';
import { StatCard } from '../components/cards/StatCard';
import { ChartContainer } from '../components/charts/ChartContainer';
import { WorkflowChart } from '../components/charts/WorkflowChart';
import { PageHeader } from '../components/layout/PageHeader';
import { PageLayout } from '../components/layout/PageLayout';
import { useRepositoryFilter } from '../context/RepositoryFilterContext';
import { getRepositories } from '../data/repositories';
import { calculateWorkflowMonthlyStats } from '../data/transforms/calculateMonthlyStats';
import { calculateWorkflowStats } from '../data/transforms/calculateWorkflowStats';
import { groupByRepository } from '../data/transforms/groupByRepository';
import { getWorkflowRuns } from '../data/workflow-runs';

export const Route = createFileRoute('/cicd')({
  component: CICDDashboard,
  loader: async () => {
    const [workflowRuns, repositories] = await Promise.all([
      getWorkflowRuns(),
      getRepositories(),
    ]);
    return { workflowRuns, repositories };
  },
});

function CICDDashboard() {
  const { workflowRuns, repositories } = Route.useLoaderData();
  const { showFavoritesOnly } = useRepositoryFilter();

  // Filter repositories based on favorites setting
  const filteredRepositories = showFavoritesOnly
    ? repositories.filter((repo) => repo.favorite)
    : repositories;

  // Group workflow runs by repository and sort by date
  const runsByRepo = groupByRepository(
    filteredRepositories,
    workflowRuns,
    undefined,
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return (
    <PageLayout>
      <PageHeader
        title="CI/CD"
        description="GitHub Actions workflow run times and performance metrics"
      />

      {filteredRepositories.map((repo) => {
        const repoRuns = runsByRepo[repo.full_name] || [];
        if (repoRuns.length === 0) return null;

        const stats = calculateWorkflowStats(repoRuns);
        const monthlyData = calculateWorkflowMonthlyStats(repoRuns);

        return (
          <RepositoryCard key={repo.id} repository={repo}>
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                icon={<Clock className="w-4 h-4 text-gray-400" />}
                label="Avg Duration"
                value={`${stats.avgDuration}m`}
              />
              <StatCard
                icon={<CheckCircle className="w-4 h-4 text-green-400" />}
                label="Success Rate"
                value={`${stats.successRate}%`}
                valueColor="text-green-400"
              />
              <StatCard
                icon={<CheckCircle className="w-4 h-4 text-green-400" />}
                label="Successful"
                value={stats.successful}
              />
              <StatCard
                icon={<XCircle className="w-4 h-4 text-red-400" />}
                label="Failed"
                value={stats.failed}
              />
            </div>

            <ChartContainer title="Average Workflow Duration by Month">
              <WorkflowChart data={monthlyData} />
            </ChartContainer>
          </RepositoryCard>
        );
      })}
    </PageLayout>
  );
}
