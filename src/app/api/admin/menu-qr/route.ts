import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { requireAdmin } from '@/lib/adminAuthSafe';
import { PUBLIC_SITE_URL } from '@/lib/commercial';
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const format = new URL(req.url).searchParams.get('format') || 'png';
    if (!['svg', 'png'].includes(format))
      return NextResponse.json({ error: 'Formato inválido.' }, { status: 400 });
    const options = {
      margin: 4,
      width: 1024,
      errorCorrectionLevel: 'M' as const,
      color: { dark: '#2A140F', light: '#FFFFFF' },
    };
    const body =
      format === 'svg'
        ? await QRCode.toString(PUBLIC_SITE_URL, { ...options, type: 'svg' })
        : new Uint8Array(await QRCode.toBuffer(PUBLIC_SITE_URL, { ...options, type: 'png' }));
    return new NextResponse(body, {
      headers: {
        'Content-Type': format === 'svg' ? 'image/svg+xml' : 'image/png',
        'Content-Disposition': `attachment; filename="cardapio-comedoria-da-tata.${format}"`,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '';
    return NextResponse.json(
      { error: 'Não foi possível gerar o QR Code.' },
      { status: message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500 }
    );
  }
}
