export type GitHubUser = {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
};

export type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  fork: boolean;
  archived: boolean;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  size: number;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
};

type GitHubCommit = {
  commit: {
    author: {
      date: string;
    } | null;
    message: string;
  };
};

type GitHubEvent = {
  type: string;
  created_at: string;
  repo?: {
    name: string;
  };
  payload?: {
    commits?: {
      message?: string;
    }[];
  };
};

export type RepoSignal = {
  name: string;
  commits: number;
  abandoned: boolean;
  developed: boolean;
  finished: boolean;
  architectureScore: number;
  aiScore: number;
};

export type AnalysisReport = {
  user: GitHubUser;
  repos: GitHubRepo[];
  sampledCommits: GitHubCommit[];
  repoSignals: RepoSignal[];
  sanity: number;
  sanityClass: string;
  risk: string;
  prognosis: string;
  recommendation: string;
  abandonment: {
    total: number;
    lowCommit: number;
    abandoned: number;
    survivalRate: number;
  };
  shinyObject: {
    created: number;
    developed: number;
    finished: number;
    level: "Baixa" | "Moderada" | "Grave" | "Terminal";
    score: number;
  };
  sleep: {
    lateNight: number;
    forbiddenHours: number;
    weekends: number;
    diagnosis: string;
    hourly: { hour: string; commits: number }[];
  };
  aiDependency: {
    score: number;
    level: string;
    hits: string[];
    diagnosis: string;
  };
  architecture: {
    score: number;
    level: string;
    suspects: string[];
  };
  profile: string;
  uselessStats: {
    namingMinutes: number;
    refactorHours: number;
    coffees: number;
    tinyBugPromises: number;
  };
  radar: { metric: string; value: number }[];
  timeline: { label: string; value: number; color: string }[];
};

const GITHUB_API = "https://api.github.com";
const AI_TERMS = ["claude.md", "copilot", "openai", "gemini", "cursor", " ai ", "agent", "gpt"];
const ARCH_TERMS = ["rewrite", "refactor", "next", "v2", "v3", "final", "final-final", "new", "old", "legacy"];

