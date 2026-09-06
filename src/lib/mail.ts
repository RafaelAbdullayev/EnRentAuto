import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Отправка писем клиентам: подтверждение брони и код входа в «Мои брони».
 *
 * Настраивается переменными окружения. Если SMTP не настроен, письма
 * не отправляются, а приложение продолжает работать — интерфейс в этом
 * случае предлагает другой способ входа.
 */
const HOST = process.env.SMTP_HOST?.trim();
const PORT = Number(process.env.SMTP_PORT ?? 587);
const USER = process.env.SMTP_USER?.trim();
const PASS = process.env.SMTP_PASSWORD;
const FROM = process.env.SMTP_FROM?.trim() || (USER ? `EnRentAuto <${USER}>` : '');

export function isMailConfigured(): boolean {
  return Boolean(HOST && FROM);
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!isMailConfigured()) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: HOST,
    port: PORT,
    // 465 — сразу TLS, 587 — STARTTLS.
    secure: PORT === 465,
    auth: USER ? { user: USER, pass: PASS } : undefined,
  });
  return transporter;
}

/**
 * Отправляет письмо. Никогда не роняет запрос: бронь важнее письма,
 * поэтому ошибка только пишется в журнал.
 */
export async function sendMail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) return false;

  try {
    await transport.sendMail({ from: FROM, ...params });
    return true;
  } catch (error) {
    console.error('[mail] не удалось отправить письмо:', error);
    return false;
  }
}

/** «ivan@example.com» → «iv***@example.com»: показываем, куда ушёл код. */
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return '***';
  const head = name.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`;
}
