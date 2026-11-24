#!/usr/bin/env node
/* Wayback Machine（Internet Archive）に、このサイトの頁の写しを頼み、残ったことを確かめる（2026-11-24）。
 * 運営者の別のリポジトリのワークフロー（wayback.yml）を写し、このサイトに合わせた。論文の PDF は、このサイトに無い。
 *
 *   node verification/wayback.js            # 頼んで確かめる（外への接続が要る。CI のワークフロー「Wayback Machine」を手で起こしたときだけ回る）
 *   node verification/wayback.js --dry-run  # 頼まずに、頼む頁と、robots.txt が閉じているので頼まない頁を出す
 *
 * 頼むのは site/sitemap.xml の頁のうち、site/robots.txt が Internet Archive の取り寄せ役（ia_archiver、archive.org_bot）と
 * 全員（*）の組で閉じていないものだけ。閉じる頁は build.js の ARCHIVE_CLOSED が決める（みんなの図鑑の二つの頁）。
 * Wayback Machine の写しは、運営者には消せない。求めがあればすぐ外すと決めた頁は、頼まない。
 * 本番の robots.txt がこのコミットのものと同じになるまで待ち、同じにならなければ何も頼まない。
 * 頼んだあと、archive.org/wayback/available で、頼んだ日（UTC）の写しがあるかを確かめる。確かめられたものだけを「残った」とする。
 * 一つでも確かめられなければ、終わりの番号を 1 にする。成功に見せないため。
 * 送るのはこのサイトの頁の所在だけで、読む人についての何も送らない。 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const BASE = 'https://quiet-wizard.vercel.app/';
const SAVE = 'https://web.archive.org/save/';
const AVAILABLE = 'https://archive.org/wayback/available';
const BOTS = ['*', 'ia_archiver', 'archive.org_bot'];
/* 429（頼みすぎ）のあとに待つ秒。ほかの答えでは、頼み直さない。 */
const RETRY_WAITS = [60, 180];
/* 頼んでから写しを見るまでの秒と、見えなかったときにもう一度見るまでの秒。 */
const LOOK_WAITS = [20, 60];
const DRY = process.argv.includes('--dry-run');

