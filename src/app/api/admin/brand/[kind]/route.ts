import { NextResponse, type NextRequest } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { isBrandKind, removeBrandImage, saveBrandImage } from '@/lib/brand';
import { UploadError } from '@/lib/upload';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ kind: string }> };

/** POST /api/admin/brand/logo|hero — загрузка (multipart/form-data, поле «file»). */
export async function POST(request: NextRequest, { params }: Ctx) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  const { kind } = await params;
  if (!isBrandKind(kind)) {
    return NextResponse.json({ error: 'Неизвестная картинка' }, { status: 404 });
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Файл не передан' }, { status: 400 });
    }

    await saveBrandImage(kind, file);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error(`[brand:${kind}] ошибка загрузки:`, error);
    return NextResponse.json({ error: 'Не удалось сохранить картинку' }, { status: 500 });
  }
}

/** DELETE /api/admin/brand/logo|hero — вернуть оформление по умолчанию. */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  const { kind } = await params;
  if (!isBrandKind(kind)) {
    return NextResponse.json({ error: 'Неизвестная картинка' }, { status: 404 });
  }

  try {
    await removeBrandImage(kind);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`[brand:${kind}] ошибка удаления:`, error);
    return NextResponse.json({ error: 'Не удалось удалить картинку' }, { status: 500 });
  }
}
