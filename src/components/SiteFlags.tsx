'use client';

import { createContext, useContext } from 'react';

/**
 * Небольшие признаки, которые нужны шапке и подвалу на каждой странице.
 *
 * Шапка — клиентский компонент и в базу ходить не может, а страницы
 * рендерятся каждая сама по себе. Поэтому значения читает макет (один раз,
 * из кэша) и передаёт сюда.
 */
export interface SiteFlags {
  /** Открыта ли страница «О сайте» — от этого зависит пункт в меню. */
  aboutPublished: boolean;
}

const DEFAULTS: SiteFlags = { aboutPublished: false };

const SiteFlagsContext = createContext<SiteFlags>(DEFAULTS);

export function SiteFlagsProvider({
  value,
  children,
}: {
  value: SiteFlags;
  children: React.ReactNode;
}) {
  return <SiteFlagsContext.Provider value={value}>{children}</SiteFlagsContext.Provider>;
}

export function useSiteFlags(): SiteFlags {
  return useContext(SiteFlagsContext);
}
