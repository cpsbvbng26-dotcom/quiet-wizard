#!/usr/bin/env node
/* ステルス・ウィザード（2026-11-21 までの名は地味な魔法使い）のサイトを、src/*.md から生成する。
 *
 *   node build.js            site/ に書き出す
 *
 * site/ は生成物で、手で直さない。依存は Node.js だけ。頁はほかのサーバーへ何も要求しない。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'site');
const BASE = 'https://quiet-wizard.vercel.app/';
const REPO = 'https://github.com/cpsbvbng26-dotcom/quiet-wizard';
const NAME = 'ステルス・ウィザード';
/* 頁の順。[元, 出力, 案内の短い名, 上の案内に出すか] 上に出さない頁は、下の欄からつなぐ。 */
const PAGES = [['index', 'index', 'はじめに', true], ['canon', 'canon', '原典', true], ['strict', 'strict', '原理', true], ['guide', 'guide', '図鑑', true], ['play', 'play', '遊び場', true], ['faq', 'faq', '問い', true],
  ['about', 'about', '断りと開示', false], ['terms', 'terms', '利用規約', false], ['privacy', 'privacy', '個人情報', false], ['requests', 'requests', '求めと連絡', false], ['legality', 'legality', '適法性の説明', false],
  ['design', 'design', 'デザインに関する法的な扱い', false]];
/* 適法性の説明と、デザインに関する法的な扱いが引く条文。e-Gov から取り寄せた文の写し（verification/statutes-texts.json）。手で書かない。 */
const STATUTES = JSON.parse(fs.readFileSync(path.join(__dirname, 'verification', 'statutes-texts.json'), 'utf8'));
/* <!-- 条文 A、B --> を、引いた条文の原文に置き換える。無い条を引けば止まる。
 * <!-- 抜粋 条｜切り出した所｜文｜文 --> は、長い条から、頁の文が拠る項や号だけを置く。切り出した文が写しの文の一部でなければ止まる（2026-11-22）。
 * 出どころの注は、頁の最後の条文の後に一度だけ置く。 */
