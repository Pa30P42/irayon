import { NextResponse } from 'next/server';
import { z } from 'zod';

const callEventSchema = z.object({
  listingId: z.string().min(1).max(64),
  source: z.enum(['detail', 'card']).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = callEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // MVP: log to stderr. Swap with Prisma write once a CallEvent table exists.
  console.warn(
    JSON.stringify({
      type: 'call_click',
      at: new Date().toISOString(),
      listingId: parsed.data.listingId,
      source: parsed.data.source ?? 'detail',
    }),
  );

  return NextResponse.json({ ok: true });
}
