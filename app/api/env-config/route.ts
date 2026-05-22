import { NextResponse } from 'next/server';
import { getServerEnvConfig } from '@/lib/env-config';

// GET /api/env-config — called once on login page mount
// Returns env values to the client if set
export async function GET() {
  return NextResponse.json(getServerEnvConfig());
}
