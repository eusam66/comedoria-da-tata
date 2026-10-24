import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuthSafe';
import { readCommercialAdmin, saveCommercial } from '@/lib/commercialServer';
function failure(error: unknown) {
  const message =
    error instanceof Error ? error.message : 'Não foi possível salvar o conteúdo comercial.';
  const status =
    message === 'Unauthorized'
      ? 401
      : message === 'Forbidden'
      ? 403
      : message === 'SETTINGS_CHANGED'
      ? 409
      : /inválid|limite|caracter|autoriza|Preencha|duplicad/i.test(message)
      ? 400
      : 500;
  return NextResponse.json(
    {
      error:
        message === 'SETTINGS_CHANGED'
          ? 'O conteúdo foi alterado em outra sessão. Recarregue antes de salvar.'
          : message,
    },
    { status }
  );
}
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const { value, revision } = await readCommercialAdmin();
    return NextResponse.json({ value, revision });
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    return NextResponse.json(await saveCommercial(body.value, body.revision));
  } catch (e) {
    return failure(e);
  }
}
