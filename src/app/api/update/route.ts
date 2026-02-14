import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

const API_KEY = process.env.OPENCLAW_API_KEY;

export async function GET(request: Request) {
  // Auth check
  if (API_KEY) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const cwd = process.cwd();

    // Fetch latest remote refs without pulling
    execSync('git fetch --quiet 2>&1', { cwd, timeout: 15_000 });

    // Compare local HEAD with remote
    const local = execSync('git rev-parse HEAD', { cwd }).toString().trim();
    const remote = execSync('git rev-parse @{u}', { cwd }).toString().trim();

    if (local === remote) {
      return NextResponse.json({ status: 'current', message: 'Up to date' });
    }

    // Get count of commits behind
    const behindOutput = execSync('git rev-list --count HEAD..@{u}', { cwd }).toString().trim();
    const behind = parseInt(behindOutput, 10);

    // Get the latest remote commit message for context
    const latestMsg = execSync('git log @{u} -1 --format=%s', { cwd }).toString().trim();

    return NextResponse.json({
      status: 'update-available',
      message: `${behind} new commit${behind === 1 ? '' : 's'} available`,
      latestCommit: latestMsg,
      behind,
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Could not check for updates' },
      { status: 500 }
    );
  }
}