function statutes(html) {
  const END = '\u0000';
  const text = (k) => { const t = STATUTES.texts[k]; if (!t) throw new Error('条文の写しに無い：' + k); return t; };
  let n = 0;
  html = html.replace(/<!-- (条文|抜粋) ([^>]+?) -->/g, (m, kind, body) => {
    n++;
    if (kind === '条文') return body.split('、').map((k) => '<h3>' + esc(k.trim()) + '</h3>\n<blockquote><p>' + esc(text(k.trim())) + '</p></blockquote>').join('\n') + END;
    const [k, where, ...pieces] = body.split('｜').map((x) => x.trim());
    const all = text(k);
    if (!where || !pieces.length) throw new Error('抜粋の形が違う：' + k);
    for (const p of pieces) if (!all.includes(p)) throw new Error('抜粋が写しの文に無い：' + k + '：' + p.slice(0, 24));
    return '<h3>' + esc(k) + '（' + esc(where) + '）</h3>\n<blockquote>' + pieces.map((p) => '<p>' + esc(p) + '</p>').join('') + '</blockquote>\n'
      + '<p class="note">長い条なので、' + esc(where) + 'だけを、写しの文から一字一句そのまま切り出しています。ほかの項と号は省いています。</p>' + END;
  });
  if (!n) return html;
  const last = html.lastIndexOf(END);
  const note = '\n<p class="note">出どころ：e-Gov 法令 API（v1）から取り寄せ、運営者が ' + esc(STATUTES.recorded) + ' に記した文の写し（運営者の別のリポジトリの verification/statutes-texts.json、コミット ' + esc(STATUTES.from.commit.slice(0, 7)) + '）。写しは、このリポジトリの verification/statutes-texts.json にあります。</p>';
  return (html.slice(0, last) + note + html.slice(last + 1)).split(END).join('');
}
/* どの頁の下にも出す断り。 */
/* 運営者の学術的な活動とは別の枠であること（2026-11-21 に利用者が求めた）。どの頁の上の帯にも出す。 */
const FRAME = 'これは運営者の学術的な活動とは別の、エンターテインメントの枠です。科学ではありません。';
const FOOT = 'これは遊びです。運営者の学術的な活動とは別の、エンターテインメントの枠です。科学ではありません。都市伝説を題材にした娯楽の頁で、ここに書く法則は科学の法則ではなく、誰の性経験も評価せず、特定の人を指しません。内輪ノリであり、気分を害する方がいる可能性があります。ご注意ください。選民思想ではなく、運営者は魔法使いの代表ではありません。';
const META_CSP = "default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'";
/* frame-ancestors は meta では効かないので、配信のヘッダーにだけ足す。 */
const CSP = META_CSP + "; frame-ancestors 'none'";

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* 行の中の書式：リンク、太字、コード。原理の頁の古典の体裁（〔ラテン語〕、原文の行、証明、Q.E.D.）もここで組む。 */
function inline(s) {
  let t = esc(s);
  t = t.replace(/〔([^〕]+)〕/g, '<span class="lat" lang="la">$1</span>');
  t = t.replace(/^原文：(.*)$/, '<span class="orig"><span class="orig-k">原文</span>$1</span>');
  t = t.replace(/^(証明|注)。/, '<span class="proof-k">$1</span>');
  t = t.replace(/Q\.E\.D\.$/, '<span class="qed" lang="la">Q.E.D.</span>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, a, h) => '<a href="' + h + '"' + (/^https?:/.test(h.replace(/&amp;/g, '&')) ? ' rel="noopener"' : '') + '>' + a + '</a>');
  return t;
}

/* Markdown の小さな部分集合：見出し、段落、箇条、番号の箇条、引用、表、HTML の注釈（そのまま）。 */
function markdown(src) {
  const lines = src.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (/^<!--.*-->$/.test(l.trim())) { out.push(l.trim()); i++; continue; }
    /* 図だけの段：![説明](fig:名前) は、src/figs/名前.svg を頁の中に描く。頁の色の決まりに従うので、明るい配色にも暗い配色にも合う。 */
    let f = /^!\[([^\]]+)\]\(fig:([a-z0-9-]+)\)$/.exec(l.trim());
    if (f) {
      const svg = fs.readFileSync(path.join(ROOT, 'src', 'figs', f[2] + '.svg'), 'utf8').trim().replace(/^<svg /, '<svg role="img" aria-label="' + esc(f[1]) + '" ');
      out.push('<figure class="fig">' + svg + '<figcaption>' + esc(f[1]) + '</figcaption></figure>');
      i++; continue;
    }
    let m = /^(#{1,3}) (.+)$/.exec(l);
    if (m) { out.push('<h' + m[1].length + '>' + inline(m[2]) + '</h' + m[1].length + '>'); i++; continue; }
    if (l.startsWith('> ')) {
      const ps = [];
      while (i < lines.length && lines[i].startsWith('>')) { ps.push(lines[i].replace(/^> ?/, '')); i++; }
      out.push('<blockquote>' + ps.filter((p) => p.trim()).map((p) => '<p>' + inline(p) + '</p>').join('') + '</blockquote>');
      continue;
    }
    if (l.startsWith('| ')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i]); i++; }
      const cells = (r) => r.replace(/^\|\s*/, '').replace(/\s*\|$/, '').split(/\s*\|\s*/);
      const head = cells(rows[0]), body = rows.slice(2).map(cells);
      /* 狭い画面では行を積んで見せるので、表の意味が読み上げで消えないよう、役割を書いておく。 */
      out.push('<div class="table"><table role="table"><tr role="row">' + head.map((c) => '<th scope="col" role="columnheader">' + inline(c) + '</th>').join('') + '</tr>'
        + body.map((r) => '<tr role="row">' + r.map((c, k) => '<td role="cell" data-col="' + esc(head[k] || '') + '">' + inline(c) + '</td>').join('') + '</tr>').join('') + '</table></div>');
      continue;
    }
    if (/^- /.test(l)) {
      const it = [];
      while (i < lines.length && /^- /.test(lines[i])) { it.push(lines[i].slice(2)); i++; }
      out.push('<ul>' + it.map((x) => '<li>' + inline(x) + '</li>').join('') + '</ul>');
      continue;
    }
    if (/^\d+\. /.test(l)) {
      const it = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { it.push(lines[i].replace(/^\d+\. /, '')); i++; }
      out.push('<ol>' + it.map((x) => '<li>' + inline(x) + '</li>').join('') + '</ol>');
      continue;
    }
    const ps = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3} |> |\| |- |\d+\. |<!--)/.test(lines[i])) { ps.push(lines[i]); i++; }
    out.push('<p>' + ps.map(inline).join('<br>\n') + '</p>');
  }
  return out.join('\n');
}

