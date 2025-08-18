import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseRoute } from "@/lib/supabaseServer";

const patchSchema = z.object({
  due_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function PATCH(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await supabaseRoute();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await _req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { due_at } = parsed.data;
  const { id } = await ctx.params;

  // Ensure the card belongs to the user
  const { data: card, error: e1 } = await supabase.from("cards").select("id").eq("id", id).eq("user_id", user.id).single();
  if (e1 || !card) return NextResponse.json({ error: e1?.message ?? "Not found" }, { status: 404 });

  const { error: e2 } = await supabase.from("cards").update({ due_at }).eq("id", id).eq("user_id", user.id);
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  return NextResponse.json({ ok: true, due_at });
}


