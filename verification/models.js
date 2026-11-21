#!/usr/bin/env node
/* 原理の第二巻を機械で確かめる。
 *
 *   node verification/models.js
 *
 * 一、十の法則と定義六を、原理の第二巻に書いた式のとおりに評価する。
 * 二、模型 M₀ がすべてを満たし（定理八）、M₁〜M₁₀ がそれぞれ一つだけを破る（定理九）ことを確かめる。
 * 三、M₀ と M₀⁻ が、外から見えるものを等しくして、魔法使いかどうかだけが違うことを確かめる（定理十）。
 * 四、五つの正多面体について、面の中心の集まりが中心対称か（定理十二）と、回転で重なるものを同じとみた
 *     負正の割り当ての数（定理十三、バーンサイドの補題）を、座標から計算する。
 * 五、第三巻：回転群が面の上に推移的に働くことと面の安定化群（定理十四）、頂点・辺・面の数とオイラーの公式
 *     （定理十五）、双対で面と頂点の数が入れ替わること（定理十六）、完全な網での構造均衡定理（定理十七、
 *     三人から六人まで総当たり）、輪の網で一本の線から源が二人に残ること（定理十八）を確かめる。
 * 依存は Node.js だけ。
 */
'use strict';

const T_MAX = 100;
const NEG = '-', POS = '+';

/* ---- 一、式の評価 ---- */

/* 正六面体の面と逆（定義十）。面 0 と 1、2 と 3、4 と 5 が向かい合う。 */
const CUBE = { faces: [0, 1, 2, 3, 4, 5], iota: (u) => u ^ 1 };

function range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }

function H(m, p, t) {
  const out = new Set();
  p.E.forEach((el, ei) => { for (const s of range(0, Math.min(t, p.L))) for (const c of m.C) if (m.sigma(p, ei, el.phi(s, c), s, c) === NEG) out.add(ei + '@' + s + '@' + c); });
  return out;
}
const N = (m, p, t) => (p.N ? p.N(t, H(m, p, t)) : H(m, p, t));
const A = (m, p, t) => N(m, p, t).size;

function W(m, p, t) {
  return p.Act.some((a) => a.t <= t && a.R.length > 0 && a.U.every(([, s]) => s <= a.t)
    && a.U.some(([ei, s, c]) => m.sigma(p, ei, p.E[ei].phi(s, c), s, c) === NEG)
    && a.U.some(([ei, s, c]) => m.sigma(p, ei, p.E[ei].phi(s, c), s, c) === POS));
}

function Sw(m, p, t) {
  for (const k of N(m, p, t)) {
    const [ei, s, c] = k.split('@').map((v, i) => (i < 2 ? Number(v) : v));
    if (!(s < t)) continue;
    const el = p.E[ei], star = el.type.iota(el.phi(s, c));
    if (m.C.some((c2) => el.phi(t, c2) === star && m.sigma(p, ei, star, t, c2) === POS)) return true;
  }
  return false;
}

const alive = (p) => range(0, p.L);
const LAWS = {
  D6: (m) => m.P.every((p) => p.E.every((el, ei) => el.type.faces.every((u) => {
    const sig = range(0, T_MAX).flatMap((t) => m.C.map((c) => m.sigma(p, ei, u, t, c)));
    return sig.includes(NEG) && sig.includes(POS);
  }))),
  D7: (m) => m.P.every((p) => alive(p).every((t) => [...N(m, p, t)].every((k) => H(m, p, t).has(k)))),
  L1: (m) => m.P.every((p) => !(p.L >= 30 && p.V(30)) || alive(p).some((t) => W(m, p, t))),
  L2: (m) => m.P.every((p) => p.E.every((el) => new Set(alive(p).flatMap((t) => m.C.map((c) => el.phi(t, c)))).size >= 2)),
  L3: (m) => m.P.every((p) => alive(p).every((t) => { const n = N(m, p, t), h = H(m, p, t); return n.size === h.size && [...h].every((k) => n.has(k)); })),
  L4: (m) => m.P.every((p) => !alive(p).some((t) => A(m, p, t) >= p.kappa) || alive(p).some((t) => Sw(m, p, t))),
  L5: (m) => m.P.some((p) => range(0, Math.min(29, p.L)).some((t) => Sw(m, p, t))),
  L6: (m) => m.P.every((p) => p.Act.every((a) => a.R.every((r) => p.Rel.has(r))) && [...p.Rel].every((r) => !m.Obs.has(r))),
  L7: (m) => m.P.every((p) => alive(p).every((t) => !W(m, p, t) || range(t, p.L).every((s) => p.Act.some((a) => a.t === s && a.R.length > 0)))),
  L8: (m) => m.P.every((p) => alive(p).every((t) => !W(m, p, t) || range(t, p.L).every((s) => p.B(s)))),
  L9: (m) => m.Wr.every(([y]) => m.Harm.has(y)),
  L10: (m) => m.P.every((p) => (!alive(p).some((t) => W(m, p, t)) || p.L >= m.Lambda) && range(0, p.L - 1).every((s) => p.Toil(s) < p.Toil(s + 1))),
};
const LAW_NAMES = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10'];

