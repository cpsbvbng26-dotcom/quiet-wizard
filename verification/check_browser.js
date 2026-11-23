#!/usr/bin/env node
/* ブラウザでの検査（2026-11-23）。site/ を手元の小さなサーバーで配り（見出しは site/vercel.json と同じ）、Playwright の Chromium で
 * 二つの言葉のすべての頁を開いて確かめる。
 *
 *   node verification/check_browser.js           # 確かめる
 *   node verification/check_browser.js --break   # site/ の写しを壊し、壊し方のどれでも落ちることを確かめる
 *
 * 確かめること：
 *   1. コンソールの誤りも、CSP の違反も、読めない素材も無い
 *   2. 幅 390×844 と 1280×800、明るい配色と暗い配色のどれでも、横にはみ出さない
 *   3. キーボード：初めの Tab で本文へのつなぎに届き、つなぎで本文へ移り、操作できるものにはどれも Tab で届き、フォーカスの輪が見える
 *   4. 200% の拡大（幅 640 の窓、画素の比 2）で、文字が切れず、横にはみ出さない
 *   5. 動きを減らす設定で、動いている animation も transition も無い
 *   6. 遊び場は、二つの言葉で、キーボードでもクリックでも動き、自動で過ごすあいだは知らせを読み上げない
 *   7. どの頁の言葉の切り替えも、対の頁へ行き、また戻る
 *   8. ディレクトリの中の存在しない所在（/x/y.html など）で出る 404 の頁が、CSS と画像を読める
 *   9. 頁の中のつなぎと飛び先が、どれも在る
 *  10. みんなの図鑑（2026-11-23）は、載せた場面をどれも見える形で描き、零件なら零件の文を見せる。本物の頁（いまは零件）のほかに、
 *      検査の作り物の場面（verification/fixtures/entries.json）で組んだ写しでも、二つの言葉の頁を、遊び場のほかの確かめにかける
 *
 * 新しい依存は足さない。Playwright は手元にあるもの（require('playwright')）を使い、CI では
 * npm install -g playwright@1.56.1 と NODE_PATH="$(npm root -g)" で入れる。 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const B = require('../build.js');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright が見つかりません（require(\'playwright\')）：' + e.message); process.exit(2); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.json': 'application/json' };

/* 配信の見出しは site/vercel.json から読む。CSP を頁の meta だけでなく見出しでも渡し、違反を本番と同じに出す。 */
function headersOf(dir) {
  const v = JSON.parse(fs.readFileSync(path.join(dir, 'vercel.json'), 'utf8'));
  const h = {};
  for (const rule of v.headers || []) if (rule.source === '/(.*)') for (const { key, value } of rule.headers) h[key] = value;
  if (!h['Content-Security-Policy']) throw new Error('vercel.json に CSP が無い');
  return h;
}

/* Vercel と同じく、在るファイルはそのまま、無い所在は 404.html を 404 で返す。cleanUrls は false なので、拡張子を補わない。 */
function serve(dir) {
  const head = headersOf(dir);
  const srv = http.createServer((req, res) => {
    let p;
    try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { p = '/'; }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(dir, path.normalize(p));
    let st = null;
    try { if (f.startsWith(dir + path.sep)) st = fs.statSync(f); } catch (e) { st = null; }
    const ok = st && st.isFile() && path.basename(f) !== 'vercel.json';
    const file = ok ? f : path.join(dir, '404.html');
    res.writeHead(ok ? 200 : 404, { ...head, 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(file));
  });
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve({ url: 'http://127.0.0.1:' + srv.address().port, close: () => new Promise((r) => srv.close(r)) })));
}

/* 頁の一覧。build.js の頁と英語の頁から作り、site/ の HTML と過不足なく合うことも確かめる。 */
const PAGES = [...B.PAGES.map(([, out]) => out), '404'].flatMap((out) => (B.hasEn(out) ? B.LANGS : ['ja']).map((lang) => ({ out, lang, file: B.fileOf(out, lang) + '.html' })));
const pathOf = (pg) => '/' + pg.file;

/* 頁の中で、Tab で届くはずのもの。見えていて、tabindex の有無に関わらず操作できるもの。 */
const CANDIDATES = `(() => {
  const sel = 'a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, iframe, audio[controls], video[controls], [contenteditable=""], [contenteditable=true], [tabindex]';
  return [...document.querySelectorAll(sel)].filter((e) => {
    if (e.matches('[tabindex]') && !e.matches('a[href], button, input, select, textarea, summary') && e.getAttribute('tabindex') === '-1') return false;
    if (e.closest('[inert]')) return false;
    return e.checkVisibility({ visibilityProperty: true });
  });
})()`;
const describe = `(e) => { if (!e || !e.tagName) return String(e); let s = e.tagName.toLowerCase(); if (e.id) s += '#' + e.id; if (e.className && typeof e.className === 'string') s += '.' + e.className.trim().split(/\\s+/).join('.'); const h = e.getAttribute && e.getAttribute('href'); if (h) s += '[href="' + h + '"]'; const t = (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 24); return t ? s + '「' + t + '」' : s; }`;

