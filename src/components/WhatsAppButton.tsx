'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { whatsappLink } from '@/lib/contact';

/**
 * Плавающая кнопка WhatsApp.
 *
 * Своего чата на сайте нет намеренно: он требует, чтобы кто-то сидел
 * и отвечал в окне браузера. WhatsApp у менеджера уже открыт на телефоне,
 * а у клиента в Азербайджане он и так основной мессенджер — переписка
 * начинается в один тап и остаётся в его истории.
 */
export function WhatsAppButton() {
  const t = useTranslations('footer');
  const [visible, setVisible] = useState(false);

  // Появляется после небольшой прокрутки: сразу поверх первого экрана
  // кнопка спорит с формой поиска и выглядит навязчиво.
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const phone = t('phone');
  if (!phone.trim()) return null;

  return (
    <a
      href={whatsappLink(phone, t('waText'))}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`WhatsApp ${phone}`}
      className={`fixed bottom-5 end-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-ink-950 shadow-[0_10px_30px_-8px_rgba(37,211,102,.7)] transition-all duration-300 hover:scale-105 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-7 w-7">
        <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z" />
        <path d="M12.04 2C6.6 2 2.18 6.42 2.18 11.86c0 1.74.46 3.44 1.32 4.94L2 22l5.35-1.4a9.83 9.83 0 0 0 4.69 1.19h.01c5.43 0 9.85-4.42 9.85-9.86A9.79 9.79 0 0 0 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.16-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.13 8.13 0 0 1-1.25-4.32c0-4.52 3.68-8.2 8.2-8.2 2.19 0 4.25.86 5.8 2.41a8.14 8.14 0 0 1 2.4 5.8c0 4.52-3.68 8.19-8.2 8.19Z" />
      </svg>
    </a>
  );
}
