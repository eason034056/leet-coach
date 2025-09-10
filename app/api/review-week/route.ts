import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

function formatYMDLocal(d: Date) {
	const y = d.getFullYear();
	const m = String(d.getMonth()+1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function parseYMDLocal(s: string) {
	const [y,m,day] = s.split('-').map(Number);
	return new Date(y, (m||1)-1, day||1);
}

function startOfTodayISO() {
	const d = new Date();
	d.setHours(0,0,0,0);
	return formatYMDLocal(d);
}

function addDaysISO(dateISO: string, days: number) {
	const d = parseYMDLocal(dateISO);
	d.setDate(d.getDate() + days);
	return formatYMDLocal(d);
}

export async function GET(req: Request) {
	const supabase = await supabaseRoute();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { searchParams } = new URL(req.url);
	let from = searchParams.get("from");
	let to = searchParams.get("to");

	if (!from) from = startOfTodayISO();
	if (!to) to = addDaysISO(from, 6);

	// Special handling for today: include overdue items
	const today = startOfTodayISO();
	const isViewingToday = from === today;

	let query = supabase
		.from("cards")
		.select("*, problem:problems(*)")
		.eq("user_id", user.id);

	if (isViewingToday) {
		// For today's view, include all items due today or earlier (to match review tab)
		query = query.lte("due_at", today);
	} else {
		// For other dates, use the original range query
		query = query.gte("due_at", from).lte("due_at", to);
	}

	const { data, error } = await query.order("due_at", { ascending: true });

	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json({ items: data, from, to });
}