const locs = (xml) => [...String(xml || '').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

/* robots.txt のうち、Internet Archive の取り寄せ役と全員（*）の組の Disallow を集める。空の Disallow は何も閉じない。
 * Allow との長さ比べはせず、一つでも当たれば閉じたとみなす（頼まない側に倒す）。* と $ の書き方は読まずに止める。 */
function closedPrefixes(robots) {
  const out = [];
  let agents = [];
  let rules = false;
  for (const raw of String(robots || '').split(/\r?\n/)) {
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(raw.replace(/#.*/, '').trim());
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'user-agent') {
      if (rules) { agents = []; rules = false; }
      agents.push(v.toLowerCase());
    } else if (k === 'allow' || k === 'disallow') {
      rules = true;
      if (k === 'disallow' && v && agents.some((a) => BOTS.includes(a))) {
        if (/[*$]/.test(v)) throw new Error('robots.txt の Disallow に、この台本が読まない書き方がある：' + v);
        out.push(v);
      }
    }
  }
  return out;
}

/* sitemap の頁を、頼むものと、robots.txt が閉じているので頼まないものに分ける。 */
function targets(xml, robots) {
  const closed = closedPrefixes(robots);
  const shut = (u) => closed.some((c) => new URL(u).pathname.startsWith(c));
  const all = locs(xml);
  return { save: all.filter((u) => !shut(u)), closed: all.filter(shut) };
}

/* 時刻を、Wayback Machine の 14 字の時刻（UTC）にする。 */
const stamp = (d) => d.toISOString().replace(/\D/g, '').slice(0, 14);

/* 写しの有無の答え（JSON の文）から、その日の写しの所在を返す。無ければ null。 */
function confirmed(text, day) {
  let c = null;
  try { c = ((JSON.parse(text) || {}).archived_snapshots || {}).closest; } catch (e) { return null; }
  return c && c.available === true && /^\d{14}$/.test(String(c.timestamp)) && String(c.timestamp).startsWith(day) && typeof c.url === 'string' ? c.url : null;
}

/* 頁ごとに、写しを頼み、頼んだ日の写しがあるかを確かめる。io は { get(url) → { status, text }, sleep(秒), now() → Date, log(文) }。
 * 見るときの timestamp は頼んだ時刻にする。日の初めにすると、前の日の写しが「いちばん近い」として返ることがある。 */
async function saveAll(urls, io) {
  const done = [], failed = [];
  for (const u of urls) {
    const at = stamp(io.now());
    const day = at.slice(0, 8);
    let asked = { status: 0 };
    for (const wait of [0, ...RETRY_WAITS]) {
      if (wait) await io.sleep(wait);
      asked = await io.get(SAVE + u).catch(() => ({ status: 0, text: '' }));
      if (asked.status !== 429) break;
    }
    io.log('頼んだ（' + asked.status + '） ' + u);
    let s = null;
    for (const wait of LOOK_WAITS) {
      await io.sleep(wait);
      const a = await io.get(AVAILABLE + '?timestamp=' + at + '&url=' + encodeURIComponent(u)).catch(() => null);
      s = a && a.status === 200 ? confirmed(a.text, day) : null;
      if (s) break;
    }
    (s ? done : failed).push([u, s]);
    io.log((s ? '残った   ' : '見えない ') + u + (s ? '  ' + s : ''));
  }
  return { done, failed };
}

/* 要約。「残った」に挙げるのは、確かめられたものだけ。 */
function summary(r, closed) {
  let s = '残ったもの ' + r.done.length + ' / 頼んだもの ' + (r.done.length + r.failed.length) + '\n\n';
  for (const [u, w] of r.done) s += '- ' + u + '\n  ' + w + '\n';
  if (r.failed.length) s += '\n今日の写しが見えなかったもの（取り込みが遅れているだけのこともある）\n\n' + r.failed.map(([u]) => '- ' + u + '\n').join('');
  if (closed.length) s += '\nrobots.txt が閉じているので頼まなかったもの\n\n' + closed.map((u) => '- ' + u + '\n').join('');
  return s;
}

const UA = { 'User-Agent': 'quiet-wizard wayback workflow' };
const io = {
  get: async (u) => { const r = await fetch(u, { headers: UA, cache: 'no-store', signal: AbortSignal.timeout(120000) }); return { status: r.status, text: await r.text() }; },
  sleep: (s) => new Promise((ok) => setTimeout(ok, s * 1000)),
  now: () => new Date(),
  log: (s) => console.log(s),
};

async function main() {
  const xml = fs.readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8');
  const robots = fs.readFileSync(path.join(SITE, 'robots.txt'), 'utf8');
  const t = targets(xml, robots);
  if (!t.save.length || [...t.save, ...t.closed].some((u) => !u.startsWith(BASE))) throw new Error('sitemap に頁が無いか、このサイトの所在でないものがある');
  console.log('頼む頁 ' + t.save.length + ' 件');
  t.save.forEach((u) => console.log('  ' + u));
  console.log('robots.txt が閉じているので頼まない頁 ' + t.closed.length + ' 件');
  t.closed.forEach((u) => console.log('  ' + u));
  if (DRY) return;
  for (let i = 0; ; i++) {
    const live = await io.get(BASE + 'robots.txt').catch(() => null);
    if (live && live.status === 200 && live.text === robots) break;
    if (i === 19) throw new Error('本番の robots.txt がこのコミットのものでない。何も頼んでいない');
    await io.sleep(30);
  }
  const r = await saveAll(t.save, io);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary(r, t.closed));
  console.log('残ったもの ' + r.done.length + ' / 頼んだもの ' + t.save.length);
  if (r.failed.length) throw new Error('今日の写しが見えないもの ' + r.failed.length + ' / 頼んだもの ' + t.save.length);
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });

module.exports = { locs, closedPrefixes, targets, stamp, confirmed, saveAll, summary, BASE, SAVE, AVAILABLE, BOTS, RETRY_WAITS, LOOK_WAITS };