/* 原理の頁の項（定義・要請・法則・定理・系）。頁の中の飛び先と、本文の引き合いのリンクと、目次と索引を、src/strict.md から作る。
 * 2026-11-22 に足した。引き合いが実在し、循環せず、後ろを引かないことは verification/check.js が別の読み方で確かめる。 */
const KAN = '一二三四五六七八九';
function kanNum(s) {
  if (!/^[一二三四五六七八九十]+$/.test(s)) return NaN;
  if (!s.includes('十')) return s.length === 1 ? KAN.indexOf(s) + 1 : NaN;
  const [a, b] = s.split('十');
  return (a ? KAN.indexOf(a) + 1 : 1) * 10 + (b ? KAN.indexOf(b) + 1 : 0);
}
const ITEM_KIND = { 定義: 'def', 要請: 'post', 法則: 'law', 定理: 'prop', 系: 'cor' };
const ITEM_HEAD = /^\*\*(?:(定義|要請|定理)([一二三四五六七八九十]+)|第([一二三四五六七八九十]+)(法則)|(系))　([^*]*)\*\*/;
function principiaItems(md) {
  const items = [];
  for (const l of md.replace(/\r/g, '').split('\n')) {
    const m = ITEM_HEAD.exec(l);
    if (!m) continue;
    const kind = m[1] || m[4] || m[5];
    const n = m[5] ? 1 : kanNum(m[2] || m[3]);
    const label = m[5] ? '系' : (m[1] ? m[1] + m[2] : '第' + m[3] + '法則');
    items.push({ id: ITEM_KIND[kind] + '-' + n, kind, n, label, title: m[6] });
  }
  return items;
}
const CITE = /(定義|要請|定理)([一二三四五六七八九十]+)(?!つ)|第([一二三四五六七八九十]+)法則/g;
function crossref(html, items) {
  const byLabel = new Map(items.map((it) => [it.label, it]));
  /* 項の段に飛び先を付ける。 */
  html = html.replace(/<p><strong>((?:定義|要請|定理)[一二三四五六七八九十]+|第[一二三四五六七八九十]+法則|系)　/g, (m, lab) => {
    const it = byLabel.get(lab);
    return it ? '<p id="' + it.id + '"><strong>' + lab + '　' : m;
  });
  let h2 = 0;
  html = html.replace(/<h2>/g, () => '<h2 id="s' + (++h2) + '">');
  /* 本文の引き合いをリンクにする。見出し・項の名・原文・既にあるリンクの中は変えない。 */
  const SKIP = /^<(strong|a|h[1-6]|span class="orig"|span class="lat")\b/;
  let depth = 0, stackTag = [];
  return html.split(/(<[^>]+>)/).map((tok) => {
    if (tok.startsWith('<')) {
      if (tok.startsWith('</')) { if (stackTag.length && tok.slice(2, -1).split(' ')[0] === stackTag[stackTag.length - 1]) { stackTag.pop(); depth--; } }
      else if (SKIP.test(tok)) { const name = /^<([a-z0-9]+)/.exec(tok)[1]; stackTag.push(name); depth++; }
      else if (depth && /^<span\b/.test(tok) && stackTag.length) { stackTag.push('span'); depth++; }
      return tok;
    }
    if (depth) return tok;
    return tok.replace(CITE, (m, k, num, lawNum) => {
      const it = byLabel.get(k ? k + num : '第' + lawNum + '法則');
      return it ? '<a class="xref" href="#' + it.id + '">' + m + '</a>' : m;
    });
  }).join('');
}
function principiaIndex(md, html) {
  const items = principiaItems(md);
  const books = [...html.matchAll(/<h2 id="(s\d+)">(.+?)<\/h2>/g)].filter((m) => /^第[一二三四五六七八九十]+巻/.test(m[2].replace(/<[^>]+>/g, '')))
    .map((m) => '<li><a href="#' + m[1] + '">' + m[2].replace(/<span class="lat"[^>]*>[^<]*<\/span>/g, '').trim() + '</a></li>');
  const group = (kinds, name) => {
    const xs = items.filter((it) => kinds.includes(it.kind));
    return '<div class="idx-g"><p class="idx-h">' + name + '</p><p class="idx-l">'
      + xs.map((it) => '<a href="#' + it.id + '"' + (it.kind === '定理' || it.kind === '系' ? ' title="' + esc(it.title) + '"' : '') + '>'
        + esc(it.kind === '定理' || it.kind === '系' ? it.label : it.label + '　' + it.title) + '</a>').join('') + '</p></div>';
  };
  return '<nav class="toc" aria-label="原理の目次と索引"><p class="toc-h">目次</p><ol class="toc-books">' + books.join('') + '</ol>'
    + '<details class="toc-idx"><summary>索引（項ごとに飛ぶ）</summary>'
    + group(['定義'], '定義') + group(['要請'], '要請') + group(['法則'], '法則') + group(['定理', '系'], '定理と系') + '</details></nav>';
}