/* 検査の組。どれも [名, 落ちた理由の並び] を返す。 */
async function open(ctx, url) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('コンソール：' + m.text()); });
  page.on('pageerror', (e) => errs.push('スクリプトの誤り：' + e.message));
  page.on('requestfailed', (r) => errs.push('読めない：' + r.url() + '（' + (r.failure() || {}).errorText + '）'));
  page.on('response', (r) => { if (r.status() >= 400 && r.request().resourceType() !== 'document') errs.push('素材が ' + r.status() + '：' + r.url()); });
  const res = await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));
  return { page, errs, res };
}
const CSP_HOOK = () => { window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + (e.blockedURI || 'inline') + (e.sourceFile ? ' @' + e.sourceFile + ':' + e.lineNumber : ''))); };

async function checkConsole(env, base, pg) {
  const { page, errs, res } = await open(env.ctx.plain, base + pathOf(pg));
  await page.waitForTimeout(150);
  const csp = await page.evaluate(() => window.__csp || ['（違反を聞く仕組みが動いていない）']);
  /* 飛び先の名と、頁の中のつなぎを、つなぎの検査のために集める。 */
  const info = await page.evaluate(() => ({
    ids: [...document.querySelectorAll('[id]')].map((e) => e.id), names: [...document.querySelectorAll('a[name]')].map((e) => e.getAttribute('name')),
    lang: document.documentElement.lang,
  }));
  env.ids.set(pathOf(pg), info);
  await page.close();
  const bad = [...errs, ...csp.map((c) => 'CSP の違反：' + c)];
  if (res.status() !== 200) bad.push('頁が ' + res.status());
  if (info.lang !== pg.lang) bad.push('html の lang が ' + info.lang);
  const dup = info.ids.filter((x, i) => info.ids.indexOf(x) !== i);
  if (dup.length) bad.push('同じ id が二度ある：' + [...new Set(dup)].join(', '));
  return [['コンソールと CSP', bad]];
}

const OVERFLOW = `(() => {
  const de = document.documentElement, w = de.clientWidth;
  if (de.scrollWidth <= w && document.body.scrollWidth <= w) return [];
  const scroller = (e) => { for (let p = e.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o !== 'visible' && o !== 'clip' && p !== document.body && p !== de) return true; } return false; };
  const out = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > w + 0.5 || r.left < -0.5) && !scroller(e); });
  const top = out.filter((e) => !out.includes(e.parentElement));
  /* 要素の箱が収まっていても、::before や ::after が中からはみ出すことがある。そのときは、はみ出しを抱えるいちばん奥の要素を挙げる。 */
  const wide = [...document.querySelectorAll('body *')].filter((e) => e.scrollWidth > w + 0.5 && ![...e.children].some((c) => c.scrollWidth > w + 0.5));
  const who = top.length ? top : wide;
  return ['横に ' + (de.scrollWidth - w) + 'px はみ出す：' + (who.length ? who.slice(0, 3).map((e) => (${describe})(e) + ' 右端 ' + Math.round(e.getBoundingClientRect().left + e.scrollWidth)).join(' / ') : '（はみ出す要素を特定できない）')];
})()`;

async function checkOverflow(env, base, pg) {
  const out = [];
  for (const [name, ctx] of Object.entries(env.ctx.sizes)) {
    const { page } = await open(ctx, base + pathOf(pg));
    out.push(['はみ出し（' + name + '）', await page.evaluate(OVERFLOW)]);
    await page.close();
  }
  return out;
}

async function checkZoom(env, base, pg) {
  const { page } = await open(env.ctx.zoom, base + pathOf(pg));
  const over = await page.evaluate(OVERFLOW);
  const clip = await page.evaluate(`(() => {
    const bad = [];
    for (const e of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(e);
      const hid = (o) => o === 'hidden' || o === 'clip';
      if (!hid(cs.overflowX) && !hid(cs.overflowY) && cs.textOverflow !== 'ellipsis') continue;
      if (!(e.innerText || '').trim()) continue;
      const r = e.getBoundingClientRect();
      /* 目には見せず読み上げにだけ渡す要素（1px に絞り、clip-path で隠す）は除く。 */
      if (r.width <= 1 || r.height <= 1 || cs.clipPath !== 'none' || cs.clip !== 'auto') continue;
      if ((hid(cs.overflowX) || cs.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 1) bad.push('文字が横で切れる：' + (${describe})(e) + '（' + e.scrollWidth + ' > ' + e.clientWidth + '）');
      if (hid(cs.overflowY) && e.scrollHeight > e.clientHeight + 1) bad.push('文字が縦で切れる：' + (${describe})(e) + '（' + e.scrollHeight + ' > ' + e.clientHeight + '）');
    }
    return bad;
  })()`);
  await page.close();
  return [['200% の拡大で横にはみ出さない', over], ['200% の拡大で文字が切れない', clip]];
}

