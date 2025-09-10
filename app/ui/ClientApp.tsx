"use client";
import React, { useEffect, useRef, useState } from "react";
import { Layers3, TrendingUp, RefreshCw, NotebookPen, Plus, CalendarDays, Link as LinkIcon, Tag, CheckCircle2, XCircle, AlertTriangle, Timer, PlayCircle, ChevronLeft, ChevronRight, Brain, Award, Gauge, Menu, Clock, CircleCheckBig } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, BarChart, Bar } from "recharts";

type Difficulty = "Easy" | "Medium" | "Hard";

type Problem = { id: string; source: string; slug: string; url: string; title: string; difficulty: Difficulty; tags: string[]; created_at: string; card?: Card };

type Card = { id: string; user_id: string; problem_id: string; state: string; ease_factor: number; interval_days: number; repetitions: number; lapses: number; due_at: string; last_q: number };

type Review = { id: string; user_id: string; problem_id: string; card_id: string; mode: string; started_at: string; finished_at: string; duration_sec: number; result: "pass"|"fail"|"partial"; q: number; error_types: string[]; notes?: string };

export default function ClientApp() {
  const [active, setActive] = useState<"dashboard"|"review"|"weekly"|"add"|"library"|"reports">("dashboard");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [queue, setQueue] = useState<{ id: string; problem: Problem }[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [weeklyItems, setWeeklyItems] = useState<{ id: string; due_at: string; problem: Problem }[]>([]);
  type WeeklyItem = { id: string; due_at: string; problem: Problem };
  const [navOpen, setNavOpen] = useState(false);

  function groupByDate(items: WeeklyItem[]) {
    return items.reduce((acc: Record<string, WeeklyItem[]>, it) => {
      const key = it.due_at;
      acc[key] = acc[key] || [];
      acc[key].push(it);
      return acc;
    }, {});
  }
  const [weekFrom, setWeekFrom] = useState<string>(() => formatYMDLocal(new Date()));
  const [weekTo, setWeekTo] = useState<string>(() => addDaysYMD(formatYMDLocal(new Date()), 6));
  const groupedWeekly = groupByDate(weeklyItems);

  function dayRangeLabel(from: string, to: string) {
    const f = parseYMDLocal(from);
    const t = parseYMDLocal(to);
    const fmt = (d: Date) => `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`;
    return `${fmt(f)}–${fmt(t)}`;
  }

  async function refreshAll() {
    const date = formatYMDLocal(new Date());
    const [pRes, qRes, rRes] = await Promise.all([
      fetch('/api/problems').then(r=>r.json()),
      fetch(`/api/review-queue?date=${date}`).then(r=>r.json()),
      fetch(`/api/reviews?from=${new Date(Date.now()-30*86400000).toISOString()}`).then(r=>r.json()),
    ]);
    setProblems(pRes.problems ?? []);
    setQueue(qRes.items ?? []);
    setReviews(rRes.reviews ?? []);
  }
  useEffect(()=>{ refreshAll(); },[]);
  useEffect(()=>{ fetchWeekly(weekFrom, weekTo); }, [weekFrom, weekTo]);
  useEffect(()=>{
    function onWeeklyRefresh(){ fetchWeekly(weekFrom, weekTo); }
    if (typeof window !== 'undefined') window.addEventListener('weekly-refresh', onWeeklyRefresh);
    return ()=>{ if (typeof window !== 'undefined') window.removeEventListener('weekly-refresh', onWeeklyRefresh); };
  }, [weekFrom, weekTo]);
  useEffect(()=>{
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
    }
  },[]);

  async function fetchWeekly(from: string, to: string) {
    const url = `/api/review-week?from=${from}&to=${to}`;
    const res = await fetch(url);
    const json = await res.json();
    setWeeklyItems(json.items ?? []);
  }

  const dueCount = queue.length;
  const streak = useStreak(reviews);
  const weekly = useWeeklyStats(reviews);
  const tagStats = useTagStats(reviews, problems);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Header onToggleNav={()=> setNavOpen(true)} />
      {navOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={()=> setNavOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl p-3 pt-14">
            <div className="absolute right-3 top-3">
              <button className="rounded-lg p-2 hover:bg-slate-100" onClick={()=> setNavOpen(false)}>
                ✕
              </button>
            </div>
            <Nav active={active} setActive={(t)=>{ setActive(t); setNavOpen(false); }} dueCount={dueCount} />
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl px-3 md:px-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        <aside className={`mt-16 md:col-span-3 lg:col-span-2 hidden md:block`}>
          <Nav active={active} setActive={setActive} dueCount={dueCount} />
        </aside>
        <main className="mt-16 md:col-span-9 lg:col-span-10">
          {active==='dashboard' && <Dashboard problems={problems} reviews={reviews} dueCount={dueCount} streak={streak} weekly={weekly} />}
          {active==='add' && <AddProblem onAdded={()=>{ refreshAll(); setActive('review'); }} />}
          {active==='review' && <ReviewQueue items={queue} onSubmitted={()=> refreshAll()} />}
          {active==='weekly' && (
            <WeeklyOverview
              items={weeklyItems}
              from={weekFrom}
              to={weekTo}
              onPrevWeek={()=>{ setWeekFrom(addDaysYMD(weekFrom, -7)); setWeekTo(addDaysYMD(weekTo, -7)); }}
              onNextWeek={()=>{ setWeekFrom(addDaysYMD(weekFrom, 7)); setWeekTo(addDaysYMD(weekTo, 7)); }}
              onThisWeek={()=>{ const today=formatYMDLocal(new Date()); setWeekFrom(today); setWeekTo(addDaysYMD(today, 6)); }}
              onStartToday={()=> setActive('review')}
            />
          )}
          {active==='library' && <Library problems={problems} onDeleted={()=> refreshAll()} />}
          {active==='reports' && <Reports weekly={weekly} tagStats={tagStats} />}
        </main>
      </div>
      <footer className="mt-10 py-8 text-center text-sm text-slate-500">
        <div className="flex items-center justify-center gap-2">
          <Brain size={16} /> LeetCoach — Supabase RLS protected
        </div>
      </footer>
    </div>
  );
}

function Header({ onToggleNav }: { onToggleNav: ()=>void }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-3 md:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="md:hidden p-2 rounded-lg hover:bg-slate-100" onClick={onToggleNav}>
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Layers3 className="text-blue-600" />
            <span className="font-semibold">LeetCoach</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-sm text-slate-600">
          <span className="flex items-center gap-1"><Award size={16} /> Stay consistent</span>
          <span className="flex items-center gap-1"><Gauge size={16} /> Space it smartly</span>
        </div>
      </div>
    </header>
  );
}

