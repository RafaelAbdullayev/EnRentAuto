import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { logAction } from '@/lib/audit';
import { addTracks, countTracks, deleteTrack, MAX_TRACKS, reorderTracks } from '@/lib/music';
import { removeUploadedFile, saveUploadedFile, UploadError } from '@/lib/upload';

export const runtime = 'nodejs';

/** POST — добавить мелодии в плейлист (multipart/form-data, поле «files»). */
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

    const already = await countTracks();
    if (already + files.length > MAX_TRACKS) {
      return NextResponse.json(
        { error: `В плейлисте не больше ${MAX_TRACKS} мелодий, сейчас ${already}` },
        { status: 422 },
      );
    }

    const saved: { url: string; title: string }[] = [];
    try {
      for (const file of files) {
        const url = await saveUploadedFile(file, { allowAudio: true });
        // Имя файла без расширения — чтобы админ узнал трек в списке.
        saved.push({ url, title: file.name.replace(/\.[^.]+$/, '').slice(0, 120) });
      }
    } catch (error) {
      // Откатываем частично загруженное, чтобы не оставлять мусор на диске.
      await Promise.all(saved.map((item) => removeUploadedFile(item.url)));
      if (error instanceof UploadError) {
        return NextResponse.json({ error: error.message }, { status: 422 });
      }
      throw error;
    }

    await addTracks(saved);
    await logAction({
      userId: session.user.id,
      action: 'MUSIC_TRACKS_ADDED',
      entity: 'MusicTrack',
      entityId: 'playlist',
      meta: { count: saved.length },
    });

    return NextResponse.json({ ok: true, added: saved.length }, { status: 201 });
  } catch (error) {
    console.error('[admin/music/tracks:POST] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось загрузить мелодии' }, { status: 500 });
  }
}

/** DELETE ?id=… — убрать мелодию из плейлиста вместе с файлом. */
export async function DELETE(request: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Не указан идентификатор' }, { status: 400 });

  try {
    await deleteTrack(id);
    await logAction({
      userId: session.user.id,
      action: 'MUSIC_TRACK_DELETED',
      entity: 'MusicTrack',
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/music/tracks:DELETE] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось удалить мелодию' }, { status: 500 });
  }
}

const orderSchema = z.object({ order: z.array(z.string().min(1)).max(MAX_TRACKS) });

/** PUT — новый порядок мелодий. */
export async function PUT(request: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
  }

  try {
    const parsed = orderSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Некорректный порядок' }, { status: 422 });
    }
    await reorderTracks(parsed.data.order);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/music/tracks:PUT] ошибка:', error);
    return NextResponse.json({ error: 'Не удалось сохранить порядок' }, { status: 500 });
  }
}