async function githubFetch<T>(path: string, token?: string): Promise<T> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${GITHUB_API}${path}`, {
    headers
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Paciente não encontrado no cadastro internacional de devs.");
    }
    if (response.status === 403) {
      throw new Error(
        "O laboratório bateu no limite público da API do GitHub. Use um token opcional ou tente novamente em alguns minutos."
      );
    }
    if (response.status === 401) {
      throw new Error("Token recusado pelo GitHub. O laboratório não aceita crachá falsificado.");
    }
    throw new Error("A máquina de ressonância GitHubiana falhou. Tente novamente.");
  }

  return response.json();
}

function daysSince(date: string | null): number {
  if (!date) return 9999;
  return Math.max(0, (Date.now() - new Date(date).getTime()) / 86400000);
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function scoreTerms(source: string, terms: string[]): { score: number; hits: string[] } {
  const haystack = ` ${source.toLowerCase()} `;
  const hits = terms.filter((term) => haystack.includes(term));
  return { score: hits.length, hits };
}

function classifySanity(score: number): string {
  if (score >= 80) return "Humano funcional";
  if (score >= 60) return "Dev comum";
  if (score >= 40) return "Programador de madrugada";
  if (score >= 20) return "Indie hacker crônico";
  return "Caso irreversível";
}

function classifyShiny(score: number): AnalysisReport["shinyObject"]["level"] {
  if (score < 28) return "Baixa";
  if (score < 52) return "Moderada";
  if (score < 75) return "Grave";
  return "Terminal";
}

function pickProfile(report: Pick<AnalysisReport, "sleep" | "shinyObject" | "aiDependency" | "architecture" | "abandonment">): string {
  if (report.aiDependency.score >= 65) return "O Domador de IA";
  if (report.sleep.weekends >= 10) return "O Destruidor de Finais de Semana";
  if (report.sleep.forbiddenHours >= 5) return "O Madrugador";
  if (report.architecture.score >= 65) return "O Refatorador Compulsivo";
  if (report.shinyObject.score >= 70) return "O Iniciador";
  if (report.abandonment.survivalRate >= 72) return "O Terminador";
  return "O Startup Founder";
}

function buildSleepDiagnosis(forbiddenHours: number, lateNight: number, weekends: number): string {
  if (forbiddenHours > 10) return "Seu relógio biológico foi removido e substituído por um cron job.";
  if (forbiddenHours > 4) return "Detectamos commits em horários proibidos pela ONU.";
  if (lateNight > 10) return "Você aparentemente não dorme; apenas alterna branches.";
  if (weekends > 12) return "Seu sábado tem cara de ambiente de produção.";
  return "Sono tecnicamente presente, emocionalmente em beta.";
}

function recommendationFor(score: number, shiny: string, forbidden: number): string {
  if (score < 20) return "Entregue o teclado a um adulto responsável e afaste-se do SaaS.";
  if (forbidden > 5) return "Pare de criar SaaS às 3 da manhã.";
  if (shiny === "Terminal") return "Finalize um README antes de abrir outro repositório.";
  if (score < 60) return "Prescrevemos sol, água e um issue fechado por dia.";
  return "Continue assim, mas mantenha café fora do alcance depois das 22h.";
}

function eventToCommits(events: GitHubEvent[]): GitHubCommit[] {
  return events.flatMap((event) => {
    if (event.type !== "PushEvent") return [];
    const commits = event.payload?.commits?.length ? event.payload.commits : [{ message: "push misterioso sem mensagem" }];
    return commits.map((commit) => ({
      commit: {
        author: {
          date: event.created_at
        },
        message: commit.message ?? "commit sem depoimento"
      }
    }));
  });
}

export async function analyzeGitHubSanity(username: string, token?: string): Promise<AnalysisReport> {
  const cleanUsername = username.trim().replace(/^@/, "");
  if (!cleanUsername) throw new Error("Digite um username para iniciar o exame.");
  const cleanToken = token?.trim() || undefined;

  const [user, repos, events] = await Promise.all([
    githubFetch<GitHubUser>(`/users/${encodeURIComponent(cleanUsername)}`, cleanToken),
    githubFetch<GitHubRepo[]>(`/users/${encodeURIComponent(cleanUsername)}/repos?per_page=100&sort=updated&type=owner`, cleanToken),
    githubFetch<GitHubEvent[]>(`/users/${encodeURIComponent(cleanUsername)}/events/public?per_page=100`, cleanToken)
  ]);

  const sampledCommits = eventToCommits(events);
  const commitCountByRepo = new Map<string, number>();
  events.forEach((event) => {
    if (event.type !== "PushEvent" || !event.repo?.name) return;
    const commits = Math.max(1, event.payload?.commits?.length ?? 1);
    commitCountByRepo.set(event.repo.name, (commitCountByRepo.get(event.repo.name) ?? 0) + commits);
  });

  const repoSignals = repos.map((repo) => {
    const text = [repo.name, repo.description ?? "", repo.language ?? ""].join(" ");
    const commits = commitCountByRepo.get(repo.full_name) ?? 0;
    const age = daysSince(repo.created_at);
    const stale = daysSince(repo.pushed_at ?? repo.updated_at);
    const abandoned = stale > 240 && !repo.archived && repo.stargazers_count < 5;
    const developed = commits >= 3 || repo.size > 240 || repo.stargazers_count > 2 || stale < 45;
    const finished =
      repo.archived ||
      /done|complete|stable|1\.0|release|finished|finalizado/i.test(text) ||
      (developed && stale < 90 && age > 45);
    const ai = scoreTerms(text, AI_TERMS);
    const arch = scoreTerms(text, ARCH_TERMS);
    const architectureScore = arch.score + (/v\d/i.test(repo.name) ? 1 : 0) + (repo.fork ? 1 : 0);

    return {
      name: repo.name,
      commits,
      abandoned,
      developed,
      finished,
      architectureScore,
      aiScore: ai.score
    };
  });

  const hourlyBuckets = Array.from({ length: 24 }, (_, hour) => ({ hour: String(hour).padStart(2, "0"), commits: 0 }));
  let lateNight = 0;
  let forbiddenHours = 0;
  let weekends = 0;

  sampledCommits.forEach((commit) => {
    const dateString = commit.commit.author?.date;
    if (!dateString) return;
    const date = new Date(dateString);
    const hour = date.getHours();
    const day = date.getDay();
    hourlyBuckets[hour].commits += 1;
    if (hour < 6) lateNight += 1;
    if (hour >= 2 && hour <= 5) forbiddenHours += 1;
    if (day === 0 || day === 6) weekends += 1;
  });

  const lowCommit = repoSignals.filter((repo) => repo.commits > 0 && repo.commits <= 3).length;
  const abandoned = repoSignals.filter((repo) => repo.abandoned).length;
  const developed = repoSignals.filter((repo) => repo.developed).length;
  const finished = repoSignals.filter((repo) => repo.finished).length;
  const total = repos.length;
  const survivalRate = total ? clamp((developed / total) * 100) : 0;

  const activityIrregularity = sampledCommits.length
    ? clamp((Math.max(...hourlyBuckets.map((h) => h.commits)) / sampledCommits.length) * 100)
    : 28;
  const excessProjectsPenalty = Math.max(0, total - 18) * 0.8;
  const abandonedPenalty = total ? (abandoned / total) * 24 : 0;
  const sanity = clamp(
    100 -
      lateNight * 1.6 -
      forbiddenHours * 2.8 -
      weekends * 0.95 -
      lowCommit * 1.15 -
      abandonedPenalty -
      excessProjectsPenalty -
      activityIrregularity * 0.16
  );

  const shinyScore = clamp((total - developed) * 3.1 + (developed - finished) * 4.2 + Math.max(0, total - 20) * 1.8);
  const aiSources = repos.map((repo) => [repo.name, repo.description ?? "", repo.language ?? ""].join(" ")).join(" ");
  const aiTerms = scoreTerms(aiSources, AI_TERMS);
  const aiDependencyScore = clamp(aiTerms.score * 18 + repoSignals.reduce((sum, repo) => sum + repo.aiScore, 0) * 5);
  const architectureSuspects = repos
    .filter((repo) => scoreTerms(`${repo.name} ${repo.description ?? ""}`, ARCH_TERMS).score > 0 || /v\d/i.test(repo.name))
    .map((repo) => repo.name)
    .slice(0, 8);
  const architectureScore = clamp(
    repoSignals.reduce((sum, repo) => sum + repo.architectureScore, 0) * 10 + Math.max(0, architectureSuspects.length - 2) * 8
  );

  const sleepDiagnosis = buildSleepDiagnosis(forbiddenHours, lateNight, weekends);
  const shinyLevel = classifyShiny(shinyScore);
  const aiLevel = aiDependencyScore < 25 ? "Baixa" : aiDependencyScore < 55 ? "Moderada" : aiDependencyScore < 80 ? "Grave" : "Robótica";
  const architectureLevel = architectureScore < 35 ? "Estável" : architectureScore < 70 ? "Preocupante" : "Crítico";
  const risk = sanity >= 70 ? "Baixo" : sanity >= 45 ? "Moderado" : sanity >= 20 ? "Alto" : "Existencial";
  const prognosis =
    sanity < 35
      ? "Você abrirá outro projeto em menos de 72 horas."
      : shinyScore > 65
        ? "Há 81% de chance de nascer um boilerplate ainda hoje."
        : "Sobrevivência provável, desde que nenhum framework novo seja anunciado.";

  const partial = {
    sleep: { lateNight, forbiddenHours, weekends, diagnosis: sleepDiagnosis, hourly: hourlyBuckets },
    shinyObject: { created: total, developed, finished, level: shinyLevel, score: shinyScore },
    aiDependency: {
      score: aiDependencyScore,
      level: aiLevel,
      hits: Array.from(new Set(aiTerms.hits.map((hit) => hit.trim()))),
      diagnosis:
        aiDependencyScore < 25
          ? "Você ainda programa."
          : aiDependencyScore < 55
            ? "Você programa às vezes."
            : "Os robôs programam por você."
    },
    architecture: {
      score: architectureScore,
      level: architectureLevel,
      suspects: architectureSuspects
    },
    abandonment: { total, lowCommit, abandoned, survivalRate }
  };

  const report: AnalysisReport = {
    user,
    repos,
    sampledCommits,
    repoSignals,
    sanity,
    sanityClass: classifySanity(sanity),
    risk,
    prognosis,
    recommendation: recommendationFor(sanity, shinyLevel, forbiddenHours),
    ...partial,
    profile: pickProfile(partial),
    uselessStats: {
      namingMinutes: Math.round(total * 17 + architectureSuspects.length * 43 + user.public_repos * 2.4),
      refactorHours: Math.round(architectureScore * 1.7 + lowCommit * 4 + sampledCommits.length * 0.16),
      coffees: Math.round(sampledCommits.length * 0.42 + lateNight * 1.8 + weekends * 0.7),
      tinyBugPromises: Math.round(sampledCommits.length * 0.31 + total * 1.9)
    },
    radar: [
      { metric: "Sanidade", value: sanity },
      { metric: "Abandono", value: clamp((abandoned / Math.max(total, 1)) * 100) },
      { metric: "IA", value: aiDependencyScore },
      { metric: "Arquitetura", value: architectureScore },
      { metric: "Madrugada", value: clamp((forbiddenHours / Math.max(sampledCommits.length, 1)) * 180) }
    ],
    timeline: [
      { label: "Criados", value: total, color: "#2dd4bf" },
      { label: "Desenvolvidos", value: developed, color: "#a3e635" },
      { label: "Finalizados", value: finished, color: "#facc15" },
      { label: "Abandonados", value: abandoned, color: "#fb7185" }
    ]
  };

  return report;
}
