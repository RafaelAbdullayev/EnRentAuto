import { createNavigation } from 'next-intl/navigation';
import { routing } from '@/i18n/routing';

/**
 * Локале-осведомлённые Link / useRouter / redirect.
 * Импортировать ИХ вместо next/link и next/navigation во всей публичной части —
 * тогда префикс языка подставляется автоматически.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