/* はじめにの頁の場面。外の目と魔法使いの目を、スクリプトを使わずに切り替える（チェックボックスと CSS だけ）。 */
const HERO = `<section class="hero" aria-label="二つの目">
<input type="checkbox" id="eye" class="eye-toggle">
<label for="eye" class="eye-switch"><span class="knob" aria-hidden="true"></span><span class="to-in">魔法使いの目で見る</span><span class="to-out">外の目に戻る</span></label>
<div class="scene" role="img" aria-label="傘を持って立っている人の場面（遊び）。切り替えると、同じ人のまわりに正多面体と関係の線が見える。">
${fs.readFileSync(path.join(ROOT, 'src', 'hero.svg.part'), 'utf8').trim()}
</div>
<p class="cap"><span class="cap-out">外の目：傘を持った人が、立っているだけ。</span><span class="cap-in">魔法使いの目：面が回り、負が溜まり、成果が人の関係へ溶けていく。</span></p>
</section>`;
/* はじめにの三つの紋（2026-11-22）。原理の印、クラスの紋、三十の目盛り。どれも assets の SVG で、外へは読みに行かない。 */
const EMBLEMS = `<figure class="emblems"><div class="emb">
<img src="assets/emblem-seal.svg" alt="原理の印：正二十面体の線画" width="200" height="160">
<img class="emb-crest" src="assets/emblem-crest.svg" alt="クラスの紋：盾の中の、先の折れた帽子と星" width="160" height="190">
<img src="assets/emblem-dial.svg" alt="三十の目盛り：零から三十までの目盛りと、三十の手前を指す針" width="200" height="160">
</div><figcaption>原理の印、クラスの紋、三十の目盛り。目盛りの針は、三十の手前を指しています。三十歳は目安にすぎません（第五法則）。紋の帽子はクラスの印で、魔法使いの見た目ではありません。見た目には、杖も帽子もありません。</figcaption></figure>`;
/* 頁の題の下に置く英語の添え名（飾り。読み上げからは外す）と、上の案内の英語。 */
const EN = { index: 'Magus Occultus', canon: 'The Canon', strict: 'Principia Magi Occulti', guide: 'Field Guide', play: 'Playground', faq: 'FAQ',
  about: 'Disclaimers & Disclosure', terms: 'Terms of Use', privacy: 'Privacy', requests: 'Requests & Contact', legality: 'On Legality', design: 'Legal Handling of the Design', 404: 'Not Found' };
