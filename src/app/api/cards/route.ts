import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import type { ParsedCardInput } from '@/lib/types';

export async function POST(request: Request) {
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

  try {
    const body = (await request.json()) as {
      setId?: string;
      newSetTitle?: string;
      collectionId?: string | null;
      cards?: ParsedCardInput[];
    };

    const incomingCards = Array.isArray(body.cards) ? body.cards : [];
    const validCards = incomingCards
      .map((c) => ({
        english_word: c.english_word?.trim() ?? '',
        vietnamese_meaning: c.vietnamese_meaning?.trim() ?? '',
        example_usage: c.example_usage?.trim() ?? '',
      }))
      .filter(
        (c) => c.english_word && c.vietnamese_meaning && c.example_usage
      );

    if (validCards.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid flashcard is required.' },
        { status: 400 }
      );
    }

    let targetSetId = body.setId?.trim() || '';

    if (!targetSetId) {
      const title = body.newSetTitle?.trim();
      if (!title) {
        return NextResponse.json(
          { error: 'Either an existing setId or a newSetTitle is required.' },
          { status: 400 }
        );
      }

      const { data: createdSet, error: setError } = await supabase
        .from('sets')
        .insert({
          title,
          collection_id: body.collectionId ? body.collectionId : null,
        })
        .select('id')
        .single();

      if (setError || !createdSet) {
        return NextResponse.json(
          { error: setError?.message ?? 'Failed to create set.' },
          { status: 500 }
        );
      }
      targetSetId = createdSet.id;
    }

    // Determine starting position
    const { count } = await supabase
      .from('cards')
      .select('id', { count: 'exact', head: true })
      .eq('set_id', targetSetId);

    const startPos = count ?? 0;

    const rows = validCards.map((card, idx) => ({
      set_id: targetSetId,
      english_word: card.english_word,
      vietnamese_meaning: card.vietnamese_meaning,
      example_usage: card.example_usage,
      position: startPos + idx + 1,
    }));

    const { data: insertedCards, error: insertError } = await supabase
      .from('cards')
      .insert(rows)
      .select(
        'id, set_id, english_word, vietnamese_meaning, example_usage, position, created_at'
      );

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { setId: targetSetId, cards: insertedCards ?? [] },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }
}
