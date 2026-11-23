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
/* Google Search Console の所有の確認（HTML タグの方式）。運営者が Search Console で受け取った値（2026-11-22）。外へは何も読みに行かない。 */
const GSC = 'UEPpX5mfnLlhOBTBTETu-PmRO_Y4L2SmjEiaq_U1Zf8';
const REPO = 'https://github.com/cpsbvbng26-dotcom/quiet-wizard';
const NAME = 'ステルス・ウィザード';
/* 頁の順。[元, 出力, 案内の短い名, 上の案内に出すか] 上に出さない頁は、下の欄からつなぐ。 */
const PAGES = [['index', 'index', 'はじめに', true], ['canon', 'canon', '原典', true], ['strict', 'strict', '原理', true], ['guide', 'guide', '図鑑', true], ['play', 'play', '遊び場', true], ['faq', 'faq', '問い', true],
  ['about', 'about', '断りと開示', false], ['terms', 'terms', '利用規約', false], ['privacy', 'privacy', '個人情報', false], ['requests', 'requests', '求めと連絡', false], ['legality', 'legality', '適法性の説明', false],
  ['design', 'design', 'デザインに関する法的な扱い', false]];
/* 英語の頁（2026-11-23）。日本語の頁ごとに一つ、src/<名>.en.md から site/<名>.en.html を作る。英語の頁は訳で、日本語の頁がもと。
 * ここに挙げた頁だけに英語の頁がある。まだ英語の無い頁へのつなぎは、日本語の頁へ向け、hreflang="ja" を付ける。 */
const EN_PAGES = ['index', 'canon', 'strict', 'guide', 'play', 'faq', 'about', 'terms', 'privacy', 'requests', 'legality', 'design'];
const LANGS = ['ja', 'en'];
const hasEn = (out) => out === '404' || EN_PAGES.includes(out);
/* 頁のファイルの名と、所在。英語の頁は <名>.en.html。日本語のはじめには根（/）を所在とする。 */
const fileOf = (out, lang) => (lang === 'en' ? out + '.en' : out);
const urlOf = (out, lang) => BASE + (out === 'index' && lang !== 'en' ? '' : fileOf(out, lang) + '.html');
const NAME_EN = 'Stealth Wizard';
/* 適法性の説明と、デザインに関する法的な扱いが引く条文。e-Gov から取り寄せた文の写し（verification/statutes-texts.json）。手で書かない。 */
const STATUTES = JSON.parse(fs.readFileSync(path.join(__dirname, 'verification', 'statutes-texts.json'), 'utf8'));
/* <!-- 条文 A、B --> を、引いた条文の原文に置き換える。無い条を引けば止まる。
 * <!-- 抜粋 条｜切り出した所｜文｜文 --> は、長い条から、頁の文が拠る項や号だけを置く。切り出した文が写しの文の一部でなければ止まる（2026-11-22）。
 * 出どころの注は、頁の最後の条文の後に一度だけ置く。 */
/* 英語の頁の条文（2026-11-23）。<!-- statute 条｜要約 --> と <!-- excerpt 条｜切り出した所（英語）｜文｜文｜要約 --> で書く。
 * 条文は写しの日本語のまま置き、その下の英語は「Summary, not a translation」と札を付けた要約にする。訳は置かない。
 * 抜粋の最後の欄が要約で、それより前の欄は写しの文の一部でなければ止まる。 */
const LAW_EN = { 刑法: 'Penal Code', 民法: 'Civil Code', 著作権法: 'Copyright Act', 景品表示法: 'Act against Unjustifiable Premiums and Misleading Representations', 消費者契約法: 'Consumer Contract Act',
  商標法: 'Trademark Act', 意匠法: 'Design Act', 不正競争防止法: 'Unfair Competition Prevention Act', 障害者差別解消法: 'Act for Eliminating Discrimination against Persons with Disabilities' };
