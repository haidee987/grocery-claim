"use client";
import { useEffect, useState } from "react";

type Prize = { username: string; name: string; amount: number; status: "pending" | "claimed" | "redeemed"; claimCode: string };
type User = { username: string; name: string; role: string };

const URL_ = process.env.NEXT_PUBLIC_SCRIPT_URL!;
async function api(body: object) {
  const token = localStorage.getItem("gpc_token");
  const res = await fetch(URL_, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ token, ...body }),
  });
  return res.json();
}

const field = "w-full rounded-xl border-2 border-[#d9e4d6] bg-white px-4 py-3 text-base outline-none focus:border-[#1f6b4f] focus:ring-4 focus:ring-[#1f6b4f]/15";
const primary = "w-full rounded-xl bg-[#1f6b4f] px-5 py-3.5 text-base font-semibold text-white active:scale-[.99] disabled:opacity-50 focus-visible:ring-4 focus-visible:ring-[#ffc83d]";
const label = "mb-1.5 block text-sm font-medium text-[#16251d]";
const peso = (n: number) => "₱" + Number(n).toLocaleString();

const STATUS = {
  pending: { text: "Ready to claim", cls: "bg-[#fff1c2] text-[#6b4e00]" },
  claimed: { text: "Claimed", cls: "bg-[#d8f0e4] text-[#14543b]" },
  redeemed: { text: "Collected", cls: "bg-[#e6e8e4] text-[#4b554e]" },
};

function Steps({ at }: { at: 1 | 2 | 3 }) {
  const items = ["Log in", "Enter PIN", "Show code at store"];
  return (
    <ol className="mb-5 flex gap-2 text-xs">
      {items.map((t, i) => (
        <li key={t} className={"flex-1 rounded-lg px-2 py-2 text-center font-medium " + (i + 1 <= at ? "bg-[#1f6b4f] text-white" : "bg-[#e3ece0] text-[#5a6b60]")}>
          {i + 1 < at ? "✓ " : ""}{t}
        </li>
      ))}
    </ol>
  );
}

function Shell({ user, onLogout, children }: { user: User | null; onLogout: () => void; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#eef4ea] text-[#16251d]">
      <header className="bg-[#1f6b4f] px-4 py-3 text-white">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <span className="text-lg font-bold">🛒 Prize Claim</span>
          {user && <button onClick={onLogout} className="rounded-lg bg-white/15 px-3 py-1.5 text-sm">Log out</button>}
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-6">{children}</main>
    </div>
  );
}

