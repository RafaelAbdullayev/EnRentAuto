import type { Metadata } from 'next';
import { BrandImageUploader } from '@/components/admin/BrandImageUploader';
import { DeveloperForm, type DeveloperValues } from '@/components/admin/DeveloperForm';
import { findBrandImage } from '@/lib/brand';
import { EMPTY_PROFILE, getDeveloperProfile } from '@/lib/developer';
import { getRatingSummary } from '@/lib/developerRating';

export const metadata: Metadata = { title: 'Разработчик' };
export const dynamic = 'force-dynamic';

export default async function AdminDeveloperPage() {
  const [profile, photo, rating] = await Promise.all([
    getDeveloperProfile(),
    findBrandImage('developer'),
    getRatingSummary(),
  ]);

  const initial: DeveloperValues = profile
    ? {
        isPublished: profile.isPublished,
        name: profile.name,
        role: profile.role,
        tagline: profile.tagline,
        about: profile.about,
        city: profile.city,
        years: profile.years,
        projects: profile.projects,
        phone: profile.phone,
        whatsapp: profile.whatsapp,
        telegram: profile.telegram,
        email: profile.email,
        website: profile.website,
        github: profile.github,
        linkedin: profile.linkedin,
        instagram: profile.instagram,
        skills: profile.skills,
        services: profile.services,
        priceNote: profile.priceNote,
      }
    : { ...EMPTY_PROFILE };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Разработчик</h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-500">
          Ваша визитка в разделе «Разработчик» на странице «О сайте»: кто вы, чем
          занимаетесь, как с вами связаться. Сама страница открыта всегда, а этот
          раздел появляется, когда вы его включите. Тексты пишите по-русски — на
          остальные языки переведём автоматически.
        </p>
      </header>

      {/* Оценки посетителей: видно, как работу встречают. */}
      <section className="surface p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-white">Оценки посетителей</h2>
          <span className="text-sm text-zinc-400">
            {rating.count > 0
              ? `${rating.average.toFixed(1)} из 5 · голосов: ${rating.count}`
              : 'Пока никто не голосовал'}
          </span>
        </div>

        {rating.count > 0 && (
          <ul className="mt-4 space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const votes = rating.buckets[stars - 1];
              const share = Math.round((votes / rating.count) * 100);
              return (
                <li key={stars} className="flex items-center gap-3 text-xs text-zinc-400">
                  <span className="w-10 shrink-0 text-accent">{'★'.repeat(stars)}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-800">
                    <span className="block h-full bg-accent/70" style={{ width: `${share}%` }} />
                  </span>
                  <span className="w-12 shrink-0 text-end">{votes}</span>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-4 text-xs text-zinc-600">
          Оценку ставят на странице «О сайте», в вашем разделе. Один голос на
          посетителя, оценку можно переставить.
        </p>
      </section>

      <BrandImageUploader
        kind="developer"
        title="Ваше фото"
        description="Портрет или логотип студии. Показывается кругом в начале страницы, поэтому лучше квадратный снимок с лицом по центру, от 400 пикселей. Без фото на его месте будет первая буква имени."
        hint="PNG, JPG, WEBP, AVIF · до 8 МБ"
        hasImage={photo !== null}
        mime={photo?.mime}
        previewClassName="h-24 w-24 rounded-full"
      />

      <DeveloperForm initial={initial} />
    </div>
  );
}
