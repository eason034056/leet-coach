import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import ClientApp from "../ui/ClientApp";

export default async function Page() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <ClientApp />;
}