const ROMAN = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
function statuteEn(k) {
  const [law, art] = k.split(' ');
  const m = /^第(\d+)条(?:の(\d+))?(?:第(\d+)項)?(?:第(\d+)号)?(?:・第(\d+)号)?$/.exec(art || '');
  if (!LAW_EN[law] || !m) throw new Error('条の英語の名が作れない：' + k);
  return LAW_EN[law] + ', Article ' + m[1] + (m[2] ? '-' + m[2] : '') + (m[3] ? '(' + m[3] + ')' : '') + (m[4] ? '(' + ROMAN[m[4]] + ')' : '') + (m[5] ? ' and (' + ROMAN[m[5]] + ')' : '');
}
const SUMMARY_K = 'Summary, not a translation';
function statutes(html, lang) {
  const END = '\u0000';
  if (lang === 'en') {
    const text = (k) => { const t = STATUTES.texts[k]; if (!t) throw new Error('条文の写しに無い：' + k); return t; };
    const head = (k, where) => '<h3>' + esc(statuteEn(k)) + (where ? ', ' + esc(where) : '') + ' <span lang="ja">（' + esc(k) + '）</span></h3>\n';
    const sum = (t) => { if (!t || /[\u3040-\u30ff\u4e00-\u9fff]/.test(t)) throw new Error('条文の英語の要約が無いか、日本語が混じる'); return '<p class="summary"><span class="sum-k">' + SUMMARY_K + '</span>' + esc(t) + '</p>'; };
    let n = 0;
    html = html.replace(/<!-- (statute|excerpt) ([^>]+?) -->/g, (m, kind, body) => {
      n++;
      const parts = body.split('｜').map((x) => x.trim());
      if (kind === 'statute') { if (parts.length !== 2) throw new Error('statute の形が違う：' + parts[0]); return head(parts[0]) + '<blockquote lang="ja"><p>' + esc(text(parts[0])) + '</p></blockquote>\n' + sum(parts[1]) + END; }
      const [k, where, ...rest] = parts, summary = rest.pop(), all = text(k);
      if (!where || !rest.length) throw new Error('excerpt の形が違う：' + k);
      for (const p of rest) if (!all.includes(p)) throw new Error('抜粋が写しの文に無い：' + k + '：' + p.slice(0, 24));
      return head(k, where) + '<blockquote lang="ja">' + rest.map((p) => '<p>' + esc(p) + '</p>').join('') + '</blockquote>\n' + sum(summary)
        + '\n<p class="note">This is a long article, so only part of it (' + esc(where) + ') is cut out of the copy, character for character. The other paragraphs and items are left out.</p>' + END;
    });
    if (!n) return html;
    const last = html.lastIndexOf(END);
    const note = '\n<p class="note">Source: retrieved from the e-Gov Laws API (v1) and recorded by the operator on ' + esc(STATUTES.recorded) + ' (verification/statutes-texts.json in another of the operator\'s repositories, commit ' + esc(STATUTES.from.commit.slice(0, 7)) + '). The copy is in verification/statutes-texts.json in this repository. The statutes are shown in the Japanese original only.</p>';
    return (html.slice(0, last) + note + html.slice(last + 1)).split(END).join('');
  }
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
/* 英語の頁の上の帯と下の欄（2026-11-23）。日本語の FRAME と FOOT と同じことを、英語で言う。検査が同じ文で固める。 */
const FRAME_EN = "This is an entertainment space, separate from the operator's academic work. It is not science.";
const FOOT_EN = "This is a play. It is an entertainment space, separate from the operator's academic work. It is not science. This site is for fun, and its subject is an urban legend. The laws written here are not scientific laws. They judge no one's sexual experience and point at no particular person. This is an in-joke, and some people may find it offensive. Please keep that in mind. It is not elitism, and the operator does not speak for wizards.";
const META_CSP ="default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'";
/* frame-ancestors は meta では効かないので、配信のヘッダーにだけ足す。 */
const CSP = META_CSP + "; frame-ancestors 'none'";

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* 行の中の書式：リンク、太字、コード。原理の頁の古典の体裁（〔ラテン語〕、原文の行、証明、Q.E.D.）もここで組む。 */
function inline(s, lang) {
  let t = esc(s);
  t = t.replace(/〔([^〕]+)〕/g, '<span class="lat" lang="la">$1</span>');
  /* 英語の頁の中の日本語の原文は〘〙で囲み、lang="ja" を付ける（2026-11-23）。 */
  t = t.replace(/〘([^〙]+)〙/g, '<span lang="ja">$1</span>');
  /* 英語の頁でも、原文の行は日本語のまま置き、原文だと札を付ける。 */
  if (lang === 'en') t = t.replace(/^原文：(.*)$/, (m, o) => '<span class="orig"><span class="orig-k">Original</span><span lang="ja">' + o + '</span>' + (o === 'なし（この版にて補ふ）' ? ' (none; added in this version)' : '') + '</span>');
  else t = t.replace(/^原文：(.*)$/, '<span class="orig"><span class="orig-k">原文</span>$1</span>');
  t = lang === 'en' ? t.replace(/^(Proof|Note)\. /, '<span class="proof-k">$1</span>') : t.replace(/^(証明|注)。/, '<span class="proof-k">$1</span>');
  t = t.replace(/Q\.E\.D\.$/, '<span class="qed" lang="la">Q.E.D.</span>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, a, h) => '<a href="' + h + '"' + (/^https?:/.test(h.replace(/&amp;/g, '&')) ? ' rel="noopener"' : '') + '>' + a + '</a>');
  return t;
}

/* 図と場面の中の文字の英語（2026-11-23）。英語の頁では、図の SVG の text の中身を、この表で英語に替えて描く。図のファイルは一つのまま。
 * 表に無い日本語の文字が残れば止まる。図の中の文字は、形を色の名で指さない（デザインに関する法的な扱い）。 */
const FIG_EN = {
  '＋＋＋　均衡': '+ + +  balanced', '組は一つ': 'one group', '＋−−　均衡': '+ − −  balanced', '二つの組に分かれる': 'splits into two groups',
  '＋＋−　均衡せず': '+ + −  not balanced', 'どう分けても合わない': 'no split works', '実線は相＋、点線は相−': 'solid line: sign +, dotted line: sign −',
  '場面 A　負の面が外を向く': 'Scene A: a negative face out', '場面 B　同じ要素が、別の面を向ける': 'Scene B: another face shown',
  '和　＋・＋': 'concord  + · +', '線が太る': 'the line thickens', '偏　＋・−': 'bias  + · −', '線が細る': 'the line thins',
  '衝　−・−': 'clash  − · −', '両の蓄積が増す': 'both stores grow', '相は＋（潜める和）': 'sign + (hidden concord)',
  '向き合う面だけを見る。人の属性は置かない': 'Only the facing faces count. People carry no attributes.', '細い線の辺は相＋、太い帯の辺は相−': 'thin-line edge: sign +, thick-band edge: sign −',
  '人の関係（中）': 'relationships (inside)', '魔法使い': 'wizard', '外の者': 'outsider', '「何も見えない」': '"I see nothing"',
  '少し溜まる': 'a little piles up', '減らずに増える': 'grows, never shrinks', '閾に届く': 'reaches the threshold', '閾（人によって違う）': 'threshold (differs by person)',
  '上の面が負': 'top face negative', '向かいの面が、正として光る': 'the opposite face glows as positive', '負は消えない。その逆が光る': 'The negative stays. Its opposite glows.',
  '魔法使いの目': "wizard's view", '外の目': 'outside view',
};
function figText(svg, lang) {
  if (lang !== 'en') return svg;
  return svg.replace(/(<text\b[^>]*>)([^<]*)(<\/text>)/g, (m, a, t, b) => {
    if (!/[　-ヿ一-鿿＀-￯]/.test(t)) return m;
    if (!FIG_EN[t]) throw new Error('図の文字の英語が無い：' + t);
    return a + esc(FIG_EN[t]) + b;
  });
}

/* Markdown の小さな部分集合：見出し、段落、箇条、番号の箇条、引用、表、HTML の注釈（そのまま）。 */
function markdown(src, lang) {
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
      const svg = figText(fs.readFileSync(path.join(ROOT, 'src', 'figs', f[2] + '.svg'), 'utf8').trim(), lang).replace(/^<svg /, '<svg role="img" aria-label="' + esc(f[1]) + '" ');
      out.push('<figure class="fig">' + svg + '<figcaption>' + esc(f[1]) + '</figcaption></figure>');
      i++; continue;
    }
    let m = /^(#{1,3}) (.+)$/.exec(l);
    if (m) { out.push('<h' + m[1].length + '>' + inline(m[2], lang) + '</h' + m[1].length + '>'); i++; continue; }
    if (l.startsWith('> ')) {
      const ps = [];
      while (i < lines.length && lines[i].startsWith('>')) { ps.push(lines[i].replace(/^> ?/, '')); i++; }
      out.push('<blockquote>' + ps.filter((p) => p.trim()).map((p) => '<p>' + inline(p, lang) + '</p>').join('') + '</blockquote>');
      continue;
    }
    if (l.startsWith('| ')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i]); i++; }
      const cells = (r) => r.replace(/^\|\s*/, '').replace(/\s*\|$/, '').split(/\s*\|\s*/);
      const head = cells(rows[0]), body = rows.slice(2).map(cells);
      /* 狭い画面では行を積んで見せるので、表の意味が読み上げで消えないよう、役割を書いておく。 */
      out.push('<div class="table"><table role="table"><tr role="row">' + head.map((c) => '<th scope="col" role="columnheader">' + inline(c, lang) + '</th>').join('') + '</tr>'
        + body.map((r) => '<tr role="row">' + r.map((c, k) => '<td role="cell" data-col="' + esc(head[k] || '') + '">' + inline(c, lang) + '</td>').join('') + '</tr>').join('') + '</table></div>');
      continue;
    }
    if (/^- /.test(l)) {
      const it = [];
      while (i < lines.length && /^- /.test(lines[i])) { it.push(lines[i].slice(2)); i++; }
      out.push('<ul>' + it.map((x) => '<li>' + inline(x, lang) + '</li>').join('') + '</ul>');
      continue;
    }
    if (/^\d+\. /.test(l)) {
      const it = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { it.push(lines[i].replace(/^\d+\. /, '')); i++; }
      out.push('<ol>' + it.map((x) => '<li>' + inline(x, lang) + '</li>').join('') + '</ol>');
      continue;
    }
    const ps = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3} |> |\| |- |\d+\. |<!--)/.test(lines[i])) { ps.push(lines[i]); i++; }
    out.push('<p>' + ps.map((p) => inline(p, lang)).join('<br>\n') + '</p>');
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
/* 英語の原理の項（2026-11-23）。**Definition 1. Wizard.** の形。飛び先の名（def-1 など）は日本語の頁と同じ。kind は日本語の名で持つ（索引の組に使う）。 */
const ITEM_HEAD_EN = /^\*\*(?:(Definition|Postulate|Proposition|Law) (\d+)|(Corollary))\. ([^*]*?)\.?\*\*/;
const KIND_EN = { Definition: '定義', Postulate: '要請', Law: '法則', Proposition: '定理', Corollary: '系' };
function principiaItems(md, lang) {
  const items = [];
  if (lang === 'en') {
    for (const l of md.replace(/\r/g, '').split('\n')) {
      const m = ITEM_HEAD_EN.exec(l);
      if (!m) continue;
      const kind = KIND_EN[m[1] || m[3]], n = m[3] ? 1 : Number(m[2]);
      items.push({ id: ITEM_KIND[kind] + '-' + n, kind, n, label: m[3] ? 'Corollary' : m[1] + ' ' + m[2], title: m[4] });
    }
    return items;
  }
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
/* 引き合い。系は「系の」の形だけを引き合いと読む（「体系の」は除く）。「第十法則の注」「系の後の注」のような注の引き合いは、注の持ち主の項を引くものとして読む（2026-11-23）。 */
const CITE = /(定義|要請|定理)([一二三四五六七八九十]+)(?!つ)|第([一二三四五六七八九十]+)法則|(?<!体)(系)(?=の)/g;
/* 英語の引き合い。複数形（Propositions 8 to 11 など）は引き合いと読まない。系は大文字の Corollary だけ。 */
const CITE_EN = /\b(Definition|Postulate|Proposition) (\d+)\b|\bLaw (\d+)\b|\b(Corollary)\b/g;
function crossref(html, items, lang) {
  const en = lang === 'en';
  const byLabel = new Map(items.map((it) => [it.label, it]));
  /* 項の段に飛び先を付ける。 */
  html = en ? html.replace(/<p><strong>((?:Definition|Postulate|Proposition|Law) \d+|Corollary)\. /g, (m, lab) => {
    const it = byLabel.get(lab);
    return it ? '<p id="' + it.id + '"><strong>' + lab + '. ' : m;
  }) : html.replace(/<p><strong>((?:定義|要請|定理)[一二三四五六七八九十]+|第[一二三四五六七八九十]+法則|系)　/g, (m, lab) => {
    const it = byLabel.get(lab);
    return it ? '<p id="' + it.id + '"><strong>' + lab + '　' : m;
  });
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
    if (en) return tok.replace(CITE_EN, (m, k, num, lawNum, cor) => {
      const it = byLabel.get(cor ? 'Corollary' : k ? k + ' ' + num : 'Law ' + lawNum);
      return it ? '<a class="xref" href="#' + it.id + '">' + m + '</a>' : m;
    });
    return tok.replace(CITE, (m, k, num, lawNum, cor) => {
      const it = byLabel.get(cor ? '系' : k ? k + num : '第' + lawNum + '法則');
      return it ? '<a class="xref" href="#' + it.id + '">' + m + '</a>' : m;
    });
  }).join('');
}
/* 見出しに飛び先を付ける。h2 は s1, s2, …、h3 はその下に s1-1, s1-2, … と振る（2026-11-23 に、原理だけでなく目次を置く頁のすべてへ広げた）。 */
function headIds(html) {
  let h2 = 0, h3 = 0;
  return html.replace(/<h([23])>/g, (m, lv) => (lv === '2' ? '<h2 id="s' + (++h2, h3 = 0, h2) + '">' : '<h3 id="s' + h2 + '-' + (++h3) + '">'));
}
/* 頁の中の目次。見出しを二段の入れ子にする。top が真の h2 を上の段に、ほかの h2 と h3 を、その前の上の段の下に置く。
 * 原理では、巻と総注解を上の段に、巻の中の要請・法則・定理・注解などを下の段に置く（2026-11-23）。 */
