import { useState, useEffect, useRef } from "react";
import {
  Plus, ChevronLeft, Check, Trash2, UserPlus,
  Search, X, Copy, CheckCheck,
  Bell, Users, Home, BarChart2, ArrowUpRight,
  Receipt, Lock,
} from "lucide-react";
import { supabase } from "./supabase";

/* ─── Palette ─────────────────────────────────────────────── */
const C = {
  bg: "#0d0d0d", surf: "#141414", card: "#1c1c1c", card2: "#222",
  div: "#242424", border: "#2a2a2a",
  accent: "#e12020", accentBg: "rgba(225,32,32,0.1)", accentBorder: "rgba(225,32,32,0.22)",
  text: "#ffffff", sub: "#a0a0a0",
  muted: "#2e2e2e", muted2: "#5a5a5a",
  paid: "#4ade80", paidBg: "rgba(74,222,128,0.1)", paidBorder: "rgba(74,222,128,0.22)",
  unpaid: "#fb923c", unpaidBg: "rgba(251,146,60,0.08)", unpaidBorder: "rgba(251,146,60,0.2)",
  payer: "#facc15", payerBg: "rgba(250,204,21,0.1)", payerBorder: "rgba(250,204,21,0.22)",
  you: "#a78bfa", youBg: "rgba(167,139,250,0.1)", youBorder: "rgba(167,139,250,0.22)",
  danger: "#ef4444",
};
/* ─── Fonts ───────────────────────────────────────────────── */
const F = { sans: "'Plus Jakarta Sans', sans-serif", mono: "'DM Mono', monospace" };

/* ─── DB layer ────────────────────────────────────────────── */
const DB = {
  async get(key) {
    try {
      const { data } = await supabase.from("mak_data").select("value").eq("key", key).maybeSingle();
      const v = data?.value;
      if (!v) return null;
      /* unwrap legacy wrapped format { _data, _cid } written by a previous code version */
      if (v && typeof v === "object" && !Array.isArray(v) && "_data" in v) return v._data;
      return v;
    } catch { return null; }
  },
  async set(key, val) {
    try { await supabase.from("mak_data").upsert({ key, value: val, updated_at: new Date().toISOString() }, { onConflict: "key" }); }
    catch (e) { console.error(e); }
  },
};
const identity = {
  get: () => { try { return localStorage.getItem("nk-identity"); } catch { return null; } },
  set: (n) => { try { localStorage.setItem("nk-identity", n); } catch {} },
};
const SK = { roster: "nk-roster-v1", matches: "nk-matches-v1", expenses: "nk-expenses-v1" };
const DEFAULT_SQUAD = ["Praveen","Mahesh S","Karthik","Raghu","Chandu","Harsha","Anand","Mahesh P","Anand P","Chetan","Shrishail","Balaji"];

/* ─── Helpers ─────────────────────────────────────────────── */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function fmtDate(d) { if (!d) return ""; return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" }); }
function fmtAmt(n) { return "₹" + Math.round(n).toLocaleString("en-IN"); }
function generateSummary(match) {
  const share = match.totalFee / match.players.length;
  const nonPayers = match.players.filter(p => p !== match.payer);
  const paidCount = nonPayers.filter(p => match.payments[p]).length;
  return [
    `🏏 NK Brigade — ${match.name || fmtDate(match.date)} (${match.format})`,
    `Match fee: ${fmtAmt(match.totalFee)} ÷ ${match.players.length} = ${fmtAmt(share)}/person`,
    `Paid by: ${match.payer} 💰`, ``,
    `${match.payer} ✅`,
    ...nonPayers.map(p => `${p} ${match.payments[p] ? "✅" : "❌"}`),
    ``, `${paidCount}/${nonPayers.length} settled`,
  ].join("\n");
}

/* ─── Semi-circular gauge (matches reference exactly) ──────── */
function SemiGauge({ pct, color, size = 96 }) {
  const r = size * 0.38, cx = size / 2, cy = size * 0.56;
  const arc = (rr) => `M ${cx - rr} ${cy} A ${rr} ${rr} 0 0 1 ${cx + rr} ${cy}`;
  const len = Math.PI * r;
  return (
    <svg width={size} height={size * 0.58} viewBox={`0 0 ${size} ${size * 0.58}`} style={{ display: "block" }}>
      <path d={arc(r)} fill="none" stroke="#252525" strokeWidth={size * 0.058} strokeLinecap="round" />
      {pct > 0 && <path d={arc(r)} fill="none" stroke={color} strokeWidth={size * 0.058} strokeLinecap="round"
        strokeDasharray={`${Math.min(pct, 1) * len} ${len}`} />}
    </svg>
  );
}

/* ─── Fonts inject ────────────────────────────────────────── */
function Fonts() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0d0d; font-family: 'Plus Jakarta Sans', sans-serif; -webkit-font-smoothing: antialiased; }
        input, select, button { font-family: 'Plus Jakarta Sans', sans-serif; }
        input, select { color-scheme: dark; }
        button:active { opacity: 0.72; }
        ::-webkit-scrollbar { width: 0; height: 0; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
      `}</style>
    </>
  );
}

/* ─── Shared input style ──────────────────────────────────── */
const iStyle = (x = {}) => ({ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontSize: 15, fontWeight: 500, padding: "13px 16px", outline: "none", boxSizing: "border-box", colorScheme: "dark", ...x });
const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: C.muted2, marginBottom: 7, textTransform: "uppercase", letterSpacing: 1 };

/* ─── Icon button (search / bell style from reference) ───── */
function IconBtn({ children, badge, onClick }) {
  return (
    <button onClick={onClick} style={{ position: "relative", width: 40, height: 40, borderRadius: 13, background: C.card, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
      {children}
      {badge && <div style={{ position: "absolute", top: 7, right: 7, width: 8, height: 8, borderRadius: "50%", background: C.accent, border: "2px solid #0d0d0d" }} />}
    </button>
  );
}

/* ─── Bottom nav — pill, 4 tabs ───────────────────────────── */
function BottomNav({ active, onHome, onMatches, onExpenses, onSquad }) {
  const tabs = [
    { id: "home",     icon: Home,     label: "Home",     fn: onHome },
    { id: "matches",  icon: BarChart2, label: "Matches",  fn: onMatches },
    { id: "expenses", icon: Receipt,  label: "Expenses", fn: onExpenses },
    { id: "squad",    icon: Users,    label: "Squad",    fn: onSquad },
  ];
  return (
    <div style={{ position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 36px)", maxWidth: 420, background: C.surf, borderRadius: 100, border: `1px solid ${C.div}`, display: "flex", padding: 5, boxShadow: "0 24px 64px rgba(0,0,0,0.85)", zIndex: 20 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={t.fn}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, border: "none", cursor: "pointer", padding: "9px 0", borderRadius: 100, background: active === t.id ? C.accent : "none", color: active === t.id ? "#fff" : C.muted2, transition: "all .2s" }}>
          <t.icon size={17} strokeWidth={active === t.id ? 2.5 : 1.8} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.4 }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ─── Header ──────────────────────────────────────────────── */
function Header({ title, subtitle, onBack, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "14px 20px 12px", borderBottom: `1px solid ${C.div}`, background: C.surf, position: "sticky", top: 0, zIndex: 10 }}>
      {onBack ? (
        <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 }}>
          <ChevronLeft size={18} />
        </button>
      ) : <div style={{ width: 4 }} />}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: -0.3 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, fontWeight: 500, color: C.sub, marginTop: 1 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

/* ─── Onboarding ──────────────────────────────────────────── */
function OnboardingScreen({ roster, current, onSelect, onBack }) {
  const [search, setSearch] = useState("");
  const [intro, setIntro] = useState(!current);
  const filtered = roster.filter(n => n.toLowerCase().includes(search.toLowerCase()));

  if (intro) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ width: 76, height: 76, borderRadius: 22, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 20, boxShadow: "0 14px 40px rgba(225,32,32,0.4)" }}>🏏</div>
      <div style={{ fontSize: 44, fontWeight: 800, color: C.text, letterSpacing: -1, textAlign: "center", lineHeight: 1.05, marginBottom: 4 }}>NK<br /><span style={{ color: C.accent }}>Brigade</span></div>
      <div style={{ fontSize: 13, fontWeight: 500, color: C.sub, marginBottom: 36, textAlign: "center" }}>Cricket match fee tracker</div>
      {[
        { icon: "🏏", t: "Log Each Match", d: "Record date, format, total ground fee and who played" },
        { icon: "💰", t: "Track Who Paid", d: "Mark the player who paid the ground fee upfront" },
        { icon: "✅", t: "Settle in One Tap", d: "Each player marks themselves paid once they transfer their share" },
      ].map((s, i) => (
        <div key={i} style={{ width: "100%", display: "flex", gap: 14, marginBottom: 10, padding: "14px 16px", background: C.card, borderRadius: 16, border: `1px solid ${C.border}` }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: C.accentBg, border: `1px solid ${C.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{s.icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 3 }}>{s.t}</div>
            <div style={{ fontSize: 12, fontWeight: 400, color: C.sub, lineHeight: 1.55 }}>{s.d}</div>
          </div>
        </div>
      ))}
      <button onClick={() => setIntro(false)} style={{ width: "100%", marginTop: 16, padding: "16px", background: C.accent, color: "#fff", border: "none", borderRadius: 16, fontWeight: 800, fontSize: 16, cursor: "pointer", boxShadow: "0 10px 28px rgba(225,32,32,0.4)", letterSpacing: -0.2 }}>
        Pick My Name →
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      {current && <Header title="Change Identity" onBack={onBack} />}
      <div style={{ flex: 1, padding: "28px 20px 40px" }}>
        {!current && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: C.text, letterSpacing: -0.5, marginBottom: 6 }}>Who are you?</div>
            <div style={{ fontSize: 13, fontWeight: 400, color: C.sub, lineHeight: 1.6 }}>Pick your name. Saved only on this device — no login needed.</div>
          </div>
        )}
        <div style={{ position: "relative", marginBottom: 14 }}>
          <Search size={15} style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: C.muted2, pointerEvents: "none" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your name…" style={{ ...iStyle({ paddingLeft: 44 }) }} autoFocus />
        </div>
        <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
          {filtered.map(name => {
            const sel = name === current;
            return (
              <button key={name} onClick={() => onSelect(name)} style={{ width: "100%", display: "flex", alignItems: "center", padding: "13px 16px", background: sel ? C.accentBg : C.card, border: `1px solid ${sel ? C.accentBorder : C.border}`, borderRadius: 14, marginBottom: 8, cursor: "pointer", textAlign: "left" }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: sel ? C.accent : C.card2, color: sel ? "#fff" : C.muted2, fontFamily: F.mono, fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 14, flexShrink: 0 }}>{name[0].toUpperCase()}</div>
                <span style={{ flex: 1, fontSize: 16, fontWeight: sel ? 700 : 500, color: sel ? C.accent : C.text }}>{name}</span>
                {sel && <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={14} color="#fff" strokeWidth={3} /></div>}
              </button>
            );
          })}
          {filtered.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: C.sub, fontSize: 14 }}><div style={{ fontSize: 30, marginBottom: 8 }}>🤔</div>Not found. Ask the group admin to add you.</div>}
        </div>
      </div>
    </div>
  );
}

