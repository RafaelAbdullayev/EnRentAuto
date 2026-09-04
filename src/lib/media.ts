/**
 * Определение типа загруженного файла по его публичному адресу.
 * Тип не хранится в базе: расширения задаёт сервер при сохранении
 * (src/lib/upload.ts), поэтому адреса достаточно.
 */
const VIDEO_EXTENSIONS = ['.mp4', '.webm'];

export function isVideoUrl(url: string): boolean {
  const clean = url.split('?')[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => clean.endsWith(ext));
}

/** Тип для тега <source>. */
export function videoMimeFromUrl(url: string): string {
  return url.split('?')[0].toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4';
}