/* ---- 二、模型 ---- */

/* M₀ の x。負の時 n（M₀ では 20）に面 f を負に向け、のちに逆 f* を正に向け、n+1 から毎年成果を生む。 */
const G = 2, F = 0, FSTAR = 1;
function wizard(id, n, opts = {}) {
  const L = opts.L ?? 100;
  const acts = opts.acts ?? range(n + 1, L);
  return {
    id, L, kappa: 1, V: opts.V ?? (() => true),
    E: [{ type: CUBE, phi: opts.phi ?? ((t) => (t < n ? G : t === n ? F : FSTAR)) }],
    Act: acts.map((s) => ({ t: s, U: [[0, n, 'c'], [0, s, 'c']], R: ['r' + id + s] })),
    Rel: new Set(acts.map((s) => 'r' + id + s)),
    B: opts.B ?? (() => true), Toil: (t) => t, N: opts.N,
  };
}
/* 場面は一つ。どの要素のどの面も、負の時 n にだけ負で、ほかは正（定義六）。 */
const world = (P, n, extra = {}) => Object.assign({ P, C: ['c'], sigma: (p, ei, u, t) => (t === n ? NEG : POS), Obs: new Set(), Wr: [], Harm: new Set(), Lambda: 80 }, extra);

const M = {};
M[0] = world([wizard('x', 20)], 20);
/* M₁：人 y は三十歳まで童貞だが、能動がなく、魔法使いと成らない。閾 2 には届かない。 */
M[1] = world([wizard('x', 20), { id: 'y', L: 100, kappa: 2, V: () => true, E: [{ type: CUBE, phi: (t) => (t % 2 ? 3 : 2) }], Act: [], Rel: new Set(), B: () => true, Toil: (t) => t }], 20);
/* M₂：x に、向きの変わらない要素 e′ を足す。 */
M[2] = world([Object.assign(wizard('x', 20), { E: [wizard('x', 20).E[0], { type: CUBE, phi: () => 4 }] })], 20);
/* M₃：時 50 より後、蓄積から出来事が消える。 */
M[3] = world([wizard('x', 20, { N: (t, h) => (t > 50 ? new Set() : h) })], 20);
/* M₄：x は時 20 より後も f を向け続け、逆が顕れない。z は M₀ の x の写しで、第五法則を保つ。 */
M[4] = world([wizard('x', 20, { phi: (t) => (t < 20 ? G : F) }), wizard('z', 20)], 20);
/* M₅：負の時を 40 に移す。切り替わりは時 41。 */
M[5] = world([wizard('x', 40)], 40);
/* M₆：成果の一つが外から見える。 */
M[6] = world([wizard('x', 20)], 20, { Obs: new Set(['rx21']) });
/* M₇：能動は時 21 の一つだけ。 */
M[7] = world([wizard('x', 20, { acts: [21] })], 20);
/* M₈：時 50 に脳が止まる。 */
M[8] = world([wizard('x', 20, { B: (t) => t !== 50 })], 20);
/* M₉：具体を記したのに、害が返らない。 */
M[9] = world([wizard('x', 20)], 20, { Wr: [['x', 'rx21']] });
/* M₁₀：魔法使いの生きる長さが 50 で、Λ = 80 に届かない。 */
M[10] = world([wizard('x', 20, { L: 50 })], 20);
/* M₀⁻：M₀ から能動を除き、童貞を偽とする。外から見えるもの（Obs）は M₀ と同じ。 */
const M0minus = world([Object.assign(wizard('x', 20, { V: () => false }), { Act: [], Rel: new Set() })], 20);
/* M₀′：M₀ で童貞を偽とする。童貞でない魔法使い（定理二・定理十）。 */
const M0prime = world([wizard('x', 20, { V: () => false })], 20);