async function checkKeyboard(env, base, pg) {
  const ctx = env.ctx.plain;
  /* 初めの Tab と、本文へのつなぎ。 */
  let { page } = await open(ctx, base + pathOf(pg));
  const skip = [];
  await page.keyboard.press('Tab');
  const first = await page.evaluate(`(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return { cls: a.className, href: a.getAttribute('href'), d: (${describe})(a), inView: r.top >= 0 && r.bottom <= innerHeight && r.width > 0 }; })()`);
  if (first.cls !== 'skip' || first.href !== '#main') skip.push('初めの Tab が本文へのつなぎでない：' + first.d);
  else if (!first.inView) skip.push('本文へのつなぎが、フォーカスのときに画面に見えない');
  const move = [];
  if (!skip.length) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(50);
    const expect = await page.evaluate(`(() => { const m = document.getElementById('main'); if (!m || m.tagName !== 'MAIN') return { err: 'id="main" の main が無い' };
      const c = ${CANDIDATES}.find((e) => m.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING); return { hash: location.hash, want: c ? (${describe})(c) : null, top: Math.round(m.getBoundingClientRect().top) }; })()`);
    if (expect.err) move.push(expect.err);
    else {
      if (expect.hash !== '#main') move.push('つなぎを押しても所在が #main にならない：' + expect.hash);
      await page.keyboard.press('Tab');
      const got = await page.evaluate(`(${describe})(document.activeElement)`);
      if (expect.want && got !== expect.want) move.push('つなぎのあとの Tab が本文の初めの操作に届かない：' + got + '（期待は ' + expect.want + '）');
    }
  } else move.push('本文へのつなぎが無いので確かめられない');
  await page.close();
  /* Tab で届くか、フォーカスの輪が見えるか。 */
  ({ page } = await open(ctx, base + pathOf(pg)));
  const total = await page.evaluate(`(() => {
    const list = ${CANDIDATES};
    window.__list = list; window.__seen = new Set(); window.__ring = [];
    const vis = (e) => { if (!e) return false; const cs = getComputedStyle(e); return (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none'); };
    document.addEventListener('focusin', (ev) => {
      const t = ev.target; window.__seen.add(t);
      const lab = t.labels && t.labels[0];
      if (!(vis(t) || vis(t.parentElement) || (lab && vis(lab)) || (t.tagName === 'INPUT' && vis(t.nextElementSibling)))) window.__ring.push((${describe})(t));
    }, true);
    return list.length;
  })()`);
  for (let i = 0; i < total + 3; i++) await page.keyboard.press('Tab');
  const res = await page.evaluate(`(() => ({ miss: window.__list.filter((e) => !window.__seen.has(e)).map((e) => (${describe})(e)), ring: [...new Set(window.__ring)],
    pos: [...document.querySelectorAll('[tabindex]')].filter((e) => +e.getAttribute('tabindex') > 0).map((e) => (${describe})(e)) }))()`);
  await page.close();
  return [['初めの Tab が本文へのつなぎ', skip], ['本文へのつなぎで本文へ移る', move],
    ['操作できるものにどれも Tab で届く（' + total + '）', [...res.miss.map((m) => 'Tab で届かない：' + m), ...res.pos.map((m) => '正の tabindex で順が変わる：' + m)]],
    ['フォーカスの輪が見える', res.ring.map((m) => 'フォーカスの輪が見えない：' + m)]];
}

async function checkMotion(env, base, pg) {
  const { page } = await open(env.ctx.reduce, base + pathOf(pg));
  await page.waitForTimeout(100);
  const MOTION = `(() => {
    const bad = [];
    const dur = (s) => s.split(',').some((x) => parseFloat(x) > 0);
    for (const e of [document.documentElement, ...document.querySelectorAll('*')]) for (const ps of [null, '::before', '::after']) {
      const cs = getComputedStyle(e, ps);
      if (ps && cs.content === 'none') continue;
      const name = (${describe})(e) + (ps || '');
      if (cs.animationName !== 'none' && dur(cs.animationDuration)) bad.push('animation が残る：' + name + '（' + cs.animationName + '）');
      if (cs.transitionProperty !== 'none' && dur(cs.transitionDuration)) bad.push('transition が残る：' + name + '（' + cs.transitionProperty + ' ' + cs.transitionDuration + '）');
    }
    for (const a of document.getAnimations()) if (a.playState === 'running') bad.push('動いている：' + (a.animationName || a.transitionProperty || a.constructor.name) + ' ' + (a.effect && a.effect.target ? (${describe})(a.effect.target) : ''));
    return [...new Set(bad)];
  })()`;
  const bad = await page.evaluate(MOTION);
  /* 遊び場では、押したあとにも動きが無いこと。 */
  if (pg.out === 'play') {
    await page.click('#scene'); await page.click('#live'); await page.click('#live');
    for (const b of await page.evaluate(MOTION)) bad.push('押したあと：' + b);
  }
  await page.close();
  return [['動きを減らす設定で、動きが無い', [...new Set(bad)]]];
}

