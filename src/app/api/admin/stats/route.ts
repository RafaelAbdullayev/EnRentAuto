import { NextResponse, type NextRequest } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { revenueForRange, endOfDay, startOfDay, daysAgo } from '@/lib/stats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/stats?period=today|week|month|custom&from=…&to=…
 * Отчёт по выручке за произвольный период.
 */
export async function GET(request: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const period = sp.get('period') ?? 'month';

  let from: Date;
  let to = endOfDay(new Date());

  switch (period) {
    case 'today':
      from = startOfDay(new Date());
      break;
    case 'week':
      from = daysAgo(6);
      break;
    case 'quarter':
      from = daysAgo(89);
      break;
    case 'custom': {
      const rawFrom = sp.get('from');
      const rawTo = sp.get('to');
      const f = rawFrom ? new Date(rawFrom) : null;
      const t = rawTo ? new Date(rawTo) : null;
      if (!f || !t || Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) {
        return NextResponse.json({ error: 'Укажите корректный диапазон дат' }, { status: 422 });
      }
      if (t < f) {
        return NextResponse.json({ error: 'Конец периода раньше начала' }, { status: 422 });
      }
      from = startOfDay(f);
      to = endOfDay(t);
      break;
    }
    case 'month':
    default:
      from = daysAgo(29);
      break;
  }

  const result = await revenueForRange(from, to);
  return NextResponse.json({
    ok: true,
    period,
    from: from.toISOString(),
    to: to.toISOString(),
    ...result,
    average: result.orders ? Math.round(result.revenue / result.orders) : 0,
  });
}
