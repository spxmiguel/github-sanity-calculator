"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toPng } from "html-to-image";
import {
  Activity,
  AlertTriangle,
  Brain,
  Clock3,
  ClipboardPlus,
  Dna,
  Download,
  FlaskConical,
  GitBranch,
  KeyRound,
  Loader2,
  Microscope,
  RefreshCcw,
  Search,
  Share2,
  Sparkles,
  Stethoscope,
  TestTube2
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import clsx from "clsx";
import { AnalysisReport, analyzeGitHubSanity } from "@/lib/githubSanity";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const loadingSteps = [
  "Conectando eletrodos no histórico público...",
  "Medindo tremores em commits de madrugada...",
  "Lendo eventos públicos sem gastar a API inteira...",
  "Consultando o manual médico dos frameworks...",
  "Gerando laudo com 0% de rigor científico..."
];

type ReportMeta = {
  cachedAt: number;
  fromCache: boolean;
};

type CachedReport = {
  cachedAt: number;
  report: AnalysisReport;
};

function cacheKey(username: string) {
  return `github-sanity-report:${username.trim().replace(/^@/, "").toLowerCase()}`;
}

function formatRelativeCacheTime(timestamp: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `há ${hours} h`;
}

function formatNextRefresh(timestamp: number) {
  const minutes = Math.max(0, Math.ceil((timestamp - Date.now()) / 60000));
  if (minutes <= 1) return "em instantes";
  if (minutes < 60) return `em ${minutes} min`;
  const hours = Math.ceil(minutes / 60);
  return `em ${hours} h`;
}

function readCachedReport(username: string): CachedReport | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(username));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedReport;
    if (!parsed.cachedAt || !parsed.report?.user?.login) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedReport(username: string, report: AnalysisReport) {
  const payload: CachedReport = {
    cachedAt: Date.now(),
    report
  };
  window.localStorage.setItem(cacheKey(username), JSON.stringify(payload));
  return payload;
}

function StatCard({
  label,
  value,
  detail,
  tone = "emerald"
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "emerald" | "rose" | "amber" | "cyan";
}) {
  const tones = {
    emerald: "border-emerald-400/25 bg-emerald-400/8 text-emerald-200",
    rose: "border-rose-400/25 bg-rose-400/8 text-rose-200",
    amber: "border-amber-300/25 bg-amber-300/8 text-amber-100",
    cyan: "border-cyan-300/25 bg-cyan-300/8 text-cyan-100"
  };

  return (
    <div className={clsx("rounded-lg border p-4 shadow-lg shadow-black/20", tones[tone])}>
      <p className="text-xs uppercase tracking-[0.22em] text-white/45">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm leading-5 text-white/62">{detail}</p>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const color = value >= 70 ? "#34d399" : value >= 40 ? "#facc15" : "#fb7185";
  const angle = (value / 100) * 180;

  return (
    <div className="relative mx-auto aspect-[2/1] w-full max-w-[360px] overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 aspect-[2/1] rounded-t-full border-[18px] border-b-0 border-white/10" />
      <div
        className="absolute inset-x-0 bottom-0 aspect-[2/1] rounded-t-full border-[18px] border-b-0"
        style={{
          borderColor: `${color} transparent transparent transparent`,
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)"
        }}
      />
      <div
        className="absolute bottom-0 left-1/2 h-1.5 w-[42%] origin-left rounded-full bg-white shadow-[0_0_24px_rgba(255,255,255,0.8)] transition-transform duration-700"
        style={{ transform: `rotate(${angle + 180}deg)` }}
      />
      <div className="absolute bottom-[-10px] left-1/2 h-7 w-7 -translate-x-1/2 rounded-full border border-white/20 bg-neutral-950" />
      <div className="absolute inset-x-0 bottom-5 text-center">
        <p className="text-6xl font-black text-white">{value}%</p>
        <p className="mt-1 text-xs uppercase tracking-[0.26em] text-white/48">sanidade mental</p>
      </div>
    </div>
  );
}

function LoadingLab({ step }: { step: string }) {
  return (
    <div className="scanline rounded-lg border border-emerald-300/20 bg-black/42 p-6">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-lg border border-emerald-300/30 bg-emerald-300/10">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-200" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-emerald-200/70">analisando cérebro do desenvolvedor</p>
          <p className="mt-2 text-xl font-bold text-white">{step}</p>
        </div>
      </div>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/8">
        <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-rose-300" />
      </div>
    </div>
  );
}

