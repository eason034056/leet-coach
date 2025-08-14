import { NextResponse as NR } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { initWebPush, sendWebPush } from '@/lib/push';

export const runtime = 'nodejs';

function todayISO() { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); }
function addDaysISO(isoDate: string, days: number) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}
function formatLongDate(isoDate: string) {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' });
}
function getNameFromMetadata(meta: unknown): string | undefined {
  if (meta && typeof meta === 'object') {
    const value = (meta as Record<string, unknown>).name;
    if (typeof value === 'string') return value;
  }
  return undefined;
}

type ProblemPreview = { id: string; title: string; difficulty: string; url: string; due_at: string };
function buildEmailHTML(options: {
  appUrl: string;
  dateISO: string;
  userName?: string;
  dueCount: number;
  overdueCount: number;
  dueTodayCount: number;
  nextCounts: { d1: number; d2: number; d3: number };
  previews: ProblemPreview[];
  weeklyStats?: { total: number; pass: number };
}) {
  const { appUrl, dateISO, userName, dueCount, overdueCount, dueTodayCount, nextCounts, previews, weeklyStats } = options;
  const dateLong = formatLongDate(dateISO);
  const ctaUrl = `${appUrl}?utm_source=email&utm_campaign=daily-digest`;
  const previewItems = previews.map(p => {
    const diffColor = p.difficulty === 'Hard' ? '#C2410C' : p.difficulty === 'Medium' ? '#2563EB' : '#16A34A';
    return `
      <tr>
        <td style="padding:12px 0 0 0;">
          <a href="${ctaUrl}" style="text-decoration:none;color:#111827;font-weight:600;">${p.title}</a>
          <div style="font-size:12px;color:#6B7280;margin-top:4px;">
            <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${diffColor};color:#fff;margin-right:8px;">${p.difficulty}</span>
            <span>Due: ${p.due_at}</span>
          </div>
        </td>
      </tr>`;
  }).join('');
  const weeklyRate = weeklyStats && weeklyStats.total > 0 ? Math.round((weeklyStats.pass / weeklyStats.total) * 100) : null;
  return `
  <div style="background:#F3F4F6;padding:24px 0;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.06);overflow:hidden;">
      <tr>
        <td style="padding:20px 24px;border-bottom:1px solid #E5E7EB;">
          <table width="100%" style="border-collapse:collapse;">
            <tr>
              <td style="font-size:18px;font-weight:700;color:#111827;">LeetCoach</td>
              <td style="text-align:right;font-size:12px;color:#6B7280;">${dateLong}</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 24px;">
          <div style="font-size:16px;color:#111827;">早安${userName ? '，' + userName : ''}！今天有 <strong>${dueCount}</strong> 題待複習。</div>
          <div style="margin-top:12px;">
            <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:separate;border-spacing:0 8px;">
              <tr>
                <td style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:12px;">
                  <div style="font-size:13px;color:#374151;">逾期：<strong>${overdueCount}</strong> ・ 今天到期：<strong>${dueTodayCount}</strong> ・ 未來3天：<strong>${nextCounts.d1 + nextCounts.d2 + nextCounts.d3}</strong></div>
                </td>
              </tr>
            </table>
          </div>
          <div style="margin-top:16px;">
            <a href="${ctaUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">開始複習</a>
            <span style="font-size:12px;color:#6B7280;margin-left:8px;">大約需要 5–10 分鐘</span>
          </div>
        </td>
      </tr>
      ${previews.length > 0 ? `
      <tr>
        <td style="padding:8px 24px 0 24px;font-size:13px;color:#6B7280;">優先佇列</td>
      </tr>
      <tr>
        <td style="padding:0 24px 8px 24px;">
          <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">${previewItems}</table>
        </td>
      </tr>` : ''}
      ${weeklyRate !== null ? `
      <tr>
        <td style="padding:8px 24px 16px 24px;">
          <div style="font-size:13px;color:#6B7280;">近 7 天：完成 <strong>${weeklyStats!.total}</strong> 題，正確率 <strong>${weeklyRate}%</strong></div>
        </td>
      </tr>` : ''}
      <tr>
        <td style="padding:16px 24px;border-top:1px solid #E5E7EB;background:#F9FAFB;font-size:12px;color:#6B7280;">
          <div style="margin-bottom:6px;">若你不想再收到這類提醒，可到偏好設定調整。</div>
          <a href="${ctaUrl}" style="color:#2563EB;text-decoration:none;">開啟 LeetCoach</a>
        </td>
      </tr>
    </table>
  </div>`;
}