/* ─── Step label with auto-checkmark ─────────────────────── */
function StepLabel({ n, title, hint, done, count }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: hint ? 5 : 0 }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: done ? C.paid : C.accent, color: done ? "#0d0d0d" : "#fff", fontWeight: 800, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .2s" }}>
          {done ? <Check size={13} strokeWidth={3.5} /> : n}
        </div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: -0.3 }}>{title}</div>
        {count != null && <div style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: done ? C.paid : C.sub }}>{count}</div>}
      </div>
      {hint && <div style={{ fontSize: 12, fontWeight: 400, color: C.sub, lineHeight: 1.55, paddingLeft: 36 }}>{hint}</div>}
    </div>
  );
}

/* ─── Inline player chip (replaces modal entirely) ────────── */
function PlayerChip({ name, selected, isPayer, onTap, disabled }) {
  return (
    <button onClick={disabled ? undefined : onTap}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "11px 4px 9px", borderRadius: 16, background: isPayer ? C.payerBg : selected ? C.accentBg : C.card, border: `2px solid ${isPayer ? C.payerBorder : selected ? C.accentBorder : C.border}`, cursor: disabled ? "default" : "pointer", transition: "all .13s", position: "relative", width: "100%", opacity: disabled ? 0.45 : 1 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: isPayer ? C.payer : selected ? C.accent : C.card2, color: "#fff", fontFamily: F.mono, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {name[0].toUpperCase()}
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, color: isPayer ? C.payer : selected ? C.text : C.sub, textAlign: "center", lineHeight: 1.25, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 3px" }}>
        {name.split(" ")[0]}
        {name.split(" ")[1] ? <span style={{ opacity: 0.7 }}>{" " + name.split(" ")[1]}</span> : null}
      </div>
      {isPayer && (
        <div style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: C.payer, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, border: "2px solid #0d0d0d" }}>💰</div>
      )}
      {selected && !isPayer && (
        <div style={{ position: "absolute", top: -5, right: -5, width: 16, height: 16, borderRadius: "50%", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #0d0d0d" }}>
          <Check size={9} color="#fff" strokeWidth={3.5} />
        </div>
      )}
    </button>
  );
}

