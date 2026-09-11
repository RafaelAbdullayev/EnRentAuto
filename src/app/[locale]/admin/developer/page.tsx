import type { Metadata } from 'next';
import { BrandImageUploader } from '@/components/admin/BrandImageUploader';
import { DeveloperForm, type DeveloperValues } from '@/components/admin/DeveloperForm';
import { findBrandImage } from '@/lib/brand';
import { EMPTY_PROFILE, getDeveloperProfile } from '@/lib/developer';

export const metadata: Metadata = { title: 'Разработчик' };
export const dynamic = 'force-dynamic';

export default async function AdminDeveloperPage() {
  const [profile, photo] = await Promise.all([
    getDeveloperProfile(),
    findBrandImage('developer'),
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
          Ваша визитка на странице «О сайте»: кто вы, чем занимаетесь, как с вами
          связаться. Пункт появляется в шапке сайта, когда страница включена.
          Тексты пишите по-русски — на остальные языки переведём автоматически.
        </p>
      </header>

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
