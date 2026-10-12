"use client";
import { useEffect, useState } from "react";

type Prize = { username: string; name: string; amount: number; status: "pending" | "claimed" | "redeemed"; claimCode: string };
type User = { username: string; name: string; role: string };

const URL_ = process.env.NEXT_PUBLIC_SCRIPT_URL!;
async function api(body: object) {
  const token = localStorage.getItem("gpc_token");
  const res = await fetch(URL_, {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // avoids a CORS preflight with Apps Script
    body: JSON.stringify({ token, ...body }),
  });
  return res.json();
}

const card = "bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm";
const input = "w-full border border-gray-300 rounded-lg p-2.5 mt-1 mb-3";
const btn = "bg-green-700 text-white rounded-lg px-4 py-2.5 font-medium disabled:opacity-50";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState(""); const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [wName, setWName] = useState(""); const [wAmt, setWAmt] = useState(1000);
  const [newPin, setNewPin] = useState(""); const [pin, setPin] = useState(""); const [code, setCode] = useState("");

  async function refresh() {
    if (!localStorage.getItem("gpc_token")) { setReady(true); return; }
    const r = await api({ action: "me" });
    if (r.ok) { setUser(r.user); setPrizes(r.prizes); } else { localStorage.removeItem("gpc_token"); setUser(null); }
    setReady(true);
  }
  useEffect(() => { refresh(); }, []);

  async function run(body: object, after?: (r: any) => void) {
    setBusy(true); setMsg("");
    try {
      const r = await api(body);
      if (r.error) setMsg(r.error); else after?.(r);
    } catch { setMsg("Could not reach the server. Try again."); }
    setBusy(false);
  }

  const auth = () => run({ action: mode, name, password }, (r) => { localStorage.setItem("gpc_token", r.token); setPassword(""); refresh(); });
  const logout = async () => { await api({ action: "logout" }); localStorage.removeItem("gpc_token"); setUser(null); setPrizes([]); };
  const claim = () => run({ action: "claim", pin }, () => { setPin(""); refresh(); });
  const addWinner = () => run({ action: "addWinner", name: wName, amount: wAmt }, (r) => { setNewPin(`${wName}: PIN ${r.pin}`); setWName(""); refresh(); });
  const redeem = () => run({ action: "redeem", code }, () => { setMsg("Redeemed."); setCode(""); refresh(); });

  if (!ready) return <main className="p-6">Loading…</main>;

  if (!user)
    return (
      <main className="max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold mt-4">🛒 Grocery Prize Claim</h1>
        <p className="text-gray-500 mb-4">Log in with your name to check and claim your prize.</p>
        <div className={card}>
          <label>Full name</label>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
          <label>Password</label>
          <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-red-700 text-sm min-h-5">{msg}</p>
          <div className="flex justify-between items-center">
            <button className={btn} disabled={busy} onClick={auth}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Register"}</button>
            <button className="text-green-700 text-sm" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMsg(""); }}>
              {mode === "login" ? "New here? Register" : "Have an account?"}
            </button>
          </div>
        </div>
      </main>
    );

  const isAdmin = user.role === "admin";
  const mine = prizes.find((p) => p.username === user.username);

  return (
    <main className="max-w-md mx-auto p-4">
      <div className="flex justify-between items-center mt-4 mb-4">
        <h1 className="text-xl font-bold">Hi, {user.name}</h1>
        <button className="text-sm text-green-700" onClick={logout}>Log out</button>
      </div>

      {!mine && <div className={card}><b>No prize found</b>
        <p className="text-gray-500">Log in with the exact name used in the promo.</p></div>}

      {mine?.status === "pending" && (
        <div className={card}>
          <p className="text-3xl font-bold text-green-700">₱{Number(mine.amount).toLocaleString()}</p>
          <p className="my-2">Congratulations! Enter the 6-digit PIN the store gave you.</p>
          <input className={input} inputMode="numeric" maxLength={6} placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
          <button className={btn} disabled={busy || pin.length < 6} onClick={claim}>Claim my prize</button>
        </div>
      )}

      {mine && mine.status !== "pending" && (
        <div className={card}>
          <p className="text-3xl font-bold text-green-700">₱{Number(mine.amount).toLocaleString()}</p>
          <p className="my-2">{mine.status === "redeemed" ? "Already redeemed." : "Show this code at the store with a valid ID:"}</p>
          <div className="font-mono text-2xl tracking-widest text-center border border-dashed border-green-700 rounded-lg p-3">{mine.claimCode}</div>
        </div>
      )}

      {isAdmin && (<>
        <div className={card}>
          <b>Admin: add winner</b>
          <input className={input} placeholder="Winner's full name" value={wName} onChange={(e) => setWName(e.target.value)} />
          <input className={input} type="number" value={wAmt} onChange={(e) => setWAmt(+e.target.value)} />
          <button className={btn} disabled={busy} onClick={addWinner}>Add winner</button>
          {newPin && <p className="mt-3 p-2 bg-yellow-50 border border-yellow-300 rounded text-sm">
            Give this to the winner now. It will not be shown again:<br /><b>{newPin}</b></p>}
        </div>
        <div className={card}>
          <b>Admin: redeem code</b>
          <input className={input} placeholder="GRC-XXXXXXXX" value={code} onChange={(e) => setCode(e.target.value)} />
          <button className={btn} disabled={busy} onClick={redeem}>Mark redeemed</button>
        </div>
        <div className={card + " overflow-x-auto"}>
          <b>All winners</b>
          <table className="w-full text-sm mt-2"><tbody>
            {prizes.map((p) => (
              <tr key={p.username} className="border-b"><td className="py-1">{p.name}</td>
                <td>₱{p.amount}</td><td>{p.status}</td><td>{p.claimCode}</td></tr>
            ))}
          </tbody></table>
        </div>
      </>)}
      <p className="text-red-700 text-sm">{msg}</p>
    </main>
  );
}