function evaluate(m) { const r = {}; for (const k of ['D6', 'D7', ...LAW_NAMES]) r[k] = LAWS[k](m); return r; }

/* ---- 四、正多面体 ---- */

const PHI = (1 + Math.sqrt(5)) / 2;
function signs3(v) { const out = []; for (const a of [1, -1]) for (const b of [1, -1]) for (const c of [1, -1]) out.push([v[0] * a, v[1] * b, v[2] * c]); return out; }
function uniq(ps) { const out = []; for (const p of ps) if (!out.some((q) => dist(p, q) < 1e-9)) out.push(p); return out; }
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const cyc = (v) => [[v[0], v[1], v[2]], [v[1], v[2], v[0]], [v[2], v[0], v[1]]];
const icosaV = uniq([[0, 1, PHI], [0, 1, -PHI], [0, -1, PHI], [0, -1, -PHI]].flatMap(cyc));
const dodecaV = uniq([...signs3([1, 1, 1]), ...[[0, PHI, 1 / PHI]].flatMap((v) => signs3(v)).flatMap(cyc)]);
/* 面の中心の向き。正四面体の面の中心は −v（v は向かい合う頂点）、ほかは双対の頂点。 */
const SOLIDS = [
  { name: '正四面体', verts: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]], faces: [[-1, -1, -1], [-1, 1, 1], [1, -1, 1], [1, 1, -1]], gens: [rot([1, 1, 1], 2 * Math.PI / 3), rot([1, 0, 0], Math.PI)] },
  { name: '正六面体', verts: signs3([1, 1, 1]), faces: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], gens: [rot([0, 0, 1], Math.PI / 2), rot([1, 1, 1], 2 * Math.PI / 3)] },
  { name: '正八面体', verts: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], faces: signs3([1, 1, 1]), gens: [rot([0, 0, 1], Math.PI / 2), rot([1, 1, 1], 2 * Math.PI / 3)] },
  { name: '正十二面体', verts: dodecaV, faces: icosaV, gens: [rot([0, 1, PHI], 2 * Math.PI / 5), rot([1, 1, 1], 2 * Math.PI / 3)] },
  { name: '正二十面体', verts: icosaV, faces: dodecaV, gens: [rot([0, 1, PHI], 2 * Math.PI / 5), rot([1, 1, 1], 2 * Math.PI / 3)] },
];
function rot(axis, ang) {
  const n = Math.hypot(...axis), [x, y, z] = axis.map((a) => a / n), c = Math.cos(ang), s = Math.sin(ang), k = 1 - c;
  return [[c + x * x * k, x * y * k - z * s, x * z * k + y * s], [y * x * k + z * s, c + y * y * k, y * z * k - x * s], [z * x * k - y * s, z * y * k + x * s, c + z * z * k]];
}
const mul = (a, b) => a.map((r, i) => [0, 1, 2].map((j) => r[0] * b[0][j] + r[1] * b[1][j] + r[2] * b[2][j]));
const app = (a, p) => [0, 1, 2].map((i) => a[i][0] * p[0] + a[i][1] * p[1] + a[i][2] * p[2]);
const same = (a, b) => a.every((r, i) => r.every((v, j) => Math.abs(v - b[i][j]) < 1e-9));
function closure(gens) {
  const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], g = [I];
  for (let i = 0; i < g.length; i++) for (const h of gens) { const p = mul(g[i], h); if (!g.some((q) => same(p, q))) g.push(p); }
  return g;
}
function solidFacts(sol) {
  const G = closure(sol.gens), F = sol.faces;
  const perm = (g) => F.map((p) => { const q = app(g, p); const j = F.findIndex((r) => dist(q, r) < 1e-9); if (j < 0) throw new Error(sol.name + '：回転が面を面に移さない'); return j; });
  const cycles = (pm) => { const seen = new Set(); let c = 0; for (let i = 0; i < pm.length; i++) if (!seen.has(i)) { c++; for (let j = i; !seen.has(j); j = pm[j]) seen.add(j); } return c; };
  const sum = G.reduce((acc, g) => acc + 2n ** BigInt(cycles(perm(g))), 0n);
  if (sum % BigInt(G.length) !== 0n) throw new Error(sol.name + '：割り切れない');
  /* 面 0 の軌道（推移的か）と安定化群の位数。辺は、最も近い頂点の対の数。 */
  const orbit = new Set(G.map((g) => perm(g)[0]));
  const stab = G.filter((g) => perm(g)[0] === 0).length;
  const Vt = sol.verts; let dmin = Infinity;
  for (let i = 0; i < Vt.length; i++) for (let j = i + 1; j < Vt.length; j++) dmin = Math.min(dmin, dist(Vt[i], Vt[j]));
  let E = 0; for (let i = 0; i < Vt.length; i++) for (let j = i + 1; j < Vt.length; j++) if (Math.abs(dist(Vt[i], Vt[j]) - dmin) < 1e-9) E++;
  return { name: sol.name, faces: F.length, verts: Vt.length, edges: E, euler: Vt.length - E + F.length, transitive: orbit.size === F.length, stabilizer: stab, order: G.length, all: 2n ** BigInt(F.length), orbits: sum / BigInt(G.length), centrallySymmetric: F.every((p) => F.some((q) => dist(q, p.map((v) => -v)) < 1e-9)) };
}