/* 上の案内の英語。読み上げにも残す（見えている名と、読まれる名を揃える）。 */
const NAV_EN = { index: 'Home', canon: 'Canon', strict: 'Principia', guide: 'Field Guide', play: 'Playground', faq: 'FAQ' };
/* 頁の題の上に置く小さな見出し。 */
const EYEBROW = { index: '三十歳魔法使い都市伝説から生まれた、遊びのクラス', canon: '原典　定義九・法則十', strict: '原理　定義・要請・法則・定理', guide: '図鑑　十の法則の地味な現れ', play: '遊び場　関係の上で働く法則', faq: '問いと答え',
  about: '断りと開示', terms: '決まり', privacy: '決まり', requests: '決まり', legality: '決まり', design: '決まり', 404: '迷子' };
/* 小さな正二十面体のしるし。 */
const MARK = '<svg class="mark" viewBox="-50 -50 100 100" aria-hidden="true"><polygon points="0,-46 40,-23 40,23 0,46 -40,23 -40,-23"/><polygon points="0,-24 21,12 -21,12"/><path d="M0,-46L0,-24M40,-23L0,-24M-40,-23L0,-24M40,-23L21,12M40,23L21,12M0,46L21,12M0,46L-21,12M-40,23L-21,12M-40,-23L-21,12"/></svg>';

/* はじめにのクラス表。ゲームの職業のたとえで、人を分ける区分ではない（下の断りを外さない）。 */
const CLASS = `<section class="class-sheet" aria-labelledby="cls-kind cls-name">
<p class="cls-kind" id="cls-kind">クラス表（遊び）</p>
<h2 id="cls-name" class="cls-name">ステルス・ウィザード<span lang="en" aria-hidden="true">Stealth Wizard</span></h2>
<dl class="cls-stats">
<div><dt>系統</dt><dd>魔法職・隠密系</dd></div>
<div><dt>転職</dt><dd>切り替わりのとき（定義八）。三十歳は目安にすぎず、それより早いこともある（第五法則）</dd></div>
<div><dt>外見</dt><dd>ほかの人と同じ。外の目には、傘を持った人が立っているだけ</dd></div>
<div><dt>呪文</dt><dd>「確認します」「お先に失礼します」</dd></div>
<div><dt>見える成果</dt><dd class="num">0（いつも）</dd></div>
</dl>
<div class="cls-skills-wrap">
<h3>スキル（パッシブ）</h3>
<ul class="cls-skills">
<li><b>多面</b><span>場面ごとに、向ける面を変える</span><i>第二法則</i></li>
<li><b>保存</b><span>向けた負は消えず、溜まっていく</span><i>第三法則</i></li>
<li><b>反転</b><span>負の蓄積が進めば、逆の面が正として顕れる</span><i>第四法則</i></li>
<li><b>還元</b><span>成果は、出た瞬間に人の関係へ溶ける</span><i>第六法則</i></li>
<li><b>秘匿</b><span>具体は記さない</span><i>第九法則</i></li>
<li><b>長命</b><span>長く生きる。長く生きるのは大変</span><i>第十法則</i></li>
</ul>
</div>
<p class="cls-status"><b>状態</b>泥沼：脳が止まらない（第八法則）</p>
<p class="cls-note">ここで言うクラスは、ゲームの職業のたとえです。人を分ける区分ではなく、誰かを当てはめるものでもありません。上位職ではなく、ほかのクラスより強くも偉くもありません。</p>
</section>`;

