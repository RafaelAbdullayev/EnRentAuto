import { NextResponse, type NextRequest } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { saveUploadedFile, removeUploadedFile, UploadError } from '@/lib/upload';

export const runtime = 'nodejs';

/**
 * POST /api/upload — загрузка фото и коротких видео автомобиля
 * (multipart/form-data, поле "files").
 * Возвращает { urls: string[] }. Доступно только сотрудникам.
 */
export async function POST(request: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const files = form.getAll('files').filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: 'Файлы не переданы' }, { status: 400 });
    }
    if (files.length > 12) {
      return NextResponse.json(
        { error: 'За раз можно загрузить не более 12 файлов' },
        { status: 400 },
      );
    }

    const urls: string[] = [];
    try {
      // Для карточек автомобилей разрешаем и короткие ролики.
      for (const file of files) urls.push(await saveUploadedFile(file, { allowVideo: true }));
    } catch (error) {
      // Откатываем частично загруженные файлы, чтобы не оставлять мусор.
      await Promise.all(urls.map(removeUploadedFile));
      if (error instanceof UploadError) {
        return NextResponse.json({ error: error.message }, { status: 422 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true, urls }, { status: 201 });
  } catch (error) {
    console.error('[upload] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось загрузить файлы' }, { status: 500 });
  }
}

/** DELETE /api/upload?url=/uploads/xxx.jpg — удалить неиспользуемый файл. */
export async function DELETE(request: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Не указан url' }, { status: 400 });
  await removeUploadedFile(url);
  return NextResponse.json({ ok: true });
}