/* 定理十七：完全な網 K_n の符号のすべてについて、「すべての三角の積が正」と「二つの組に分けられる」が同じか。
 * 完全な網では、すべての閉路の均衡は、すべての三角の均衡と同じ（閉路は三角の積に分かれる）。 */
function balanceTheorem(nMax) {
  for (let n = 3; n <= nMax; n++) {
    const pairs = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
    for (let mask = 0; mask < 2 ** pairs.length; mask++) {
      const s = {}; pairs.forEach(([i, j], k) => { s[i + ',' + j] = (mask >> k) & 1 ? -1 : 1; });
      const sg = (i, j) => (i < j ? s[i + ',' + j] : s[j + ',' + i]);
      let tri = true; for (let a = 0; a < n && tri; a++) for (let b = a + 1; b < n && tri; b++) for (let c = b + 1; c < n; c++) if (sg(a, b) * sg(b, c) * sg(a, c) < 0) { tri = false; break; }
      let split = false; for (let part = 0; part < 2 ** (n - 1) && !split; part++) { const side = (i) => (i === 0 ? 0 : (part >> (i - 1)) & 1); split = pairs.every(([i, j]) => (side(i) === side(j)) === (sg(i, j) > 0)); }
      if (tri !== split) return { ok: false, n, mask };
    }
  }
  return { ok: true, nMax };
}
/* 定理十八：輪 C_n（n ≥ 4）で、線 yz を太らせうる源（y か z に隣り、線の端ではない人）は、ちょうど二人。 */
function ringSources(n) {
  const out = [];
  for (let y = 0; y < n; y++) { const z = (y + 1) % n; const cand = new Set(); for (const [a, b] of [[y, z], [z, y]]) for (const w of [(a + 1) % n, (a + n - 1) % n]) if (w !== a && w !== b) cand.add(w); out.push(cand.size); }
  return out;
}