function Alert({ err, ok }: { err: string; ok: string }) {
  return (<>
    {err && <p role="alert" className="mb-4 rounded-xl bg-[#fde8e6] px-4 py-3 text-sm text-[#8a1c14]">{err}</p>}
    {ok && <p role="status" className="mb-4 rounded-xl bg-[#d8f0e4] px-4 py-3 text-sm text-[#14543b]">{ok}</p>}
  </>);
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState(""); const [password, setPassword] = useState(""); const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState(""); const [ok, setOk] = useState(""); const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"winners" | "add" | "redeem">("winners");
  const [wName, setWName] = useState(""); const [wAmt, setWAmt] = useState(1000);
  const [newPin, setNewPin] = useState<{ who: string; pin: string } | null>(null);
  const [pin, setPin] = useState(""); const [code, setCode] = useState(""); const [q, setQ] = useState("");

  async function refresh() {
    if (!localStorage.getItem("gpc_token")) { setReady(true); return; }
    try {
      const r = await api({ action: "me" });
      if (r.ok) { setUser(r.user); setPrizes(r.prizes); } else { localStorage.removeItem("gpc_token"); setUser(null); }
    } catch { setErr("Can't connect right now. Check your internet and refresh."); }
    setReady(true);
  }
  useEffect(() => { refresh(); }, []);

  async function run(body: object, after?: (r: any) => void) {
    setBusy(true); setErr(""); setOk("");
    try {
      const r = await api(body);
      if (r.error) setErr(r.error); else after?.(r);
    } catch { setErr("Can't connect right now. Check your internet and try again."); }
    setBusy(false);
  }

  const auth = () => run({ action: mode, name, password }, (r) => { localStorage.setItem("gpc_token", r.token); setPassword(""); refresh(); });
  const logout = async () => { await api({ action: "logout" }).catch(() => {}); localStorage.removeItem("gpc_token"); setUser(null); setPrizes([]); setErr(""); setOk(""); };
  const claim = () => run({ action: "claim", pin }, () => { setPin(""); refresh(); });
  const addWinner = () => run({ action: "addWinner", name: wName, amount: wAmt }, (r) => { setNewPin({ who: wName, pin: r.pin }); setWName(""); refresh(); });
  const redeem = () => run({ action: "redeem", code }, () => { setOk("Marked as collected."); setCode(""); refresh(); });
  const copy = (t: string) => { navigator.clipboard?.writeText(t); setOk("Copied."); };

  if (!ready) return <main className="grid min-h-screen place-items-center bg-[#eef4ea] text-[#5a6b60]">Loading…</main>;

  if (!user)
    return (
      <Shell user={user} onLogout={logout}>
        <h1 className="text-3xl font-extrabold leading-tight">Won a grocery prize?<br />Log in to claim it.</h1>
        <p className="mb-6 mt-2 text-[#4b5d52]">Use the full name you entered in the promo.</p>
        <div className="mb-5 grid grid-cols-2 rounded-xl bg-[#dbe7d7] p-1 text-sm font-semibold">
          {(["login", "register"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setErr(""); }} className={"rounded-lg py-2.5 " + (mode === m ? "bg-white shadow" : "text-[#4b5d52]")}>
              {m === "login" ? "Log in" : "Create account"}
            </button>
          ))}
        </div>
        <Alert err={err} ok={ok} />
        <div className="space-y-4">
          <div><label className={label} htmlFor="n">Full name</label>
            <input id="n" className={field} value={name} autoComplete="name" placeholder="e.g. Juan Santos" onChange={(e) => setName(e.target.value)} /></div>
          <div><label className={label} htmlFor="p">Password</label>
            <div className="relative">
              <input id="p" className={field + " pr-16"} type={showPw ? "text" : "password"} value={password} placeholder="At least 6 characters"
                autoComplete={mode === "login" ? "current-password" : "new-password"} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && auth()} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[#1f6b4f]">{showPw ? "Hide" : "Show"}</button>
            </div></div>
          <button className={primary} disabled={busy || !name.trim() || password.length < 6} onClick={auth}>
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </div>
        <p className="mt-5 text-center text-sm text-[#5a6b60]">
          {mode === "login" ? "First time here? Choose “Create account” above." : "Already have an account? Choose “Log in” above."}
        </p>
      </Shell>
    );

  const isAdmin = user.role === "admin";
  const mine = prizes.find((p) => p.username === user.username);
  const list = prizes.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const step = !mine ? 1 : mine.status === "pending" ? 2 : 3;

  return (
    <Shell user={user} onLogout={logout}>
      <h1 className="mb-1 text-2xl font-extrabold">Hi, {user.name.split(" ")[0]} 👋</h1>
      <Alert err={err} ok={ok} />
      {!mine ? (
        <div className="mb-6 rounded-2xl bg-white p-5">
          <p className="font-semibold">No prize under this name yet</p>
          <p className="mt-1 text-sm text-[#4b5d52]">Make sure you registered with the exact name used in the promo. If you think this is a mistake, ask the store.</p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-[#4b5d52]">{mine.status === "pending" ? "You have a prize waiting." : mine.status === "claimed" ? "Your prize is claimed. Show the code below at the store." : "This prize has been collected."}</p>
          <Steps at={step as 1 | 2 | 3} />
          <div className="relative mb-6 overflow-hidden rounded-2xl bg-white shadow-[0_2px_0_#c9d8c5]">
            <div className="p-5 text-center">
              <span className={"inline-block rounded-full px-3 py-1 text-xs font-semibold " + STATUS[mine.status].cls}>{STATUS[mine.status].text}</span>
              <p className="mt-3 text-sm text-[#4b5d52]">Grocery prize</p>
              <p className="text-5xl font-extrabold text-[#1f6b4f]">{peso(mine.amount)}</p>
            </div>
            <div className="relative border-t-2 border-dashed border-[#d9e4d6]">
              <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#eef4ea]" />
              <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[#eef4ea]" />
              <div className="p-5">
                {mine.status === "pending" ? (<>
                  <label className={label} htmlFor="pin">6-digit PIN from the store</label>
                  <input id="pin" className={field + " mb-4 text-center font-mono text-2xl tracking-[.4em]"} inputMode="numeric" maxLength={6}
                    value={pin} placeholder="••••••" onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
                  <button className={primary} disabled={busy || pin.length < 6} onClick={claim}>{busy ? "Checking…" : "Claim my prize"}</button>
                </>) : (<>
                  <p className="mb-2 text-center text-sm text-[#4b5d52]">Your claim code</p>
                  <div className="rounded-xl bg-[#fff6d6] py-4 text-center font-mono text-3xl font-bold tracking-widest">{mine.claimCode}</div>
                  {mine.status === "claimed" && <p className="mt-3 text-center text-sm text-[#4b5d52]">Bring a valid ID. The store will mark it as collected.</p>}
                </>)}
              </div>
            </div>
          </div>
        </>
      )}

      {isAdmin && (
        <section className="rounded-2xl bg-white p-4">
          <p className="mb-3 font-bold">Store admin</p>
          <div className="mb-4 grid grid-cols-3 rounded-xl bg-[#e3ece0] p-1 text-sm font-semibold">
            {([["winners", "Winners"], ["add", "Add winner"], ["redeem", "Redeem"]] as const).map(([k, t]) => (
              <button key={k} onClick={() => { setTab(k); setErr(""); setOk(""); }} className={"rounded-lg py-2 " + (tab === k ? "bg-white shadow" : "text-[#4b5d52]")}>{t}</button>
            ))}
          </div>
          {tab === "add" && (
            <div className="space-y-3">
              <div><label className={label} htmlFor="wn">Winner’s full name</label>
                <input id="wn" className={field} value={wName} onChange={(e) => setWName(e.target.value)} /></div>
              <div><label className={label} htmlFor="wa">Prize amount (₱)</label>
                <input id="wa" className={field} type="number" value={wAmt} onChange={(e) => setWAmt(+e.target.value)} /></div>
              <button className={primary} disabled={busy || !wName.trim() || !(wAmt > 0)} onClick={addWinner}>Add winner</button>
              {newPin && (
                <div className="rounded-xl border-2 border-[#ffc83d] bg-[#fff6d6] p-4 text-center">
                  <p className="text-sm">Give this PIN to <b>{newPin.who}</b>. It won’t be shown again.</p>
                  <p className="my-2 font-mono text-3xl font-bold tracking-widest">{newPin.pin}</p>
                  <button onClick={() => copy(newPin.pin)} className="rounded-lg bg-white px-4 py-1.5 text-sm font-semibold">Copy PIN</button>
                </div>
              )}
            </div>
          )}
          {tab === "redeem" && (
            <div className="space-y-3">
              <div><label className={label} htmlFor="rc">Winner’s claim code</label>
                <input id="rc" className={field + " font-mono uppercase"} placeholder="GRC-XXXXXXXX" value={code} onChange={(e) => setCode(e.target.value)} /></div>
              <p className="text-sm text-[#4b5d52]">Check the winner’s ID first, then mark the prize as collected.</p>
              <button className={primary} disabled={busy || !code.trim()} onClick={redeem}>Mark as collected</button>
            </div>
          )}
          {tab === "winners" && (
            <div>
              <input className={field + " mb-3"} placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
              {list.length === 0 && <p className="py-6 text-center text-sm text-[#5a6b60]">{prizes.length ? "No winners match your search." : "No winners yet. Use “Add winner” to create the first one."}</p>}
              <ul className="divide-y divide-[#e3ece0]">
                {list.map((p) => (
                  <li key={p.username} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0"><p className="truncate font-semibold">{p.name}</p>
                      <p className="text-sm text-[#5a6b60]">{peso(p.amount)}{p.claimCode ? " · " + p.claimCode : ""}</p></div>
                    <span className={"shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold " + STATUS[p.status].cls}>{STATUS[p.status].text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </Shell>
  );
}