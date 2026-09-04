import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { StatCard } from '@/components/admin/StatCard';
import { AutoRefresh } from '@/components/admin/AutoRefresh';
import { ONLINE_WINDOW_MS } from '@/lib/constants';
import { formatDateTime, formatNumber } from '@/lib/format';
import { startOfDay } from '@/lib/stats';

export const metadata: Metadata = { title: 'Онлайн-пользователи' };
export const dynamic = 'force-dynamic';

/** Короткое описание устройства из User-Agent — без внешних библиотек. */
function describeAgent(ua: string): string {
  if (!ua) return 'Неизвестное устройство';
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /YaBrowser/.test(ua) ? 'Яндекс.Браузер'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Браузер';
  const os =
    /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iOS/.test(ua) ? 'iOS'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : '—';
  const device = /Mobile|Android|iPhone/.test(ua) ? '📱' : '🖥';
  return `${device} ${browser} · ${os}`;
}

export default async function AdminOnlinePage() {
  const now = new Date();
  const onlineSince = new Date(now.getTime() - ONLINE_WINDOW_MS);

  const [onlineNow, todayCount, totalCount, sessions] = await Promise.all([
    prisma.visitorSession.count({ where: { lastSeen: { gte: onlineSince } } }),
    prisma.visitorSession.count({ where: { lastSeen: { gte: startOfDay(now) } } }),
    prisma.visitorSession.count(),
    prisma.visitorSession.findMany({ orderBy: { lastSeen: 'desc' }, take: 50 }),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Онлайн-пользователи</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Анонимный учёт посещений: сессия заводится при первом заходе на сайт, «онлайн» —
            активность за последние 5 минут. Ваши собственные заходы тоже попадают в список.
          </p>
        </div>
        <AutoRefresh seconds={20} />
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Онлайн сейчас" value={formatNumber(onlineNow)} hint="активность < 5 мин" icon="◉" accent />
        <StatCard label="Посетителей за сегодня" value={formatNumber(todayCount)} icon="◈" />
        <StatCard label="Всего сессий" value={formatNumber(totalCount)} hint="за всё время" icon="∑" />
      </div>

      <section className="surface overflow-hidden">
        <div className="border-b border-ink-700 px-5 py-4">
          <h2 className="text-base font-semibold text-white">Последние сессии</h2>
        </div>

        {sessions.length === 0 ? (
          <p className="p-12 text-center text-sm text-zinc-500">Посещений пока не зафиксировано.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-3 font-medium">Статус</th>
                  <th className="px-5 py-3 font-medium">IP</th>
                  <th className="px-5 py-3 font-medium">Устройство</th>
                  <th className="px-5 py-3 font-medium">Страница</th>
                  <th className="px-5 py-3 font-medium">Просмотров</th>
                  <th className="px-5 py-3 font-medium">Активность</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {sessions.map((s) => {
                  const online = s.lastSeen >= onlineSince;
                  return (
                    <tr key={s.id} className="transition-colors hover:bg-ink-800/40">
                      <td className="px-5 py-3">
                        {online ? (
                          <span className="badge bg-signal-active/15 text-signal-active ring-signal-active/30">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-active" />
                            Онлайн
                          </span>
                        ) : (
                          <span className="badge bg-ink-800 text-zinc-500 ring-ink-600">Офлайн</span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-zinc-400">{s.ip || '—'}</td>
                      <td className="px-5 py-3 text-xs text-zinc-400">{describeAgent(s.userAgent)}</td>
                      <td className="px-5 py-3 text-xs text-zinc-400">{s.lastPath}</td>
                      <td className="px-5 py-3 text-zinc-300">{s.pageViews}</td>
                      <td className="px-5 py-3 text-xs text-zinc-500">{formatDateTime(s.lastSeen)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