function run() {
  const res = { models: {}, M0minus: evaluate(M0minus), M0prime: evaluate(M0prime) };
  for (let k = 0; k <= 10; k++) res.models[k] = evaluate(M[k]);
  res.W = { M0: W(M[0], M[0].P[0], 100), M0minus: W(M0minus, M0minus.P[0], 100), M0prime: W(M0prime, M0prime.P[0], 100), firstM0: range(0, 100).find((t) => W(M[0], M[0].P[0], t)) };
  res.switchM0 = range(0, 100).find((t) => Sw(M[0], M[0].P[0], t));
  res.switchM5 = range(0, 100).find((t) => Sw(M[5], M[5].P[0], t));
  res.sameObs = [...M[0].Obs].join() === [...M0minus.Obs].join();
  res.solids = SOLIDS.map(solidFacts);
  res.balance = balanceTheorem(6);
  res.ring = [4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => ringSources(n).every((c) => c === 2));
  res.ring3 = ringSources(3);
  return res;
}

/* 主張：M₀ はすべてを満たし、M_k は L_k だけを破る。 */
function verdict(res) {
  const bad = [];
  const all = (r) => Object.values(r).every(Boolean);
  if (!all(res.models[0])) bad.push('M₀ が満たさない：' + Object.keys(res.models[0]).filter((k) => !res.models[0][k]).join(' '));
  for (let k = 1; k <= 10; k++) {
    const r = res.models[k], broken = Object.keys(r).filter((n) => !r[n]);
    if (broken.join(' ') !== 'L' + k) bad.push('M' + k + ' が破るもの：' + (broken.join(' ') || 'なし'));
  }
  if (!all(res.M0minus) || !all(res.M0prime)) bad.push('M₀⁻ か M₀′ が法則を満たさない');
  if (!(res.W.M0 && !res.W.M0minus && res.W.M0prime && res.sameObs)) bad.push('識別の不能の対が成り立たない');
  if (res.W.firstM0 !== 21 || res.switchM0 !== 21 || res.switchM5 !== 41) bad.push('M₀ の成る時・切り替わりの時、M₅ の切り替わりの時');
  for (const s of res.solids) { if (!s.transitive) bad.push(s.name + '：回転群が面の上に推移的でない'); if (s.euler !== 2) bad.push(s.name + '：V − E + F = ' + s.euler); if (s.stabilizer * s.faces !== s.order) bad.push(s.name + '：軌道と安定化群'); }
  const by = Object.fromEntries(res.solids.map((s) => [s.name, s]));
  for (const [a, b] of [['正六面体', '正八面体'], ['正十二面体', '正二十面体'], ['正四面体', '正四面体']]) if (by[a].faces !== by[b].verts || by[a].verts !== by[b].faces || by[a].edges !== by[b].edges || by[a].order !== by[b].order) bad.push(a + 'と' + b + '：双対の数が合わない');
  if (!res.balance.ok) bad.push('構造均衡定理が K_' + res.balance.n + ' で破れる');
  if (!res.ring.every(Boolean)) bad.push('輪の源が二人でない網がある');
  return bad;
}

module.exports = { run, verdict, LAWS, M };

if (require.main === module) {
  const res = run();
  for (let k = 0; k <= 10; k++) console.log('M' + k, Object.entries(res.models[k]).filter(([, v]) => !v).map(([n]) => n).join(' ') || 'すべて満たす');
  console.log('M0- 魔法使い', res.W.M0minus, ' M0 魔法使い', res.W.M0, ' M0′ 魔法使い', res.W.M0prime);
  for (const s of res.solids) console.log(s.name, 'V', s.verts, 'E', s.edges, 'F', s.faces, 'V−E+F', s.euler, '推移', s.transitive, '安定化群', s.stabilizer, '回転群', s.order, '割り当て', String(s.all), '本質', String(s.orbits), '中心対称', s.centrallySymmetric);
  console.log('構造均衡', JSON.stringify(res.balance), '輪の源', res.ring.join(), 'C3', res.ring3.join());
  const bad = verdict(res);
  console.log(bad.length ? '落：' + bad.join(' / ') : '通：すべての主張が成り立つ');
  process.exit(bad.length ? 1 : 0);
}
