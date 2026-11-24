import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

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
      english_word?: string;
      vietnamese_meaning?: string;
      example_usage?: string;
    };

    const english_word = body.english_word?.trim();
    const vietnamese_meaning = body.vietnamese_meaning?.trim();
    const example_usage = body.example_usage?.trim();

    if (!english_word || !vietnamese_meaning || !example_usage) {
      return NextResponse.json(
        {
          error:
            'English word, Vietnamese meaning, and example usage are required.',
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('cards')
      .update({ english_word, vietnamese_meaning, example_usage })
      .eq('id', id)
      .select(
        'id, set_id, english_word, vietnamese_meaning, example_usage, position, created_at'
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ card: data });
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
  const { error } = await supabase.from('cards').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