/* 遊び場。知らせの欄の文の変わり目を、そのときの aria-live と並べて記す。 */
const NOTE_LOG = () => {
  const n = document.getElementById('note');
  window.__notes = [];
  const push = () => window.__notes.push([n.getAttribute('aria-live'), n.textContent]);
  /* textContent への代入を、その場で（aria-live の値とともに）記す。 */
  const d = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
  Object.defineProperty(n, 'textContent', { get() { return d.get.call(this); }, set(v) { d.set.call(this, v); push(); }, configurable: true });
};
async function checkPlay(env, base, pg) {
  if (pg.out !== 'play') return [];
  const out = [];
  const day = (page) => page.evaluate(() => +document.getElementById('day').textContent);
  const note = (page) => page.evaluate(() => document.getElementById('note').textContent);
  /* クリック。 */
  {
    const { page } = await open(env.ctx.plain, base + pathOf(pg));
    const bad = [];
    await page.evaluate(NOTE_LOG);
    const d0 = await day(page);
    await page.click('#live');
    if (await day(page) !== d0 + 1) bad.push('「一日を過ごす」をクリックしても日が進まない');
    const n1 = await note(page);
    await page.click('#scene');
    const n2 = await note(page);
    if (!n2 || n2 === n1) bad.push('「場面を変える」をクリックしても知らせが変わらない');
    const label0 = await page.textContent('#auto');
    const startAt = await page.evaluate(() => window.__notes.length);
    await page.click('#auto');
    if (await page.textContent('#auto') === label0) bad.push('「自動で過ごす」をクリックしても、止めるの札にならない');
    const d1 = await day(page);
    await page.waitForTimeout(2600);
    const d2 = await day(page);
    if (d2 < d1 + 2) bad.push('自動で過ごしても日が進まない（' + d1 + ' → ' + d2 + '）');
    await page.click('#auto');
    const d3 = await day(page);
    await page.waitForTimeout(1800);
    if (await day(page) !== d3) bad.push('止めても日が進む');
    if (await page.textContent('#auto') !== label0) bad.push('止めても札が戻らない');
    const log = await page.evaluate(() => window.__notes);
    const during = log.slice(startAt, log.length - 1);
    const loud = during.slice(1).filter(([live]) => live !== 'off');
    out.push(['遊び場：自動で過ごすあいだは読み上げない', [
      ...(during.length < 3 ? ['自動で過ごすあいだの知らせが少なく、確かめられない（' + during.length + '）'] : []),
      ...(during.length && during[0][0] !== 'polite' ? ['始めの知らせが読み上げられない（aria-live=' + during[0][0] + '）'] : []),
      ...loud.map(([live, t]) => '自動のあいだに aria-live=' + live + ' で知らせる：' + t.slice(0, 30)),
      ...(log.length && log[log.length - 1][0] !== 'polite' ? ['止めたあと、aria-live が polite に戻らない'] : []),
    ]]);
    out.push(['遊び場：クリックで動く', bad]);
    await page.close();
  }
  /* キーボード。 */
  {
    const { page } = await open(env.ctx.plain, base + pathOf(pg));
    const bad = [];
    const to = async (id) => { for (let i = 0; i < 300; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => document.activeElement && document.activeElement.id) === id) return true; } return false; };
    if (!(await to('scene'))) bad.push('「場面を変える」に Tab で届かない');
    else {
      const n0 = await note(page);
      await page.keyboard.press('Enter');
      if (!(await note(page)) || (await note(page)) === n0) bad.push('「場面を変える」を Enter で押せない');
    }
    if (!(await to('live'))) bad.push('「一日を過ごす」に Tab で届かない');
    else {
      const d0 = await day(page);
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      if (await day(page) !== d0 + 2) bad.push('「一日を過ごす」を Enter と Space で押せない（' + d0 + ' → ' + (await day(page)) + '）');
    }
    if (!(await to('auto'))) bad.push('「自動で過ごす」に Tab で届かない');
    else {
      const d0 = await day(page);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1800);
      await page.keyboard.press('Space');
      const d1 = await day(page);
      if (d1 <= d0) bad.push('「自動で過ごす」を Enter で始められない');
      await page.waitForTimeout(1200);
      if (await day(page) !== d1) bad.push('「止める」を Space で押せない');
    }
    out.push(['遊び場：キーボードで動く', bad]);
    await page.close();
  }
  return out.map(([k, v]) => [k + '（' + pg.lang + '）', v]);
}

async function checkLang(env, base, pg) {
  const bad = [];
  const other = pg.lang === 'en' ? 'ja' : 'en';
  const want = '/' + B.fileOf(pg.out, other) + '.html';
  const { page } = await open(env.ctx.plain, base + pathOf(pg));
  const sw = await page.$('a.lang');
  if (!sw) bad.push('言葉の切り替えが無い');
  else {
    await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), sw.click()]);
    const u = new URL(page.url());
    if (u.pathname !== want) bad.push('切り替えの行き先が ' + u.pathname + '（期待は ' + want + '）');
    if (await page.evaluate(() => document.documentElement.lang) !== other) bad.push('切り替えた頁の lang が ' + other + ' でない');
    const back = await page.$('a.lang');
    if (!back) bad.push('切り替えた頁に、戻る切り替えが無い');
    else {
      await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), back.click()]);
      const v = new URL(page.url());
      if (v.pathname !== pathOf(pg)) bad.push('戻る切り替えの行き先が ' + v.pathname + '（期待は ' + pathOf(pg) + '）');
    }
  }
  await page.close();
  return [['言葉の切り替えが対の頁へ行き、戻る', bad]];
}

