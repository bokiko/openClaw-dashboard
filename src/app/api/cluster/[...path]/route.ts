/**
 * Catch-all proxy to OpenClaw Cluster
 *
 * Forwards /api/cluster/* → CLUSTER_URL/* with HMAC auth headers.
 * Session cookie is validated by middleware.ts before reaching here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { clusterFetch } from '@/lib/cluster-client';

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params;
    // Reject path traversal attempts
    if (path.some(seg => seg === '..' || seg === '.')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    const clusterPath = '/' + path.join('/');
    const url = new URL(req.url);
    const queryString = url.search;
    const fullPath = clusterPath + queryString;

    const body = req.method !== 'GET' && req.method !== 'HEAD'
      ? await req.text()
      : undefined;

    const res = await clusterFetch(fullPath, {
      method: req.method,
      body,
    });

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Proxy error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const PUT = proxy;