function Nav({ active, setActive, dueCount }: { active: "dashboard"|"review"|"weekly"|"add"|"library"|"reports"; setActive: (t: "dashboard"|"review"|"weekly"|"add"|"library"|"reports")=>void; dueCount: number }) {
  const items: { key: "dashboard"|"review"|"weekly"|"add"|"library"|"reports"; label: string; icon: React.ReactNode }[] = [
    { key: "dashboard", label: "Dashboard", icon: <TrendingUp size={18} /> },
    { key: "review", label: "Review", icon: <RefreshCw size={18} /> },
    { key: "weekly", label: "Weekly", icon: <CalendarDays size={18} /> },
    { key: "add", label: "Add Problem", icon: <Plus size={18} /> },
    { key: "library", label: "Library", icon: <NotebookPen size={18} /> },
    { key: "reports", label: "Reports", icon: <Gauge size={18} /> },
  ];
  return (
    <nav className="bg-white shadow-sm rounded-2xl p-3 sticky top-16">
      <ul className="space-y-1">
        {items.map(it => (
          <li key={it.key}>
            <button className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:bg-slate-100 transition ${active === it.key ? "bg-slate-900 text-white" : "text-slate-700"}`} onClick={()=>setActive(it.key)}>
              {it.icon}
              <span className="flex-1 text-left">{it.label}</span>
              {it.key === "review" && dueCount > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${active === it.key ? "bg-white/20" : "bg-blue-100 text-blue-700"}`}>{dueCount}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function StatCard({ title, value, icon, hint }: { title: string; value: React.ReactNode; icon: React.ReactNode; hint?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
      <div className="p-2 rounded-xl bg-slate-50">{icon}</div>
      <div>
        <div className="text-xs text-slate-500">{title}</div>
        <div className="text-xl font-semibold">{value}</div>
        {hint && <div className="text-xs text-slate-400 mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}

function Dashboard({ problems, reviews, dueCount, streak, weekly }: { problems: Problem[]; reviews: Review[]; dueCount: number; streak: number; weekly: ReturnType<typeof useWeeklyStats> }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Due Today" value={dueCount} icon={<Clock className="text-blue-600" />} hint="Cards waiting" />
        <StatCard title="Total Problems" value={problems.length} icon={<Layers3 className="text-emerald-600" />} />
        <StatCard title="7d Reviews" value={weekly.totalReviews} icon={<RefreshCw className="text-fuchsia-600" />} />
        <StatCard title="Streak" value={`${streak}d`} icon={<Flame />} hint="Keep it going!" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-2"><h3 className="font-semibold">7-Day Activity</h3></div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly.daily.map(d => ({ date: d.date.slice(5), reviews: d.count }))}>
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="reviews" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h3 className="font-semibold mb-2">Error Types (7d)</h3>
          <div className="h-64 flex items-center justify-center">
            {weekly.errorBreakdown.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={weekly.errorBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                    {weekly.errorBreakdown.map((_: { name: string; value: number }, i: number) => (
                      <Cell key={i} fill={["#60a5fa","#34d399","#fbbf24","#f87171","#a78bfa","#f472b6","#f59e0b","#22d3ee"][i % 8]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-sm">No errors logged.</div>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h3 className="font-semibold mb-2">Heatmap (last 30 days)</h3>
        <Heatmap reviews={reviews} days={30} />
      </div>
    </div>
  );
}

function AddProblem({ onAdded }: { onAdded: ()=>void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [tags, setTags] = useState<string>("");

  async function save() {
    const res = await fetch('/api/problems', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title: title || guessTitle(url), difficulty, tags: tags.split(',').map(s=>s.trim()).filter(Boolean) })
    });
    if (!res.ok) { alert('Failed to save'); return; }
    setUrl(""); setTitle(""); setTags(""); onAdded();
  }

  function guessTitle(u: string) {
    const m = u.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i);
    const slug = m ? m[1] : "Problem";
    return slug.split('-').map(s=>s[0]?.toUpperCase()+s.slice(1)).join(' ');
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 max-w-2xl">
      <h3 className="font-semibold mb-2 flex items-center gap-2"><Plus size={18} /> Add a Problem</h3>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-500">URL</label>
          <div className="flex gap-2 mt-1">
            <input className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://leetcode.com/problems/two-sum/" />
            <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onClick={()=>{ if(!title) setTitle(guessTitle(url)); }}><LinkIcon size={16} /> Parse</button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">Title</label>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={title} onChange={e=>setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Difficulty</label>
            <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={difficulty} onChange={e=>setDifficulty(e.target.value as Difficulty)}>
              <option>Easy</option><option>Medium</option><option>Hard</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500">Tags (comma separated)</label>
          <input className="w-full rounded-XL border border-slate-200 px-3 py-2 text-sm" value={tags} onChange={e=>setTags(e.target.value)} placeholder="Array, HashMap, Two Pointers" />
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-3 py-2 text-sm" onClick={save}><CircleCheckBig size={16}/> Save & Schedule</button>
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onClick={()=>{ setUrl(""); setTitle(""); setTags(""); }}>Clear</button>
        </div>
      </div>
    </div>
  );
}

function ReviewQueue({ items, onSubmitted }: { items: { id: string; problem: Problem }[]; onSubmitted: ()=>void }) {
  const [index, setIndex] = useState(0);
  const [q, setQ] = useState(3);
  const [result, setResult] = useState<"pass"|"partial"|"fail">("pass");
  const [errorTypes, setErrorTypes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [secs, setSecs] = useState(0);
  const [running, setRunning] = useState(false);
  const [showOverview, setShowOverview] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(()=>{ if(!running) return; timerRef.current = setInterval(()=> setSecs(s=>s+1), 1000); return ()=> { if (timerRef.current) clearInterval(timerRef.current); }; }, [running]);
  useEffect(()=>{ setQ(3); setResult("pass"); setErrorTypes([]); setNotes(""); setSecs(0); setRunning(false); }, [index]);
  // Clamp index whenever items length changes to avoid out-of-bounds
  useEffect(()=>{ setIndex(i => Math.min(i, Math.max(0, items.length - 1))); }, [items.length]);

  if (!items.length) return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center text-slate-500">
      <RefreshCw className="mx-auto mb-2" /> Nothing due. Add problems or come back tomorrow.
    </div>
  );

  const safeIndex = Math.min(index, Math.max(0, items.length - 1));
  const cur = items[safeIndex];

  async function submit() {
    const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId: cur.id, result, q, durationSec: secs, errorTypes, notes }) });
    if (!res.ok) { alert('Submit failed'); return; }
    setSecs(0);
    setRunning(false);
    setNotes("");
    // Keep the same visual position: after removing current item, the next one shifts into this index
    setIndex(prev => Math.max(0, Math.min(prev, items.length - 2)));
    onSubmitted();
  }

  return (
    <div className="space-y-4">
      {/* 題目總覽區塊 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Layers3 size={18} className="text-blue-600" /> 今天的題目總覽 ({items.length})
          </h3>
          <button 
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-100 transition"
            onClick={() => setShowOverview(!showOverview)}
          >
            {showOverview ? '收起' : '展開'}
          </button>
        </div>
        
        {showOverview && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item, idx) => (
              <div 
                key={item.id}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  idx === safeIndex 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                }`}
                onClick={() => setIndex(idx)}
              >
                <div className="font-medium text-sm mb-2 line-clamp-2">{item.problem.title}</div>
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <Badge>{item.problem.difficulty}</Badge>
                  {item.problem.tags?.slice(0, 2).map((tag, i) => (
                    <Badge key={i}><Tag size={12}/> {tag}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>#{idx + 1}</span>
                  {idx === safeIndex && <span className="text-blue-600 font-medium">目前題目</span>}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-3 pt-3 border-t border-slate-200 text-sm text-slate-500 text-center">
          點擊題目卡片可以直接跳到該題目進行複習
        </div>
      </div>

      {/* 原來的複習介面 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-3"><h3 className="font-semibold flex items-center gap-2"><PlayCircle/> Review {safeIndex+1} / {items.length}</h3><div className="text-sm text-slate-500 flex items-center gap-2"><Timer size={16}/> {secs}s</div></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <a className="block p-4 rounded-xl border hover:border-blue-300 hover:bg-blue-50/30 transition" href={cur.problem.url} target="_blank" rel="noreferrer">
            <div className="text-sm text-slate-500 flex items-center gap-2"><LinkIcon size={16}/> {cur.problem.source}</div>
            <div className="mt-1 font-semibold">{cur.problem.title}</div>
            <div className="mt-1 text-xs text-slate-500 flex flex-wrap gap-2 items-center">
              <Badge>{cur.problem.difficulty}</Badge>
              {cur.problem.tags?.map((t:string,i:number)=>(<Badge key={i}><Tag size={12}/> {t}</Badge>))}
            </div>
          </a>
          <div className="p-4 rounded-xl border bg-slate-50">
            <div className="text-sm text-slate-600">Self-grade (Q)</div>
            <div className="flex gap-2 mt-2">{[0,1,2,3,4,5].map(n=>(<button key={n} className={`px-3 py-2 rounded-lg border ${q === n ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-100'}`} onClick={()=>setQ(n)}>{n}</button>))}</div>
          </div>
          <div className="p-4 rounded-xl border bg-white">
            <div className="text-sm text-slate-600 mb-2">Result</div>
            <div className="flex gap-2">
              <button className={`rounded-xl border border-slate-200 px-3 py-2 text-sm ${result==='pass'?'bg-slate-900 text-white':''}`} onClick={()=>setResult('pass')}><CheckCircle2 size={16}/> Pass</button>
              <button className={`rounded-xl border border-slate-200 px-3 py-2 text-sm ${result==='partial'?'bg-slate-900 text-white':''}`} onClick={()=>setResult('partial')}><AlertTriangle size={16}/> Partial</button>
              <button className={`rounded-xl border border-slate-200 px-3 py-2 text-sm ${result==='fail'?'bg-slate-900 text-white':''}`} onClick={()=>setResult('fail')}><XCircle size={16}/> Fail</button>
            </div>
          </div>
          <div className="p-4 rounded-xl border bg-white">
            <div className="text-sm text-slate-600 mb-2">Error types</div>
            <div className="flex flex-wrap gap-2">{"Logic,Edge Case,Complexity,API/Library,Misread,Data Structure".split(',').map(et=> (
              <label key={et} className={`px-3 py-1 rounded-full border text-sm cursor-pointer ${errorTypes.includes(et) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-slate-100'}`}>
                <input type="checkbox" className="hidden" checked={errorTypes.includes(et)} onChange={()=> setErrorTypes(prev => prev.includes(et) ? prev.filter(x=>x!==et) : [...prev, et]) } />
                {et}
              </label>
            ))}</div>
          </div>
          <div className="p-4 rounded-xl border bg-white">
            <div className="text-sm text-slate-600 mb-1">Notes (≤ 200 chars)</div>
            <textarea className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm h-24" maxLength={200} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Idea, template, edge cases..." />
          </div>
        </div>
        <div className="space-y-3">
          <div className="p-4 rounded-2xl border bg-white">
            <div className="text-sm text-slate-600">Timer</div>
            <div className="text-3xl font-semibold mt-1">{secs}s</div>
            <div className="flex gap-2 mt-2">
              {!running ? (<button className="rounded-xl bg-slate-900 text-white px-3 py-2 text-sm w-full" onClick={()=>setRunning(true)}>Start</button>) : (<button className="rounded-xl border border-slate-200 px-3 py-2 text-sm w-full" onClick={()=>setRunning(false)}>Pause</button>)}
              <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm w-full" onClick={()=>{ setSecs(0); setRunning(false); }}>Reset</button>
            </div>
          </div>
          <div className="p-4 rounded-2xl border bg-white">
            <div className="text-sm text-slate-600 mb-2">Queue</div>
            <div className="flex items-center justify-between">
              <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm" disabled={safeIndex===0} onClick={()=>setIndex(i=>Math.max(0,i-1))}><ChevronLeft size={16}/> Prev</button>
              <div className="text-sm text-slate-500">{safeIndex+1} / {items.length}</div>
              <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm" disabled={safeIndex===items.length-1} onClick={()=>setIndex(i=>Math.min(items.length-1, i+1))}>Next <ChevronRight size={16}/></button>
            </div>
            <div className="mt-3 text-xs text-slate-500">Give Q then submit to schedule next review.</div>
            <button className="rounded-xl bg-slate-900 text-white px-3 py-2 text-sm w-full mt-3" onClick={submit}>Submit & Next</button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

function Library({ problems, onDeleted }: { problems: Problem[]; onDeleted: ()=>void }) {
  const [q, setQ] = useState("");
  const list = problems.filter(p=> !q.trim() || p.title.toLowerCase().includes(q.toLowerCase()) || (p.tags||[]).join(',').toLowerCase().includes(q.toLowerCase()));
  async function del(id: string) {
    if (!confirm('Delete this problem?')) return;
    const res = await fetch(`/api/problems/${id}`, { method: 'DELETE' });
    if (!res.ok) { alert('Delete failed'); return; }
    onDeleted();
  }
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="font-semibold">Your Library</div>
        <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm w-full sm:w-72" placeholder="Search title or tag..." value={q} onChange={e=>setQ(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map(p => (
          <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <a className="font-semibold hover:underline" href={p.url} target="_blank" rel="noreferrer">{p.title}</a>
            <div className="mt-1 text-xs text-slate-500 flex flex-wrap gap-2 items-center">
              <Badge>{p.difficulty}</Badge>
              {p.tags?.map((t, i)=> <Badge key={i}><Tag size={12}/> {t}</Badge>)}
            </div>
            <div className="mt-2 text-xs text-slate-500">Due: {p.card ? (p.card.due_at) : '—'} · Reps: {p.card?.repetitions ?? 0} · EF: {p.card && typeof p.card.ease_factor === 'number' ? p.card.ease_factor.toFixed(2) : '—'}</div>
            <div className="mt-3 flex gap-2">
              <a className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm w-full text-center" href={p.url} target="_blank" rel="noreferrer">Open</a>
              <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm w-full" onClick={()=>del(p.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function startOfDay(ts: number = Date.now()) { const d = new Date(ts); d.setHours(0,0,0,0); return d.getTime(); }
function addDays(ts: number, days: number) { const d = new Date(ts); d.setDate(d.getDate()+days); return d.getTime(); }
function formatDate(ts: number) { const d = new Date(ts); return formatYMDLocal(d); }
function formatYMDLocal(d: Date) { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
function parseYMDLocal(s: string) { const [y,m,day] = s.split('-').map(Number); return new Date(y, (m||1)-1, day||1); }
function addDaysYMD(ymd: string, days: number) { const d=parseYMDLocal(ymd); d.setDate(d.getDate()+days); return formatYMDLocal(d); }

function useWeeklyStats(reviews: Review[]) {
  const today = startOfDay();
  const from = addDays(today, -6);
  const days: { date: string; count: number; avgQ: number }[] = [];
  for (let i=0;i<7;i++){ const d = addDays(from, i); const list = reviews.filter(r=> startOfDay(new Date(r.finished_at).getTime()) === d); days.push({ date: formatDate(d), count: list.length, avgQ: list.length? list.reduce((s,r)=>s+r.q,0)/list.length : 0 }); }
  const last7 = reviews.filter(r=> new Date(r.finished_at).getTime() >= from);
  const totalReviews = last7.length;
  const avgQ = totalReviews ? last7.reduce((s,r)=>s+r.q,0)/totalReviews : 0;
  const avgSec = totalReviews ? last7.reduce((s,r)=>s+r.duration_sec,0)/totalReviews : 0;
  const errorMap = new Map<string, number>();
  last7.forEach(r=> r.error_types.forEach(e=> errorMap.set(e,(errorMap.get(e)??0)+1)));
  const topError = [...errorMap.entries()].sort((a,b)=> b[1]-a[1])[0]?.[0];
  const errorBreakdown = [...errorMap.entries()].map(([name,value])=>({ name, value }));
  return { daily: days, totalReviews, avgQ, avgSec, topError, errorBreakdown };
}

function useStreak(reviews: Review[]) {
  let streak = 0;
  let day = startOfDay();
  // Count from today backwards until a day has zero reviews
  while (true) {
    const has = reviews.some(r => startOfDay(new Date(r.finished_at).getTime()) === day);
    if (!has) break;
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

function useTagStats(reviews: Review[], problems: Problem[]) {
  const byTag = new Map<string, { attempts: number; fails: number; seconds: number }>();
  reviews.forEach(r=>{
    const p = problems.find(p=>p.id===r.problem_id); if (!p) return; const tags = p.tags?.length ? p.tags : ['(untagged)'];
    tags.forEach(t=>{ const cur = byTag.get(t) ?? { attempts:0, fails:0, seconds:0 }; cur.attempts += 1; if (r.result==='fail') cur.fails += 1; cur.seconds += r.duration_sec; byTag.set(t, cur); });
  });
  const byFailRate = [...byTag.entries()].map(([tag,v])=>({ tag, failRate: v.attempts? +(v.fails/v.attempts).toFixed(2) : 0 })).sort((a,b)=> b.failRate-a.failRate).slice(0,10);
  const byTime = [...byTag.entries()].map(([tag,v])=>({ tag, seconds: v.seconds })).sort((a,b)=> b.seconds-a.seconds).slice(0,10);
  return { byFailRate, byTime };
}

function Heatmap({ reviews, days=30 }: { reviews: Review[]; days?: number }) {
  const today = startOfDay();
  const cells: { date: number; count: number }[] = [];
  for (let i=days-1;i>=0;i--){ const d = addDays(today, -i); const count = reviews.filter(r=> startOfDay(new Date(r.finished_at).getTime()) === d).length; cells.push({ date: d, count }); }
  const max = Math.max(1, ...cells.map(c=>c.count));
  function bg(c:number){ const t=c/max; if (t===0) return 'bg-slate-100'; if (t<0.25) return 'bg-blue-100'; if (t<0.5) return 'bg-blue-200'; if (t<0.75) return 'bg-blue-400'; return 'bg-blue-600'; }
  return (
    <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-30 lg:grid-cols-30 gap-1">
      {cells.map((c,i)=> <div key={i} className={`h-6 rounded ${bg(c.count)}`} title={`${formatDate(c.date)} • ${c.count} reviews`} />)}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) { return <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs inline-flex items-center gap-1">{children}</span>; }
function Flame(){ return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2s6 5 6 10a6 6 0 11-12 0c0-3 2-5 4-7l2-3z" stroke="#ef4444" strokeWidth="1.5" fill="#fee2e2"/></svg>); }

function Reports({ weekly, tagStats }: { weekly: ReturnType<typeof useWeeklyStats>; tagStats: ReturnType<typeof useTagStats> }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <h3 className="font-semibold mb-2">Weekly Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard title="Reviews" value={weekly.totalReviews} icon={<RefreshCw className="text-blue-600" />} />
          <StatCard title="Avg Q" value={weekly.avgQ.toFixed(2)} icon={<Gauge className="text-emerald-600" />} />
          <StatCard title="Avg Seconds" value={weekly.avgSec.toFixed(0)} icon={<Timer className="text-fuchsia-600" />} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h3 className="font-semibold mb-2">Top Tags by Fail Rate</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tagStats.byFailRate}>
                <XAxis dataKey="tag" hide />
                <YAxis allowDecimals={false} domain={[0,1]} />
                <Tooltip />
                <Bar dataKey="failRate" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h3 className="font-semibold mb-2">Tags by Time Spent</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tagStats.byTime}>
                <XAxis dataKey="tag" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="seconds" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeeklyOverview({ items, from, to, onPrevWeek, onNextWeek, onThisWeek, onStartToday }: { items: { id: string; due_at: string; problem: Problem }[]; from: string; to: string; onPrevWeek: ()=>void; onNextWeek: ()=>void; onThisWeek: ()=>void; onStartToday: ()=>void }) {
  const days: { date: string; label: string }[] = [];
  const start = parseYMDLocal(from);
  for (let i=0;i<7;i++){ const d = new Date(start); d.setDate(d.getDate()+i); const iso=formatYMDLocal(d); days.push({ date: iso, label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' }) }); }
  
  const todayYMD = formatYMDLocal(new Date());
  const isViewingThisWeek = from === todayYMD;
  
  // Group items by date, but for this week's view, move overdue items to today
  const grouped = items.reduce((acc: Record<string, typeof items>, it) => { 
    let targetDate = it.due_at;
    
    // If viewing this week and item is overdue, show it under today
    if (isViewingThisWeek && it.due_at < todayYMD) {
      targetDate = todayYMD;
    }
    
    (acc[targetDate] ||= []).push(it); 
    return acc; 
  }, {} as Record<string, typeof items>);
  
  const total = items.length;
  const isEmpty = total === 0;
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="font-semibold">This Week ({new Date(from).toLocaleDateString()} – {new Date(to).toLocaleDateString()})</div>
        <div className="flex gap-2">
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onClick={onPrevWeek}><ChevronLeft size={16}/> Prev</button>
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onClick={onThisWeek}>This Week</button>
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onClick={onNextWeek}>Next <ChevronRight size={16}/></button>
          <button className="rounded-xl bg-slate-900 text-white px-3 py-2 text-sm" onClick={onStartToday}><PlayCircle size={16}/> Start Today</button>
        </div>
      </div>
      {isEmpty ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center text-slate-500">
          <div className="text-base font-medium mb-1">本週沒有待複習的題目</div>
          <div className="text-sm">你可以先去排程或替題目加上標籤，建立你的複習節奏。</div>
          <div className="flex gap-2 justify-center mt-3">
            <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" onClick={onStartToday}>開始今天</button>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {days.map(d => {
          const isToday = d.date === todayYMD;
          const cardClass = `bg-white rounded-2xl p-3 shadow-sm border ${isToday ? 'border-blue-400 bg-blue-50/40' : 'border-slate-100'}`;
          return (
          <div key={d.date} className={cardClass} onDragOver={(e)=>{ e.preventDefault(); }} onDrop={async (e)=>{
            e.preventDefault();
            const cardId = e.dataTransfer.getData('text/plain');
            const targetDate = d.date;
            if (!cardId) return;
            const res = await fetch(`/api/cards/${cardId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ due_at: targetDate }) });
            if (!res.ok) { alert('Failed to reschedule'); return; }
            // optimistic: remove from old day and add to new day in local state by refetching
            // Easiest: trigger This Week reload
            const ev = new Event('weekly-refresh');
            window.dispatchEvent(ev);
          }}>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>{d.label}</span>
            </div>
            <div className="text-lg font-semibold">{grouped[d.date]?.length ?? 0}</div>
            <div className="mt-2 space-y-2 max-h-72 overflow-auto pr-1">
              {(grouped[d.date] ?? []).map(it => (
                <div key={it.id} className="p-2 rounded-xl border hover:border-blue-300 hover:bg-blue-50/40 transition" draggable onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', it.id); e.dataTransfer.setData('application/x-ymd', it.due_at); }}>
                  <a className="font-medium text-sm hover:underline" href={it.problem.url} target="_blank" rel="noreferrer">{it.problem.title}</a>
                  <div className="mt-1 text-xs text-slate-500 flex flex-wrap gap-2 items-center">
                    <Badge>{it.problem.difficulty}</Badge>
                    {it.problem.tags?.slice(0,2).map((t,i)=>(<Badge key={i}><Tag size={12}/> {t}</Badge>))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          );
        })}
      </div>
      )}
      <div className="text-sm text-slate-500">Total this week: {total}</div>
    </div>
  );
}


