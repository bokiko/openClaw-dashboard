/**
 * Server-side HTTP client for OpenClaw Cluster
 *
 * Signs all requests with HMAC-SHA256 using CLUSTER_SECRET.
 * Only used in server components and API routes — never imported client-side.
 */

import { createHmac } from 'crypto';

const CLUSTER_URL = process.env.CLUSTER_URL || 'http://192.168.7.205:8080';
const CLUSTER_SECRET = process.env.CLUSTER_SECRET || '';

function signRequest(method: string, path: string, body: unknown, timestamp: string): string {
  const bodyString = body && typeof body === 'object' ? JSON.stringify(body) : (body || '');
  const message = `${method}:${path}:${timestamp}:${bodyString}`;
  return createHmac('sha256', CLUSTER_SECRET).update(message).digest('hex');
}

function authHeaders(method: string, path: string, body?: unknown): Record<string, string> {
  if (!CLUSTER_SECRET) return {};
  const timestamp = String(Date.now());
  const signature = signRequest(method, path, body, timestamp);
  return {
    'X-Cluster-Timestamp': timestamp,
    'X-Cluster-Signature': signature,
  };
}

export async function clusterFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body as string) : undefined;

  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders(method, path, body),
    ...(options.headers as Record<string, string> || {}),
  };

  const url = `${CLUSTER_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });

  return res;
}

export async function clusterGet<T = unknown>(path: string): Promise<T> {
  const res = await clusterFetch(path);
  if (!res.ok) throw new Error(`Cluster ${path}: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function clusterPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await clusterFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Cluster POST ${path}: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function clusterPatch<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await clusterFetch(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Cluster PATCH ${path}: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function clusterDelete(path: string): Promise<void> {
  const res = await clusterFetch(path, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Cluster DELETE ${path}: ${res.status} ${res.statusText}`);
}

export function getClusterUrl(): string {
  return CLUSTER_URL;
}
