const GITHUB_API = "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN ?? "";

interface GithubUser {
  login: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  blog: string | null;
  company: string | null;
  avatar_url: string | null;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  hireable: boolean | null;
  twitter_username: string | null;
}

interface GithubRepo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  created_at: string;
  size: number;
  fork: boolean;
}

export interface GitHubAnalysisResult {
  username: string;
  score: number;
  profileData: {
    name: string | null;
    avatarUrl: string | null;
    bio: string | null;
    location: string | null;
    company: string | null;
    blog: string | null;
    followers: number;
    following: number;
    publicRepos: number;
    createdAt: string;
    hireable: boolean | null;
    url: string;
  };
  repos: {
    name: string;
    description: string | null;
    url: string;
    language: string | null;
    stars: number;
    forks: number;
    updatedAt: string;
    hasReadme: boolean;
  }[];
  breakdown: {
    profile: number;
    repos: number;
    activity: number;
  };
  strengths: string[];
  recommendations: string[];
}

async function githubFetch(path: string): Promise<unknown> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 404) throw new Error("GitHub user not found.");
  if (res.status === 403) throw new Error("GitHub API rate limit reached. Add a GITHUB_TOKEN or try later.");
  if (!res.ok) throw new Error(`GitHub API error (${res.status}).`);
  return res.json();
}

export async function analyzeGitHub(username: string): Promise<GitHubAnalysisResult> {
  const clean = username.replace(/^@/, "").trim();
  if (!clean) throw new Error("A GitHub username is required.");

  const [userRaw, reposRaw, eventsRaw] = await Promise.all([
    githubFetch(`/users/${clean}`) as Promise<GithubUser>,
    githubFetch(`/users/${clean}/repos?sort=updated&per_page=100&type=owner`) as Promise<GithubRepo[]>,
    githubFetch(`/users/${clean}/events/public?per_page=100`).catch(() => []),
  ]);

  // Recent activity: unique days with events in the last 90 days.
  const now = Date.now();
  const activeDays = new Set(
    (eventsRaw as { created_at?: string }[]).filter(
      (e) => e.created_at && now - new Date(e.created_at).getTime() < 90 * 86400_000,
    ).map((e) => e.created_at!.slice(0, 10)),
  ).size;

  const repos = reposRaw
    .filter((r) => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 10)
    .map((r) => ({
      name: r.name,
      description: r.description,
      url: r.html_url,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      updatedAt: r.updated_at,
      hasReadme: Boolean(r.description) || r.size > 50,
    }));

  // Profile score.
  let profile = 0;
  if (userRaw.bio) profile += 20;
  if (userRaw.location) profile += 10;
  if (userRaw.company || userRaw.blog) profile += 10;
  if (userRaw.hireable) profile += 10;
  if (userRaw.followers >= 10) profile += 15;
  else if (userRaw.followers >= 3) profile += 8;
  if (userRaw.public_repos >= 8) profile += 15;
  else if (userRaw.public_repos >= 4) profile += 8;
  if (userRaw.twitter_username) profile += 5;
  profile += userRaw.following >= 10 ? 5 : 0;
  profile += userRaw.public_repos >= 20 ? 10 : 0;

  // Repo score.
  const notable = repos.filter((r) => r.stars >= 10 || r.forks >= 5);
  let repoScore = 0;
  if (repos.length >= 6) repoScore += 20;
  else if (repos.length >= 3) repoScore += 12;
  repoScore += Math.min(20, repos.filter((r) => r.description).length * 4);
  repoScore += Math.min(20, repos.filter((r) => r.language).length * 3);
  repoScore += Math.min(25, notable.length * 8);
  repoScore += Math.min(15, repos.filter((r) => r.stars > 0).length * 3);

  // Activity score.
  let activity = 0;
  if (activeDays >= 20) activity = 100;
  else if (activeDays >= 10) activity = 80;
  else if (activeDays >= 5) activity = 60;
  else if (activeDays >= 2) activity = 40;
  else if (activeDays >= 1) activity = 25;

  const score = Math.round(profile * 0.3 + repoScore * 0.4 + activity * 0.3);

  const strengths: string[] = [];
  const recommendations: string[] = [];

  if (userRaw.bio) strengths.push("You have a bio that tells visitors who you are.");
  else recommendations.push("Add a short bio describing your focus (e.g. \"CS student building AI apps\").");

  if (repos.filter((r) => r.description).length >= 3) strengths.push("Most projects have clear descriptions.");
  else recommendations.push("Add a one-line description to each repository — recruiters scan these.");

  if (notable.length > 0) strengths.push(`You have ${notable.length} notable project(s) with stars/forks.`);
  else recommendations.push("Build 1-2 polished projects with READMEs, screenshots, and live demos.");

  if (activeDays >= 10) strengths.push("You contribute consistently — great signal for recruiters.");
  else recommendations.push("Commit regularly (aim for a few days a week) so your profile shows active work.");

  if (repos.length >= 6) strengths.push("Good number of public repositories.");
  else recommendations.push("Aim for at least 6 public repos covering varied technologies.");

  if (strengths.length === 0) strengths.push("Your profile is a good starting point.");
  if (recommendations.length === 0) recommendations.push("Keep building and sharing your work publicly.");

  return {
    username: clean,
    score,
    profileData: {
      name: userRaw.name,
      avatarUrl: userRaw.avatar_url,
      bio: userRaw.bio,
      location: userRaw.location,
      company: userRaw.company,
      blog: userRaw.blog,
      followers: userRaw.followers,
      following: userRaw.following,
      publicRepos: userRaw.public_repos,
      createdAt: userRaw.created_at,
      hireable: userRaw.hireable,
      url: userRaw.html_url,
    },
    repos,
    breakdown: { profile, repos: repoScore, activity },
    strengths,
    recommendations,
  };
}
