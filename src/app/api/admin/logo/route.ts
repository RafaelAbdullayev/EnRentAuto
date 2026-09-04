import { NextResponse, type NextRequest } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { removeLogo, saveLogo } from '@/lib/brand';
import { UploadError } from '@/lib/upload';

export const runtime = 'nodejs';

/** POST /api/admin/logo — загрузка логотипа (multipart/form-data, поле «file»). */
export async function POST(request: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Файл не передан' }, { status: 400 });
    }

    await saveLogo(file);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error('[logo] ошибка загрузки:', error);
    return NextResponse.json({ error: 'Не удалось сохранить логотип' }, { status: 500 });
  }
}

/** DELETE /api/admin/logo — вернуть текстовый знак «EnRentAuto». */
export async function DELETE() {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  try {
    await removeLogo();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[logo] ошибка удаления:', error);
    return NextResponse.json({ error: 'Не удалось удалить логотип' }, { status: 500 });
  }
}
