import { createFileRoute } from '@tanstack/react-router';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo } from 'react';

import { Package } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { PageLayout } from '../components/layout/PageLayout';
import { useRepositoryFilter } from '../context/RepositoryFilterContext';
import { getPackages } from '../data/packages';
import { getRepositories } from '../data/repositories';
import { getVersionColorClass } from '../utils/packageUtils';

const coreRowModel = getCoreRowModel();

export const Route = createFileRoute('/packages')({
  component: PackagesPage,
  loader: async () => {
    const [packages, repositories] = await Promise.all([
      getPackages(),
      getRepositories(),
    ]);
    return { packages, repositories };
  },
});

const columnHelper = createColumnHelper<PackageRow>();

interface PackageRow {
  packageName: string;
  [repoName: string]: string;
}

interface TrackedPackage {
  name: string;
  targetVersion?: string;
}

const TRACKED_PACKAGES: TrackedPackage[] = [
  { name: 'node', targetVersion: '24.0.0' },
  { name: 'yarn', targetVersion: '4.0.0' },
  { name: '@swc/core', targetVersion: '1.15.18' },
  { name: '@rsbuild/core', targetVersion: '1.5.0' },
  { name: 'rsbuild-config-cozy-app', targetVersion: '0.7.1' },
  { name: 'eslint-config-cozy-app', targetVersion: '7.0.0' },
  { name: 'jest', targetVersion: '30.0.0' },
  { name: 'eslint', targetVersion: '10.0.0' },
  { name: 'typescript', targetVersion: '5.9.3' },
  { name: 'react', targetVersion: '18.0.0' },
  { name: 'cozy-client' },
  { name: 'cozy-ui' },
  { name: 'cozy-ui-plus' },
  { name: 'cozy-bar' },
  { name: 'cozy-sharing' },
  { name: 'cozy-search' },
  { name: 'cozy-viewer' },
  { name: 'cozy-harvest-lib' },
  { name: 'cozy-dataproxy-lib' }
];

function PackagesPage() {
  const { packages, repositories } = Route.useLoaderData();
  const { showFavoritesOnly } = useRepositoryFilter();

  const filteredPackages = useMemo(
    () =>
      showFavoritesOnly
        ? packages.filter((pkg) => {
            const repo = repositories.find(
              (r) => r.full_name === pkg.repo_full_name,
            );
            return repo?.favorite;
          })
        : packages,
    [showFavoritesOnly, packages, repositories],
  );

  const tableData: PackageRow[] = useMemo(() => TRACKED_PACKAGES.map((pkg) => {
    const row: PackageRow = { packageName: pkg.name };

    filteredPackages.forEach((repoData) => {
      let version: string | null = null;

      // Handle special cases for node and yarn
      if (pkg.name === 'node') {
        version = repoData.nodeVersion;
      } else if (pkg.name === 'yarn') {
        version = repoData.yarnVersion;
      } else {
        // Check both dependencies and devDependencies for regular packages
        version =
          repoData.dependencies[pkg.name] || repoData.devDependencies[pkg.name];
      }

      row[repoData.repo_name] = version || '-';
    });

    return row;
  }), [filteredPackages]);

  // Create columns dynamically based on repositories
  const columns = useMemo(() => [
    columnHelper.accessor('packageName', {
      header: 'Package',
      cell: (info) => (
        <div className="font-semibold text-white">{info.getValue()}</div>
      ),
    }),
    columnHelper.display({
      id: 'target',
      header: 'Target',
      cell: (info) => {
        const packageName = info.row.original.packageName;
        const trackedPackage = TRACKED_PACKAGES.find(
          (p) => p.name === packageName,
        );
        return (
          <div className="font-mono text-sm text-gray-400">
            {trackedPackage?.targetVersion || '-'}
          </div>
        );
      },
    }),
    ...filteredPackages.map((repo) =>
      columnHelper.accessor(repo.repo_name, {
        header: repo.repo_name,
        cell: (info) => {
          const value = info.getValue();
          const packageName = info.row.original.packageName;
          const trackedPackage = TRACKED_PACKAGES.find(
            (p) => p.name === packageName,
          );

          const textColor = getVersionColorClass(
            value,
            trackedPackage?.targetVersion,
          );

          return (
            <div className={`${textColor} font-mono text-sm`}>{value}</div>
          );
        },
      }),
    ),
  ], [filteredPackages]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: coreRowModel,
  });

  return (
    <PageLayout>
      <PageHeader
        title="Packages"
        description={`Compare package versions across ${filteredPackages.length} repositories`}
      />

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      scope="col"
                      className="px-6 py-4 text-left text-sm font-semibold text-gray-300 border-b border-slate-600"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`${
                    idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/50'
                  } hover:bg-slate-700/50 transition-colors`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-6 py-4 border-b border-slate-700/50"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-sm text-gray-400">
        <Package className="w-4 h-4" aria-hidden="true" />
        <span>
          Tracking {TRACKED_PACKAGES.length} key packages across{' '}
          {filteredPackages.length} repositories
        </span>
      </div>
    </PageLayout>
  );
}
