'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/format';

/**
 * Смена собственного пароля.
 *
 * После успешной смены выходим из системы: остальные устройства продолжат
 * работать по старым сессиям до истечения срока, и честнее сразу попросить
 * войти заново — так владелец увидит, что новый пароль действительно работает.
 */
export function PasswordForm() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    repeatPassword: '',
  });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setFields((f) => ({ ...f, [key]: '' }));
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFields({});
    setPending(true);
    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFields(data.fields ?? {});
        setError(data.error ?? 'Не удалось сменить пароль');
        return;
      }

      setDone(true);
      setForm({ currentPassword: '', newPassword: '', repeatPassword: '' });
      // Даём прочитать сообщение и отправляем на страницу входа.
      setTimeout(() => void signOut({ callbackUrl: '/login' }), 2500);
    } catch {
      setError('Сеть недоступна. Повторите попытку.');
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-signal-active/40 bg-signal-active/10 p-4 text-sm text-signal-active">
        Пароль изменён. Сейчас откроется страница входа — войдите с новым паролем.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <div>
        <label className="label" htmlFor="currentPassword">Текущий пароль</label>
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          className={cn('field', fields.currentPassword && 'field-error')}
          value={form.currentPassword}
          onChange={set('currentPassword')}
          required
        />
        {fields.currentPassword && <p className="error-text">{fields.currentPassword}</p>}
      </div>

      <div>
        <label className="label" htmlFor="newPassword">Новый пароль</label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          className={cn('field', fields.newPassword && 'field-error')}
          value={form.newPassword}
          onChange={set('newPassword')}
          required
        />
        {fields.newPassword ? (
          <p className="error-text">{fields.newPassword}</p>
        ) : (
          <p className="hint">Минимум 10 символов, буквы и хотя бы одна цифра.</p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="repeatPassword">Новый пароль ещё раз</label>
        <input
          id="repeatPassword"
          type="password"
          autoComplete="new-password"
          className={cn('field', fields.repeatPassword && 'field-error')}
          value={form.repeatPassword}
          onChange={set('repeatPassword')}
          required
        />
        {fields.repeatPassword && <p className="error-text">{fields.repeatPassword}</p>}
      </div>

      {error && <p className="error-text">{error}</p>}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? 'Сохраняем…' : 'Сменить пароль'}
      </button>
    </form>
  );
}
