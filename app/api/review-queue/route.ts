import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const supabase = await supabaseRoute();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0,10);

  const { data, error } = await supabase
    .from("cards")
    .select("*, problem:problems(*)")
    .eq("user_id", user.id)
    .lte("due_at", date)
    .order("due_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}


