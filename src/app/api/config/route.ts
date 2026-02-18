import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    skipAuth: process.env.SKIP_AUTH === 'true',
  });
}
