import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET() {
  const headersList = await headers();
  const host = headersList.get('host') || '(empty)';
  const deploymentMode = process.env.DEPLOYMENT_MODE || '(not set)';

  return NextResponse.json({
    host,
    deployment_mode: deploymentMode,
    host_lowercase: host.toLowerCase(),
    host_without_port: host.toLowerCase().split(':')[0],
    checks: {
      exact_match: host.toLowerCase().split(':')[0] === 'bluetreebrainapp.com',
      starts_with_bluetreebrain: host.toLowerCase().startsWith('bluetreebrain'),
      env_var_outreach_only: deploymentMode === 'outreach-only',
    },
  });
}