/* ディレクトリの中の存在しない所在。404 の頁の CSS と画像と、頁の中のつなぎ。 */
const NESTED = ['/x/y.html', '/x/y/z.html', '/missing.html', '/x/'];
async function checkNested(env, base, p) {
  const { page, errs, res } = await open(env.ctx.plain, base + p);
  /* 文書そのものの 404 は期待どおりで、コンソールにも出る。素材の 404 は、応答を聞く「素材が」で拾う。 */
  const bad = errs.filter((e) => !/^コンソール：Failed to load resource: the server responded with a status of 404/.test(e));
  if (res.status() !== 404) bad.push('存在しない所在が ' + res.status() + ' を返す');
  const st = await page.evaluate(() => {
    const sheets = [...document.styleSheets].map((s) => { try { return s.cssRules.length; } catch (e) { return -1; } });
    const imgs = [...document.images].map((i) => [i.getAttribute('src'), i.complete && i.naturalWidth > 0]);
    return { title: document.title, sheets, imgs, bg: getComputedStyle(document.body).backgroundColor, skip: getComputedStyle(document.querySelector('.skip') || document.body).position };
  });
  if (!st.sheets.length || st.sheets.some((n) => n <= 0)) bad.push('CSS が読めない（' + JSON.stringify(st.sheets) + '）');
  if (st.skip !== 'absolute') bad.push('CSS が効いていない（本文へのつなぎが隠れていない）');
  if (!st.imgs.length) bad.push('画像が一つも無い');
  for (const [s, okk] of st.imgs) if (!okk) bad.push('画像が読めない：' + s);
  if (st.title !== env.title404) bad.push('404 の頁でない：' + st.title);
  const links = await collectLinks(page);
  const self = await page.evaluate(() => ({ ids: [...document.querySelectorAll('[id]')].map((e) => e.id), names: [...document.querySelectorAll('a[name]')].map((e) => e.getAttribute('name')) }));
  await page.close();
  return [['入れ子の存在しない所在 ' + p + ' で、404 の頁が CSS と画像を読む', bad], ...(await linkVerdict(env, base, p, links, self))];
}

/* つなぎと飛び先。頁の中の a・link・img・script と、頭の og の所在。本番の所在（BASE）は手元の所在に読み替える。 */
async function collectLinks(page) {
  return page.evaluate(() => [
    ...[...document.querySelectorAll('a[href], area[href]')].map((e) => ['a', e.getAttribute('href'), e.href]),
    ...[...document.querySelectorAll('link[href]')].map((e) => ['link', e.getAttribute('href'), e.href]),
    ...[...document.querySelectorAll('img[src], script[src]')].map((e) => [e.tagName.toLowerCase(), e.getAttribute('src'), e.src]),
    ...[...document.querySelectorAll('meta[property^="og:"][content^="http"]')].filter((e) => /:(url|image)$/.test(e.getAttribute('property'))).map((e) => ['meta', e.getAttribute('content'), e.getAttribute('content')]),
  ]);
}
async function status(env, url) {
  if (!env.status.has(url)) env.status.set(url, fetch(url, { method: 'HEAD' }).then((r) => r.status, (e) => 'err ' + e.message));
  return env.status.get(url);
}
async function linkVerdict(env, base, from, links, self) {
  const bad = [];
  let internal = 0;
  for (const [tag, raw, abs] of links) {
    let u;
    try { u = new URL(abs.startsWith(B.BASE) ? base + '/' + abs.slice(B.BASE.length) : abs); } catch (e) { bad.push('読めない所在：' + raw); continue; }
    if (u.origin !== base) continue;
    internal++;
    /* 同じ頁の中の飛び先は、いま開いている頁の名で確かめる（入れ子の 404 の頁は、その所在では 404 を返すため）。 */
    if (u.pathname === new URL(base + from).pathname && self) {
      const id = decodeURIComponent(u.hash.slice(1));
      if (u.hash && u.hash !== '#' && !self.ids.includes(id) && !self.names.includes(id)) bad.push('飛び先が無い：' + raw + '（' + from + ' の中）');
      continue;
    }
    const st = await status(env, u.origin + u.pathname);
    if (st !== 200) { bad.push(tag + ' の ' + raw + ' が ' + st); continue; }
    if (u.hash && u.hash !== '#') {
      const p = u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname;
      const info = env.ids.get(p);
      const id = decodeURIComponent(u.hash.slice(1));
      if (!info) { if (/\.html$/.test(p)) bad.push('飛び先の頁を開いていない：' + raw); continue; }
      if (!info.ids.includes(id) && !info.names.includes(id)) bad.push('飛び先が無い：' + raw + '（' + from + ' から）');
    }
  }
  return [['頁の中のつなぎと飛び先が在る（' + internal + '）', bad]];
}
async function checkLinks(env, base, pg) {
  const { page } = await open(env.ctx.plain, base + pathOf(pg));
  const links = await collectLinks(page);
  await page.close();
  return linkVerdict(env, base, pathOf(pg), links);
}