/* ─── HOME SCREEN — Portfolio Risk Score layout ────────────── */
function HomeScreen({ matches, expenses, myId, onMatchClick, onNew, onMatches, onExpenses, onSquad, onChangeId, onMarkPaid }) {
  const [showNotifs, setShowNotifs] = useState(false);
  const total = matches.length;
  const isSettled = (m) => { const np = (m.players || []).filter(p => p !== m.payer); return np.length > 0 && np.every(p => m.payments?.[p]); };
  const isPending = (m) => { const np = (m.players || []).filter(p => p !== m.payer); return np.length > 0 && np.some(p => !m.payments?.[p]); };
  const settledMs = matches.filter(isSettled);
  const pendingMs  = matches.filter(isPending);
  const barPct = total ? settledMs.length / total : 0;

  /* combine match + expense debt for "Your Balance" */
  const myPendingMatches  = matches.filter(m => myId && m.payer !== myId && m.players.includes(myId) && !m.payments[myId]);
  const myPendingExpenses = expenses.filter(e => myId && e.payer !== myId && e.participants.includes(myId) && !e.payments[myId]);
  const myOwed = myPendingMatches.reduce((s, m) => s + m.totalFee / m.players.length, 0)
               + myPendingExpenses.reduce((s, e) => s + e.totalAmount / e.participants.length, 0);
  const myPendingCount = myPendingMatches.length + myPendingExpenses.length;

  const balanceSub = myPendingCount === 0
    ? "You're all settled! 🎉"
    : [
        myPendingMatches.length > 0 && `${myPendingMatches.length} match${myPendingMatches.length > 1 ? "es" : ""}`,
        myPendingExpenses.length > 0 && `${myPendingExpenses.length} expense${myPendingExpenses.length > 1 ? "s" : ""}`,
      ].filter(Boolean).join(" + ");

  const rows = [
    { dot: C.payer,   title: "Your Balance",    sub: balanceSub,                                                                                               val: myPendingCount === 0 ? "₹0" : fmtAmt(myOwed), pct: myOwed > 0 ? Math.min(myOwed / 3000, 1) : 0, color: myPendingCount === 0 ? C.paid : C.payer },
    { dot: C.accent,  title: "Pending Matches", sub: pendingMs.length === 0 ? "All fees recovered ✓" : "Not everyone has paid back yet",                       val: pendingMs.length.toString(),                   pct: total ? pendingMs.length / total : 0,         color: C.accent },
    { dot: "#ffffff", title: "Settled Matches",  sub: settledMs.length === total && total > 0 ? "All matches fully closed!" : "Everyone paid back the payer",  val: settledMs.length.toString(),                   pct: total ? settledMs.length / total : 0,         color: "#ffffff" },
  ];

  return (
    <div style={{ paddingBottom: 90, minHeight: "100vh", background: C.bg }}>
      {/* Header row — avatar + search/bell */}
      <div style={{ padding: "20px 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onChangeId} style={{ width: 44, height: 44, borderRadius: "50%", background: C.accent, border: "none", color: "#fff", fontFamily: F.mono, fontWeight: 700, fontSize: 17, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(225,32,32,0.4)", flexShrink: 0 }}>
            {myId ? myId[0].toUpperCase() : "?"}
          </button>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.sub }}>Welcome back</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{myId || "—"}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <IconBtn badge={myPendingCount > 0} onClick={() => setShowNotifs(v => !v)}><Bell size={17} color={showNotifs ? C.text : C.sub} /></IconBtn>
          <button onClick={onNew} style={{ width: 40, height: 40, borderRadius: 13, background: C.accent, border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 16px rgba(225,32,32,0.45)" }}>
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* ── Notifications panel ── */}
      {showNotifs && (
        <div style={{ margin: "0 16px 14px", background: C.surf, borderRadius: 18, border: `1px solid ${C.div}`, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px 10px", borderBottom: `1px solid ${C.div}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Your Pending Payments</div>
            <div style={{ fontFamily: F.mono, fontSize: 12, color: C.accent }}>{myPendingCount} item{myPendingCount !== 1 ? "s" : ""}</div>
          </div>
          {myPendingCount === 0 ? (
            <div style={{ padding: "24px 18px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>All settled!</div>
              <div style={{ fontSize: 12, color: C.sub }}>You don't owe anyone right now.</div>
            </div>
          ) : (
            <div>
              {myPendingMatches.map(m => {
                const share = m.totalFee / m.players.length;
                return (
                  <button key={m.id} onClick={() => { onMatchClick(m.id); setShowNotifs(false); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", padding: "13px 18px", background: "none", border: "none", borderBottom: `1px solid ${C.div}`, cursor: "pointer", textAlign: "left", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 11, background: C.accentBg, border: `1px solid ${C.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🏏</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{fmtDate(m.date)} · {m.format}</div>
                      <div style={{ fontSize: 11, color: C.sub }}>Pay <b style={{ color: C.text }}>{m.payer}</b></div>
                    </div>
                    <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 15, color: C.accent, flexShrink: 0 }}>{fmtAmt(share)}</div>
                  </button>
                );
              })}
              {myPendingExpenses.map(e => {
                const share = e.totalAmount / e.participants.length;
                return (
                  <button key={e.id} onClick={() => { onExpenses(); setShowNotifs(false); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", padding: "13px 18px", background: "none", border: "none", borderBottom: `1px solid ${C.div}`, cursor: "pointer", textAlign: "left", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 11, background: "rgba(250,204,21,0.1)", border: `1px solid ${C.payerBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🍽️</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</div>
                      <div style={{ fontSize: 11, color: C.sub }}>Pay <b style={{ color: C.text }}>{e.payer}</b></div>
                    </div>
                    <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 15, color: C.payer, flexShrink: 0 }}>{fmtAmt(share)}</div>
                  </button>
                );
              })}
              <div style={{ padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.sub }}>Total you owe</div>
                <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 16, color: C.text }}>{fmtAmt(myOwed)}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MAIN ANALYTICS CARD — exact Portfolio Risk Score layout ── */}
      <div style={{ margin: "0 16px 14px", background: C.surf, borderRadius: 22, overflow: "hidden", border: `1px solid ${C.div}` }}>
        {/* Top: title + updated + bar */}
        <div style={{ padding: "22px 22px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <div style={{ fontSize: 28, fontWeight: 300, color: C.text, lineHeight: 1.2, letterSpacing: -0.5 }}>
              Match Fee<br />Tracker
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 400, color: C.sub }}>{total} match{total !== 1 ? "es" : ""}</div>
              <div style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 600, color: barPct === 1 && total > 0 ? C.paid : C.sub, marginTop: 2 }}>
                {Math.round(barPct * 100)}% settled {barPct === 1 && total > 0 ? "✓" : ""}
              </div>
            </div>
          </div>
          {/* Settlement bar */}
          <div style={{ height: 7, background: "#1e1e1e", borderRadius: 100, position: "relative", overflow: "hidden", marginBottom: 7 }}>
            {[...Array(22)].map((_, i) => (
              <div key={i} style={{ position: "absolute", left: `${(i + 1) * 4.5}%`, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.06)", zIndex: 0 }} />
            ))}
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${barPct * 100}%`, background: barPct === 1 ? `linear-gradient(90deg, #22c55e, #4ade80)` : `linear-gradient(90deg, ${C.accent} 0%, #ff5050 100%)`, borderRadius: 100, boxShadow: barPct === 1 ? "0 0 10px rgba(34,197,94,0.4)" : `0 0 10px rgba(225,32,32,0.5)`, transition: "width .6s ease, background .4s ease", zIndex: 1 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: C.sub }}>{pendingMs.length} pending</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: settledMs.length > 0 ? C.paid : C.sub }}>{settledMs.length} settled</span>
          </div>
        </div>

        {/* Three analytics rows — separated by dividers (like reference) */}
        {rows.map((row, i) => (
          <div key={i}>
            <div style={{ height: 1, background: C.div }} />
            <div style={{ padding: "18px 22px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: row.dot, flexShrink: 0, boxShadow: row.dot === C.accent ? "0 0 6px rgba(225,32,32,0.6)" : "none" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{row.title}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 400, color: C.sub, marginBottom: 14, paddingLeft: 18 }}>{row.sub}</div>
                <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 36, color: C.text, paddingLeft: 18, letterSpacing: -1 }}>{row.val}</div>
              </div>
              <div style={{ flexShrink: 0, marginTop: -4 }}>
                <SemiGauge pct={row.pct} color={row.color} size={100} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Log Match CTA — always visible, prominent ── */}
      <div style={{ padding: "0 16px 14px" }}>
        <button onClick={onNew} style={{ width: "100%", padding: "15px 18px", background: C.accent, borderRadius: 18, color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 28px rgba(225,32,32,0.38)", textAlign: "left" }}>
          <div style={{ width: 40, height: 40, borderRadius: 13, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Plus size={22} strokeWidth={3} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: -0.2 }}>Log a New Match</div>
            <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.75, marginTop: 1 }}>Pick players → set fee → mark payer · 30 sec</div>
          </div>
          <ArrowUpRight size={18} style={{ opacity: 0.7, flexShrink: 0 }} />
        </button>
      </div>

      {/* Recent matches preview */}
      {total === 0 ? (
        <div style={{ textAlign: "center", padding: "30px 20px 40px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏏</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 6 }}>No matches yet</div>
          <div style={{ fontSize: 13, fontWeight: 400, color: C.sub, marginBottom: 6, lineHeight: 1.6 }}>
            Tap the red button above to log your first match.<br />
            The fee gets split automatically between all players.
          </div>
        </div>
      ) : (
        <div style={{ padding: "0 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: -0.3 }}>Recent Matches</div>
            <button onClick={onMatches} style={{ fontSize: 13, fontWeight: 700, color: C.accent, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              See all <ArrowUpRight size={14} />
            </button>
          </div>
          {matches.slice(0, 3).map(m => {
            const np = (m.players || []).filter(p => p !== m.payer);
            const pc = np.filter(p => m.payments?.[p]).length;
            const all = np.length > 0 && pc === np.length;
            const share = m.totalFee / m.players.length;
            const iOwe = myId && m.payer !== myId && m.players.includes(myId) && !m.payments[myId];
            return (
              <div key={m.id} onClick={() => onMatchClick(m.id)} style={{ background: C.card, borderRadius: 18, marginBottom: 10, overflow: "hidden", border: `1px solid ${iOwe ? C.accentBorder : all ? C.paidBorder : C.border}`, cursor: "pointer" }}>
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: all ? C.paidBg : C.accentBg, border: `1px solid ${all ? C.paidBorder : C.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🏏</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 3 }}>{m.name || fmtDate(m.date)}</div>
                        <div style={{ fontSize: 11, fontWeight: 400, color: C.sub }}>{m.name ? fmtDate(m.date) + " · " : ""}💰 {m.payer} · {m.format} · {m.players.length}p</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 18, color: C.text }}>{fmtAmt(share)}<span style={{ fontSize: 10, color: C.sub }}>/ea</span></div>
                      <div style={{ fontSize: 11, fontWeight: 600, marginTop: 3, color: all ? C.paid : C.accent }}>{all ? "✓ All settled" : `${pc}/${np.length} paid back`}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, height: 3, background: C.div, borderRadius: 100 }}>
                    <div style={{ height: "100%", width: `${np.length ? (pc / np.length) * 100 : 100}%`, background: all ? C.paid : C.accent, borderRadius: 100, transition: "width .3s" }} />
                  </div>
                </div>
                {iOwe && (
                  <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.accentBorder}`, background: C.accentBg, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: C.sub }}>You owe <span style={{ color: "#fff", fontWeight: 700 }}>{fmtAmt(share)}</span> → {m.payer}</div>
                    <button onClick={e => { e.stopPropagation(); onMarkPaid(m.id); }} style={{ background: C.accent, border: "none", borderRadius: 9, color: "#fff", fontWeight: 700, fontSize: 12, padding: "7px 14px", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
                      <Check size={12} /> Mark Paid
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <BottomNav active="home" onHome={() => {}} onMatches={onMatches} onExpenses={onExpenses} onSquad={onSquad} />
    </div>
  );
}

/* ─── MATCHES SCREEN — full list with filters ─────────────── */
function MatchesScreen({ matches, myId, onMatchClick, onNew, onHome, onExpenses, onSquad, onMarkPaid }) {
  const [filter, setFilter] = useState("all");
  const filtered = matches.filter(m => {
    const np = (m.players || []).filter(p => p !== m.payer);
    if (filter === "pending") return np.length > 0 && np.some(p => !m.payments?.[p]);
    if (filter === "settled") return np.length > 0 && np.every(p => m.payments?.[p]);
    return true;
  });

  return (
    <div style={{ paddingBottom: 90, background: C.bg, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 300, color: C.text, lineHeight: 1.15, letterSpacing: -0.5 }}>All<br />Matches</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <IconBtn><Search size={17} color={C.sub} /></IconBtn>
          <IconBtn><Bell size={17} color={C.sub} /></IconBtn>
          <button onClick={onNew} style={{ width: 40, height: 40, borderRadius: 13, background: C.accent, border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 16px rgba(225,32,32,0.45)" }}>
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ padding: "0 20px 14px", display: "flex", gap: 7 }}>
        {[{ id: "all", l: "All" }, { id: "pending", l: "Pending" }, { id: "settled", l: "Settled" }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: "7px 18px", borderRadius: 100, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, background: filter === f.id ? C.accent : C.card, color: filter === f.id ? "#fff" : C.sub, transition: "all .15s" }}>{f.l}</button>
        ))}
      </div>

      <div style={{ padding: "0 16px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.sub, fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏏</div>
            {filter === "all" ? "No matches yet. Tap + to add one." : `No ${filter} matches.`}
          </div>
        ) : filtered.map(m => {
          const np = (m.players || []).filter(p => p !== m.payer);
          const pc = np.filter(p => m.payments?.[p]).length;
          const all = np.length > 0 && pc === np.length;
          const share = m.totalFee / m.players.length;
          const iOwe = myId && m.payer !== myId && m.players.includes(myId) && !m.payments[myId];
          return (
            <div key={m.id} onClick={() => onMatchClick(m.id)} style={{ background: C.card, borderRadius: 18, marginBottom: 10, overflow: "hidden", border: `1px solid ${iOwe ? C.accentBorder : all ? C.paidBorder : C.border}`, cursor: "pointer" }}>
              <div style={{ padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 5 }}>{m.name || fmtDate(m.date)}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {m.name && <span style={{ fontFamily: F.mono, fontSize: 10, color: C.sub }}>{fmtDate(m.date)}</span>}
                      <span style={{ fontFamily: F.mono, fontSize: 10, color: C.sub, background: C.card2, padding: "2px 8px", borderRadius: 6, border: `1px solid ${C.border}` }}>{m.format}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: C.payer }}>💰 {m.payer}</span>
                      <span style={{ fontSize: 11, fontWeight: 400, color: C.sub }}>· {m.players.length} players</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 21, color: C.text }}>{fmtAmt(share)}<span style={{ fontSize: 10, color: C.sub }}>/ea</span></div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: all ? C.paid : C.accent, marginTop: 3 }}>{all ? "✓ Settled" : `${pc}/${np.length} paid`}</div>
                  </div>
                </div>
                <div style={{ height: 4, background: C.div, borderRadius: 100 }}>
                  <div style={{ height: "100%", width: `${np.length ? (pc / np.length) * 100 : 100}%`, background: all ? C.paid : C.accent, borderRadius: 100 }} />
                </div>
              </div>
              {iOwe && (
                <div style={{ padding: "11px 16px", borderTop: `1px solid ${C.accentBorder}`, background: C.accentBg, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.sub }}>You owe <span style={{ color: "#fff", fontWeight: 700 }}>{fmtAmt(share)}</span> → {m.payer}</div>
                  <button onClick={e => { e.stopPropagation(); onMarkPaid(m.id); }} style={{ background: C.accent, border: "none", borderRadius: 9, color: "#fff", fontWeight: 700, fontSize: 12, padding: "7px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <Check size={12} /> Mark Paid
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <BottomNav active="matches" onHome={onHome} onMatches={() => {}} onExpenses={onExpenses} onSquad={onSquad} />
    </div>
  );
}

/* ─── HISTORY SCREEN — 2-col transaction-card grid (ref img 2) */

/* ─── NEW MATCH — fully inline, no modal, no dropdowns ───── */
function NewMatchScreen({ roster, matches, onSave, onBack }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ name: "", date: today, format: "T-30", totalFee: "", payer: "", players: [] });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const lastMatch = matches[0];
  const [playerSearch, setPlayerSearch] = useState("");
  const visiblePlayers = roster.filter(n =>
    n.toLowerCase().includes(playerSearch.toLowerCase())
  );

  /* toggle a player chip — payer can't be deselected */
  const togglePlayer = (name) => setForm(f => {
    if (f.payer === name) return f;
    const players = f.players.includes(name)
      ? f.players.filter(p => p !== name)
      : [...f.players, name];
    return { ...f, players };
  });

  /* set payer, auto-adding them to players if missing */
  const setPayer = (name) => setForm(f => ({
    ...f, payer: name,
    players: f.players.includes(name) ? f.players : [...f.players, name],
  }));

  const selectAll   = () => set("players", [...roster]);
  const clearAll    = () => setForm(f => ({ ...f, players: f.payer ? [f.payer] : [], payer: f.payer }));
  const useLastMatch = () => { if (lastMatch) set("players", [...lastMatch.players]); };

  const fee   = parseFloat(form.totalFee) || 0;
  const share = form.players.length > 0 && fee > 0 ? fee / form.players.length : 0;

  const step1Done = !!form.date && fee > 0;
  const step2Done = form.players.length >= 2;
  const step3Done = !!form.payer && form.players.includes(form.payer);
  const canSave   = step1Done && step2Done && step3Done;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const payments = {};
    form.players.forEach(p => { payments[p] = (p === form.payer); });
    await onSave({ id: uid(), name: form.name.trim(), date: form.date, format: form.format, totalFee: fee, payer: form.payer, players: form.players, payments, createdAt: Date.now() });
    setSaving(false);
  };

  /* ── quick-action chip style ── */
  const qBtn = (active) => ({
    padding: "7px 14px", borderRadius: 100, border: `1px solid ${active ? C.accentBorder : C.border}`,
    background: active ? C.accentBg : C.card, color: active ? C.accent : C.sub,
    fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
    flexShrink: 0,
  });

  return (
    <div style={{ paddingBottom: 48, background: C.bg, minHeight: "100vh" }}>
      <Header title="New Match" subtitle="3 steps · fee split auto-calculated" onBack={onBack} />

      <div style={{ padding: "20px 20px 0" }}>

        {/* ── STEP 1 ── */}
        <StepLabel n="1" title="Match Details" done={step1Done}
          count={step1Done ? `${form.format} · ${fmtAmt(fee)}` : null} />

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Match Name <span style={{ color: C.muted2, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
          <input value={form.name} onChange={e => set("name", e.target.value)}
            placeholder="e.g. Sunday League, Koramangala Ground…"
            style={iStyle()} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Date</label>
          <input type="date" value={form.date} onChange={e => set("date", e.target.value)} style={iStyle()} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Format</label>
          <div style={{ display: "flex", gap: 8 }}>
            {["T-20","T-30","T-40","ODI"].map(f => (
              <button key={f} onClick={() => set("format", f)}
                style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: `2px solid ${form.format === f ? C.accentBorder : C.border}`, background: form.format === f ? C.accentBg : C.card, color: form.format === f ? C.accent : C.sub, fontSize: 14, fontWeight: form.format === f ? 800 : 500, cursor: "pointer", transition: "all .15s" }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24, position: "relative" }}>
          <label style={lbl}>Total Ground Fee</label>
          <span style={{ position: "absolute", left: 16, bottom: 13, fontFamily: F.mono, fontWeight: 600, fontSize: 20, color: fee > 0 ? C.sub : C.muted2, pointerEvents: "none" }}>₹</span>
          <input type="number" inputMode="numeric" value={form.totalFee}
            onChange={e => set("totalFee", e.target.value)}
            placeholder="0"
            style={iStyle({ paddingLeft: 34, fontSize: 22, fontFamily: F.mono, fontWeight: 600, letterSpacing: -0.5 })} />
        </div>

        {/* ── STEP 2 ── */}
        <div style={{ height: 1, background: C.div, marginBottom: 20 }} />
        <StepLabel n="2" title="Who Played?"
          hint="Tap a player to add or remove them. Payer stays locked in."
          done={step2Done}
          count={form.players.length > 0 ? `${form.players.length} / ${roster.length}` : null} />

        {/* Quick-select row */}
        <div style={{ display: "flex", gap: 7, marginBottom: 12, overflowX: "auto", paddingBottom: 2 }}>
          <button style={qBtn(form.players.length === roster.length)} onClick={selectAll}>
            All {roster.length}
          </button>
          <button style={qBtn(false)} onClick={clearAll}>
            Clear
          </button>
          {lastMatch && (
            <button style={qBtn(false)} onClick={useLastMatch}>
              ↩ Last ({lastMatch.players.length}p)
            </button>
          )}
        </div>

        {/* Search — filters the grid below in real-time */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.muted2, pointerEvents: "none" }} />
          <input
            value={playerSearch}
            onChange={e => setPlayerSearch(e.target.value)}
            placeholder="Search players…"
            style={iStyle({ paddingLeft: 40, fontSize: 14, padding: "10px 14px 10px 40px" })}
          />
          {playerSearch && (
            <button onClick={() => setPlayerSearch("")}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: C.muted, border: "none", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.sub }}>
              <X size={11} />
            </button>
          )}
        </div>

        {/* 4-col inline grid — live-filtered, NO MODAL */}
        {visiblePlayers.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
            {visiblePlayers.map(name => (
              <PlayerChip
                key={name}
                name={name}
                selected={form.players.includes(name)}
                isPayer={form.payer === name}
                onTap={() => togglePlayer(name)}
                disabled={false}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "24px 0", color: C.sub, fontSize: 13, marginBottom: 14 }}>
            No player named "{playerSearch}" in the squad
          </div>
        )}

        {/* Hidden-but-selected indicator — shows players selected but scrolled out of search */}
        {playerSearch && form.players.filter(p => !visiblePlayers.includes(p)).length > 0 && (
          <div style={{ padding: "8px 12px", background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 10, marginBottom: 10, fontSize: 12, fontWeight: 500, color: C.accent }}>
            + {form.players.filter(p => !visiblePlayers.includes(p)).length} selected player{form.players.filter(p => !visiblePlayers.includes(p)).length > 1 ? "s" : ""} hidden by search
          </div>
        )}

        {/* Live split card — appears as soon as fee + 2 players are set */}
        {share > 0 && (
          <div style={{ background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 16, padding: "14px 18px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Each person owes</div>
              <div style={{ fontFamily: F.mono, fontWeight: 600, color: C.accent, fontSize: 28, letterSpacing: -1 }}>{fmtAmt(share)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Split between</div>
              <div style={{ fontFamily: F.mono, fontSize: 28, color: C.text, fontWeight: 600 }}>{form.players.length}<span style={{ fontSize: 14, color: C.sub }}> players</span></div>
            </div>
          </div>
        )}

        {/* ── STEP 3 — only shows after 2+ players selected ── */}
        {step2Done && (
          <>
            <div style={{ height: 1, background: C.div, marginBottom: 20 }} />
            <StepLabel n="3" title="Who Paid the Ground Fee?"
              hint="This person is auto-marked settled. Others owe them their share."
              done={step3Done} />

            {/* Payer chips — only selected players, no dropdown */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
              {form.players.map(name => (
                <button key={name} onClick={() => setPayer(name)}
                  style={{
                    padding: "10px 16px", borderRadius: 12,
                    border: `2px solid ${form.payer === name ? C.payerBorder : C.border}`,
                    background: form.payer === name ? C.payerBg : C.card,
                    color: form.payer === name ? C.payer : C.sub,
                    fontWeight: form.payer === name ? 800 : 500,
                    fontSize: 14, cursor: "pointer", transition: "all .14s",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                  {form.payer === name && "💰 "}{name}
                </button>
              ))}
            </div>

            <button onClick={handleSave} disabled={!canSave || saving}
              style={{ width: "100%", padding: "17px", background: canSave ? C.accent : C.muted, color: canSave ? "#fff" : C.muted2, border: "none", borderRadius: 16, fontWeight: 800, fontSize: 16, cursor: canSave ? "pointer" : "not-allowed", transition: "all .2s", boxShadow: canSave ? "0 10px 28px rgba(225,32,32,0.4)" : "none", letterSpacing: -0.3 }}>
              {saving ? "Creating…" : canSave ? `Create Match · ${form.players.length} players · ${fmtAmt(share)} each` : "Select payer above ↑"}
            </button>
          </>
        )}

        {!step2Done && step1Done && (
          <div style={{ textAlign: "center", padding: "6px 0 4px", fontSize: 12, fontWeight: 500, color: C.sub }}>
            ↑ Tap players to add them
          </div>
        )}

      </div>
    </div>
  );
}

/* ─── DETAIL SCREEN ───────────────────────────────────────── */

/* Shared player row used by both match and expense detail */
function PlayerRow({ name, amount, paid, isPayer, isMe, onToggle, locked }) {
  const bc = isPayer ? C.payerBorder : isMe ? C.youBorder : paid ? C.paidBorder : C.border;
  const ac = isPayer ? C.payer : isMe ? C.you : paid ? C.paid : C.unpaid;
  const ab = isPayer ? C.payerBg : isMe ? C.youBg : paid ? C.paidBg : C.unpaidBg;
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", background: isMe ? "rgba(167,139,250,0.04)" : C.card, borderRadius: 14, marginBottom: 7, border: `1px solid ${bc}` }}>
      <div style={{ width: 38, height: 38, borderRadius: "50%", background: ab, color: ac, fontFamily: F.mono, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 12 }}>{name[0].toUpperCase()}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
          {name}{isMe && <span style={{ fontSize: 9, fontWeight: 700, color: C.you, background: C.youBg, border: `1px solid ${C.youBorder}`, padding: "1px 6px", borderRadius: 5 }}>YOU</span>}
        </div>
        {isPayer && <div style={{ fontSize: 11, fontWeight: 500, color: C.payer }}>Paid upfront 💰</div>}
        {locked && !isPayer && <div style={{ fontSize: 10, fontWeight: 500, color: C.muted2 }}>Only payer can mark</div>}
      </div>
      <div style={{ fontFamily: F.mono, fontSize: 13, color: C.sub, marginRight: 10, flexShrink: 0 }}>{fmtAmt(amount)}</div>
      <div onClick={(!locked && onToggle) ? onToggle : undefined}
        style={{ width: 36, height: 36, borderRadius: 10, background: isPayer ? C.payerBg : paid ? C.paid : C.border, color: isPayer ? C.payer : paid ? "#fff" : C.muted2, display: "flex", alignItems: "center", justifyContent: "center", cursor: (!locked && onToggle) ? "pointer" : "default", flexShrink: 0, transition: "all .2s", border: isPayer ? `1px solid ${C.payerBorder}` : "none", opacity: locked ? 0.38 : 1 }}>
        {locked && !isPayer ? <Lock size={13} /> : <Check size={16} strokeWidth={paid || isPayer ? 3 : 2} />}
      </div>
    </div>
  );
}

function DetailScreen({ match, myId, onUpdate, onDelete, onBack }) {
  const [copied, setCopied] = useState(false);
  /* Local payment state — updated optimistically so rapid toggles never read stale prop */
  const [pays, setPays] = useState(match.payments || {});
  useEffect(() => { setPays(match.payments || {}); }, [match.id, match.payments]);

  const share = match.totalFee / match.players.length;
  const nonPayers = (match.players || []).filter(p => p !== match.payer);
  const paidCount = nonPayers.filter(p => pays[p]).length;
  const allPaid = nonPayers.length > 0 && paidCount === nonPayers.length;
  const stillOwed = (nonPayers.length - paidCount) * share;
  const iAmIn = myId && match.players.includes(myId) && myId !== match.payer;
  const iHavePaid = iAmIn && !!pays[myId];
  const iAmPayer = myId === match.payer;

  /* auth: payer can mark anyone; everyone can mark themselves */
  const canMark = (name) => iAmPayer || myId === name;

  const toggle = async (n) => {
    const newVal = !(pays[n] ?? false);
    const newPays = { ...pays, [n]: newVal };
    setPays(newPays);
    await onUpdate({ ...match, payments: newPays });
  };
  const markAll = async () => {
    const newPays = { ...pays };
    nonPayers.forEach(n => { newPays[n] = true; });
    setPays(newPays);
    await onUpdate({ ...match, payments: newPays });
  };
  const copy = () => { navigator.clipboard?.writeText(generateSummary(match)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };

  return (
    <div style={{ paddingBottom: 40, background: C.bg, minHeight: "100vh" }}>
      <Header title={match.name || "Match Detail"} subtitle={match.name ? fmtDate(match.date) : undefined} onBack={onBack} right={
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={copy} style={{ background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 10, color: copied ? C.paid : C.accent, cursor: "pointer", padding: "7px 13px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Share</>}
          </button>
          <button onClick={onDelete} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.sub, cursor: "pointer", padding: "7px 10px", display: "flex" }}><Trash2 size={15} /></button>
        </div>
      } />

      {/* My status banner */}
      {iAmIn && (
        <div style={{ margin: "14px 20px 0", padding: "14px 16px", background: iHavePaid ? C.paidBg : C.accentBg, border: `1px solid ${iHavePaid ? C.paidBorder : C.accentBorder}`, borderRadius: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: iHavePaid ? C.paid : C.accent }}>{iHavePaid ? "✓ You're settled!" : "You haven't paid yet"}</div>
            <div style={{ fontSize: 12, fontWeight: 400, color: C.sub, marginTop: 2 }}>{iHavePaid ? `Paid ${fmtAmt(share)} to ${match.payer}` : `Owe ${fmtAmt(share)} to ${match.payer}`}</div>
          </div>
          {!iHavePaid && (
            <button onClick={() => toggle(myId)} style={{ background: C.accent, border: "none", borderRadius: 12, color: "#fff", fontWeight: 800, fontSize: 13, padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, boxShadow: "0 4px 14px rgba(225,32,32,0.38)" }}>
              <Check size={14} /> Mark Paid
            </button>
          )}
        </div>
      )}

      <div style={{ margin: "12px 20px 0", background: C.card, borderRadius: 18, padding: "16px", border: `1px solid ${C.border}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[match.name && { l: "Name", v: match.name }, { l: "Date", v: fmtDate(match.date) }, { l: "Format", v: match.format }, { l: "Total Fee", v: fmtAmt(match.totalFee) }, { l: "Per Person", v: fmtAmt(share) }].filter(Boolean).map(f => (
            <div key={f.l}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>{f.l}</div>
              <div style={{ fontFamily: F.mono, fontSize: 16, fontWeight: 600, color: C.text }}>{f.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ margin: "10px 20px", padding: "16px", background: allPaid ? C.paidBg : C.accentBg, borderRadius: 16, border: `1px solid ${allPaid ? C.paidBorder : C.accentBorder}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.sub }}>{allPaid ? "Fully settled!" : "Still outstanding"}</div>
            <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 28, color: allPaid ? C.paid : C.accent, letterSpacing: -1 }}>{allPaid ? "✓ Done" : fmtAmt(stillOwed)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.sub }}>Settled</div>
            <div style={{ fontFamily: F.mono, fontSize: 28, color: C.text, fontWeight: 600, letterSpacing: -1 }}>{paidCount}<span style={{ color: C.sub, fontSize: 18 }}>/{nonPayers.length}</span></div>
          </div>
        </div>
        <div style={{ marginTop: 12, height: 5, background: "rgba(0,0,0,0.3)", borderRadius: 100 }}>
          <div style={{ height: "100%", background: allPaid ? C.paid : C.accent, borderRadius: 100, width: `${nonPayers.length ? (paidCount / nonPayers.length) * 100 : 100}%`, transition: "width .3s" }} />
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1 }}>Players · {match.players.length}</div>
          {iAmPayer && !allPaid && <button onClick={markAll} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 9, color: C.sub, fontSize: 12, fontWeight: 600, padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><CheckCheck size={13} /> Mark all</button>}
        </div>
        {!iAmPayer && !allPaid && (
          <div style={{ fontSize: 11, fontWeight: 500, color: C.muted2, marginBottom: 10, padding: "7px 12px", background: C.card, borderRadius: 9, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 6 }}>
            <Lock size={11} /> Only <b style={{ color: C.text }}>{match.payer}</b> (payer) can mark others. You can only mark yourself.
          </div>
        )}
        <PlayerRow name={match.payer} amount={share} paid isPayer isMe={iAmPayer} onToggle={null} locked={false} />
        {nonPayers.map(n => (
          <PlayerRow key={n} name={n} amount={share} paid={!!pays[n]} isPayer={false} isMe={myId === n}
            onToggle={canMark(n) ? () => toggle(n) : null} locked={!canMark(n)} />
        ))}
      </div>
    </div>
  );
}

/* ─── SQUAD SCREEN ────────────────────────────────────────── */
function SquadScreen({ roster, onUpdate, onHome, onMatches, onExpenses, myId }) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [squadSearch, setSquadSearch] = useState("");

  const handleAdd = () => {
    const n = newName.trim();
    if (!n) return;
    if (roster.map(r => r.toLowerCase()).includes(n.toLowerCase())) {
      setNewName("");
      setAdding(false);
      return;
    }
    onUpdate([...roster, n]);
    setNewName("");
    setAdding(false);
  };

  const visible = roster.filter(n => n.toLowerCase().includes(squadSearch.toLowerCase()));

  return (
    <div style={{ paddingBottom: 90, background: C.bg, minHeight: "100vh" }}>
      <Header title="Squad" subtitle={`${roster.length} players registered`} right={
        <button onClick={() => { setAdding(a => !a); setSquadSearch(""); }}
          style={{ background: adding ? C.card : C.accentBg, border: `1px solid ${adding ? C.border : C.accentBorder}`, borderRadius: 11, color: adding ? C.sub : C.accent, cursor: "pointer", padding: "8px 14px", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
          {adding ? <><X size={14} /> Cancel</> : <><UserPlus size={14} /> Add Player</>}
        </button>
      } />

      {/* Add player panel */}
      {adding && (
        <div style={{ margin: "14px 20px 0", padding: "16px", background: C.card, border: `1px solid ${C.accentBorder}`, borderRadius: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>New Player</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Full name, e.g. Vikram R"
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              style={{ ...iStyle({ border: `1px solid ${C.accent}`, flex: 1 }) }}
              autoFocus
            />
            <button onClick={handleAdd} disabled={!newName.trim()}
              style={{ background: newName.trim() ? C.accent : C.muted, border: "none", borderRadius: 12, color: newName.trim() ? "#fff" : C.muted2, fontWeight: 800, fontSize: 14, padding: "0 20px", cursor: newName.trim() ? "pointer" : "default", flexShrink: 0, transition: "all .15s" }}>
              Add
            </button>
          </div>
          {roster.map(r => r.toLowerCase()).includes(newName.trim().toLowerCase()) && newName.trim() && (
            <div style={{ marginTop: 8, fontSize: 12, fontWeight: 500, color: C.unpaid }}>"{newName.trim()}" is already in the squad</div>
          )}
          <div style={{ marginTop: 10, fontSize: 12, fontWeight: 400, color: C.sub, lineHeight: 1.55 }}>
            💡 Use the full name as it appears in your WhatsApp group. This name will show in all match forms.
          </div>
        </div>
      )}

      <div style={{ padding: "14px 20px 0" }}>
        {/* Info banner */}
        {!adding && (
          <div style={{ padding: "12px 14px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 14, fontSize: 12, fontWeight: 400, color: C.sub, lineHeight: 1.6 }}>
            🏏 These players appear in the match form. Removing only affects new matches — past data stays intact.
          </div>
        )}

        {/* Search */}
        {roster.length > 5 && (
          <div style={{ position: "relative", marginBottom: 14 }}>
            <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.muted2, pointerEvents: "none" }} />
            <input
              value={squadSearch}
              onChange={e => setSquadSearch(e.target.value)}
              placeholder={`Search ${roster.length} players…`}
              style={iStyle({ paddingLeft: 40, fontSize: 14, padding: "10px 14px 10px 40px" })}
            />
            {squadSearch && (
              <button onClick={() => setSquadSearch("")}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: C.muted, border: "none", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.sub }}>
                <X size={11} />
              </button>
            )}
          </div>
        )}

        {visible.length === 0 && squadSearch ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: C.sub, fontSize: 14 }}>
            No player named "{squadSearch}"
          </div>
        ) : (
          visible.map((name) => {
            const realIdx = roster.indexOf(name);
            return (
              <div key={name} style={{ display: "flex", alignItems: "center", padding: "12px 14px", background: C.card, borderRadius: 14, marginBottom: 8, border: `1px solid ${name === myId ? C.youBorder : C.border}` }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: name === myId ? C.youBg : C.accentBg, color: name === myId ? C.you : C.accent, fontFamily: F.mono, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 }}>
                  {realIdx + 1}
                </div>
                <div style={{ flex: 1, fontSize: 15, fontWeight: name === myId ? 700 : 500, color: C.text }}>
                  {name}
                  {name === myId && <span style={{ fontSize: 9, fontWeight: 700, color: C.you, background: C.youBg, border: `1px solid ${C.youBorder}`, padding: "1px 6px", borderRadius: 5, marginLeft: 8 }}>YOU</span>}
                </div>
                {name !== myId ? (
                  <button onClick={() => onUpdate(roster.filter(p => p !== name))}
                    style={{ background: "none", border: "none", color: C.muted2, cursor: "pointer", padding: 6, borderRadius: 8, transition: "color .15s" }}
                    onMouseEnter={e => e.currentTarget.style.color = C.danger}
                    onMouseLeave={e => e.currentTarget.style.color = C.muted2}>
                    <Trash2 size={15} />
                  </button>
                ) : (
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.muted2, padding: "4px 8px", background: C.card2, borderRadius: 6 }}>can't remove</div>
                )}
              </div>
            );
          })
        )}
      </div>
      <BottomNav active="squad" onHome={onHome} onMatches={onMatches} onExpenses={onExpenses} onSquad={() => {}} />
    </div>
  );
}

/* ─── EXPENSE HELPERS ─────────────────────────────────────── */
function generateExpenseSummary(exp) {
  const share = exp.totalAmount / exp.participants.length;
  const nonPayers = exp.participants.filter(p => p !== exp.payer);
  const paidCount = nonPayers.filter(p => exp.payments[p]).length;
  return [
    `🍽️ NK Brigade — ${exp.description}`,
    `Date: ${fmtDate(exp.date)}`,
    `Amount: ${fmtAmt(exp.totalAmount)} ÷ ${exp.participants.length} = ${fmtAmt(share)}/person`,
    `Paid by: ${exp.payer} 💰`, ``,
    `${exp.payer} ✅`,
    ...nonPayers.map(p => `${p} ${exp.payments[p] ? "✅" : "❌"}`),
    ``, `${paidCount}/${nonPayers.length} settled`,
  ].join("\n");
}

/* ─── EXPENSE CARD ────────────────────────────────────────── */
function ExpenseCard({ expense: exp, myId, onClick, onMarkPaid }) {
  const nonPayers = (exp.participants || []).filter(p => p !== exp.payer);
  const paidCount = nonPayers.filter(p => exp.payments?.[p]).length;
  const allPaid = nonPayers.length > 0 && paidCount === nonPayers.length;
  const share = exp.totalAmount / exp.participants.length;
  const pct = nonPayers.length ? (paidCount / nonPayers.length) * 100 : 0;
  const iOwe = myId && exp.payer !== myId && exp.participants.includes(myId) && !exp.payments[myId];
  return (
    <div style={{ background: C.card, border: `1px solid ${iOwe ? C.accentBorder : allPaid ? C.paidBorder : C.border}`, borderRadius: 18, marginBottom: 10, overflow: "hidden" }}>
      <div onClick={onClick} style={{ padding: "15px 16px 13px", cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 11 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: allPaid ? C.paidBg : "rgba(250,204,21,0.08)", border: `1px solid ${allPaid ? C.paidBorder : C.payerBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🍽️</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.description}</div>
              <div style={{ fontSize: 11, color: C.sub }}>💰 {exp.payer} · {fmtDate(exp.date)} · {exp.participants.length}p</div>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
            <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 18, color: C.text }}>{fmtAmt(share)}<span style={{ fontSize: 10, color: C.sub }}>/ea</span></div>
            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 3, color: allPaid ? C.paid : C.unpaid }}>{allPaid ? "✓ Settled" : `${paidCount}/${nonPayers.length} paid`}</div>
          </div>
        </div>
        <div style={{ height: 3, background: C.div, borderRadius: 100 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: allPaid ? C.paid : C.payer, borderRadius: 100, transition: "width .3s" }} />
        </div>
      </div>
      {iOwe && (
        <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.accentBorder}`, background: C.accentBg, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.sub }}>You owe <span style={{ color: "#fff", fontWeight: 700 }}>{fmtAmt(share)}</span> → {exp.payer}</div>
          <button onClick={e => { e.stopPropagation(); onMarkPaid(exp.id); }}
            style={{ background: C.accent, border: "none", borderRadius: 9, color: "#fff", fontWeight: 700, fontSize: 12, padding: "7px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <Check size={12} /> Mark Paid
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── ADD EXPENSE SCREEN ──────────────────────────────────── */
function AddExpenseScreen({ roster, onSave, onBack }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ description: "", date: today, totalAmount: "", payer: "", participants: [] });
  const [playerSearch, setPlayerSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const visible = roster.filter(n => n.toLowerCase().includes(playerSearch.toLowerCase()));
  const toggleP = (name) => setForm(f => {
    if (f.payer === name) return f;
    const participants = f.participants.includes(name) ? f.participants.filter(p => p !== name) : [...f.participants, name];
    return { ...f, participants };
  });
  const setPayer = (name) => setForm(f => ({ ...f, payer: name, participants: f.participants.includes(name) ? f.participants : [...f.participants, name] }));

  const amount = parseFloat(form.totalAmount) || 0;
  const share = form.participants.length > 0 && amount > 0 ? amount / form.participants.length : 0;
  const step1Done = !!form.description.trim() && !!form.date && amount > 0;
  const step2Done = form.participants.length >= 2;
  const step3Done = !!form.payer && form.participants.includes(form.payer);
  const canSave = step1Done && step2Done && step3Done;

  const qBtn = (active) => ({ padding: "7px 14px", borderRadius: 100, border: `1px solid ${active ? C.accentBorder : C.border}`, background: active ? C.accentBg : C.card, color: active ? C.accent : C.sub, fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 });

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const payments = {};
    form.participants.forEach(p => { payments[p] = (p === form.payer); });
    await onSave({ id: uid(), description: form.description.trim(), date: form.date, totalAmount: amount, payer: form.payer, participants: form.participants, payments, createdAt: Date.now() });
    setSaving(false);
  };

  return (
    <div style={{ paddingBottom: 48, background: C.bg, minHeight: "100vh" }}>
      <Header title="Log Expense" subtitle="Lunch, snacks, transport — split anything" onBack={onBack} />
      <div style={{ padding: "20px 20px 0" }}>

        <StepLabel n="1" title="What was it?" done={step1Done} count={step1Done ? fmtAmt(amount) : null} />

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Description</label>
          <input value={form.description} onChange={e => set("description", e.target.value)}
            placeholder="e.g. Team lunch at Hotel Udupi, Post-match snacks…"
            style={iStyle()} autoFocus />
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Date</label>
            <input type="date" value={form.date} onChange={e => set("date", e.target.value)} style={iStyle()} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Total Amount</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontFamily: F.mono, fontWeight: 600, fontSize: 18, color: amount > 0 ? C.sub : C.muted2, pointerEvents: "none" }}>₹</span>
              <input type="number" inputMode="numeric" value={form.totalAmount} onChange={e => set("totalAmount", e.target.value)} placeholder="0" style={iStyle({ paddingLeft: 30, fontFamily: F.mono, fontWeight: 600, fontSize: 18 })} />
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: C.div, marginBottom: 20 }} />
        <StepLabel n="2" title="Who came?" hint="Tap to add/remove · Only participants split the cost" done={step2Done} count={form.participants.length > 0 ? `${form.participants.length}/${roster.length}` : null} />

        <div style={{ display: "flex", gap: 7, marginBottom: 12, overflowX: "auto" }}>
          <button style={qBtn(form.participants.length === roster.length)} onClick={() => set("participants", [...roster])}>All {roster.length}</button>
          <button style={qBtn(false)} onClick={() => setForm(f => ({ ...f, participants: f.payer ? [f.payer] : [] }))}>Clear</button>
        </div>
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.muted2, pointerEvents: "none" }} />
          <input value={playerSearch} onChange={e => setPlayerSearch(e.target.value)} placeholder="Search players…" style={iStyle({ paddingLeft: 40, fontSize: 14, padding: "10px 14px 10px 40px" })} />
          {playerSearch && <button onClick={() => setPlayerSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: C.muted, border: "none", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.sub }}><X size={11} /></button>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
          {visible.map(name => (
            <PlayerChip key={name} name={name} selected={form.participants.includes(name)} isPayer={form.payer === name} onTap={() => toggleP(name)} />
          ))}
        </div>

        {share > 0 && (
          <div style={{ background: "rgba(250,204,21,0.08)", border: `1px solid ${C.payerBorder}`, borderRadius: 16, padding: "14px 18px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Each person pays</div>
              <div style={{ fontFamily: F.mono, fontWeight: 600, color: C.payer, fontSize: 28, letterSpacing: -1 }}>{fmtAmt(share)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Splitting</div>
              <div style={{ fontFamily: F.mono, fontSize: 28, color: C.text, fontWeight: 600 }}>{form.participants.length}<span style={{ fontSize: 14, color: C.sub }}> people</span></div>
            </div>
          </div>
        )}

        {step2Done && (
          <>
            <div style={{ height: 1, background: C.div, marginBottom: 20 }} />
            <StepLabel n="3" title="Who paid the bill?" hint="They'll be auto-marked settled. Others owe them their share." done={step3Done} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
              {form.participants.map(name => (
                <button key={name} onClick={() => setPayer(name)}
                  style={{ padding: "10px 16px", borderRadius: 12, border: `2px solid ${form.payer === name ? C.payerBorder : C.border}`, background: form.payer === name ? C.payerBg : C.card, color: form.payer === name ? C.payer : C.sub, fontWeight: form.payer === name ? 800 : 500, fontSize: 14, cursor: "pointer", transition: "all .14s", display: "flex", alignItems: "center", gap: 6 }}>
                  {form.payer === name && "💰 "}{name}
                </button>
              ))}
            </div>
            <button onClick={handleSave} disabled={!canSave || saving}
              style={{ width: "100%", padding: "17px", background: canSave ? C.accent : C.muted, color: canSave ? "#fff" : C.muted2, border: "none", borderRadius: 16, fontWeight: 800, fontSize: 16, cursor: canSave ? "pointer" : "not-allowed", transition: "all .2s", boxShadow: canSave ? "0 10px 28px rgba(225,32,32,0.4)" : "none" }}>
              {saving ? "Saving…" : canSave ? `Log Expense · ${form.participants.length} people · ${fmtAmt(share)} each` : "Select who paid ↑"}
            </button>
          </>
        )}
        {!step2Done && step1Done && (
          <div style={{ textAlign: "center", padding: "6px 0", fontSize: 12, fontWeight: 500, color: C.sub }}>↑ Tap players who came</div>
        )}
      </div>
    </div>
  );
}

/* ─── EXPENSE DETAIL SCREEN ───────────────────────────────── */
function ExpenseDetailScreen({ expense: exp, myId, onUpdate, onDelete, onBack }) {
  const [copied, setCopied] = useState(false);
  const [pays, setPays] = useState(exp.payments || {});
  useEffect(() => { setPays(exp.payments || {}); }, [exp.id, exp.payments]);

  const share = exp.totalAmount / exp.participants.length;
  const nonPayers = (exp.participants || []).filter(p => p !== exp.payer);
  const paidCount = nonPayers.filter(p => pays[p]).length;
  const allPaid = nonPayers.length > 0 && paidCount === nonPayers.length;
  const stillOwed = (nonPayers.length - paidCount) * share;
  const iAmIn = myId && exp.participants.includes(myId) && myId !== exp.payer;
  const iHavePaid = iAmIn && !!pays[myId];
  const iAmPayer = myId === exp.payer;
  const canMark = (name) => iAmPayer || myId === name;
  const toggle = async (n) => {
    const newVal = !(pays[n] ?? false);
    const newPays = { ...pays, [n]: newVal };
    setPays(newPays);
    await onUpdate({ ...exp, payments: newPays });
  };
  const markAll = async () => {
    const newPays = { ...pays };
    nonPayers.forEach(n => { newPays[n] = true; });
    setPays(newPays);
    await onUpdate({ ...exp, payments: newPays });
  };
  const copy = () => { navigator.clipboard?.writeText(generateExpenseSummary(exp)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };

  return (
    <div style={{ paddingBottom: 40, background: C.bg, minHeight: "100vh" }}>
      <Header title="Expense Detail" subtitle={exp.description} onBack={onBack} right={
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={copy} style={{ background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 10, color: copied ? C.paid : C.accent, cursor: "pointer", padding: "7px 13px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Share</>}
          </button>
          <button onClick={onDelete} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.sub, cursor: "pointer", padding: "7px 10px", display: "flex" }}><Trash2 size={15} /></button>
        </div>
      } />

      {iAmIn && (
        <div style={{ margin: "14px 20px 0", padding: "14px 16px", background: iHavePaid ? C.paidBg : C.accentBg, border: `1px solid ${iHavePaid ? C.paidBorder : C.accentBorder}`, borderRadius: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: iHavePaid ? C.paid : C.accent }}>{iHavePaid ? "✓ You're settled!" : "You haven't paid yet"}</div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{iHavePaid ? `Paid ${fmtAmt(share)} to ${exp.payer}` : `Owe ${fmtAmt(share)} to ${exp.payer}`}</div>
          </div>
          {!iHavePaid && <button onClick={() => toggle(myId)} style={{ background: C.accent, border: "none", borderRadius: 12, color: "#fff", fontWeight: 800, fontSize: 13, padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, boxShadow: "0 4px 14px rgba(225,32,32,0.38)" }}><Check size={14} /> Mark Paid</button>}
        </div>
      )}

      <div style={{ margin: "12px 20px 0", background: C.card, borderRadius: 18, padding: "16px", border: `1px solid ${C.border}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[{ l: "Date", v: fmtDate(exp.date) }, { l: "Paid by", v: exp.payer }, { l: "Total Bill", v: fmtAmt(exp.totalAmount) }, { l: "Per Person", v: fmtAmt(share) }].map(f => (
            <div key={f.l}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>{f.l}</div>
              <div style={{ fontFamily: F.mono, fontSize: 16, fontWeight: 600, color: C.text }}>{f.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ margin: "10px 20px", padding: "16px", background: allPaid ? C.paidBg : C.accentBg, borderRadius: 16, border: `1px solid ${allPaid ? C.paidBorder : C.accentBorder}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: C.sub }}>{allPaid ? "Fully settled!" : "Still outstanding"}</div>
            <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 28, color: allPaid ? C.paid : C.accent, letterSpacing: -1 }}>{allPaid ? "✓ Done" : fmtAmt(stillOwed)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: C.sub }}>Settled</div>
            <div style={{ fontFamily: F.mono, fontSize: 28, color: C.text, fontWeight: 600, letterSpacing: -1 }}>{paidCount}<span style={{ color: C.sub, fontSize: 18 }}>/{nonPayers.length}</span></div>
          </div>
        </div>
        <div style={{ marginTop: 12, height: 5, background: "rgba(0,0,0,0.3)", borderRadius: 100 }}>
          <div style={{ height: "100%", background: allPaid ? C.paid : C.payer, borderRadius: 100, width: `${nonPayers.length ? (paidCount / nonPayers.length) * 100 : 100}%`, transition: "width .3s" }} />
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1 }}>Participants · {exp.participants.length}</div>
          {iAmPayer && !allPaid && <button onClick={markAll} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 9, color: C.sub, fontSize: 12, fontWeight: 600, padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><CheckCheck size={13} /> Mark all</button>}
        </div>
        {!iAmPayer && !allPaid && (
          <div style={{ fontSize: 11, fontWeight: 500, color: C.muted2, marginBottom: 10, padding: "7px 12px", background: C.card, borderRadius: 9, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 6 }}>
            <Lock size={11} /> Only <b style={{ color: C.text }}>{exp.payer}</b> can mark others. You can mark yourself.
          </div>
        )}
        <PlayerRow name={exp.payer} amount={share} paid isPayer isMe={iAmPayer} onToggle={null} locked={false} />
        {nonPayers.map(n => (
          <PlayerRow key={n} name={n} amount={share} paid={!!pays[n]} isPayer={false} isMe={myId === n}
            onToggle={canMark(n) ? () => toggle(n) : null} locked={!canMark(n)} />
        ))}
      </div>
    </div>
  );
}

/* ─── EXPENSES SCREEN ─────────────────────────────────────── */
function ExpensesScreen({ expenses, myId, onExpenseClick, onNew, onMarkPaid, onHome, onMatches, onExpenses, onSquad }) {
  const myPending = expenses.filter(e => myId && e.payer !== myId && e.participants.includes(myId) && !e.payments[myId]);
  const myOwed = myPending.reduce((s, e) => s + e.totalAmount / e.participants.length, 0);
  const totalSpend = expenses.reduce((s, e) => s + e.totalAmount, 0);

  return (
    <div style={{ paddingBottom: 90, background: C.bg, minHeight: "100vh" }}>
      <div style={{ padding: "20px 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 28, fontWeight: 300, color: C.text, lineHeight: 1.15, letterSpacing: -0.5 }}>
          Group<br /><span style={{ fontWeight: 800 }}>Expenses</span>
        </div>
        <button onClick={onNew} style={{ width: 40, height: 40, borderRadius: 13, background: C.accent, border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 16px rgba(225,32,32,0.45)" }}>
          <Plus size={20} strokeWidth={3} />
        </button>
      </div>

      {/* Stats */}
      <div style={{ padding: "0 16px", marginBottom: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div style={{ background: C.card, borderRadius: 14, padding: "14px 16px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Total Expenses</div>
            <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 20, color: C.text }}>{fmtAmt(totalSpend)}</div>
            <div style={{ fontSize: 10, fontWeight: 500, color: C.sub, marginTop: 2 }}>{expenses.length} event{expenses.length !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ background: myOwed > 0 ? C.accentBg : C.card, borderRadius: 14, padding: "14px 16px", border: `1px solid ${myOwed > 0 ? C.accentBorder : C.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>You Owe</div>
            <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 20, color: myOwed > 0 ? C.accent : C.paid }}>{fmtAmt(myOwed)}</div>
            <div style={{ fontSize: 10, fontWeight: 500, color: C.sub, marginTop: 2 }}>{myPending.length > 0 ? `${myPending.length} unsettled` : "All clear ✓"}</div>
          </div>
        </div>

        {/* CTA */}
        <button onClick={onNew} style={{ width: "100%", padding: "14px 18px", background: "rgba(250,204,21,0.08)", borderRadius: 16, color: C.payer, border: `1px solid ${C.payerBorder}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: C.payerBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🍽️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Log a Group Expense</div>
            <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.8, marginTop: 1 }}>Lunch, snacks, transport — split anything</div>
          </div>
          <ArrowUpRight size={16} style={{ opacity: 0.6 }} />
        </button>
      </div>

      <div style={{ padding: "0 16px" }}>
        {expenses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🍽️</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 6 }}>No expenses yet</div>
            <div style={{ fontSize: 13, fontWeight: 400, color: C.sub, lineHeight: 1.6 }}>After a match, go for lunch?<br />Log it here and split the bill automatically.</div>
          </div>
        ) : (
          expenses.map(e => (
            <ExpenseCard key={e.id} expense={e} myId={myId} onClick={() => onExpenseClick(e.id)} onMarkPaid={onMarkPaid} />
          ))
        )}
      </div>

      <BottomNav active="expenses" onHome={onHome} onMatches={onMatches} onExpenses={onExpenses} onSquad={onSquad} />
    </div>
  );
}

/* ─── ROOT ────────────────────────────────────────────────── */
export default function App() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState("home");
  const [roster, setRoster] = useState([]);
  const [matches, setMatches] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [myId, setMyId] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [showIdPicker, setShowIdPicker] = useState(false);
  /* suppresses realtime echoes for 4 s after each local save */
  const suppressUntil = useRef({});

  useEffect(() => {
    (async () => {
      const [r, m, e] = await Promise.all([DB.get(SK.roster), DB.get(SK.matches), DB.get(SK.expenses)]);
      setRoster(r || DEFAULT_SQUAD);
      setMatches(m || []);
      setExpenses(e || []);
      setMyId(identity.get());
      setReady(true);
    })();
    const ch = supabase.channel("nk-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "mak_data" }, (p) => {
        if (!p.new) return;
        /* skip events that arrived within 4 s of our own save — prevents stale echoes
           from overwriting local state after rapid mark/unmark cycles              */
        const age = Date.now() - (suppressUntil.current[p.new.key] || 0);
        if (age < 0) return;
        if (p.new.key === SK.matches)  setMatches(p.new.value || []);
        if (p.new.key === SK.roster)   setRoster(p.new.value || DEFAULT_SQUAD);
        if (p.new.key === SK.expenses) setExpenses(p.new.value || []);
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const suppress = (key) => { suppressUntil.current[key] = Date.now() + 4000; };
  const saveRoster   = async (r) => { suppress(SK.roster);   setRoster(r);   await DB.set(SK.roster, r); };
  const saveMatches  = async (m) => { suppress(SK.matches);  setMatches(m);  await DB.set(SK.matches, m); };
  const saveExpenses = async (e) => { suppress(SK.expenses); setExpenses(e); await DB.set(SK.expenses, e); };
  const saveIdentity = (n) => { identity.set(n); setMyId(n); setShowIdPicker(false); };

  const handleMarkPaid = async (matchId) => {
    if (!myId) return;
    const nm = matches.map(m => m.id !== matchId ? m : { ...m, payments: { ...m.payments, [myId]: true } });
    await saveMatches(nm);
  };
  const handleMarkExpensePaid = async (expenseId) => {
    if (!myId) return;
    const ne = expenses.map(e => e.id !== expenseId ? e : { ...e, payments: { ...e.payments, [myId]: true } });
    await saveExpenses(ne);
  };

  const activeMatch   = matches.find(m => m.id === activeId);
  const activeExpense = expenses.find(e => e.id === activeId);

  if (!ready) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: F.sans }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: F.mono, fontSize: 54, color: C.accent, letterSpacing: 4, lineHeight: 1, fontWeight: 600 }}>NK</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: C.sub, marginTop: 10 }}>Loading…</div>
      </div>
    </div>
  );

  if (!myId || showIdPicker) return (
    <div style={{ minHeight: "100vh", background: C.bg, maxWidth: 480, margin: "0 auto" }}>
      <Fonts />
      <OnboardingScreen roster={roster} current={showIdPicker ? myId : null} onSelect={saveIdentity} onBack={showIdPicker ? () => setShowIdPicker(false) : undefined} />
    </div>
  );

  const nav = {
    onHome:     () => setScreen("home"),
    onMatches:  () => setScreen("matches"),
    onExpenses: () => setScreen("expenses"),
    onSquad:    () => setScreen("squad"),
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, maxWidth: 480, margin: "0 auto", fontFamily: F.sans }}>
      <Fonts />

      {/* ── Matches ── */}
      {screen === "home" && <HomeScreen matches={matches} expenses={expenses} myId={myId} onMatchClick={id => { setActiveId(id); setScreen("detail"); }} onNew={() => setScreen("new")} {...nav} onChangeId={() => setShowIdPicker(true)} onMarkPaid={handleMarkPaid} />}
      {screen === "matches" && <MatchesScreen matches={matches} myId={myId} onMatchClick={id => { setActiveId(id); setScreen("detail"); }} onNew={() => setScreen("new")} {...nav} onMarkPaid={handleMarkPaid} />}
      {screen === "new" && <NewMatchScreen roster={roster} matches={matches} onSave={async m => { await saveMatches([m, ...matches]); setScreen("home"); }} onBack={() => setScreen("home")} />}
      {screen === "detail" && activeMatch && (
        <DetailScreen match={activeMatch} myId={myId}
          onUpdate={async u => { const nm = matches.map(m => m.id === u.id ? u : m); await saveMatches(nm); }}
          onDelete={async () => { await saveMatches(matches.filter(m => m.id !== activeId)); setScreen("home"); }}
          onBack={() => setScreen("home")} />
      )}

      {/* ── Expenses ── */}
      {screen === "expenses" && (
        <ExpensesScreen expenses={expenses} myId={myId}
          onExpenseClick={id => { setActiveId(id); setScreen("expenseDetail"); }}
          onNew={() => setScreen("addExpense")} onMarkPaid={handleMarkExpensePaid} {...nav} />
      )}
      {screen === "addExpense" && (
        <AddExpenseScreen roster={roster}
          onSave={async e => { await saveExpenses([e, ...expenses]); setScreen("expenses"); }}
          onBack={() => setScreen("expenses")} />
      )}
      {screen === "expenseDetail" && activeExpense && (
        <ExpenseDetailScreen expense={activeExpense} myId={myId}
          onUpdate={async u => { const ne = expenses.map(e => e.id === u.id ? u : e); await saveExpenses(ne); }}
          onDelete={async () => { await saveExpenses(expenses.filter(e => e.id !== activeId)); setScreen("expenses"); }}
          onBack={() => setScreen("expenses")} />
      )}

      {/* ── Squad ── */}
      {screen === "squad" && <SquadScreen roster={roster} onUpdate={saveRoster} {...nav} myId={myId} />}
    </div>
  );
}
