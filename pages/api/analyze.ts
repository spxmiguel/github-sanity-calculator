import type { NextApiRequest, NextApiResponse } from "next";
import { analyzeGitHubSanity } from "@/lib/githubSanity";

const DAY_SECONDS = 24 * 60 * 60;
const WEEK_SECONDS = 7 * DAY_SECONDS;

function setSharedHeaders(response: NextApiResponse) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Cache-Control", `public, s-maxage=${DAY_SECONDS}, stale-while-revalidate=${WEEK_SECONDS}`);
}

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  setSharedHeaders(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "GET") {
    response.status(405).json({ error: "Método recusado pelo conselho de ética do laboratório." });
    return;
  }

  const rawUsername = Array.isArray(request.query.username) ? request.query.username[0] : request.query.username;
  const username = rawUsername?.trim().replace(/^@/, "");

  if (!username) {
    response.status(400).json({ error: "Informe um username para o laboratório abrir o prontuário." });
    return;
  }

  try {
    const report = await analyzeGitHubSanity(username, process.env.GITHUB_TOKEN);
    response.status(200).json({
      cachedAt: Date.now(),
      report,
      source: "github-sanity-api"
    });
  } catch (error) {
    response.status(502).json({
      error: error instanceof Error ? error.message : "A API própria tropeçou no jaleco."
    });
  }
}