/* みんなの図鑑：頁の文の場面の数だけ、場面が見える形で描かれ、言葉の印（lang）を持つ。零件なら零件の文が見える。 */
async function checkEntries(env, base, pg) {
  if (pg.out !== 'entries') return [];
  const { page } = await open(env.ctx.plain, base + pathOf(pg));
  const r = await page.evaluate(() => {
    const bad = [], vis = (e) => { const b = e.getBoundingClientRect(), s = getComputedStyle(e); return b.width > 0 && b.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0; };
    const qs = [...document.querySelectorAll('main blockquote.entry')], none = document.querySelector('main .entries-none'), count = document.querySelector('main .entries-count');
    const n = count ? Number((/\d+/.exec(count.textContent) || [NaN])[0]) : 0;
    if (qs.length !== n || (!qs.length) !== Boolean(none)) bad.push('場面の数（' + qs.length + '）が、頁の文の数（' + n + '）か零件の文と合わない');
    if (none && !vis(none)) bad.push('零件の文が見えない');
    for (const q of qs) {
      if (!['ja', 'en'].includes(q.getAttribute('lang'))) bad.push('場面に言葉の印が無い');
      if (!vis(q) || [...q.querySelectorAll('p')].length !== 2 || [...q.querySelectorAll('p')].some((p) => !vis(p) || !p.textContent.trim())) bad.push('場面の題か文が見えない');
      const note = q.nextElementSibling;
      if (!note || !note.matches('p.note') || !vis(note)) bad.push('場面の札（言葉・日・名）が見えない');
    }
    return bad;
  });
  await page.close();
  return [['みんなの図鑑の場面', r]];
}
/* 検査の作り物の場面で、みんなの図鑑の二つの頁を組み直した写しを作る。 */
function withFixture(dir, data) {
  const fx = data || JSON.parse(fs.readFileSync(path.join(ROOT, 'verification', 'fixtures', 'entries.json'), 'utf8'));
  for (const lang of B.LANGS) {
    const s = B.fileOf('entries', lang), md = fs.readFileSync(path.join(ROOT, 'src', s + '.md'), 'utf8');
    fs.writeFileSync(path.join(dir, s + '.html'), B.page('entries', /^# (.+)$/m.exec(md)[1], B.render(md, s, lang, { entries: fx }), lang));
  }
}
const KINDS = { entries: checkEntries, console: checkConsole, overflow: checkOverflow, keyboard: checkKeyboard, zoom: checkZoom, motion: checkMotion, play: checkPlay, lang: checkLang, links: checkLinks };

async function environment(browser) {
  const mk = (o) => browser.newContext({ ...o }).then(async (c) => { await c.addInitScript(CSP_HOOK); return c; });
  const ctx = {
    plain: await mk({ viewport: { width: 1280, height: 800 } }),
    sizes: {},
    zoom: await mk({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 }),
    reduce: await mk({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }),
  };
  for (const [w, h] of [[390, 844], [1280, 800]]) for (const scheme of ['light', 'dark']) ctx.sizes[w + '×' + h + '・' + (scheme === 'light' ? '明るい配色' : '暗い配色')] = await mk({ viewport: { width: w, height: h }, colorScheme: scheme, isMobile: w < 500, hasTouch: w < 500 });
  return { ctx, ids: new Map(), status: new Map(), title404: '' };
}

/* 頁の組と、確かめる種類を受け取り、[頁, 名, 落ちた理由] の並びを返す。つなぎは、飛び先の名を集めてから確かめる。 */
async function run(browser, dir, pages, kinds, { nested = true } = {}) {
  const srv = await serve(dir);
  const env = await environment(browser);
  const results = [];
  try {
    env.title404 = (/<title>([^<]*)<\/title>/.exec(fs.readFileSync(path.join(dir, '404.html'), 'utf8')) || [, ''])[1].replace(/&amp;/g, '&');
    /* つなぎを確かめるときは、飛び先の名がどの頁のものも要るので、まず全頁を開く。 */
    const all = kinds.includes('links') || nested ? PAGES : pages;
    for (const pg of all) for (const [k, v] of await checkConsole(env, srv.url, pg)) if (kinds.includes('console') && pages.includes(pg)) results.push([pg.file, k, v]);
    for (const kind of kinds.filter((k) => k !== 'console')) for (const pg of pages) for (const [k, v] of await KINDS[kind](env, srv.url, pg)) results.push([pg.file, k, v]);
    if (nested) for (const p of NESTED) for (const [k, v] of await checkNested(env, srv.url, p)) results.push([p, k, v]);
  } finally {
    for (const c of [env.ctx.plain, env.ctx.zoom, env.ctx.reduce, ...Object.values(env.ctx.sizes)]) await c.close();
    await srv.close();
  }
  return results;
}

/* 壊し方。site/ の写しを一か所だけ壊し、その頁と種類を確かめ、落ちることを見る。 */
const sub = (f, a, b) => (dir) => {
  const p = path.join(dir, f), t = fs.readFileSync(p, 'utf8');
  const u = typeof a === 'string' ? t.split(a).join(b) : t.replace(a, b);
  if (u === t) throw new Error(f + ' に壊す所が見つからない：' + a);
  fs.writeFileSync(p, u);
};
const css = (rule) => (dir) => fs.appendFileSync(path.join(dir, 'assets', 'style.css'), '\n' + rule + '\n');
const pageOf = (file) => PAGES.find((p) => p.file === file);
const BREAKS = [
  ['横にはみ出す要素（どの大きさでも）', 'about.html', 'overflow', 'はみ出し', css('.p-about main::after { content: ""; display: block; width: 2400px; height: 1px; }')],
  ['幅 390 のときだけ横にはみ出す要素', 'legality.en.html', 'overflow', 'はみ出し', css('@media (max-width: 400px) { .p-legality main::after { content: ""; display: block; width: 900px; height: 1px; } }')],
  ['暗い配色のときだけ横にはみ出す要素', 'faq.html', 'overflow', 'はみ出し', css('@media (prefers-color-scheme: dark) { .p-faq main::after { content: ""; display: block; width: 2400px; height: 1px; } }')],
  ['本文へのつなぎを外す', 'faq.en.html', 'keyboard', '初めの Tab', sub('faq.en.html', /<a class="skip" href="#main">[^<]*<\/a>\n/, '')],
  ['本文へのつなぎの飛び先を外す', 'guide.html', 'keyboard', '本文へのつなぎで本文へ移る', sub('guide.html', '<main id="main">', '<main>')],
  ['操作できるものを Tab で届かなくする', 'about.html', 'keyboard', '操作できるもの', sub('about.html', /(<main id="main">[\s\S]*?<a [\s\S]*?<a [\s\S]*?<a )(href=)/, '$1tabindex="-1" $2')],
  ['フォーカスの輪を消す', 'terms.html', 'keyboard', 'フォーカスの輪', css('a:focus-visible { outline: none !important; }')],
  ['スクリプトの誤り', 'guide.html', 'console', 'コンソールと CSP', (dir) => { fs.writeFileSync(path.join(dir, 'assets', 'boom.js'), 'throw new Error("boom");\n'); sub('guide.html', '</body>', '<script src="assets/boom.js"></script>\n</body>')(dir); }],
  ['CSP の違反（style 属性）', 'canon.html', 'console', 'コンソールと CSP', sub('canon.html', '<main id="main">', '<main id="main"><p style="color: red">x</p>')],
  ['読めない画像', 'strict.en.html', 'console', 'コンソールと CSP', sub('strict.en.html', 'assets/emblem-crest.svg', 'assets/emblem-none.svg')],
  ['200% の拡大のときだけ横にはみ出す要素', 'canon.en.html', 'zoom', '200% の拡大で横にはみ出さない', css('@media (min-width: 600px) and (max-width: 700px) { .p-canon main::after { content: ""; display: block; width: 1200px; height: 1px; } }')],
  ['拡大で文字が切れる', 'privacy.html', 'zoom', '200% の拡大で文字が切れない', css('.p-privacy main p { max-height: 1.2em; overflow: hidden; }')],
  ['動き続ける animation', 'terms.html', 'motion', '動きを減らす設定', css('@keyframes qwbreak { to { opacity: .5; } } .p-terms main > h1 { animation: qwbreak 1s infinite !important; }')],
  ['動きを減らす設定でも残る transition', 'requests.html', 'motion', '動きを減らす設定', css('.p-requests nav a { transition: color 1s !important; }')],
  ['遊び場が自動のあいだも読み上げる', 'play.html', 'play', '遊び場：自動で過ごすあいだは読み上げない', sub('assets/play.js', "$('note').setAttribute('aria-live', 'off'); ", '')],
  ['遊び場のボタンをキーボードで押せなくする', 'play.en.html', 'play', '遊び場：キーボードで動く', sub('play.en.html', /<button type="button" id="live">([^<]*)<\/button>/, '<span id="live" role="button">$1</span>')],
  ['言葉の切り替えを別の頁へ向ける', 'design.en.html', 'lang', '言葉の切り替え', sub('design.en.html', 'class="lang" href="design.html"', 'class="lang" href="terms.html"')],
  ['言葉の切り替えの戻りを外す', 'index.html', 'lang', '言葉の切り替え', sub('index.en.html', /<a class="lang"[^>]*>[^<]*<\/a>/, '')],
  ['飛び先の無いつなぎ', 'play.html', 'links', '頁の中のつなぎと飛び先', sub('play.html', 'href="strict.html#prop-23"', 'href="strict.html#prop-999"')],
  ['存在しない頁へのつなぎ', 'index.en.html', 'links', '頁の中のつなぎと飛び先', sub('index.en.html', 'href="faq.en.html"', 'href="faq-none.en.html"')],
  ['404 の頁の CSS を頁からの所在に戻す', null, 'nested', '入れ子', sub('404.html', 'href="/assets/style.css"', 'href="assets/style.css"')],
  ['404 の頁の紋を頁からの所在に戻す', null, 'nested', '入れ子', sub('404.html', 'src="/assets/emblem-crest.svg"', 'src="assets/emblem-crest.svg"')],
  /* みんなの図鑑（2026-11-23）。作り物の場面で組んだ写しを壊す。 */
  ['みんなの図鑑の場面を見えなくする', 'entries.html', 'entries', 'みんなの図鑑の場面', (dir) => { withFixture(dir); css('.p-entries blockquote.entry { display: none; }')(dir); }],
  ['みんなの図鑑の場面を一つ描き落とす', 'entries.en.html', 'entries', 'みんなの図鑑の場面', (dir) => { withFixture(dir); sub('entries.en.html', /<blockquote class="entry"[^\n]*\n<p class="note">[^\n]*\n/, '')(dir); }],
  ['みんなの図鑑の零件の文を見えなくする', 'entries.html', 'entries', 'みんなの図鑑の場面', (dir) => { withFixture(dir, { _: '', entries: [] }); css('.p-entries .entries-none { visibility: hidden; }')(dir); }],
  ['作り物の場面の頁が横にはみ出す', 'entries.en.html', 'overflow', 'はみ出し', (dir) => { withFixture(dir); css('@media (max-width: 400px) { .p-entries blockquote.entry p::after { content: ""; display: block; width: 900px; height: 1px; } }')(dir); }],
];

function fails(results) { return results.filter(([, , v]) => v.length); }

async function main() {
  const browser = await chromium.launch();
  let code = 0;
  try {
    /* 頁の一覧が site/ と過不足なく合う。 */
    const have = fs.readdirSync(SITE).filter((f) => /\.html$/.test(f)).sort().join(',');
    const want = PAGES.map((p) => p.file).sort().join(',');
    if (have !== want) { console.log('  落  頁の一覧が site/ と合わない —— site: ' + have + ' / build.js: ' + want); code = 1; }
    if (process.argv.includes('--break')) {
      let caught = 0;
      /* 壊し方は [名, 確かめる頁, 確かめる種類, 落ちるはずの確かめの名の頭, 壊す手]。その確かめで落ちることまで見る。 */
      for (const [name, file, kind, expect, mutate] of BREAKS) {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qw-break-'));
        let r = [];
        try {
          fs.cpSync(SITE, tmp, { recursive: true });
          mutate(tmp);
          r = await run(browser, tmp, file ? [pageOf(file)] : [], kind === 'nested' ? [] : [kind], { nested: kind === 'nested' });
        } catch (e) { r = [['', '壊し方そのものが動かない', ['（' + e.message + '）']]]; }
        finally { fs.rmSync(tmp, { recursive: true, force: true }); }
        const f0 = fails(r);
        const f = f0.filter(([, k]) => k.startsWith(expect));
        const own = f.length && !f0.some(([, k]) => k === '壊し方そのものが動かない');
        if (own) caught++;
        console.log('  ' + (own ? '通' : '落') + '  ' + name + (own ? ' で落ちる（' + f[0][1] + '：' + f[0][2][0].slice(0, 60) + '）' : ' で「' + expect + '」が落ちない' + (f0.length ? '：' + f0[0][1] + '：' + f0[0][2][0] : '')));
      }
      console.log('\n' + '-'.repeat(48));
      console.log('壊して確かめる：' + caught + ' / ' + BREAKS.length + ' の壊し方で落ちました。');
      if (caught !== BREAKS.length) code = 1;
    } else {
      const r = await run(browser, SITE, PAGES, Object.keys(KINDS));
      /* 作り物の場面で組んだ写しでも、みんなの図鑑の二つの頁を、遊び場のほかの確かめにかける。 */
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qw-entries-'));
      try {
        fs.cpSync(SITE, tmp, { recursive: true });
        withFixture(tmp);
        for (const [where, k, v] of await run(browser, tmp, PAGES.filter((p) => p.out === 'entries'), Object.keys(KINDS).filter((k) => k !== 'play'), { nested: false })) r.push(['作り物の場面：' + where, k, v]);
      } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
      const f = fails(r);
      const byKind = new Map();
      for (const [, k, v] of r) { const key = k.replace(/（[^）]*）$/, ''); const e = byKind.get(key) || [0, 0]; e[0]++; if (v.length) e[1]++; byKind.set(key, e); }
      for (const [k, [n, bad]] of byKind) console.log('  ' + (bad ? '落' : '通') + '  ' + k + '（' + (n - bad) + ' / ' + n + '）');
      for (const [where, k, v] of f) for (const m of v) console.log('  落  ' + where + '：' + k + ' —— ' + m);
      console.log('\n' + '-'.repeat(48));
      console.log('頁 ' + PAGES.length + '（入れ子の存在しない所在 ' + NESTED.length + '）で、' + r.length + ' 件の確かめのうち ' + (r.length - f.length) + ' 件が通りました。');
      if (f.length) code = 1;
    }
  } finally { await browser.close(); }
  process.exit(code);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(2); });
module.exports = { serve, PAGES, BREAKS, NESTED, KINDS };