/* 遊び場の部品。play.js が動かす。 */
const PLAY = `<div class="play" id="play">
<div class="row"><button type="button" id="scene">① 場面を変える</button><button type="button" id="live">② 一日を過ごす</button><button type="button" id="auto">④ 自動で過ごす</button></div>
<div class="views">
<section class="eye inner" aria-labelledby="eye-in"><h3 id="eye-in">魔法使いの目</h3>
<svg id="inner" class="net-svg" viewBox="0 0 300 240" role="img" aria-label="魔法使いの目"></svg>
<ul class="legend"><li><span class="k k-me"></span>魔法使い（自分）</li><li><span class="k k-neg"></span>負の面を向けている線</li><li><span class="k k-pos"></span>正の面を向けている線</li><li><span class="k k-gold"></span>負の逆が光った線・成果が入った関係</li></ul>
<div class="meter" id="meter" role="meter" aria-label="負の蓄積" aria-valuemin="0" aria-valuemax="36" aria-valuenow="0"><div class="fill" id="fill"></div></div>
<p>日 <b id="day">0</b>　蓄積 <b id="stock">0</b>　負を向けている人 <b id="negs">0</b></p>
<p>③ 切り替わり <b id="state">まだ</b></p>
</section>
<section class="eye outer" aria-labelledby="eye-out"><h3 id="eye-out">外の目</h3>
<svg id="outer" class="net-svg" viewBox="0 0 300 240" role="img" aria-label="外の目"></svg>
<p>魔法使いの見える成果 <b id="deeds">0</b></p>
<p>関係の太さの合計 <b id="total">0</b></p>
<p class="small">8 人と、隣り合う人どうしの関係の線だけが見えます。どれが魔法使いかも、誰のおかげで線が太くなったかも、見えません。</p>
</section>
</div>
<p class="note" id="note" aria-live="polite"></p>
</div>
<script src="assets/play.js" defer></script>`;

/* src の Markdown を、頁の中身にする。差し込みの部品もここで置く。 */
function render(md) {
  let html = statutes(markdown(md).replace('<!-- play -->', PLAY).replace('<!-- hero -->', HERO).replace('<!-- class -->', CLASS).replace('<!-- emblems -->', EMBLEMS));
  if (html.includes('<!-- index -->')) { html = crossref(html, principiaItems(md)); html = html.replace('<!-- index -->', principiaIndex(md, html)); }
  return html;
}