const headText = (h) => h.replace(/<span class="lat"[^>]*>[^<]*<\/span>/g, '').replace(/<[^>]+>/g, '').trim();
function tocList(html, top) {
  const groups = [];
  for (const m of html.matchAll(/<h([23]) id="(s[\d-]+)">(.+?)<\/h\1>/g)) {
    const e = { id: m[2], text: headText(m[3]) };
    if ((m[1] === '2' && top(e.text)) || !groups.length) groups.push({ e, kids: [] }); else groups[groups.length - 1].kids.push(e);
  }
  return groups.map(({ e, kids }) => '<li><a href="#' + e.id + '">' + esc(e.text) + '</a>'
    + (kids.length ? '<ol>' + kids.map((k) => '<li><a href="#' + k.id + '">' + esc(k.text) + '</a></li>').join('') + '</ol>' : '') + '</li>').join('');
}
const pageToc = (html, lang) => '<nav class="toc" aria-label="' + UI[lang === 'en' ? 'en' : 'ja'].tocLabel + '"><p class="toc-h">' + UI[lang === 'en' ? 'en' : 'ja'].toc + '</p><ol class="toc-books">' + tocList(html, () => true) + '</ol></nav>';
/* 原理の目次と索引。英語の頁では、巻（Book I など）と General Scholium を上の段に置く。 */
const BOOK_TOP = { ja: /^(第[一二三四五六七八九十]+巻|総注解)/, en: /^(Book [IVX]+\b|General Scholium)/ };
function principiaIndex(md, html, lang) {
  const en = lang === 'en';
  const items = principiaItems(md, lang);
  const books = [tocList(html, (t) => BOOK_TOP[en ? 'en' : 'ja'].test(t))];
  const group = (kinds, name) => {
    const xs = items.filter((it) => kinds.includes(it.kind));
    return '<div class="idx-g"><p class="idx-h">' + name + '</p><p class="idx-l">'
      + xs.map((it) => '<a href="#' + it.id + '"' + (it.kind === '定理' || it.kind === '系' ? ' title="' + esc(it.title) + '"' : '') + '>'
        + esc(it.kind === '定理' || it.kind === '系' ? it.label : it.label + (en ? '. ' : '　') + it.title) + '</a>').join('') + '</p></div>';
  };
  if (en) return '<nav class="toc" aria-label="Contents and index of the Principia"><p class="toc-h">Contents</p><ol class="toc-books">' + books.join('') + '</ol>'
    + '<details class="toc-idx"><summary>Index (jump to each item)</summary>'
    + group(['定義'], 'Definitions') + group(['要請'], 'Postulates') + group(['法則'], 'Laws') + group(['定理', '系'], 'Propositions and corollary') + '</details></nav>';
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
/* 頁ごとの短い説明（meta の description と og:description）。どれも短い断りで終える（2026-11-23）。断りの全文は、頁の上の帯と下の欄にある。 */
const DESC_TAIL = '遊びであり、科学ではありません。';
const DESC = {
  index: 'ステルス・ウィザードは、三十歳魔法使い都市伝説の魔法使いを、ゲームのクラスに見立てた遊びのサイトです。',
  canon: '遊びの元になった一枚の文を、手を入れずに写した頁です。定義が九つ、法則が十あります。',
  strict: '原典の定義と法則を骨に、古典の数学書の形で組み直した原理です。定義・要請・法則・定理と証明を、五つの巻に並べます。',
  guide: '十の法則が、暮らしの中でどう地味に現れるかを並べた図鑑です。観察や調査に基づくものではありません。',
  play: '8 人の関係の上で、面を返し、負を溜め、切り替わりを待つ遊び場です。何も測らず、何も記録しません。',
  faq: '科学なのか、誰が魔法使いなのか、三十歳の誕生日に何が起きるのか。よくある問いへの答えです。',
  about: 'このサイトが何でないか、誰が何を書いたか、ライセンスを書いた頁です。',
  terms: 'このサイトの利用規約です。料金を取らず、想定していない使い方を示します。',
  privacy: 'このサイトは何も集めません。配信の事業者、検索の側の集計、issue での求めの扱いを書いた頁です。',
  requests: '文の誤りの知らせ、記載を消すことや直すことの求め、権利者からの知らせの受け方です。',
  legality: 'このサイトが日本の法令のどこに触れうるかと、触れないための決めを、条文の写しと並べた頁です。法的な助言ではありません。',
  design: '書体・印・ファビコン・図・共有のカードなど、見た目の部品の出所と許諾と、法令との関わりです。法的な助言ではありません。',
  404: 'この所在に頁はありません。',
};
/* 共有のカードと、ホーム画面のアイコン（2026-11-23）。tools/card.js が、紋と上の欄の色と Inter Tight から描いた PNG。
 * 大きさは PNG の頭（IHDR）から読む。上の欄の夜の黒を、ブラウザの帯の色（theme-color）にも使う。 */
const pngSize = (f) => { const b = fs.readFileSync(path.join(ROOT, 'assets', f)); if (b.toString('latin1', 1, 4) !== 'PNG') throw new Error(f + ' が PNG でない'); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const CARD = { file: 'card.png', size: pngSize('card.png'),
  alt: 'ステルス・ウィザードの共有のカード。夜の黒の地に、クラスの紋（盾の中の、先の折れた帽子と星）、英字の名 STEALTH WIZARD と MAGUS OCCULTUS、A play, not science. の一行、原理の印と三十の目盛り。' };
const CARD_ALT_EN = 'The share card of Stealth Wizard. On a night-black ground: the class crest (a hat with a bent tip and a star inside a shield), the name STEALTH WIZARD and MAGUS OCCULTUS, the line A play, not science., the seal of the Principia and the dial of thirty.';
const THEME = /--mastbg:\s*(#[0-9a-f]{6})/.exec(fs.readFileSync(path.join(ROOT, 'assets', 'style.css'), 'utf8'))[1];
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
<div class="row"><button type="button" id="scene">場面を変える</button><button type="button" id="live">一日を過ごす</button><button type="button" id="auto">自動で過ごす</button></div>
<div class="views">
<section class="eye inner" aria-labelledby="eye-in"><h3 id="eye-in">魔法使いの目</h3>
<svg id="inner" class="net-svg" viewBox="0 0 300 240" role="img" aria-label="魔法使いの目"></svg>
<ul class="legend"><li><span class="k k-me"></span>魔法使い（自分）</li><li><span class="k k-neg"></span>負の面を向けている線</li><li><span class="k k-pos"></span>正の面を向けている線</li><li><span class="k k-gold"></span>負の逆が光った線・成果が入った関係</li></ul>
<div class="meter" id="meter" role="meter" aria-label="負の蓄積" aria-valuemin="0" aria-valuemax="36" aria-valuenow="0"><div class="fill" id="fill"></div></div>
<p>日 <b id="day">0</b>　蓄積 <b id="stock">0</b>　負を向けている人 <b id="negs">0</b></p>
<p>切り替わり <b id="state">まだ</b></p>
</section>
<section class="eye outer" aria-labelledby="eye-out"><h3 id="eye-out">外の目</h3>
<svg id="outer" class="net-svg" viewBox="0 0 300 240" role="img" aria-label="外の目"></svg>
<p>魔法使いの見える成果 <b id="deeds">0</b></p>
<p>関係の太さの合計 <b id="total">0</b></p>
<p class="small">8 人と、隣り合う人どうしの関係の線だけが見えます。点はみな同じに描かれ、太くなった線の一本からは、誰のおかげかは分かりません。</p>
</section>
</div>
<p class="note" id="note" aria-live="polite"></p>
</div>
<script src="assets/play.js" defer></script>`;

/* 英語の頁の部品（2026-11-23）。日本語の HERO・EMBLEMS・CLASS・PLAY と同じ形で、文だけを英語にする。クラス表の断りは外さない。 */
const HERO_EN = `<section class="hero" aria-label="Two views">
<input type="checkbox" id="eye" class="eye-toggle">
<label for="eye" class="eye-switch"><span class="knob" aria-hidden="true"></span><span class="to-in">See with the wizard's eyes</span><span class="to-out">Back to the outside view</span></label>
<div class="scene" role="img" aria-label="A person standing with an umbrella (a play). Switch the view, and regular polyhedra and lines of relationship appear around the same person.">
${figText(fs.readFileSync(path.join(ROOT, 'src', 'hero.svg.part'), 'utf8').trim(), 'en')}
</div>
<p class="cap"><span class="cap-out">Outside view: a person with an umbrella, just standing there.</span><span class="cap-in">Wizard's view: faces turn, negatives pile up, and results melt into relationships.</span></p>
</section>`;
const EMBLEMS_EN = `<figure class="emblems"><div class="emb">
<img src="assets/emblem-seal.svg" alt="Seal of the Principia: a line drawing of a regular icosahedron" width="200" height="160">
<img class="emb-crest" src="assets/emblem-crest.svg" alt="Class crest: a hat with a bent tip and a star, inside a shield" width="160" height="190">
<img src="assets/emblem-dial.svg" alt="Dial of thirty: a scale from zero to thirty, with the needle just short of thirty" width="200" height="160">
</div><figcaption>The seal of the Principia, the class crest, and the dial of thirty. The needle stops just short of thirty. Thirty is only a rule of thumb (Law 5). The hat on the crest marks the class; it is not what a wizard looks like. In real looks, there is no staff and no hat.</figcaption></figure>`;
const CLASS_EN = `<section class="class-sheet" aria-labelledby="cls-kind cls-name">
<p class="cls-kind" id="cls-kind">Class sheet (a play)</p>
<h2 id="cls-name" class="cls-name">Stealth Wizard<span lang="ja" aria-hidden="true">ステルス・ウィザード</span></h2>
<dl class="cls-stats">
<div><dt>Line</dt><dd>Magic, stealth branch</dd></div>
<div><dt>Class change</dt><dd>At the switch (Definition 8). Thirty is only a rule of thumb, and the switch can come earlier (Law 5)</dd></div>
<div><dt>Looks</dt><dd>Like anyone else. To the outside view, just a person standing with an umbrella</dd></div>
<div><dt>Spells</dt><dd>"Let me double-check." "I'll be heading off now."</dd></div>
<div><dt>Visible results</dt><dd class="num">0 (always)</dd></div>
</dl>
<div class="cls-skills-wrap">
<h3>Skills (passive)</h3>
<ul class="cls-skills">
<li><b>Many Faces</b><span>Shows a different face in each scene</span><i>Law 2</i></li>
<li><b>Conservation</b><span>A negative once shown never fades; it piles up</span><i>Law 3</i></li>
<li><b>Reversal</b><span>As negatives pile up, the opposite face appears as positive</span><i>Law 4</i></li>
<li><b>Return</b><span>Results melt into relationships the moment they appear</span><i>Law 6</i></li>
<li><b>Secrecy</b><span>Writes down no specifics</span><i>Law 9</i></li>
<li><b>Long Life</b><span>Lives long. Living long is hard</span><i>Law 10</i></li>
</ul>
</div>
<p class="cls-status"><b>Status</b>Quagmire: the brain won't stop (Law 8)</p>
<p class="cls-note">A class here is a game metaphor, like a job in a role-playing game. It does not sort people into groups, and it is not something to pin on anyone. It is not an advanced class, and it is no stronger or better than any other class.</p>
</section>`;
/* 遊び場の部品の英語。play.js は、頁の lang を読んで、知らせと状態の文を英語にする。 */
const PLAY_EN = `<div class="play" id="play">
<div class="row"><button type="button" id="scene">Change the scene</button><button type="button" id="live">Live one day</button><button type="button" id="auto">Let the days run</button></div>
<div class="views">
<section class="eye inner" aria-labelledby="eye-in"><h3 id="eye-in">The wizard's view</h3>
<svg id="inner" class="net-svg" viewBox="0 0 300 240" role="img" aria-label="The wizard's view"></svg>
<ul class="legend"><li><span class="k k-me"></span>The wizard (self)</li><li><span class="k k-neg"></span>A line where a negative face is shown</li><li><span class="k k-pos"></span>A line where a positive face is shown</li><li><span class="k k-gold"></span>A line where the opposite of a negative glows, or a relationship that took in a result</li></ul>
<div class="meter" id="meter" role="meter" aria-label="Stored negative" aria-valuemin="0" aria-valuemax="36" aria-valuenow="0"><div class="fill" id="fill"></div></div>
<p>Day <b id="day">0</b> · Store <b id="stock">0</b> · Shown a negative <b id="negs">0</b></p>
<p>Switch <b id="state">not yet</b></p>
</section>
<section class="eye outer" aria-labelledby="eye-out"><h3 id="eye-out">The outside view</h3>
<svg id="outer" class="net-svg" viewBox="0 0 300 240" role="img" aria-label="The outside view"></svg>
<p>The wizard's visible results <b id="deeds">0</b></p>
<p>Total thickness of relationships <b id="total">0</b></p>
<p class="small">Only the 8 people and the lines between neighbours can be seen. Every dot is drawn the same, and one thickened line does not tell whose doing it was.</p>
</section>
</div>
<p class="note" id="note" aria-live="polite"></p>
</div>
<script src="assets/play.js" defer></script>`;
/* 英語の頁の、案内の名・題の上の小さな見出し・題の下の添え名・頁ごとの説明。添え名は、日本語の頁の名（はじめにと原理はラテン語）。 */
const SHORT_EN = { index: 'Home', canon: 'Canon', strict: 'Principia', guide: 'Field Guide', play: 'Playground', faq: 'FAQ',
  about: 'Disclaimers and disclosure', terms: 'Terms of use', privacy: 'Privacy', requests: 'Requests and contact', legality: 'Notes on legality', design: 'Legal handling of the design' };
const EYEBROW_EN = { index: 'A play class from an urban legend', canon: 'Canon · nine definitions, ten laws', strict: 'Principia · definitions, postulates, laws, propositions',
  guide: 'Field guide · how the ten laws quietly show', play: 'Playground · laws at work on relationships', faq: 'Questions and answers',
  about: 'Disclaimers and disclosure', terms: 'Rules', privacy: 'Rules', requests: 'Rules', legality: 'Rules', design: 'Rules', 404: 'Lost' };
const SUB_EN = { index: ['la', 'Magus Occultus'], strict: ['la', 'Principia Magi Occulti'], 404: ['ja', '頁が見つかりません'] };
const DESC_TAIL_EN = 'It is a play, not science.';
const DESC_EN = {
  index: 'Stealth Wizard is a site for fun that treats the wizard of the wizard-at-thirty urban legend as a class in a game.',
  canon: 'An English translation of the single text the play grew from, with the Japanese original beside each line. Nine definitions, ten laws.',
  strict: 'The canon rebuilt in the style of a classical mathematics book, with definitions, postulates, laws, propositions and proofs in five books.',
  guide: 'How the ten laws might quietly show up in daily life. Nothing here comes from observation or surveys.',
  play: 'A playground on 8 people and their relationships: flip faces, store negatives, wait for the switch. Nothing is measured or recorded.',
  faq: 'Is it science? Who is a wizard? What happens on the thirtieth birthday? Answers to common questions.',
  about: 'What this site is not, who wrote what, and the licences.',
  terms: 'The terms of use of this site. It charges no one, and it lists uses it does not expect.',
  privacy: 'This site collects nothing. Notes on the hosting provider, search-side statistics, and how requests in issues are handled.',
  requests: 'How error reports, requests to remove or correct an entry, and notices from rights holders are received.',
  legality: 'Where this site might touch Japanese law and what it does to stay clear, with the Japanese statute texts. Not legal advice.',
  design: 'Where the visual parts come from, their licences, and how they relate to Japanese law. Not legal advice.',
  404: 'There is no page at this address.',
};
/* 404 の頁の英語。所在は根から書く。 */
const NOT_FOUND_EN = '<h1>Page not found</h1>\n<p>There is no page at this address. By Law 6 it may just be invisible, but most likely it really is not here.</p>\n<p>Return to the <a href="/index.en.html">home page</a>.</p>';
/* 英語の決まりの頁に一度だけ置く断り。二つの言葉の頁が食い違えば、日本語の頁に従う。 */
const RULE_PAGES = ['terms', 'privacy', 'requests', 'legality', 'design'];
const GOVERNS_EN = 'This page is an English version of a Japanese page. If the two differ, the Japanese page governs.';
/* 頁の枠の英語。上の帯、上の欄、下の欄の決まった語。 */
const UI = {
  ja: { name: NAME, frame: FRAME, foot: FOOT, tag: '娯楽の枠', frameLabel: 'この頁の枠', skip: '本文へ', crest: 'クラスの紋', navLabel: '頁', rulesLabel: '決まり', repo: 'リポジトリ',
    disclose: '原典は運営者の文で、遊びの部分は Claude（Anthropic の言語モデル）が書きました。Claude は著者ではありません。文は CC BY 4.0、コードは MIT。',
    ruler: ['0', '十', '二十', '三十（目安）'], switchTo: ['en', 'English'], locale: 'ja_JP', tocLabel: 'この頁の目次', toc: '目次', updated: '最終更新：', history: '変更の記録' },
  en: { name: NAME_EN, frame: FRAME_EN, foot: FOOT_EN, tag: 'Entertainment', frameLabel: 'Frame of this page', skip: 'Skip to content', crest: 'Class crest', navLabel: 'Pages', rulesLabel: 'Rules', repo: 'Repository',
    disclose: "The canon is the operator's text. The playful parts were written by Claude (a language model made by Anthropic). Claude is not an author. The English pages were translated from the Japanese by Claude. Text is CC BY 4.0; code is MIT.",
    ruler: ['0', '10', '20', '30 (rule of thumb)'], switchTo: ['ja', '日本語'], locale: 'en_US', tocLabel: 'Contents of this page', toc: 'Contents', updated: 'Last updated: ', history: 'change history' },
};

/* 最終更新の行（「最終更新：YYYY-MM-DD。」だけの段、英語では「Last updated: YYYY-MM-DD.」）に、その頁の元のファイルの変更の記録へのリンクを添える（2026-11-23）。 */
function updated(html, src, lang) {
  if (lang === 'en') return html.replace(/<p>Last updated: (\d{4}-\d{2}-\d{2})\.<\/p>/g, (m, d) => '<p class="updated">Last updated: <time datetime="' + d + '">' + d + '</time>'
    + (src ? ' (<a href="' + REPO + '/commits/main/src/' + src + '.md" rel="noopener">change history</a>)' : '') + '.</p>');
  return html.replace(/<p>最終更新：(\d{4}-\d{2}-\d{2})。<\/p>/g, (m, d) => '<p class="updated">最終更新：<time datetime="' + d + '">' + d + '</time>'
    + (src ? '（<a href="' + REPO + '/commits/main/src/' + src + '.md" rel="noopener">変更の記録</a>）' : '') + '。</p>');
}
/* src の Markdown を、頁の中身にする。差し込みの部品もここで置く。src は元のファイルの名（変更の記録へのリンクに使う）。lang は 'ja' か 'en'。
 * 英語の頁で、まだ英語の無い頁へのつなぎ（<名>.en.html）は、日本語の頁へ向け、hreflang="ja" を付ける。 */
function render(md, src, lang) {
  const en = lang === 'en';
  let html = markdown(md, lang).replace('<!-- play -->', en ? PLAY_EN : PLAY).replace('<!-- hero -->', en ? HERO_EN : HERO).replace('<!-- class -->', en ? CLASS_EN : CLASS).replace('<!-- emblems -->', en ? EMBLEMS_EN : EMBLEMS);
  html = updated(statutes(html, lang), src, lang);
  if (html.includes('<!-- index -->')) { html = crossref(headIds(html), principiaItems(md, lang), lang); html = html.replace('<!-- index -->', principiaIndex(md, html, lang)); }
  if (html.includes('<!-- toc -->')) { html = headIds(html); html = html.replace('<!-- toc -->', pageToc(html, lang)); }
  if (en) html = html.replace(/<a href="([a-z0-9]+)\.en\.html(#[^"]*)?"/g, (m, out, hash) => (hasEn(out) ? m : '<a href="' + out + '.html' + (hash || '') + '" hreflang="ja"'));
  return html;
}

/* 頁を組む。404 の頁は、どのディレクトリの存在しない所在でも出るので、頁の中のつなぎと素材を根からの所在（/assets/…）で書き、
 * canonical を出さず、検索に載せない（2026-11-23）。ほかの頁は、頁のある所からの所在で書く。
 * lang が 'en' なら英語の頁を組む。英語の頁がある頁は、上の欄に、もう一つの言葉の同じ頁へのつなぎを置き、頭に hreflang の対を置く（2026-11-23）。 */
function page(file, title, body, lang) {
  lang = lang === 'en' ? 'en' : 'ja';
  const en = lang === 'en', U = UI[lang], other = en ? 'ja' : 'en';
  const up = file === '404' ? '/' : '';
  /* つなぎの先。英語の頁からは、英語のある頁は英語へ、まだ無い頁は日本語へ向ける。 */
  const target = (out) => (en && !hasEn(out) ? 'ja' : lang);
  const href = (out) => { const l = target(out); return up + (out === 'index' && up && l === 'ja' ? '' : fileOf(out, l) + '.html'); };
  const hl = (out) => (target(out) !== lang ? ' hreflang="ja"' : '');
  const label = (out, short) => (en ? esc(SHORT_EN[out]) : '<span class="ja">' + esc(short) + '</span> <span class="en" lang="en">' + esc(NAV_EN[out]) + '</span>');
  const nav = PAGES.filter((x) => x[3]).map(([, out, short]) => (out === file ? '<span aria-current="page">' + label(out, short) + '</span>' : '<a href="' + href(out) + '"' + hl(out) + '>' + label(out, short) + '</a>')).join('\n');
  const sub = en ? (SUB_EN[file] || ['ja', (PAGES.find(([, o]) => o === file) || [])[2] || '']) : ['en', EN[file] || ''];
  body = body.replace('</h1>', '</h1>\n<p class="en-title" lang="' + sub[0] + '" aria-hidden="true">' + esc(sub[1]) + '</p>' + (en && RULE_PAGES.includes(file) ? '\n<p class="langnote">' + esc(GOVERNS_EN) + '</p>' : ''));
  const url = urlOf(file, lang);
  const full = en ? (title === NAME_EN ? NAME_EN + ' (a play)' : title + ' | ' + NAME_EN) : (title === NAME ? NAME + '（遊び）' : title + ' | ' + NAME);
  const desc = en ? DESC_EN[file] + ' ' + DESC_TAIL_EN : DESC[file] + DESC_TAIL;
  const pair = hasEn(file);
  /* もう一つの言葉の同じ頁へのつなぎ。見える所に置く。 */
  const sw = pair ? '<a class="lang" href="' + (up ? '/' + fileOf(file, other) + '.html' : fileOf(file, other) + '.html') + '" hreflang="' + other + '" lang="' + other + '">' + esc(U.switchTo[1]) + '</a>' : '';
  /* 二つの言葉の頁の対（hreflang）。x-default は日本語の頁。404 は所在を持たないので出さない。 */
  const alt = pair && file !== '404' ? [['ja', urlOf(file, 'ja')], ['en', urlOf(file, 'en')], ['x-default', urlOf(file, 'ja')]].map(([h, u]) => '<link rel="alternate" hreflang="' + h + '" href="' + u + '">').join('\n') + '\n' : '';
  /* 共有のカード（Open Graph と X のカード）。404 は所在を持たないので、canonical もカードも出さない。 */
  const share = ['<meta property="og:type" content="website">', '<meta property="og:site_name" content="' + esc(U.name) + '">', '<meta property="og:locale" content="' + U.locale + '">',
    ...(pair ? ['<meta property="og:locale:alternate" content="' + UI[other].locale + '">'] : []),
    '<meta property="og:title" content="' + esc(full) + '">', '<meta property="og:description" content="' + esc(desc) + '">', '<meta property="og:url" content="' + url + '">',
    '<meta property="og:image" content="' + BASE + 'assets/' + CARD.file + '">', '<meta property="og:image:type" content="image/png">',
    '<meta property="og:image:width" content="' + CARD.size[0] + '">', '<meta property="og:image:height" content="' + CARD.size[1] + '">',
    '<meta property="og:image:alt" content="' + esc(en ? CARD_ALT_EN : CARD.alt) + '">', '<meta name="twitter:card" content="summary_large_image">'].join('\n');
  const where = file === '404' ? '<meta name="robots" content="noindex">' : '<link rel="canonical" href="' + url + '">\n' + alt + share;
  const rules = PAGES.filter((x) => !x[3]).map(([, out, short]) => (out === file ? '<span aria-current="page">' + esc(en ? SHORT_EN[out] : short) + '</span>' : '<a href="' + href(out) + '"' + hl(out) + '>' + esc(en ? SHORT_EN[out] : short) + '</a>')).join('\n');
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${META_CSP}">
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="${THEME}">
<meta name="google-site-verification" content="${GSC}">
${where}
<link rel="stylesheet" href="${up}assets/style.css">
<link rel="icon" href="${up}assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${up}assets/apple-touch-icon.png">
</head>
<body class="p-${esc(file)}">
<a class="skip" href="#main">${esc(U.skip)}</a>
<aside class="frame" aria-label="${esc(U.frameLabel)}"><p><span class="tag">${esc(U.tag)}</span><span class="say">${esc(U.frame)}</span></p></aside>
<header><div class="mast"><a class="site" href="${href('index')}"><img class="crest" src="${up}assets/emblem-crest.svg" alt="${esc(U.crest)}" width="34" height="40"><span class="titles"><span class="name">${esc(U.name)}</span><span class="sub" lang="la" aria-hidden="true">Magus Occultus</span></span></a>${sw}</div>
<nav aria-label="${esc(U.navLabel)}">
${nav}
</nav></header>
<main id="main">
<p class="eyebrow">${esc((en ? EYEBROW_EN : EYEBROW)[file] || '')}</p>
${body}
</main>
<footer>
<p class="wordmark" lang="en" aria-hidden="true">${MARK}Stealth Wizard</p>
<div class="ruler" aria-hidden="true">${U.ruler.map((r) => '<span>' + esc(r) + '</span>').join('')}</div>
<p>${esc(U.foot)}</p>
<p>${esc(U.disclose)}${en ? ' ' : ''}<a href="${REPO}" rel="noopener">${esc(U.repo)}</a></p>
<nav aria-label="${esc(U.rulesLabel)}">${rules}</nav>
</footer>
</body>
</html>
`;
}
/* 404 の頁の中身。所在は根から書く。 */
const NOT_FOUND = '<h1>頁が見つかりません</h1>\n<p>この所在に頁はありません。第六法則のとおり、見えないだけかもしれませんが、たぶん本当にありません。</p>\n<p><a href="/">はじめに</a>へ戻れます。</p>';
/* 配信の決まり（vercel.json）、robots.txt、sitemap.xml。検査が、置いたファイルとこれらが同じことを確かめる。 */
const VERCEL = JSON.stringify({ cleanUrls: false, headers: [{ source: '/(.*)', headers: [
  { key: 'Content-Security-Policy', value: CSP }, { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' }] }] }, null, 2) + '\n';
const ROBOTS = 'User-agent: *\nAllow: /\nSitemap: ' + BASE + 'sitemap.xml\n';
/* sitemap は、どの頁も二つの言葉の対を xhtml:link で挙げる（2026-11-23）。英語の頁の無い頁は、日本語の頁だけ。 */
const SITEMAP = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
  + PAGES.flatMap(([, out]) => (hasEn(out) ? LANGS : ['ja']).map((l) => '<url><loc>' + urlOf(out, l) + '</loc>'
    + (hasEn(out) ? [['ja', 'ja'], ['en', 'en'], ['x-default', 'ja']].map(([h, k]) => '<xhtml:link rel="alternate" hreflang="' + h + '" href="' + urlOf(out, k) + '"/>').join('') : '') + '</url>')).join('\n') + '\n</urlset>\n';

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
  let n = 0;
  for (const [src, out] of PAGES) for (const lang of hasEn(out) ? LANGS : ['ja']) {
    const s = fileOf(src, lang);
    const md = fs.readFileSync(path.join(ROOT, 'src', s + '.md'), 'utf8');
    const title = /^# (.+)$/m.exec(md)[1];
    fs.writeFileSync(path.join(OUT, fileOf(out, lang) + '.html'), page(out, title, render(md, s, lang), lang));
    n++;
  }
  fs.writeFileSync(path.join(OUT, '404.en.html'), page('404', 'Page not found', NOT_FOUND_EN, 'en'));
  fs.writeFileSync(path.join(OUT, '404.html'), page('404', '頁が見つかりません', NOT_FOUND));
  for (const f of fs.readdirSync(path.join(ROOT, 'assets'))) fs.copyFileSync(path.join(ROOT, 'assets', f), path.join(OUT, 'assets', f));
  fs.writeFileSync(path.join(OUT, 'robots.txt'), ROBOTS);
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), SITEMAP);
  fs.writeFileSync(path.join(OUT, 'vercel.json'), VERCEL);
  const pr = principia();
  fs.writeFileSync(path.join(ROOT, 'PRINCIPIA.md'), pr.md);
  fs.mkdirSync(path.join(ROOT, 'docs', 'figs'), { recursive: true });
  for (const f of pr.figs) fs.writeFileSync(path.join(ROOT, 'docs', 'figs', f + '.svg'), githubFig(f));
  return n + 2;
}

if (require.main === module) console.log('生成しました: site/（頁 ' + build() + '）');
module.exports = { statuteEn, SUMMARY_K, RULE_PAGES, GOVERNS_EN, LAW_EN, ITEM_HEAD_EN, CITE_EN, BOOK_TOP, EN_PAGES, LANGS, hasEn, fileOf, urlOf, NAME_EN, FRAME_EN, FOOT_EN, HERO_EN, EMBLEMS_EN, CLASS_EN, PLAY_EN, SHORT_EN, EYEBROW_EN, DESC_EN, DESC_TAIL_EN, NOT_FOUND_EN, UI, FIG_EN, figText, CARD_ALT_EN, DESC, DESC_TAIL, CARD, THEME, NOT_FOUND, VERCEL, ROBOTS, SITEMAP, headIds, tocList, CITE, GSC, EMBLEMS, MARK, FIG_STYLE, principiaItems, crossref, kanNum, principia, githubFig, EN, FRAME, CLASS, render, HERO, statutes, STATUTES, markdown, inline, page, build, PAGES, FOOT, CSP, META_CSP, BASE, NAME, PLAY };
