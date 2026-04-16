import type { Cut, ProjectInfo, Correction } from "./types";

const BASE = "";

export async function fetchProject(slug: string): Promise<ProjectInfo> {
  const res = await fetch(`${BASE}/api/project/${slug}`);
  return res.json();
}

export async function fetchCuts(slug: string): Promise<Cut[]> {
  const res = await fetch(`${BASE}/api/cuts/${slug}`);
  return res.json();
}

export async function saveCuts(slug: string, cuts: Cut[]): Promise<void> {
  await fetch(`${BASE}/api/cuts/${slug}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cuts }),
  });
}

export async function postCorrection(slug: string, correction: Correction): Promise<void> {
  await fetch(`${BASE}/api/corrections/${slug}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(correction),
  });
}

export async function startCompose(slug: string): Promise<string> {
  const res = await fetch(`${BASE}/api/compose/${slug}`, { method: "POST" });
  const data = await res.json();
  return data.job_id;
}

export async function checkCompose(slug: string, jobId: string): Promise<string> {
  const res = await fetch(`${BASE}/api/compose/${slug}/status?job_id=${jobId}`);
  const data = await res.json();
  return data.status;
}

export function mediaUrl(slug: string, filename: string): string {
  return `${BASE}/media/${filename}`;
}
