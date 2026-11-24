#!/usr/bin/env node
/* IndexNow に、増えた頁と消えた頁を知らせる（2026-11-24）。運営者の別のリポジトリの小さい版を写し、このサイトに合わせた。
 *
 *   node verification/indexnow.js            # BEFORE の sitemap と比べて、増えた頁と消えた頁を送る（外への接続が要る。CI が回す）
 *   node verification/indexnow.js --dry-run  # 送らずに、送るものを出す
 *   ALL=yes node verification/indexnow.js    # sitemap の頁を全部送る
 *
 * 鍵は build.js の INDEXNOW_KEY で、node build.js が site/<鍵>.txt に、中身も鍵そのものとして書く（IndexNow の決まり）。鍵は秘密ではない。
 * sitemap は lastmod を持たないので、push のあとに送るのは、増えた頁と消えた頁だけになる。
 * Google は IndexNow を読まない。sitemap を読む（robots.txt が名指している）。
 * 配備が済むまで待ってから送る。本番の sitemap がこのコミットのものと同じになり、鍵のファイルが読めるようになるまで、最大 10 分待つ。
 * 送るのはこのサイトの頁の所在だけで、読む人についての何も送らない。 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const BASE = 'https://quiet-wizard.vercel.app/';
const KEY = fs.readdirSync(SITE).map((f) => /^([0-9a-f]{32})\.txt$/.exec(f)).filter(Boolean).map((m) => m[1])[0];
const DRY = process.argv.includes('--dry-run');

const entries = (xml) => new Map([...String(xml || '').matchAll(/<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>)?/g)].map((m) => [m[1], m[2] || '']));

function before() {
  const at = process.env.BEFORE;
  if (!at || /^0+$/.test(at)) return '';
  if (!/^[0-9a-f]{7,40}$/.test(at)) throw new Error('BEFORE はコミットの id でない');
  try { return execFileSync('git', ['show', at + ':site/sitemap.xml'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { return ''; }
}

const text = async (url) => {
  const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) }).catch(() => null);
  return r && r.ok ? r.text() : null;
};

(async () => {
  if (!KEY || fs.readFileSync(path.join(SITE, KEY + '.txt'), 'utf8') !== KEY) throw new Error('鍵のファイルが無いか、中身が鍵と違う');
  const xml = fs.readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8');
  const now = entries(xml);
  const was = entries(before());
  const all = process.env.ALL === 'yes';
  const urls = [...now].filter(([u, d]) => all || was.get(u) !== d).map(([u]) => u)
    .concat(all ? [] : [...was.keys()].filter((u) => !now.has(u)));
  if (urls.some((u) => !u.startsWith(BASE))) throw new Error('sitemap に、このサイトの所在でないものがある');
  console.log('送る頁 ' + urls.length + ' 件');
  urls.forEach((u) => console.log('  ' + (now.has(u) ? '' : '消えた ') + u));
  if (DRY || !urls.length) return;
  for (let i = 0; i < 20; i++) {
    if ((await text(BASE + 'sitemap.xml')) === xml && (await text(BASE + KEY + '.txt')) === KEY) break;
    if (i === 19) throw new Error('本番の sitemap がこのコミットのものでないか、鍵のファイルが配られていない。何も送っていない');
    await new Promise((ok) => setTimeout(ok, 30000));
  }
  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(BASE).host, key: KEY, keyLocation: BASE + KEY + '.txt', urlList: urls }),
  });
  console.log('IndexNow の答え: ' + r.status);
  if (r.status !== 200 && r.status !== 202) process.exit(1);
})().catch((e) => { console.error(e.message); process.exit(1); });
