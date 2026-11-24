import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { fetchSetWithCards } from '@/lib/data';
import { getAdminSupabase } from '@/lib/supabase';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const data = await fetchSetWithCards(id);

  if (!data.configured) {
    return NextResponse.json(
      { error: 'Supabase is not configured.' },
      { status: 503 }
    );
  }
  if (data.error) {
    return NextResponse.json({ error: data.error }, { status: 500 });
  }
  if (!data.set) {
    return NextResponse.json({ error: 'Set not found.' }, { status: 404 });
  }

  return NextResponse.json({ set: data.set, cards: data.cards });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase is not configured.' },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  try {
    const body = (await request.json()) as {
      title?: string;
      collection_id?: string | null;
    };

    const updates: { title?: string; collection_id?: string | null } = {};
    if (typeof body.title === 'string') {
      const trimmed = body.title.trim();
      if (!trimmed) {
        return NextResponse.json(
          { error: 'Set title cannot be empty.' },
          { status: 400 }
        );
      }
      updates.title = trimmed;
    }

    if ('collection_id' in body) {
      updates.collection_id = body.collection_id ? body.collection_id : null;
    }

    const { data, error } = await supabase
      .from('sets')
      .update(updates)
      .eq('id', id)
      .select('id, collection_id, title, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ set: data });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase is not configured.' },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  const { error } = await supabase.from('sets').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