function Certificate({ report }: { report: AnalysisReport }) {
  return (
    <div
      id="sanity-certificate"
      className="relative overflow-hidden rounded-lg border border-emerald-300/30 bg-[#07100d] p-6 shadow-2xl shadow-emerald-950/40"
    >
      <div className="absolute right-4 top-4 rounded border border-rose-300/40 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-rose-200">
        laudo oficial
      </div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <img
          src={report.user.avatar_url}
          alt={`Avatar de ${report.user.login}`}
          className="h-20 w-20 rounded-lg border border-white/20 bg-white/10 object-cover"
        />
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-200/60">GitHub Sanity Calculator</p>
          <h2 className="mt-2 text-3xl font-black text-white">@{report.user.login}</h2>
          <p className="mt-1 text-sm text-white/58">Perfil psicológico: {report.profile}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-white/42">Sanidade</p>
          <p className="mt-2 text-5xl font-black text-emerald-200">{report.sanity}%</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-white/42">Diagnóstico</p>
          <p className="mt-2 text-2xl font-black text-white">{report.sanityClass}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-white/42">Risco</p>
          <p className="mt-2 text-2xl font-black text-rose-200">{report.risk}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-white/42">IA</p>
          <p className="mt-2 text-2xl font-black text-cyan-200">{report.aiDependency.level}</p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-amber-200/20 bg-amber-200/8 p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-amber-100/60">Prognóstico</p>
        <p className="mt-2 text-lg font-bold text-white">{report.prognosis}</p>
      </div>
      <div className="mt-3 rounded-lg border border-emerald-200/20 bg-emerald-200/8 p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-emerald-100/60">Recomendação médica</p>
        <p className="mt-2 text-lg font-bold text-white">{report.recommendation}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [username, setUsername] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [reportMeta, setReportMeta] = useState<ReportMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [error, setError] = useState("");
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    setGithubToken(window.localStorage.getItem("github-sanity-token") ?? "");
  }, []);

  useEffect(() => {
    if (!loading) return;
    const interval = window.setInterval(() => {
      setLoadingIndex((current) => (current + 1) % loadingSteps.length);
    }, 1150);
    return () => window.clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (!report) {
      setChartsReady(false);
      return;
    }

    const timer = window.setTimeout(() => setChartsReady(true), 180);
    return () => window.clearTimeout(timer);
  }, [report]);

  const topRepos = useMemo(() => report?.repos.slice(0, 7) ?? [], [report]);

  function updateToken(value: string) {
    setGithubToken(value);
    if (value.trim()) {
      window.localStorage.setItem("github-sanity-token", value.trim());
    } else {
      window.localStorage.removeItem("github-sanity-token");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setReport(null);
    setReportMeta(null);
    setChartsReady(false);
    setLoadingIndex(0);

    const requestedUsername = username.trim().replace(/^@/, "");
    const cached = readCachedReport(requestedUsername);
    const isFresh = cached ? Date.now() - cached.cachedAt < CACHE_TTL_MS : false;

    if (cached && isFresh) {
      setReport(cached.report);
      setReportMeta({ cachedAt: cached.cachedAt, fromCache: true });
      return;
    }

    setLoading(true);

    try {
      const result = await analyzeGitHubSanity(requestedUsername, githubToken);
      const saved = writeCachedReport(requestedUsername, result);
      setReport(result);
      setReportMeta({ cachedAt: saved.cachedAt, fromCache: false });
    } catch (caught) {
      if (cached) {
        setReport(cached.report);
        setReportMeta({ cachedAt: cached.cachedAt, fromCache: true });
      }
      setError(caught instanceof Error ? caught.message : "O exame explodiu discretamente.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadCertificate() {
    const node = document.getElementById("sanity-certificate");
    if (!node || !report) return;
    const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2, backgroundColor: "#07100d" });
    const link = document.createElement("a");
    link.download = `laudo-${report.user.login}-sanidade.png`;
    link.href = dataUrl;
    link.click();
  }

  async function shareCertificate() {
    const node = document.getElementById("sanity-certificate");
    if (!node || !report) return;
    const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2, backgroundColor: "#07100d" });
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `laudo-${report.user.login}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: "Meu laudo de sanidade GitHub", files: [file] });
    } else {
      await downloadCertificate();
    }
  }

  return (
    <main className="lab-grid min-h-screen overflow-hidden">
      <div className="border-b border-emerald-300/10 bg-black/36">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-emerald-300/30 bg-emerald-300/10">
              <Brain className="h-5 w-5 text-emerald-200" />
            </div>
            <div>
              <p className="text-sm font-black text-white">GitHub Sanity Calculator</p>
              <p className="text-xs text-white/44">laboratório psicológico hacker</p>
            </div>
          </div>
          <a
            href="https://docs.github.com/rest"
            className="hidden items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/62 transition hover:border-emerald-300/40 hover:text-white sm:flex"
          >
            <GitBranch className="h-4 w-4" />
            REST API
          </a>
        </div>
      </div>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:py-12">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-300/25 bg-emerald-300/8 px-3 py-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-100">
            <FlaskConical className="h-4 w-4" />
            exame mental pseudocientífico
          </div>
          <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
            Sanidade dev, medida por sintomas públicos.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/68">
            Digite um usuário do GitHub e receba um laudo clínico absurdo baseado em repositórios, horários de commits,
            abandono de projetos, sinais de IA e arquitetura emocionalmente instável.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/48">
            Modo econômico: usa só usuário, repositórios e eventos públicos. Se a API reclamar, cole um token do GitHub sem escopos para
            aumentar o limite.
          </p>
          <p className="mt-2 inline-flex max-w-2xl items-center gap-2 text-sm leading-6 text-emerald-100/60">
            <Clock3 className="h-4 w-4 shrink-0" />
            Laudos ficam em cache por 24h por username. O laboratório só atualiza sob demanda quando a quarentena vence.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 rounded-lg border border-white/12 bg-black/34 p-3 shadow-2xl shadow-black/30">
            <div className="grid gap-3 lg:grid-cols-[1fr_0.9fr_auto]">
              <label className="relative flex-1">
                <GitBranch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/36" />
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="octocat"
                  className="h-14 w-full rounded-lg border border-white/10 bg-white/[0.06] pl-12 pr-4 text-lg font-bold text-white outline-none transition placeholder:text-white/28 focus:border-emerald-300/50 focus:bg-white/[0.08]"
                />
              </label>
              <label className="relative flex-1">
                <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/36" />
                <input
                  value={githubToken}
                  onChange={(event) => updateToken(event.target.value)}
                  placeholder="token opcional"
                  type="password"
                  autoComplete="off"
                  className="h-14 w-full rounded-lg border border-white/10 bg-white/[0.06] pl-12 pr-4 text-sm font-bold text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/50 focus:bg-white/[0.08]"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-emerald-300 px-5 font-black text-emerald-950 transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                Analisar
              </button>
            </div>
          </form>

          {error ? (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-rose-300/30 bg-rose-400/10 p-4 text-rose-100">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                {error}
                {reportMeta?.fromCache ? " Mostrei o último laudo salvo para não desperdiçar eletrodos." : ""}
              </p>
            </div>
          ) : null}
        </div>

        <div className="relative min-h-[440px] rounded-lg border border-white/10 bg-black/30 p-5 shadow-2xl shadow-black/40">
          <div className="pulse-ring absolute inset-5 rounded-full border border-emerald-300/10" />
          <div className="relative grid min-h-[400px] place-items-center rounded-lg border border-emerald-300/14 bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.12),transparent_58%)]">
            {loading ? (
              <LoadingLab step={loadingSteps[loadingIndex]} />
            ) : report ? (
              <div className="w-full px-2">
                <Gauge value={report.sanity} />
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <StatCard label="Diagnóstico" value={report.sanityClass} detail={report.profile} tone="emerald" />
                  <StatCard label="Risco" value={report.risk} detail={report.prognosis} tone="rose" />
                </div>
              </div>
            ) : (
              <div className="max-w-md text-center">
                <Microscope className="mx-auto h-16 w-16 text-emerald-200/80" />
                <p className="mt-5 text-2xl font-black text-white">A maca está pronta.</p>
                <p className="mt-3 text-white/58">Nenhum dev foi diagnosticado ainda. Isso é estatisticamente suspeito.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-y border-white/10 bg-black/40 py-3">
        <div className="ticker flex w-[200%] gap-8 whitespace-nowrap text-xs uppercase tracking-[0.24em] text-white/40">
          {Array.from({ length: 2 }).map((_, group) => (
            <div key={group} className="flex min-w-1/2 gap-8">
              <span>commit às 03:17 detectado</span>
              <span>README em observação</span>
              <span>novo projeto sem motivo aparente</span>
              <span>framework experimental no sangue</span>
              <span>café acima do recomendado</span>
            </div>
          ))}
        </div>
      </div>

      {report ? (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-emerald-200/60">relatório completo</p>
              <h2 className="mt-2 text-4xl font-black text-white">Paciente @{report.user.login}</h2>
              {reportMeta ? (
                <p className="mt-2 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white/58">
                  <Clock3 className="h-4 w-4 text-emerald-200" />
                  {reportMeta.fromCache ? "Laudo em cache" : "Laudo atualizado"} {formatRelativeCacheTime(reportMeta.cachedAt)}.
                  Próxima atualização {formatNextRefresh(reportMeta.cachedAt + CACHE_TTL_MS)}.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={shareCertificate}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 font-bold text-cyan-100 transition hover:bg-cyan-300/18"
              >
                <Share2 className="h-5 w-5" />
                Compartilhar imagem
              </button>
              <button
                onClick={downloadCertificate}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 font-bold text-emerald-100 transition hover:bg-emerald-300/18"
              >
                <Download className="h-5 w-5" />
                Baixar cartão
              </button>
              <button
                onClick={() => {
                  setReport(null);
                  setReportMeta(null);
                  setUsername("");
                  setError("");
                  setChartsReady(false);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-white/14 bg-white/[0.06] px-4 py-3 font-bold text-white/76 transition hover:bg-white/[0.1]"
              >
                <RefreshCcw className="h-5 w-5" />
                Analisar outro paciente
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Índice de abandono"
              value={`${100 - report.abandonment.survivalRate}%`}
              detail={`${report.abandonment.abandoned} abandonados, ${report.abandonment.lowCommit} quase sem commits`}
              tone="rose"
            />
            <StatCard
              label="Objeto brilhante"
              value={report.shinyObject.level}
              detail={`${report.shinyObject.created} criados, ${report.shinyObject.finished} finalizados`}
              tone="amber"
            />
            <StatCard
              label="Dependência de IA"
              value={report.aiDependency.level}
              detail={report.aiDependency.diagnosis}
              tone="cyan"
            />
            <StatCard
              label="Arquitetura"
              value={report.architecture.level}
              detail={`${report.architecture.suspects.length} nomes suspeitos no prontuário`}
              tone="emerald"
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.86fr]">
            <div className="rounded-lg border border-white/10 bg-black/34 p-5">
              <div className="mb-4 flex items-center gap-3">
                <Activity className="h-5 w-5 text-emerald-200" />
                <h3 className="text-xl font-black text-white">Horário de sono</h3>
              </div>
              <div className="h-72">
                {chartsReady ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={report.sleep.hourly}>
                      <defs>
                        <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.06} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="hour" stroke="rgba(255,255,255,0.42)" tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.42)" tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: "#07100d", border: "1px solid rgba(52,211,153,.25)", borderRadius: 8 }}
                        labelFormatter={(label) => `${label}:00`}
                      />
                      <Area type="monotone" dataKey="commits" stroke="#34d399" fill="url(#sleepGradient)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="grid h-full place-items-center text-sm uppercase tracking-[0.22em] text-white/36">calibrando gráfico</div>
                )}
              </div>
              <p className="mt-4 rounded-lg border border-amber-200/20 bg-amber-200/8 p-4 text-lg font-bold text-white">
                {report.sleep.diagnosis}
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/34 p-5">
              <div className="mb-4 flex items-center gap-3">
                <Dna className="h-5 w-5 text-cyan-200" />
                <h3 className="text-xl font-black text-white">Tomografia comportamental</h3>
              </div>
              <div className="h-72">
                {chartsReady ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <RadarChart data={report.radar}>
                      <PolarGrid stroke="rgba(255,255,255,0.13)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: "rgba(255,255,255,.68)", fontSize: 12 }} />
                      <Radar dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.32} strokeWidth={3} />
                      <Tooltip contentStyle={{ background: "#07100d", border: "1px solid rgba(34,211,238,.25)", borderRadius: 8 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="grid h-full place-items-center text-sm uppercase tracking-[0.22em] text-white/36">calibrando gráfico</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-white/64">
                <p>
                  <span className="font-bold text-white">{report.sleep.forbiddenHours}</span> commits entre 02h e 05h
                </p>
                <p>
                  <span className="font-bold text-white">{report.sleep.weekends}</span> commits em finais de semana
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border border-white/10 bg-black/34 p-5">
              <div className="mb-4 flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-amber-200" />
                <h3 className="text-xl font-black text-white">Síndrome do objeto brilhante</h3>
              </div>
              <div className="h-72">
                {chartsReady ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={report.timeline}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="label" stroke="rgba(255,255,255,0.48)" tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.42)" tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "#07100d", border: "1px solid rgba(250,204,21,.24)", borderRadius: 8 }} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {report.timeline.map((entry) => (
                          <Cell key={entry.label} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="grid h-full place-items-center text-sm uppercase tracking-[0.22em] text-white/36">calibrando gráfico</div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/34 p-5">
              <div className="mb-4 flex items-center gap-3">
                <ClipboardPlus className="h-5 w-5 text-rose-200" />
                <h3 className="text-xl font-black text-white">Estatísticas inúteis, porém preocupantes</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard
                  label="Escolhendo nomes"
                  value={`${report.uselessStats.namingMinutes} min`}
                  detail="Inclui debates internos entre app, app-final e app-agora-vai"
                  tone="cyan"
                />
                <StatCard
                  label="Refactors"
                  value={`${report.uselessStats.refactorHours} h`}
                  detail="Horas convertidas em sensação de progresso arquitetural"
                  tone="amber"
                />
                <StatCard
                  label="Cafés"
                  value={`${report.uselessStats.coffees}`}
                  detail="Estimativa clínica com margem de erro emocional"
                  tone="emerald"
                />
                <StatCard
                  label="Só um bug"
                  value={`${report.uselessStats.tinyBugPromises}`}
                  detail="Promessas feitas antes de perder a tarde inteira"
                  tone="rose"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="rounded-lg border border-white/10 bg-black/34 p-5">
              <div className="mb-4 flex items-center gap-3">
                <TestTube2 className="h-5 w-5 text-emerald-200" />
                <h3 className="text-xl font-black text-white">Amostras de repositórios recentes</h3>
              </div>
              <div className="space-y-3">
                {topRepos.map((repo) => (
                  <a
                    key={repo.id}
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4 transition hover:border-emerald-300/35 hover:bg-white/[0.07] sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <p className="font-black text-white">{repo.name}</p>
                      <p className="mt-1 line-clamp-1 text-sm text-white/52">{repo.description ?? "Sem descrição. Sintoma clássico."}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-white/58">
                      <span>{repo.language ?? "misterioso"}</span>
                      <span>{repo.stargazers_count} estrelas</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <Certificate report={report} />
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-white/10 bg-black/34 p-5">
            <div className="mb-4 flex items-center gap-3">
              <Stethoscope className="h-5 w-5 text-cyan-200" />
              <h3 className="text-xl font-black text-white">Notas clínicas</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-white/68">
                Índice de abandono: {report.abandonment.total} repositórios públicos, {report.abandonment.lowCommit} com poucos commits e{" "}
                {report.abandonment.survivalRate}% de sobrevivência.
              </p>
              <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-white/68">
                IA detectada: {report.aiDependency.hits.length ? report.aiDependency.hits.join(", ") : "nenhum traço forte"}.{" "}
                {report.aiDependency.diagnosis}
              </p>
              <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-white/68">
                Esquizofrenia arquitetural: {report.architecture.level}. Suspeitos:{" "}
                {report.architecture.suspects.length ? report.architecture.suspects.join(", ") : "nenhum nome muito comprometedor"}.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="border-t border-white/10 px-4 py-8 text-center text-sm text-white/42">
        Feito para parecer científico. Não recomendado para decisões médicas, técnicas ou emocionais.
      </footer>
    </main>
  );
}
