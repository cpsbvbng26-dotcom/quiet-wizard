#!/usr/bin/env node
/* 本番の頁と共有のカードが、ログインなしで外から読めるかを確かめる。
 *
 *   node verification/live.js              本番（https://quiet-wizard.vercel.app）を取り寄せて確かめる（外への接続が要る。CI が回す）
 *   node verification/live.js --self-test  作り物の答えで、確かめが落ちるべきものを落とすかを見る（外へは出ない）
 *
 * 2026-11-23 に、共有したときに画像が出ないと運営者が知らせた。頁の og:image と PNG は正しく生成されていた。
 * この環境からは本番に届かないので、GitHub Actions から、cookie も鍵も持たずに取り寄せて、
 * 共有の取り寄せ役（X など）が見るのと同じ所在を見る。
 * 確かめるのは、日本語と英語のはじめにの頁が 200 の HTML で返ること、og:image が本番の所在の PNG を指すこと、
 * その PNG が 200 の image/png で、1200×630 であること。転送やログインの保護に当たれば、その状態と行き先を書いて落ちる。
 * 同じ確かめを、一般の取り寄せ役の名と、X の取り寄せ役の名（Twitterbot）の二つで行う。 */
'use strict';

const BASE = 'https://quiet-wizard.vercel.app';
const PAGES = ['/', '/index.en.html'];
const AGENTS = ['quiet-wizard-live/1 (+https://github.com/cpsbvbng26-dotcom/quiet-wizard)', 'Twitterbot/1.0'];
const CARD = { width: 1200, height: 630 };

/* 一つの答えを言葉にする。r は { status, type, location }。 */
function where(r) {
  return 'status ' + r.status + (r.type ? ', ' + r.type : '') + (r.location ? ', 行き先 ' + r.location : '');
}

/* 頁の答えを確かめ、og:image の所在を返す。問題があれば errors に足す。 */
function judgePage(url, r, errors) {
  if (r.status !== 200) {
    const sso = /vercel\.com\/(sso|login)|_vercel_sso|vercel-auth/i.test(r.location || '') || r.status === 401;
    errors.push(url + '：200 でない（' + where(r) + '）' + (sso ? '。Vercel のログインの保護に当たっている' : ''));
    return null;
  }
  if (!/^text\/html\b/i.test(r.type || '')) { errors.push(url + '：HTML でない（' + where(r) + '）'); return null; }
  const m = /<meta property="og:image" content="([^"]+)"/.exec(r.body || '');
  if (!m) { errors.push(url + '：og:image が無い'); return null; }
  if (m[1].indexOf(BASE + '/') !== 0) { errors.push(url + '：og:image が本番の所在でない（' + m[1] + '）'); return null; }
  if (!/<meta name="twitter:card" content="summary_large_image"/.test(r.body || '')) errors.push(url + '：twitter:card が summary_large_image でない');
  return m[1];
}

/* PNG の答えを確かめる。r.bytes は Buffer。 */
function judgeImage(url, r, errors) {
  if (r.status !== 200) { errors.push(url + '：200 でない（' + where(r) + '）'); return; }
  if (!/^image\/png\b/i.test(r.type || '')) { errors.push(url + '：image/png でない（' + where(r) + '）'); return; }
  const b = r.bytes || Buffer.alloc(0);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (b.length < 24 || !b.subarray(0, 8).equals(sig) || b.toString('latin1', 12, 16) !== 'IHDR') { errors.push(url + '：PNG として読めない'); return; }
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  if (w !== CARD.width || h !== CARD.height) errors.push(url + '：大きさが ' + w + '×' + h + '（' + CARD.width + '×' + CARD.height + ' でない）');
}

async function get(url, agent) {
  const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': agent, Accept: '*/*' } });
  const bytes = Buffer.from(await res.arrayBuffer());
  return { status: res.status, type: res.headers.get('content-type') || '', location: res.headers.get('location') || '', bytes, body: bytes.toString('utf8') };
}

async function live() {
  const errors = [];
  let n = 0;
  for (const agent of AGENTS) {
    for (const p of PAGES) {
      const url = BASE + p;
      const r = await get(url, agent);
      n++;
      console.log('  ' + agent.split('/')[0] + '  ' + url + '  ' + where(r));
      const img = judgePage(url, r, errors);
      if (!img) continue;
      const ri = await get(img, agent);
      n++;
      console.log('  ' + agent.split('/')[0] + '  ' + img + '  ' + where(ri) + ', ' + ri.bytes.length + ' バイト');
      judgeImage(img, ri, errors);
    }
  }
  console.log('');
  if (errors.length) { errors.forEach((e) => console.log('落  ' + e)); process.exit(1); }
  console.log(n + ' 件の取り寄せが、どれも通りました。');
}

/* 作り物の答えで、落ちるべきものを落とすかを見る。 */
function selfTest() {
  const png = (w, h) => { const b = Buffer.alloc(33); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0); b.writeUInt32BE(13, 8); b.write('IHDR', 12, 'latin1'); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); return b; };
  const html = '<meta property="og:image" content="' + BASE + '/assets/card.png"><meta name="twitter:card" content="summary_large_image">';
  const page = (o) => Object.assign({ status: 200, type: 'text/html; charset=utf-8', location: '', body: html }, o);
  const image = (o) => Object.assign({ status: 200, type: 'image/png', location: '', bytes: png(1200, 630) }, o);
  const run = (p, i) => { const e = []; const u = judgePage('x', p, e); if (u && i) judgeImage(u, i, e); return e; };
  const cases = [
    ['通るべきもの', run(page(), image()).length === 0],
    ['ログインの保護への転送で落ちる', /ログインの保護/.test(run(page({ status: 302, location: 'https://vercel.com/sso-api?url=x' }))[0] || '')],
    ['401 で落ちる', /ログインの保護/.test(run(page({ status: 401 }))[0] || '')],
    ['HTML でなければ落ちる', run(page({ type: 'text/plain' })).length === 1],
    ['og:image が無ければ落ちる', run(page({ body: '<p>x</p>' })).length === 1],
    ['og:image が別の所在なら落ちる', run(page({ body: html.replace(BASE, 'https://example.com') })).length === 1],
    ['twitter:card が違えば落ちる', run(page({ body: html.replace('summary_large_image', 'summary') }), image()).length === 1],
    ['画像が 404 なら落ちる', run(page(), image({ status: 404 })).length === 1],
    ['画像が PNG の型でなければ落ちる', run(page(), image({ type: 'text/html' })).length === 1],
    ['画像が PNG として読めなければ落ちる', run(page(), image({ bytes: Buffer.from('<html>') })).length === 1],
    ['画像の大きさが違えば落ちる', run(page(), image({ bytes: png(600, 315) })).length === 1],
  ];
  const bad = cases.filter(([, ok]) => !ok);
  cases.forEach(([name, ok]) => console.log((ok ? '  通  ' : '  落  ') + name));
  console.log('');
  if (bad.length) { console.log(bad.length + ' 件が期待どおりでない。'); process.exit(1); }
  console.log(cases.length + ' 件すべて期待どおりでした。');
}

if (require.main === module) {
  if (process.argv.includes('--self-test')) selfTest();
  else live().catch((e) => { console.log('落  取り寄せに失敗: ' + (e && e.cause ? e.cause.message || e.cause.code : e.message)); process.exit(1); });
}

module.exports = { judgePage, judgeImage, BASE, PAGES };
