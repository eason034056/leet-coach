import { NextResponse as NextResp } from "next/server";
import { supabaseRoute as supaRoute } from "@/lib/supabaseServer";

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await supaRoute();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResp.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const { error } = await supabase.from("problems").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResp.json({ error: error.message }, { status: 500 });
  return NextResp.json({ ok: true });
}


