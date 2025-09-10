import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

function formatYMDLocal(d: Date) {
	const y = d.getFullYear();
	const m = String(d.getMonth()+1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export async function GET(req: Request) {
  const supabase = await supabaseRoute();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? formatYMDLocal(new Date());

  const { data, error } = await supabase
    .from("cards")
    .select("*, problem:problems(*)")
    .eq("user_id", user.id)
    .lte("due_at", date)
    .order("due_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}


