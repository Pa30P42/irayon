import { isUsingMockData } from '@/lib/api/listings-service';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const callEventSchema = z.object({
  listingId: z.string().min(1).max(64),
  source: z.enum(['detail', 'card']).optional(),
  locale: z.string().max(8).optional(),
});

export async function POST(request: Request) {
  const rate = await checkRateLimit('calls', getClientIp(request));
  if (!rate.success) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: rateLimitHeaders(rate) },
    );
  }

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

  // Structured event log stays — it's the fallback stream when the DB write
  // fails (and the only record in mock mode).
  console.warn(
    JSON.stringify({
      type: 'call_click',
      at: new Date().toISOString(),
      listingId: parsed.data.listingId,
      source: parsed.data.source ?? 'detail',
    }),
  );

  if (!isUsingMockData()) {
    try {
      await prisma.callEvent.create({
        data: {
          // Guard against junk ids: connect-by-id would throw; a raw FK write
          // would too. Verify existence cheaply and store null if unknown so
          // the tap still counts toward totals.
          listingId: (await prisma.listing.findUnique({
            where: { id: parsed.data.listingId },
            select: { id: true },
          }))
            ? parsed.data.listingId
            : null,
          source: parsed.data.source ?? 'detail',
          locale: parsed.data.locale ?? null,
        },
      });
    } catch (err) {
      // Analytics must never fail the response.
      logger.error('POST /api/calls persist failed', { err });
    }
  }

  return NextResponse.json({ ok: true });
}
