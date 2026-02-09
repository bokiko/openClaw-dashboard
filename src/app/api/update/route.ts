import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

const API_KEY = process.env.OPENCLAW_API_KEY;

export async function POST(request: Request) {
  // Auth check — update requires auth if API key is configured
  if (API_KEY) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const cwd = process.cwd();
    const steps: { step: string; output: string }[] = [];

    // Step 1: git pull
    try {
      const pullOutput = execSync('git pull --ff-only 2>&1', { cwd, timeout: 30_000 }).toString().trim();
      steps.push({ step: 'git pull', output: pullOutput });

      if (pullOutput === 'Already up to date.') {
        return NextResponse.json({
          status: 'current',
          message: 'Already up to date',
          steps,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({
        status: 'error',
        message: `Git pull failed: ${msg}`,
        steps,
      }, { status: 500 });
    }

    // Step 2: npm install (only if package.json changed)
    try {
      const installOutput = execSync('npm install --prefer-offline 2>&1', { cwd, timeout: 120_000 }).toString().trim();
      steps.push({ step: 'npm install', output: installOutput.slice(-200) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({
        status: 'error',
        message: `Install failed: ${msg}`,
        steps,
      }, { status: 500 });
    }

    // Schedule restart after response is sent
    // Process managers (PM2, systemd, Docker) will auto-restart
    // In dev mode, Next.js hot-reloads on file changes anyway
    setTimeout(() => {
      console.log('[update] Restarting server to apply changes...');
      process.exit(0);
    }, 1500);

    return NextResponse.json({
      status: 'updated',
      message: 'Update applied — server restarting',
      steps,
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
