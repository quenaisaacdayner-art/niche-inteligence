import type { Cut, ProjectInfo, Correction, Overlay } from "./types";

const BASE = "";

export async function fetchProject(slug: string): Promise<ProjectInfo> {
  const res = await fetch(`${BASE}/api/project/${slug}`);
  if (!res.ok) throw new Error(`project fetch failed: ${res.status}`);
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

export async function fetchOverlays(slug: string): Promise<Overlay[]> {
  const res = await fetch(`${BASE}/api/overlays/${slug}`);
  return res.json();
}

export async function saveOverlays(slug: string, overlays: Overlay[]): Promise<void> {
  await fetch(`${BASE}/api/overlays/${slug}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ overlays }),
  });
}

export async function deleteOverlayRemote(slug: string, overlayId: string): Promise<void> {
  await fetch(`${BASE}/api/overlays/${slug}/${overlayId}`, { method: "DELETE" });
}

export async function uploadMaster(slug: string, file: File, replace = false): Promise<{ file: string; bytes: number }> {
  const form = new FormData();
  form.append("file", file);
  const url = `${BASE}/api/upload/${slug}/master${replace ? "?replace=true" : ""}`;
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`upload master failed (${res.status}): ${detail}`);
  }
  return res.json();
}

export async function uploadOverlay(
  slug: string,
  file: File,
  track: number,
  timelinePos: number
): Promise<Overlay> {
  const form = new FormData();
  form.append("file", file);
  const params = new URLSearchParams({ track: String(track), timeline_pos: String(timelinePos) });
  const res = await fetch(`${BASE}/api/upload/${slug}/overlay?${params}`, { method: "POST", body: form });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`upload overlay failed (${res.status}): ${detail}`);
  }
  return res.json();
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

export function mediaUrl(filename: string): string {
  return `${BASE}/media/${filename}`;
}

export function overlayMediaUrl(filename: string): string {
  return `${BASE}/media/overlays/${filename}`;
}
