#!/usr/bin/env node
/* 共有のカード（assets/card.png、1200×630）と、ホーム画面のアイコン（assets/apple-touch-icon.png、180×180）を描く。
 *
 *   node tools/card.js           描いて assets/ に書き出す
 *   node tools/card.js --check   描き直し、assets/ にあるものと同じバイトかを確かめる（違えば終了コード 1）
 *
 * 描くのは、このリポジトリの部品だけ：三つの紋（assets/emblem-*.svg）、上の欄の夜の黒と金と文字の色（assets/style.css の
 * --mastbg・--mastgold・--mastink・--mastmuted）、配っている英字の書体 Inter Tight（assets/intertight.woff2、SIL OFL 1.1）。
 * カードの文字は英字だけ。和文の書体は使わない（書体の許諾の問いを持ち込まないため）。
 * 描くのは Playwright の Chromium（require('playwright')）。外へは何も読みに行かない。頁は、この PNG を読むだけ（2026-11-23）。 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const A = (f) => path.join(ROOT, 'assets', f);
const css = fs.readFileSync(A('style.css'), 'utf8');
const tok = (k) => { const m = new RegExp('--' + k + ':\\s*(#[0-9a-f]{6})').exec(css); if (!m) throw new Error('style.css に --' + k + ' が無い'); return m[1]; };
const C = { bg: tok('mastbg'), gold: tok('mastgold'), ink: tok('mastink'), muted: tok('mastmuted'), line: tok('mastline') };
const svg = (f) => 'data:image/svg+xml;base64,' + fs.readFileSync(A(f)).toString('base64');
const font = 'data:font/woff2;base64,' + fs.readFileSync(A('intertight.woff2')).toString('base64');

/* カードの文字。英字だけ。検査がこの並びを読み、配る書体が収める字だけであることを確かめる。 */
const WORDS = { kicker: 'MAGUS OCCULTUS', title: 'STEALTH WIZARD', line: 'A play, not science.', foot: 'quiet-wizard.vercel.app' };

const head = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Inter Tight"; src: url(${font}) format("woff2"); font-weight: 100 900; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { background: ${C.bg}; overflow: hidden; }
body { font-family: "Inter Tight"; color: ${C.ink}; -webkit-font-smoothing: antialiased; }
</style></head><body>`;

const CARD = head + `<div style="position:relative;width:1200px;height:630px;background:${C.bg};
  background-image:linear-gradient(${C.line} 1px,transparent 1px),linear-gradient(90deg,${C.line} 1px,transparent 1px);background-size:72px 72px;background-position:-12px -12px">
<div style="position:absolute;inset:0;background:radial-gradient(60rem 30rem at 30% 40%, rgba(13,15,19,.35), ${C.bg} 75%)"></div>
${[['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']].map(([v, h]) => `<div style="position:absolute;${v}:36px;${h}:36px;width:26px;height:26px;border-${v}:2px solid ${C.gold};border-${h}:2px solid ${C.gold}"></div>`).join('')}
<img src="${svg('emblem-crest.svg')}" style="position:absolute;left:112px;top:150px;width:230px;height:273px">
<div style="position:absolute;left:418px;top:150px;width:700px">
<div style="font-size:22px;font-weight:500;letter-spacing:.5em;color:${C.gold}">${WORDS.kicker}</div>
<div style="margin-top:18px;font-size:86px;font-weight:200;letter-spacing:.04em;line-height:1;color:${C.ink};white-space:nowrap">${WORDS.title}</div>
<div style="margin-top:30px;width:72px;height:3px;background:${C.gold}"></div>
<div style="margin-top:30px;font-size:30px;font-weight:400;letter-spacing:.04em;color:${C.muted}">${WORDS.line}</div>
</div>
<img src="${svg('emblem-seal.svg')}" style="position:absolute;left:418px;top:432px;width:120px;height:96px">
<img src="${svg('emblem-dial.svg')}" style="position:absolute;left:552px;top:432px;width:120px;height:96px">
<div style="position:absolute;right:76px;bottom:100px;font-size:20px;font-weight:500;letter-spacing:.18em;color:${C.muted}">${WORDS.foot}</div>
<div style="position:absolute;left:0;right:0;bottom:0;height:12px;border-top:1px solid ${C.gold};box-shadow:inset 0 3px 0 ${C.bg},inset 0 6px 0 ${C.gold}"></div>
</div></body></html>`;

const ICON = head + `<div style="position:relative;width:180px;height:180px;background:${C.bg}">
<img src="${svg('emblem-crest.svg')}" style="position:absolute;left:44px;top:28px;width:92px;height:109px">
<div style="position:absolute;left:32px;right:32px;bottom:22px;height:6px;border-top:1px solid ${C.gold};box-shadow:inset 0 2px 0 ${C.bg},inset 0 4px 0 ${C.gold}"></div>
</div></body></html>`;

const OUT = [['card.png', CARD, 1200, 630], ['apple-touch-icon.png', ICON, 180, 180]];

async function render() {
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const out = {};
  try {
    for (const [name, html, w, h] of OUT) {
      const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      /* 外へは何も読みに行かない。data: のほかの要求は止める。 */
      await p.route('**/*', (r) => (r.request().url().startsWith('data:') ? r.continue() : r.abort()));
      await p.setContent(html, { waitUntil: 'load' });
      await p.evaluate(() => Promise.all(['200 86px "Inter Tight"', '400 30px "Inter Tight"', '500 22px "Inter Tight"'].map((f) => document.fonts.load(f))));
      const ok = await p.evaluate(() => ['200 86px "Inter Tight"', '400 30px "Inter Tight"', '500 22px "Inter Tight"'].every((f) => document.fonts.check(f)) && [...document.images].every((i) => i.complete && i.naturalWidth > 0));
      if (!ok) throw new Error(name + '：書体か紋が読めていない');
      out[name] = await p.screenshot({ type: 'png', clip: { x: 0, y: 0, width: w, height: h } });
      await p.close();
    }
    out.version = b.version();
  } finally { await b.close(); }
  return out;
}

if (require.main === module) {
  render().then((out) => {
    const check = process.argv.includes('--check');
    let same = true;
    for (const [name] of OUT) {
      const have = fs.existsSync(A(name)) ? fs.readFileSync(A(name)) : Buffer.alloc(0);
      const sha = require('crypto').createHash('sha256').update(out[name]).digest('hex');
      if (check) { const eq = have.equals(out[name]); same = same && eq; console.log((eq ? '同じ  ' : '違う  ') + name + ' ' + sha); }
      else { fs.writeFileSync(A(name), out[name]); console.log('描きました  ' + name + ' ' + sha); }
    }
    console.log('Chromium ' + out.version);
    if (!same) process.exit(1);
  }).catch((e) => { console.error(e.message); process.exit(2); });
}
module.exports = { WORDS, OUT, C, render };
