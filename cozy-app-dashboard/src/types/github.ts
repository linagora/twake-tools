export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  topics: string[];
  license: {
    key: string;
    name: string;
    spdx_id: string;
  } | null;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  favorite?: boolean;
}

export interface GitHubRelease {
  id: number;
  repo_full_name: string;
  repo_name: string;
  tag_name: string;
  name: string | null;
  body: string | null;
  prerelease: boolean;
  draft: boolean;
  created_at: string;
  published_at: string | null;
  html_url: string;
  author: {
    login: string;
    avatar_url: string;
  };
}

export interface GitHubWorkflowRun {
  id: number;
  repo_full_name: string;
  repo_name: string;
  name: string;
  workflow_id: number;
  status: string;
  conclusion: string | null;
  run_number: number;
  event: string;
  created_at: string;
  updated_at: string;
  run_started_at: string | null;
  duration_seconds: number;
  html_url: string;
  head_branch: string;
}

export interface PackageData {
  repo_full_name: string;
  repo_name: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  nodeVersion: string | null;
  yarnVersion: string | null;
  packageManager: string | null;
}