export async function POST(req: Request) {
  const auth = req.headers.get('x-cron-key');
  if (auth !== process.env.CRON_SECRET) return NR.json({ error: 'Forbidden' }, { status: 403 });

  const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const resend = new Resend(process.env.RESEND_API_KEY!);
  initWebPush();

  const date = todayISO();
  const { data: dueRows, error: e1 } = await supa.from('cards').select('user_id').lte('due_at', date);
  if (e1) return NR.json({ error: e1.message }, { status: 500 });
  const userIds = [...new Set((dueRows ?? []).map(r => r.user_id))];

  for (const uid of userIds) {
    const [cardsCountResp, subsResp, userResp, overdueResp, dueTodayResp, d1Resp, d2Resp, d3Resp, topDueResp, reviewsResp] = await Promise.all([
      supa.from('cards').select('id', { count: 'exact', head: true }).eq('user_id', uid).lte('due_at', date),
      supa.from('push_subscriptions').select('*').eq('user_id', uid),
      supa.auth.admin.getUserById(uid),
      supa.from('cards').select('id', { count: 'exact', head: true }).eq('user_id', uid).lt('due_at', date),
      supa.from('cards').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('due_at', date),
      supa.from('cards').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('due_at', addDaysISO(date, 1)),
      supa.from('cards').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('due_at', addDaysISO(date, 2)),
      supa.from('cards').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('due_at', addDaysISO(date, 3)),
      supa.from('cards').select('id, problem_id, due_at').eq('user_id', uid).lte('due_at', date).order('due_at', { ascending: true }).limit(5),
      supa.from('reviews').select('id,result,finished_at').eq('user_id', uid).gte('finished_at', new Date(new Date(date + 'T00:00:00').getTime() - 7*24*3600*1000).toISOString()),
    ]);
    const dueCount = (cardsCountResp as { count: number | null } | null)?.count ?? 0;
    const overdueCount = (overdueResp as { count: number | null } | null)?.count ?? 0;
    const dueTodayCount = (dueTodayResp as { count: number | null } | null)?.count ?? 0;
    const nextCounts = {
      d1: (d1Resp as { count: number | null } | null)?.count ?? 0,
      d2: (d2Resp as { count: number | null } | null)?.count ?? 0,
      d3: (d3Resp as { count: number | null } | null)?.count ?? 0,
    };
    const userData = (userResp as { data?: { user?: { email?: string; user_metadata?: unknown } } } | null | undefined)?.data?.user;
    const email = userData?.email as string | undefined;
    const userName = getNameFromMetadata(userData?.user_metadata);

    // Load problem titles for preview
    let previews: ProblemPreview[] = [];
    const topDue = (topDueResp as { data?: { id: string; problem_id: string; due_at: string }[] } | null)?.data ?? [];
    if (topDue.length > 0) {
      const problemIds = topDue.map(r => r.problem_id);
      const problemsResp = await supa.from('problems').select('id,title,difficulty,url').in('id', problemIds);
      const problems = (problemsResp as { data?: { id: string; title: string; difficulty: string; url: string }[] } | null)?.data ?? [];
      const map = new Map(problems.map(p => [p.id, p]));
      previews = topDue.map(r => {
        const p = map.get(r.problem_id);
        return {
          id: r.problem_id,
          title: p?.title ?? 'Problem',
          difficulty: p?.difficulty ?? 'Medium',
          url: p?.url ?? process.env.APP_URL!,
          due_at: r.due_at,
        };
      });
    }

    const weekly = (reviewsResp as { data?: { result: string }[] } | null)?.data ?? [];
    const weeklyStats = weekly.length > 0 ? { total: weekly.length, pass: weekly.filter(r => r.result === 'pass').length } : undefined;

    if (email && dueCount > 0) {
      const html = buildEmailHTML({
        appUrl: process.env.APP_URL!,
        dateISO: date,
        userName,
        dueCount,
        overdueCount,
        dueTodayCount,
        nextCounts,
        previews,
        weeklyStats,
      });
      await resend.emails.send({
        from: process.env.FROM_EMAIL!,
        to: email,
        subject: `LeetCoach — 今日待複習 ${dueCount} 題`,
        html,
      });
    }

    const subs = (subsResp as { data?: { endpoint: string; p256dh: string; auth: string }[] } | null)?.data ?? [];
    if (subs.length > 0 && dueCount > 0) {
      for (const s of subs) {
        await sendWebPush({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, {
          title: 'LeetCoach — Review time',
          body: `You have ${dueCount} due card${dueCount>1?'s':''} today. Tap to open.`,
        });
      }
    }
  }

  return NR.json({ ok: true, users: userIds.length });
}


