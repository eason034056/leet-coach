import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseRoute } from "@/lib/supabaseServer";
import { nextInterval } from "@/lib/sm2";

const bodySchema2 = z.object({
  cardId: z.string().uuid(),
  result: z.enum(["pass","fail","partial"]),
  q: z.number().min(0).max(5),
  durationSec: z.number().int().min(0),
  errorTypes: z.array(z.string()),
  notes: z.string().optional(),
});

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.toISOString().slice(0,10);
}

export async function POST(req: Request) {
  const supabase = await supabaseRoute();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json();
  const parsed = bodySchema2.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { cardId, result, q, durationSec, errorTypes, notes } = parsed.data;

  const { data: card, error: e1 } = await supabase.from("cards").select("*").eq("id", cardId).eq("user_id", user.id).single();
  if (e1 || !card) return NextResponse.json({ error: e1?.message ?? "Card not found" }, { status: 404 });
  const { data: problem, error: e2 } = await supabase.from("problems").select("*").eq("id", card.problem_id).eq("user_id", user.id).single();
  if (e2 || !problem) return NextResponse.json({ error: e2?.message ?? "Problem not found" }, { status: 404 });

  const next = nextInterval({
    easeFactor: card.ease_factor,
    intervalDays: card.interval_days,
    repetitions: card.repetitions,
    q,
    difficulty: problem.difficulty as "Easy" | "Medium" | "Hard",
    tags: problem.tags ?? [],
  });

  const todayISO = startOfTodayISO();
  const nextDue = new Date(todayISO);
  nextDue.setDate(nextDue.getDate() + next.intervalDays);
  const nextDueISO = nextDue.toISOString().slice(0,10);

  const now = new Date();
  const startedAt = new Date(now.getTime() - durationSec*1000);
  const mode = card.repetitions === 0 ? "learn" : "review";

  const { error: e3 } = await supabase.from("reviews").insert({
    user_id: user.id,
    problem_id: problem.id,
    card_id: card.id,
    mode,
    started_at: startedAt.toISOString(),
    finished_at: now.toISOString(),
    duration_sec: durationSec,
    result,
    q,
    error_types: errorTypes,
    notes,
  });
  if (e3) return NextResponse.json({ error: e3.message }, { status: 500 });

  const lapses = q < 3 ? card.lapses + 1 : card.lapses;
  const state = q < 3 ? 'learning' : 'review';
  const { error: e4 } = await supabase.from("cards").update({
    ease_factor: next.easeFactor,
    interval_days: next.intervalDays,
    repetitions: next.repetitions,
    last_q: q,
    lapses,
    state,
    due_at: nextDueISO,
  }).eq("id", card.id).eq("user_id", user.id);
  if (e4) return NextResponse.json({ error: e4.message }, { status: 500 });

  return NextResponse.json({ ok: true, nextDue: nextDueISO });
}

export async function GET(req: Request) {
  const supabase = await supabaseRoute();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  let q = supabase.from("reviews").select("*").eq("user_id", user.id);
  if (from) q = q.gte("finished_at", from);
  if (to) q = q.lte("finished_at", to);
  const { data, error } = await q.order("finished_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data });
}


