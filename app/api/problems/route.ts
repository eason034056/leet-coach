import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseRoute } from "@/lib/supabaseServer";

function formatYMDLocal(d: Date) {
	const y = d.getFullYear();
	const m = String(d.getMonth()+1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

const bodySchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  difficulty: z.enum(["Easy","Medium","Hard"]),
  tags: z.array(z.string()).default([])
});

export async function POST(req: Request) {
  const supabase = await supabaseRoute();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { url, title, difficulty, tags } = parsed.data;

  const slugMatch = url.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i);
  const slug = slugMatch ? slugMatch[1] : title.toLowerCase().replace(/\s+/g, "-");

  const { data: pb, error: e1 } = await supabase
    .from("problems")
    .upsert({ user_id: user.id, source: "LeetCode", slug, url, title, difficulty, tags }, { onConflict: "user_id,slug" })
    .select("*")
    .single();
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const { data: existing } = await supabase
    .from("cards")
    .select("id")
    .eq("user_id", user.id)
    .eq("problem_id", pb.id)
    .maybeSingle();

  if (!existing) {
    const { error: e2 } = await supabase.from("cards").insert({
      user_id: user.id,
      problem_id: pb.id,
      state: "learning",
      ease_factor: 2.5,
      interval_days: 0,
      repetitions: 0,
      lapses: 0,
      due_at: formatYMDLocal(new Date()),
      last_q: 0,
    });
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  }

  return NextResponse.json({ problem: pb });
}

export async function GET() {
  const supabase = await supabaseRoute();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("problems")
    .select("*, card:cards(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ problems: data });
}


