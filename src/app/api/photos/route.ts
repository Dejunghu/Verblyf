import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/db';
import { UPLOAD_RULES, validateUpload } from '@/lib/images';

export const runtime = 'nodejs';

/**
 * POST /api/photos — foto's van een partnerhotel uploaden.
 *
 * De browser stuurt het bestand hier naartoe; wij ondertekenen en sturen door
 * naar Cloudinary. De API-secret verlaat de server dus nooit. Cloudinary doet
 * het herschalen, het formaat (AVIF/WebP) en de compressie — daarom slaan wij
 * alleen de `publicId` op en bouwen we de varianten in `lib/images.ts`.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const roomId = String(form?.get('roomId') ?? '');
  const alt = String(form?.get('alt') ?? '').slice(0, 160);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Geen bestand ontvangen.' }, { status: 400 });
  }

  const problem = validateUpload({ type: file.type, size: file.size });
  if (problem) return NextResponse.json({ error: problem }, { status: 422 });

  const count = await prisma.roomPhoto.count({ where: { roomId } });
  if (count >= UPLOAD_RULES.maxPerRoom) {
    return NextResponse.json(
      { error: `Deze kamer heeft al ${UPLOAD_RULES.maxPerRoom} foto's. Verwijder er eerst een.` },
      { status: 409 },
    );
  }

  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Beeldopslag is nog niet ingesteld.' }, { status: 503 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `verblyf/rooms/${roomId}`;
  // Cloudinary verwacht de parameters alfabetisch, met de secret erachter.
  const toSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');

  const upstream = new FormData();
  upstream.append('file', file);
  upstream.append('api_key', apiKey);
  upstream.append('timestamp', String(timestamp));
  upstream.append('folder', folder);
  upstream.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: 'POST',
    body: upstream,
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error('[photos] cloudinary', detail.slice(0, 300));
    return NextResponse.json({ error: 'Uploaden is niet gelukt. Probeer het opnieuw.' }, { status: 502 });
  }

  const json = (await res.json()) as { public_id: string; width: number; height: number; secure_url: string };

  if (json.width < UPLOAD_RULES.minWidth || json.height < UPLOAD_RULES.minHeight) {
    return NextResponse.json(
      {
        error: `Deze foto is ${json.width}×${json.height} pixels. Gasten zien hem groot op hun scherm; minimaal ${UPLOAD_RULES.minWidth}×${UPLOAD_RULES.minHeight} ziet er beter uit.`,
      },
      { status: 422 },
    );
  }

  const photo = await prisma.roomPhoto.create({
    data: {
      roomId,
      publicId: json.public_id,
      width: json.width,
      height: json.height,
      alt: alt || 'Hotelkamer',
      position: count,
      isCover: count === 0,
    },
  });

  return NextResponse.json({ photo });
}

/** PATCH /api/photos — volgorde, coverfoto of alt-tekst wijzigen. */
export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { id: string; position?: number; isCover?: boolean; alt?: string }
    | null;
  if (!body?.id) return NextResponse.json({ error: 'Ontbrekende foto-id.' }, { status: 400 });

  if (body.isCover) {
    const photo = await prisma.roomPhoto.findUnique({ where: { id: body.id } });
    if (photo) await prisma.roomPhoto.updateMany({ where: { roomId: photo.roomId }, data: { isCover: false } });
  }

  const updated = await prisma.roomPhoto.update({
    where: { id: body.id },
    data: {
      position: body.position,
      isCover: body.isCover,
      alt: body.alt?.slice(0, 160),
    },
  });
  return NextResponse.json({ photo: updated });
}

/** DELETE /api/photos?id=… */
export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Ontbrekende foto-id.' }, { status: 400 });
  await prisma.roomPhoto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