function page(file, title, body) {
  const label = (out, short) => '<span class="ja">' + esc(short) + '</span> <span class="en" lang="en">' + esc(NAV_EN[out]) + '</span>';
  const nav = PAGES.filter((x) => x[3]).map(([, out, short]) => (out === file ? '<span aria-current="page">' + label(out, short) + '</span>' : '<a href="' + out + '.html">' + label(out, short) + '</a>')).join('\n');
  body = body.replace('</h1>', '</h1>\n<p class="en-title" lang="en" aria-hidden="true">' + esc(EN[file] || '') + '</p>');
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${META_CSP}">
<title>${esc(title === NAME ? NAME + '（遊び）' : title + ' | ' + NAME)}</title>
<meta name="description" content="${esc(FOOT)}">
<link rel="canonical" href="${BASE}${file === 'index' ? '' : file + '.html'}">
<link rel="stylesheet" href="assets/style.css">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
</head>
<body class="p-${esc(file)}">
<aside class="frame" aria-label="この頁の枠"><p><span class="tag">娯楽の枠</span><span class="say">${esc(FRAME)}</span></p></aside>
<header><div class="mast"><a class="site" href="index.html"><img class="crest" src="assets/emblem-crest.svg" alt="クラスの紋" width="34" height="40"><span class="titles"><span class="name">${esc(NAME)}</span><span class="sub" lang="la" aria-hidden="true">Magus Occultus</span></span></a></div>
<nav aria-label="頁">
${nav}
</nav></header>
<main>
<p class="eyebrow">${esc(EYEBROW[file] || '')}</p>
${body}
</main>
<footer>
<p class="wordmark" lang="en" aria-hidden="true">${MARK}Stealth Wizard</p>
<div class="ruler" aria-hidden="true"><span>0</span><span>十</span><span>二十</span><span>三十（目安）</span></div>
<p>${esc(FOOT)}</p>
<p>原典は運営者の文で、遊びの部分は Claude（Anthropic の言語モデル）が書きました。Claude は著者ではありません。文は CC BY 4.0、コードは MIT。<a href="${REPO}" rel="noopener">リポジトリ</a></p>
<nav aria-label="決まり">${PAGES.filter((x) => !x[3]).map(([, out, short]) => (out === file ? '<span aria-current="page">' + esc(short) + '</span>' : '<a href="' + out + '.html">' + esc(short) + '</a>')).join('\n')}</nav>
</footer>
</body>
</html>
`;
}

/* GitHub で読む原理の全文（PRINCIPIA.md）と、GitHub でも色の付く図（docs/figs/*.svg）。
 * src/strict.md から作る。手で直さない。GitHub の Markdown に合わせ、〔ラテン語〕は小さく、原文は引用、証明と注は斜体の見出し、
 * 行の終わりは改行のまま見えるよう、段落の中の行を「\」で切る。 */
const FIG_STYLE = '<style>.s{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.4}.f-ln{stroke:#0d0f13}.f-mt{stroke:#555b65}.f-gd{stroke:#9a7b2f}'
  + '.f-inkfill{fill:#0d0f13}.f-goldf{fill:#9a7b2f}.f-tx{fill:#555b65;font-family:"Hiragino Sans","Yu Gothic","Noto Sans JP",sans-serif}</style>';
function githubFig(name) {
  const svg = fs.readFileSync(path.join(ROOT, 'src', 'figs', name + '.svg'), 'utf8').trim();
  const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
  return svg.replace(/^<svg /, '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/^(<svg[^>]*>)/, '$1' + FIG_STYLE + '<rect width="' + vb[1] + '" height="' + vb[2] + '" fill="#ffffff"/>') + '\n';
}
function principia() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'strict.md'), 'utf8').replace(/\r/g, '');
  const preface = /^> (.+)$/m.exec(fs.readFileSync(path.join(ROOT, 'src', 'canon.md'), 'utf8'))[1];
  const lat = (t) => t.replace(/〔([^〕]+)〕/g, ' <sub>$1</sub>');
  const lines = src.split('\n');
  const out = [];
  const figs = [];
  const toc = [];
  let book = 0;
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i];
    if (i === 0) {
      out.push('# 原理：魔法使いの定義と法則', '', '<p><sub>PRINCIPIA MAGI OCCULTI · ステルス・ウィザード</sub></p>', '',
        '> [!NOTE]', '> **娯楽の枠**　' + FRAME, '>', '> ' + FOOT, '',
        'この文書は、サイト「' + NAME + '」の [原理](' + BASE + 'strict.html) の頁と同じ中身を、GitHub で読める形にしたものです。', '',
        '原典は、こう始まります。', '', '> ' + preface, '', '<!-- 目次 -->', '');
      continue;
    }
    const h = /^## (.+)$/.exec(l);
    if (h) { book++; toc.push(h[1].replace(/〔[^〕]+〕/g, '')); out.push('<a id="s' + book + '"></a>', '', '## ' + lat(h[1]), ''); continue; }
    const f = /^!\[([^\]]+)\]\(fig:([a-z0-9-]+)\)$/.exec(l.trim());
    if (f) { figs.push(f[2]); out.push('<p align="center"><img src="docs/figs/' + f[2] + '.svg" alt="' + f[1] + '" width="560"></p>', '<p align="center"><sub>' + f[1] + '</sub></p>', ''); continue; }
    if (!l.trim()) { out.push(''); continue; }
    if (/^<!--.*-->$/.test(l.trim())) continue;
    if (/^> /.test(l) && /^> /.test(out[out.length - 1] || '')) out.push('>');
    if (/^(> |\| |- )/.test(l)) { out.push(lat(l).replace(/\]\(canon\.html\)/g, '](src/canon.md)').replace(/\]\(([a-z]+)\.html\)/g, '](' + BASE + '$1.html)')); continue; }
    /* 段落：続く行をまとめ、原文は引用に、証明と注は斜体の見出しに、Q.E.D. は斜体に。 */
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(## |> |\| |- |!\[)/.test(lines[i])) { para.push(lines[i]); i++; }
    i--;
    /* 行の順を保つ。原文の行で段落を切り、引用にして挟む。 */
    let body = [];
    const flush = () => { if (body.length) out.push(body.join('\\\n'), ''); body = []; };
    for (const p of para) {
      let t = lat(p).replace(/\]\(canon\.html\)/g, '](src/canon.md)').replace(/\]\(([a-z]+)\.html\)/g, '](' + BASE + '$1.html)');
      t = t.replace(/Q\.E\.D\.$/, '*Q.E.D.*');
      if (/^原文：/.test(t)) { flush(); out.push('> **原文**　' + t.slice(3), ''); continue; }
      /* 定義・要請・法則は、名の行と本文の行を分ける。 */
      t = t.replace(/^(\*\*(?:定義|要請|第[一二三四五六七八九十]+法則)[^*]+\*\*(?: <sub>[^<]+<\/sub>)?)　(.+)$/, '$1\\\n$2');
      body.push(t.replace(/^(証明|注)。/, '*$1*　'));
    }
    flush();
  }
  out.push('---', '', '原典は運営者の文です。原理と、この文書の形は、運営者の求めで Claude（Anthropic の言語モデル）が書きました。Claude は著者ではありません。', '',
    '文は CC BY 4.0、コードは MIT です。図は、このリポジトリの `src/figs` から作っています。', '',
    'この文書は `node build.js` が `src/strict.md` から作る生成物で、手で直しません。式・模型・数は `verification/models.js` が機械で確かめています。', '');
  const md = out.join('\n').replace(/\n{3,}/g, '\n\n').replace('<!-- 目次 -->', '## 目次\n\n' + toc.map((t, k) => (k + 1) + '. [' + t.trim() + '](#s' + (k + 1) + ')').join('\n'));
  return { md, figs };
}

function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
  for (const [src, out] of PAGES) {
    const md = fs.readFileSync(path.join(ROOT, 'src', src + '.md'), 'utf8');
    const title = /^# (.+)$/m.exec(md)[1];
    const body = render(md);
    fs.writeFileSync(path.join(OUT, out + '.html'), page(out, title, body));
  }
  fs.writeFileSync(path.join(OUT, '404.html'), page('404', '頁が見つかりません', '<h1>頁が見つかりません</h1>\n<p>この所在に頁はありません。第六法則のとおり、見えないだけかもしれませんが、たぶん本当にありません。</p>\n<p><a href="index.html">はじめに</a>へ戻れます。</p>'));
  for (const f of fs.readdirSync(path.join(ROOT, 'assets'))) fs.copyFileSync(path.join(ROOT, 'assets', f), path.join(OUT, 'assets', f));
  fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: ' + BASE + 'sitemap.xml\n');
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + PAGES.map(([, out]) => '<url><loc>' + BASE + (out === 'index' ? '' : out + '.html') + '</loc></url>').join('\n') + '\n</urlset>\n');
  fs.writeFileSync(path.join(OUT, 'vercel.json'), JSON.stringify({ cleanUrls: false, headers: [{ source: '/(.*)', headers: [
    { key: 'Content-Security-Policy', value: CSP }, { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'no-referrer' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' }] }] }, null, 2) + '\n');
  const pr = principia();
  fs.writeFileSync(path.join(ROOT, 'PRINCIPIA.md'), pr.md);
  fs.mkdirSync(path.join(ROOT, 'docs', 'figs'), { recursive: true });
  for (const f of pr.figs) fs.writeFileSync(path.join(ROOT, 'docs', 'figs', f + '.svg'), githubFig(f));
  return PAGES.length + 1;
}

if (require.main === module) console.log('生成しました: site/（頁 ' + build() + '）');
module.exports = { EMBLEMS, MARK, FIG_STYLE, principiaItems, crossref, kanNum, principia, githubFig, EN, FRAME, CLASS, render, HERO, statutes, STATUTES, markdown, inline, page, build, PAGES, FOOT, CSP, META_CSP, BASE, NAME, PLAY };
