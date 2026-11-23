#!/usr/bin/env node
/* ステルス・ウィザードの検査。約束が消えていないか、原典が一字も変わっていないか、外へ何も要求しないかを確かめ、壊して落ちることも確かめる。
 *
 *   node verification/check.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const B = require('../build.js');

let pass = 0;
const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  通  ' + label); } else { fails.push(label); console.log('  落  ' + label + (detail ? ' —— ' + detail : '')); }
}
const R = (f) => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { return ''; } };

/* 原典。PDF から写した文で、変えない。 */
const DEFS = [
  ['定義一', '魔法使い', '自らの負と正の両方を用いて能動し、成果を出す者をいう。'],
  ['定義二', '童貞', '性経験のない者をいう。'],
  ['定義三', '能動', '全ての能動をいう。発信、記録、働きかけに限らない。'],
  ['定義四', '成果', '能動によって生じるものをいう。その形は時と場合によって定まる。'],
  ['定義五', '要素', 'ある者を構成するものをいう。要素は正多面体である。'],
  ['定義六', '負と正', '要素が時と場合によって向ける面をいう。要素そのものに負と正の別はない。'],
  ['定義七', '蓄積', '負が消えずに溜まっていくことをいう。'],
  ['定義八', '切り替わり', '蓄積した負が、逆の面を正として顕し始めることをいう。'],
  ['定義九', '三十歳', '切り替わりの目安をいう。'],
];
const LAWS = [
  ['第一法則', '成立', '三十歳まで童貞であれば、魔法使いになる。'],
  ['第二法則', '多面', '要素は固定されない。時と場合によって、向く面を変える。'],
  ['第三法則', '保存', '負は消えない。蓄積する。'],
  ['第四法則', '反転', '負の蓄積が進めば、逆の面が正として顕れる。'],
  ['第五法則', '目安', '三十歳は目安にすぎない。切り替わりは年齢に先立つことがある。'],
  ['第六法則', '還元', '成果は、出た瞬間に社会的関係へ何事もなく還元される。ゆえに外からは見えない。'],
  ['第七法則', '共通', '成った者は、皆これを行っている。'],
  ['第八法則', '泥沼', '成れば泥沼である。脳は止まらない。'],
  ['第九法則', '秘匿', '具体を記せば、記した者に害が返る。ゆえに具体は記さない。'],
  ['第十法則', '長命', '成ることは、長く生きることである。長く生きるのは大変である。'],
];
const PREFACE = '本稿は論文とは別のものであり、著者の主体的な直観によるものである。';
const PLAYFUL = '> これは遊びです。';
/* 遊びと断る冒頭を持たない頁（原典と、決まりの頁）。 */
const PLAIN = ['canon', 'about', 'terms', 'privacy', 'requests', 'legality', 'design'];
/* 条文の写しの SHA-256。写しを手で書き換えれば落ちる。
 * 2026-11-22 に改めた。デザインに関する法的な扱いが引く十の条を、運営者の別のリポジトリのコミット 85dd680 の写しから足したため。
 * もとからあった十の条は、その写しでも一字一句同じ。 */
const STATUTES_SHA = '08669436f247be3f831dab1a491dc7f0bbefe0735d74b1e08833e728fd131670';
const LEGAL = {
  'src/terms.md': ['この決まりは日本法に準拠します。', '話し合いで解決しない紛争は、法令の定める裁判所が管轄します。', 'この決まりは、法令が認める以上に運営者の責任を軽くしません。', 'このサイトは、誰からも料金を取りません。', '読む人に不利になる変更は、変える中身と効力の生じる日を、その日より前にこの頁で示します。', '同じ名や似た名の商標が登録されているかは、特許庁のデータベースで調べていません。', 'このサイトの文や図を、人の性経験を詮索したり、からかったり、責めたりする材料にすること。'],
  'src/privacy.md': ['サイトは、何も集めません。', '性経験・年齢・名前など、読む人についての何も尋ねません。', 'GitHub のアカウントを持たない人や、連絡先を公開しない人が、非公開で知らせる道は、いまはありません。'],
  'src/requests.md': ['運営者のほかの人が開いた issue の題と本文は、書いた人がその issue の中で同意したときだけ、言語モデルに渡します。', 'コメントは、言語モデルに渡しません。', '判断の前に、その記載をいまの版から外します。'],
  'src/legality.md': ['運営者の側の理解を書いたもので、読む人への法的な助言ではありません。', '弁護士の確認は受けていません。', '法令の文を記憶から書いてはいません。'],
  'src/design.md': ['運営者の側の理解を書いたもので、読む人への法的な助言ではありません。', '弁護士の確認は受けていません。', '法令の文を記憶から書いてはいません。', 'この頁は、当たるとも当たらないとも決めません。', '許諾は、どれも変えていません。', '同じ名や似た名、似た形の商標や意匠が登録されているかは、特許庁のデータベースで調べていません。', '部品を変えるときは、この頁と検査を、同じ変更（同じ PR）で直します。'],
  'src/about.md': ['このサイトは、運営者を含め、誰の性経験についても何も述べません。'],
  'src/strict.md': ['この版は、運営者の求めで Claude が書いたものです。原典ではありません。', '「厳密」なのは言葉の運びのことで、中身が科学として正しいという意味ではありません。', '**定理四　この法則は、外より成果を観て反証するを得ず。**', '**定理九　十の法則は、互いに独立なり。いづれの一つも、他の九つと定義六とより導かれず。**', '注。この版は、第一巻の第十法則の注から、L を外より見えざるものと読む。', '**定理五　魔法使ひは、他の人に優るにあらず。**', '**要請二　値**　人の値は、魔法使ひたると否と、童貞たると否とに由らず。'],
};
/* 利用者が正文とした論文。DataCite で確かめた版の DOI。 */
const PAPER_LINK = '<a href="https://doi.org/10.5281/zenodo.23114131" rel="noopener">10.5281/zenodo.23114131</a>';
/* 利用者が求めた断り（2026-11-21）。 */
const CAUTION = ['これは内輪ノリであり、気分を害する方がいる可能性があります。ご注意ください。', '選民思想ではありません。', '運営者は、魔法使いの代表ではありません。'];
/* 運営者の学術的な活動とは別の枠だという断り（2026-11-21 に利用者が求めた）。どの頁の上の帯と下の欄、はじめに・断りと開示・問い・README のどれにも置く。 */
const FRAME = 'これは運営者の学術的な活動とは別の、エンターテインメントの枠です。科学ではありません。';
/* クラスは職業のたとえで、人を分ける区分ではない（2026-11-21、名をクラスへ替えたときに決めた）。 */
const CLASS_NOTE = 'ここで言うクラスは、ゲームの職業のたとえです。人を分ける区分ではなく、誰かを当てはめるものでもありません。';
/* 配る書体の指紋（Inter Tight を英字に絞り、許諾の欄を残した woff2）。差し替えたら、ここも同じ日に変える。 */
const FONT_SHA = '775d0af912f596ab5ace2d458c00a5e8691b3d97270e0df70c7e8397c772c81e';
/* 原理の定義・要請・法則の本文（文語）の指紋。中身を変えたら、原典より弱めていないか、補ったものを注解に書いたかを確かめ直し、ここも同じ日に変える。 */
const STRICT_SHA = 'd774cd31b81d73301b2ed5970e21d7b7dd635b399df930db04992ee69ca0ee54';
/* 運営者の直観（2026-11-21）。第五巻の定義二十の原文として、一字一句そのまま置く。 */
const INTUITION = '魔法が実在できないのは魔法が存在しないからではなく存在してはならないからでありここにおける魔法とは異端の学説を反証させない立場に置いたもの';
const NOT_SCIENCE = { 'src/index.md': '科学の法則ではありません。', 'src/canon.md': '科学の法則ではありません。', 'src/guide.md': '科学の主張でもありません。', 'src/play.md': '何も測らず、何も占わず、何も記録しません。', 'src/faq.md': '原典の法則は、直観から書かれた文で、実験や調査で確かめたものではありません。', 'src/about.md': '科学の法則ではありません。' };
const DISCLOSE = ['遊びの部分は Claude（Anthropic の言語モデル）が書きました。Claude は著者ではありません。', '文は CC BY 4.0、コードは MIT。'];
/* 研究の系列と、ほかの遊びの国へはつながない。 */
const AWAY = ['cpsbvbng26-dotcom.github.io', 'sophaxis', 'nusquama', 'zenodo.org', 'orcid.org', 'doi.org', 'researchmap', 'osf.io', 'ssrn', 'psyarxiv'];

/* 配る書体（woff2）の名前表と、収める字。依存を足さずに読む（WOFF2 の表の並びを解き、Brotli を解いて、name と cmap の形式 4 を読む）。
 * 2026-11-22 に、デザインに関する法的な扱いが書く事実（著作権と許諾の欄、名、版、商標の記載、字の数と範囲）を確かめるために足した。fontTools の読みと突き合わせてある。 */
function woff2(buf) {
  if (buf.toString('latin1', 0, 4) !== 'wOF2') throw new Error('woff2 でない');
  const n = buf.readUInt16BE(12), csize = buf.readUInt32BE(20);
  const TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post'];
  let p = 48;
  const b128 = () => { let v = 0; for (let i = 0; i < 5; i++) { const b = buf[p++]; v = v * 128 + (b & 0x7f); if (!(b & 0x80)) return v; } throw new Error('UIntBase128'); };
  const dir = [];
  for (let i = 0; i < n; i++) {
    const f = buf[p++], idx = f & 0x3f;
    let tag = TAGS[idx] || '#' + idx;
    if (idx === 0x3f) { tag = buf.toString('latin1', p, p + 4); p += 4; }
    const orig = b128(), ver = f >> 6, transformed = (idx === 10 || idx === 11) ? ver === 0 : ver !== 0;
    dir.push({ tag, len: transformed ? b128() : orig });
  }
  const data = require('zlib').brotliDecompressSync(buf.subarray(p, p + csize));
  const t = {};
  let o = 0;
  for (const d of dir) { t[d.tag] = data.subarray(o, o + d.len); o += d.len; }
  if (o !== data.length) throw new Error('表の長さが合わない');
  const nm = t.name, names = {};
  for (let i = 0, so = nm.readUInt16BE(4); i < nm.readUInt16BE(2); i++) {
    const r = 6 + i * 12;
    if (nm.readUInt16BE(r) !== 3) continue;
    const s = nm.subarray(so + nm.readUInt16BE(r + 10), so + nm.readUInt16BE(r + 10) + nm.readUInt16BE(r + 8));
    let str = '';
    for (let k = 0; k < s.length; k += 2) str += String.fromCharCode(s.readUInt16BE(k));
    names[nm.readUInt16BE(r + 6)] = str;
  }
  const cm = t.cmap, codes = [];
  for (let i = 0; i < cm.readUInt16BE(2); i++) {
    const r = 4 + i * 8, s = cm.readUInt32BE(r + 4);
    if (cm.readUInt16BE(r) !== 3 || cm.readUInt16BE(r + 2) !== 1 || cm.readUInt16BE(s) !== 4) continue;
    const seg = cm.readUInt16BE(s + 6) / 2, E = s + 14, S = E + seg * 2 + 2, D = S + seg * 2, RO = D + seg * 2;
    for (let k = 0; k < seg; k++) {
      const end = cm.readUInt16BE(E + k * 2), start = cm.readUInt16BE(S + k * 2), delta = cm.readInt16BE(D + k * 2), ro = cm.readUInt16BE(RO + k * 2);
      for (let c = start; c <= end && c !== 0xffff; c++) {
        let g = ro ? cm.readUInt16BE(RO + k * 2 + ro + (c - start) * 2) : c;
        if (g) g = (g + delta) & 0xffff;
        if (g) codes.push(c);
      }
    }
  }
  return { names, codes };
}

function files() {
  const x = {};
  for (const f of ['README.md', 'README.en.md', 'CLAUDE.md', 'PRINCIPIA.md', 'build.js', 'assets/play.js', 'assets/style.css', 'assets/OFL-InterTight.txt', 'verification/statutes-texts.json', ...B.PAGES.map(([s]) => 'src/' + s + '.md'), ...B.EN_PAGES.map((s) => 'src/' + s + '.en.md')]) x[f] = R(f);
  for (const f of fs.existsSync(path.join(ROOT, 'site')) ? fs.readdirSync(path.join(ROOT, 'site')) : []) if (/\.html$/.test(f)) x['site/' + f] = R('site/' + f);
  /* 配る素材（書体・図・スクリプト・意匠）は、assets と site/assets で同じであること。書体は中身の指紋で固める。 */
  const sha = (p) => { try { return require('crypto').createHash('sha256').update(fs.readFileSync(path.join(ROOT, p))).digest('hex'); } catch (e) { return ''; } };
  x['#assets'] = fs.readdirSync(path.join(ROOT, 'assets')).sort().map((f) => f + ' ' + sha('assets/' + f)).join('\n');
  x['#site-assets'] = fs.existsSync(path.join(ROOT, 'site', 'assets')) ? fs.readdirSync(path.join(ROOT, 'site', 'assets')).sort().map((f) => f + ' ' + sha('site/assets/' + f)).join('\n') : '';
  /* デザインに関する法的な扱い（2026-11-22）が挙げる部品。SVG の元、見た目の部品のファイルの一覧、書体の名前表と字、リポジトリにあるラスターの画像。 */
  for (const f of ['src/hero.svg.part', 'src/design.md', 'src/terms.md', ...fs.readdirSync(path.join(ROOT, 'assets')).filter((f) => /\.svg$/.test(f)).map((f) => 'assets/' + f), ...fs.readdirSync(path.join(ROOT, 'src', 'figs')).map((f) => 'src/figs/' + f)]) x[f] = R(f);
  const ls = (d) => (fs.existsSync(path.join(ROOT, d)) ? fs.readdirSync(path.join(ROOT, d)).sort().map((f) => d + '/' + f) : []);
  x['#parts'] = [...ls('assets'), 'src/hero.svg.part', ...ls('src/figs'), ...ls('docs/figs'), ...ls('tools'), 'build.js'].sort().join('\n');
  try { x['#font'] = JSON.stringify(woff2(fs.readFileSync(path.join(ROOT, 'assets', 'intertight.woff2')))); } catch (e) { x['#font'] = '{}'; }
  const raster = [];
  const walk = (d) => { for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { if (e.name === '.git' || e.name === 'node_modules') continue; const q = d ? d + '/' + e.name : e.name; if (e.isDirectory()) walk(q); else if (/\.(png|jpe?g|gif|webp|ico|bmp|avif|tiff?|heic)$/i.test(e.name)) raster.push(q); } };
  walk('');
  x['#raster'] = raster.join('\n');
  x['#pages'] = JSON.stringify(B.PAGES);
  /* 配信の決まりと、検索の仕組みに渡すファイル（2026-11-23 から、元から作ったものと同じことを確かめる）。 */
  for (const f of ['site/vercel.json', 'site/robots.txt', 'site/sitemap.xml']) x[f] = R(f);
  /* 共有のカードとアイコン（2026-11-23）。PNG は base64 で持ち、描くスクリプトの文も読む。 */
  x['tools/card.js'] = R('tools/card.js');
  for (const f of ['assets/card.png', 'assets/apple-touch-icon.png']) { try { x['#png:' + f] = fs.readFileSync(path.join(ROOT, f)).toString('base64'); } catch (e) { x['#png:' + f] = ''; } }
  return x;
}

/* 第二巻からの模型と数。模型は頁の文に依らないので、一度だけ計算する。 */
const MD = require('./models.js'), mr = MD.run(), mbad = MD.verdict(mr);

/* 遊び場のスクリプトを、ブラウザの代わりの小さな作り物の上で動かす（2026-11-23）。押したときと、自動で過ごすときの一日を、
 * 決めた乱数で進め、描いた線と点、知らせの文と読み上げの設定を集める。頁の文の数（人の数・閾の幅）と、魔法使い自身の線が
 * 自分の成果で太らないことを、スクリプトの文を読むのではなく、動かした結果で確かめるため。 */
function simulatePlay(js, play, { first = 0.5, days = 120, seed = 7, lang = 'ja' } = {}) {
  const vm = require('vm');
  const mk = (tag) => ({ tag, attrs: {}, style: {}, kids: [], handlers: {}, textContent: '', className: '',
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k]; },
    appendChild(c) { this.kids.push(c); return c; }, removeChild(c) { this.kids.splice(this.kids.indexOf(c), 1); return c; },
    get firstChild() { return this.kids[0] || null; }, addEventListener(t, f) { this.handlers[t] = f; } });
  const els = {};
  for (const m of play.matchAll(/<([a-z0-9]+)\b([^>]*)\sid="([a-z]+)"([^>]*)>/g)) {
    els[m[3]] = mk(m[1]);
    for (const a of (m[2] + m[4]).matchAll(/([a-z-]+)="([^"]*)"/g)) els[m[3]].attrs[a[1]] = a[2];
  }
  let tick = null, calls = 0, st = seed;
  const rand = () => { if (calls++ === 0) return first; st = (st * 1103515245 + 12345) % 2147483648; return st / 2147483648; };
  /* 頁の言葉は html の lang から読む（2026-11-23）。 */
  const ctx = { document: { documentElement: { getAttribute: (k) => (k === 'lang' ? lang : null) }, getElementById: (id) => els[id] || null, createElementNS: (ns, name) => mk(name) },
    window: { matchMedia: () => ({ matches: false }) }, setInterval: (f) => { tick = f; return 1; }, clearInterval: () => { tick = null; }, __rand: rand };
  vm.createContext(ctx);
  vm.runInContext('Math.random = __rand;\n' + js, ctx, { timeout: 2000 });
  const click = (id) => els[id].handlers.click.call(els[id]);
  const out = { notes: [], deeds: new Set(), maxNow: 0, live: [], colors: { inner: new Set(), outer: new Set() }, wizardWidths: new Set(), widths: new Set(), people: 0 };
  const look = () => {
    out.deeds.add(els.deeds.textContent); out.notes.push(els.note.textContent);
    out.maxNow = Math.max(out.maxNow, Number(els.meter.attrs['aria-valuenow']));
    const o = els.outer.kids, me = o.find((k) => k.tag === 'circle');
    out.people = o.filter((k) => k.tag === 'circle').length;
    for (const k of o.filter((z) => z.tag === 'line')) {
      out.widths.add(k.style.strokeWidth);
      if (me && ((k.attrs.x1 === me.attrs.cx && k.attrs.y1 === me.attrs.cy) || (k.attrs.x2 === me.attrs.cx && k.attrs.y2 === me.attrs.cy))) out.wizardWidths.add(k.style.strokeWidth);
    }
    for (const [w, svg] of [['inner', els.inner], ['outer', els.outer]]) for (const k of svg.kids) {
      if (k.style.stroke && k.style.stroke !== 'none' && k.style.strokeWidth !== '0') out.colors[w].add(k.style.stroke);
      if (k.style.fill) out.colors[w].add('fill:' + k.style.fill);
    }
  };
  look();
  for (let d = 0; d < days; d++) { if (d % 9 === 4) click('scene'); click('live'); look(); }
  /* 自動で過ごす：始めの知らせは読み上げ、日ごとの知らせは読み上げず、止めると戻す。 */
  click('auto'); out.live.push(els.note.attrs['aria-live'] + ':' + (tick ? 'on' : 'none')); look();
  for (let d = 0; d < 5 && tick; d++) { tick(); out.live.push(els.note.attrs['aria-live']); look(); }
  click('auto'); out.live.push(els.note.attrs['aria-live'] + ':' + (tick ? 'on' : 'none')); look();
  out.valuemax = Number(els.meter.attrs['aria-valuemax']);
  out.threshold = Number((out.notes.map((t) => /閾の (\d+) に届き|reached the threshold of (\d+),/.exec(t)).find(Boolean) || [, NaN]).slice(1).find(Boolean));
  out.state = els.state.textContent; out.autoLabel = els.auto.textContent;
  return out;
}
/* 遊び場の部品（build.js の PLAY）は、build.js の文から読む（壊し方が build.js を変えて確かめられるように）。 */
const playOf = (x, lang) => (new RegExp('const PLAY' + (lang === 'en' ? '_EN' : '') + ' = `([\\s\\S]*?)`;').exec(x['build.js'] || '') || [, ''])[1];
const KANJI_N = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

/* 英語の頁（2026-11-23）。頁のファイルの名から、言葉と頁の名を読む。 */
const langOf = (f) => (/\.en\.html$|\.en\.md$/.test(f) ? 'en' : 'ja');
const pageOf = (f) => f.replace(/^(site|src)\//, '').replace(/(\.en)?\.(html|md)$/, '');
/* 英語の頁の上の帯と下の欄（日本語の FRAME と FOOT と同じことを言う）。どの英語の頁にも置く。 */
const FRAME_EN = "This is an entertainment space, separate from the operator's academic work. It is not science.";
const DISCLOSE_EN = ['The playful parts were written by Claude (a language model made by Anthropic). Claude is not an author.', 'The English pages were translated from the Japanese by Claude.', 'Text is CC BY 4.0; code is MIT.'];
const CAUTION_EN = ['This is an in-joke, and some people may find it offensive. Please keep that in mind.', 'It is not elitism', 'does not speak for wizards.'];
/* 頁ごとに、言葉で変わる決まった語。 */
const LW = {
  ja: { FOOT: B.FOOT, FRAME, skip: '本文へ', footFrame: '運営者の学術的な活動とは別の、エンターテインメントの枠です。科学ではありません。',
    footWords: ['これは遊びです。', '科学の法則ではなく', '誰の性経験も評価せず', '特定の人を指しません。'],
    footCaution: ['内輪ノリであり、気分を害する方がいる可能性があります。ご注意ください。', '選民思想ではなく、運営者は魔法使いの代表ではありません。'],
    disclose: DISCLOSE, ruleHref: (up, l) => 'href="' + up + l + '.html"',
    header: (up) => '<header><div class="mast"><a class="site" href="' + (up || 'index.html') + '"><img class="crest" src="' + up + 'assets/emblem-crest.svg" alt="クラスの紋" width="34" height="40"><span class="titles"><span class="name">' + B.NAME + '</span><span class="sub" lang="la" aria-hidden="true">Magus Occultus</span></span></a>' },
  en: { FOOT: B.FOOT_EN, FRAME: FRAME_EN, skip: 'Skip to content', footFrame: "an entertainment space, separate from the operator's academic work. It is not science.",
    footWords: ['This is a play.', 'not scientific laws', "judge no one's sexual experience", 'point at no particular person.'],
    footCaution: ['This is an in-joke, and some people may find it offensive. Please keep that in mind.', 'It is not elitism, and the operator does not speak for wizards.'],
    disclose: DISCLOSE_EN, ruleHref: (up, l) => 'href="' + up + l + (B.hasEn(l) ? '.en' : '') + '.html"',
    header: (up) => '<header><div class="mast"><a class="site" href="' + up + 'index.en.html"><img class="crest" src="' + up + 'assets/emblem-crest.svg" alt="Class crest" width="34" height="40"><span class="titles"><span class="name">' + B.NAME_EN + '</span><span class="sub" lang="la" aria-hidden="true">Magus Occultus</span></span></a>' },
};

function verdict(x) {
  const bad = [];
  const canon = x['src/canon.md'];
  for (const [n, w, d] of DEFS.concat(LAWS)) if (!canon.includes('| ' + n + ' | ' + w + ' | ' + d + ' |')) bad.push('原典の ' + n + ' が一字一句そのままでない');
  if ((canon.match(/^\| 定義/mg) || []).length !== 9 || (canon.match(/^\| 第.+法則 \|/mg) || []).length !== 10) bad.push('原典の定義が九つ、法則が十でない');
  if (!canon.includes('> ' + PREFACE) || !canon.includes('文には手を入れていません。')) bad.push('原典の前書きか、手を入れていないという断り');
  for (const [s] of B.PAGES) if (!PLAIN.includes(s) && !x['src/' + s + '.md'].includes(PLAYFUL)) bad.push('src/' + s + '.md：冒頭の「これは遊びです」');
  for (const [f, says] of Object.entries(LEGAL)) for (const w of says) if (!x[f].includes(w)) bad.push(f + '：' + w.slice(0, 24));
  for (const f of ['src/index.md', 'src/about.md']) for (const w of CAUTION) if (!x[f].includes(w)) bad.push(f + '：' + w.slice(0, 20));
  if (B.FRAME !== FRAME) bad.push('上の帯の文が、決めた文と違う');
  /* GitHub で読む原理の全文は、src/strict.md から作ったものと同じで、断りと開示を持つ。 */
  const pr = B.principia();
  if (x['PRINCIPIA.md'] !== pr.md) bad.push('PRINCIPIA.md が src から作ったものと違う（node build.js）');
  for (const w of [FRAME, B.FOOT, 'Claude は著者ではありません。', '文は CC BY 4.0、コードは MIT です。', 'この版は、運営者の求めで Claude が書いたものです。原典ではありません。']) if (!x['PRINCIPIA.md'].includes(w)) bad.push('PRINCIPIA.md：' + w.slice(0, 16));
  for (const f of pr.figs) if (R('docs/figs/' + f + '.svg') !== B.githubFig(f)) bad.push('docs/figs/' + f + '.svg が src から作ったものと違う');
  /* 配る書体は OFL の英字書体だけで、許諾の文を添え、断りと開示に書く。書体は自分のところからだけ読む。 */
  const fonts = x['#assets'].split('\n').filter((l) => /\.(woff2?|ttf|otf) /.test(l));
  if (fonts.join(' ') !== 'intertight.woff2 ' + FONT_SHA) bad.push('配る書体が決めたものと違う：' + fonts.join(' / '));
  if (x['#assets'] !== x['#site-assets']) bad.push('site/assets が assets と違う（node build.js）');
  /* style.css が読むのは、自分のところの書体と図だけ。 */
  for (const m of x['assets/style.css'].matchAll(/url\(([^)]*)\)/g)) if (!/^(intertight\.woff2|mark\.svg)$/.test(m[1])) bad.push('style.css が読むもの：' + m[1]);
  if (!x['assets/OFL-InterTight.txt'].includes('SIL OPEN FONT LICENSE Version 1.1') || !x['assets/OFL-InterTight.txt'].includes('Copyright 2022 The Inter Project Authors')) bad.push('書体の許諾の文');
  if (!x['src/about.md'].includes('Inter Tight（Copyright 2022 The Inter Project Authors、SIL Open Font License 1.1）')) bad.push('断りと開示：書体の許諾');
  if (!/font-src 'self';/.test(B.META_CSP) || /@font-face[^}]*url\((?!intertight\.woff2\))/.test(x['assets/style.css'])) bad.push('書体を自分のところ以外から読む');
  /* クラス表は build.js の CLASS から読む（頁の手直しは「生成物が元と同じ」が見る。ここは表の中身を見る）。 */
  const cls = (/const CLASS = `([\s\S]*?)`;/.exec(x['build.js']) || [, ''])[1];
  if (!cls.includes('<p class="cls-note">' + CLASS_NOTE + '上位職ではなく、ほかのクラスより強くも偉くもありません。</p>')) bad.push('クラス表：職業のたとえで、人を分ける区分ではなく、上位職でもないという断り');
  /* スキルと状態の名は、引いた法則の名と同じ。原典より多くを言わないよう、引く条も決めた並びに固める。 */
  const lawName = Object.fromEntries(LAWS.map(([n, w]) => [n, w]));
  const skills = [...cls.matchAll(/<li><b>([^<]+)<\/b><span>[^<]*<\/span><i>(第.+?法則)<\/i><\/li>/g)];
  if (skills.length !== 6) bad.push('クラス表のスキルが六つでない');
  for (const [, nm, law] of skills) if (lawName[law] !== nm) bad.push('クラス表：スキル「' + nm + '」と' + law + 'の名が合わない');
  if (!/<b>状態<\/b>泥沼：[^<]*（第八法則）/.test(cls)) bad.push('クラス表：状態が第八法則 泥沼でない');
  const cites = (cls.match(/第[一二三四五六七八九十]+法則|定義[一二三四五六七八九]/g) || []).join(' ');
  if (cites !== '定義八 第五法則 第二法則 第三法則 第四法則 第六法則 第九法則 第十法則 第八法則') bad.push('クラス表が引く条：' + cites);
  if (!x['src/faq.md'].includes(CLASS_NOTE) || !x['README.md'].includes(CLASS_NOTE)) bad.push('問いか README：クラスは人を分ける区分ではないという断り');
  if (!x['src/index.md'].includes('<!-- class -->')) bad.push('はじめにのクラス表');
  /* はじめにの断りの二行目は、札で目立たせる行（style.css の nth-child(2)）。別の枠だという断りがそこにあること。 */
  /* 2026-11-22 から、題と断りのあいだに一文と三つの紋を置く。見るのは、頁で最初の断りの二行目。 */
  if ((/^> [^\n]+\n> ([^\n]+)/m.exec(x['src/index.md']) || [])[1] !== FRAME) bad.push('はじめにの断りの二行目が、別の枠だという断りでない');
  /* 上の帯を、見た目で消していないこと。 */
  if (/\.frame\b[^{]*\{[^}]*(display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0[;}\s])/.test(x['assets/style.css'])) bad.push('style.css が上の帯を隠している');
  for (const f of ['src/index.md', 'src/about.md', 'src/faq.md', 'README.md']) if (!x[f].includes(FRAME)) bad.push(f + '：学術的な活動とは別の枠だという断り');
  if (!x['src/faq.md'].includes('選民思想ではありません。') || !x['src/terms.md'].includes('運営者は、魔法使いの代表ではありません。')) bad.push('問いか利用規約の断り');
  if (!(x['site/about.html'] || '').includes(PAPER_LINK) || (x['site/about.html'] || '').split('doi.org').length !== 2) bad.push('学術的な正文の DOI は、確かめた一つだけ');
  if (!x['src/about.md'].includes('その DOI は、ここには書いていません。確かめていないためです。')) bad.push('英語の版の DOI を確かめていないという断り');
  /* 原理の数：定義十、要請二、法則十、定理七。原文の行は、原典の文と一字一句同じ。 */
  const st = x['src/strict.md'];
  if ((st.match(/^\*\*定義[一二三四五六七八九十]+　/mg) || []).length !== 20 || (st.match(/^\*\*要請[一二三四五]　/mg) || []).length !== 5 || (st.match(/^\*\*第[一二三四五六七八九十]+法則　/mg) || []).length !== 10 || (st.match(/^\*\*定理[一二三四五六七八九十]+　/mg) || []).length !== 26) bad.push('原理の定義・要請・法則・定理の数');
  for (const [n, , d] of DEFS.concat(LAWS)) { const at = st.indexOf('**' + n + '　'); const line = at < 0 ? '' : st.slice(at).split('\n')[1]; if (line !== '原文：' + d) bad.push('原理の ' + n + ' の原文が、原典の文と同じでない'); }
  if ((st.match(/Q\.E\.D\.$/mg) || []).length !== 26) bad.push('原理の定理の証明が二十六でない');
  if (!st.includes('**系　魔法は、知の内に在るべからず。**')) bad.push('原理の第五巻の系');
  /* 第二巻の主張は、verification/models.js が機械で確かめる。頁に書いた数は、計算した数と同じであること。 */
  for (const b of mbad) bad.push('第二巻の模型：' + b);
  const fmt = (n) => BigInt(n).toLocaleString('en-US');
  const solidsLine = mr.solids.map((o) => o.name + ' ' + fmt(o.orbits)).join('、');
  if (!st.includes(solidsLine + ' 通りなり')) bad.push('原理の定理十三の数が計算と違う：' + solidsLine);
  if (!st.includes('回転の群の位数は、順に ' + mr.solids.map((o) => o.order).join('、') + '。')) bad.push('原理の回転の群の位数');
  for (const o of mr.solids) {
    const total = o.orbits * BigInt(o.order);
    if (!st.includes(o.name + '：') || !st.includes(fmt(total) + '/' + o.order + ' = ' + fmt(o.orbits) + '。')) bad.push('原理の定理十三の式（' + o.name + '）');
  }
  if (mr.solids.map((o) => o.centrallySymmetric).join() !== 'false,true,true,true,true') bad.push('原理の定理十二：中心対称でないのが正四面体だけでない');
  if ((st.match(/^\| M[₀-₉]+ \|/mg) || []).length !== 10) bad.push('原理の定理九の表が十行でない');
  /* 第三巻の数：位数 = 面の数 × 安定化群、V − E + F = 2、輪の源は四人以上で二人、三人で一人。 */
  if (!st.includes(mr.solids.map((o) => o.name + ' ' + o.order + ' = ' + o.faces + ' × ' + o.stabilizer).join('、') + '。')) bad.push('原理の定理十四の数が計算と違う');
  for (const o of mr.solids) if (!st.includes(o.name + '：' + o.verts + ' − ' + o.edges + ' + ' + o.faces + ' = ' + o.euler + '。')) bad.push('原理の定理十五の数（' + o.name + '）');
  /* 第四巻：M₀ の一つの負から八十の魔法、魔法の定義の文、結語。 */
  const kanji = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const tens = (n) => (n >= 10 ? (Math.floor(n / 10) > 1 ? kanji[Math.floor(n / 10)] : '') + '十' + kanji[n % 10] : kanji[n]);
  if (mr.magic.M0negatives !== 1 || !st.includes('負の向きは時 20 の一つだけで、能動 a_s（21 ≤ s ≤ 100）の' + tens(mr.magic.M0count) + 'がみな')) bad.push('原理の定理二十二の数が計算と違う');
  if (!st.includes('**定義十六　魔法**　魔法とは、転化を用ゐて成果を出だし、その成果を、外より見えざる人の関係へ還す能動を謂ふ。') || !st.includes('結語。魔法とは、負を、その逆の正に転じ、見えざる関係へ還すことである。')) bad.push('原理の第四巻：魔法の定義と結語');
  /* 第五巻：運営者の直観の原文、記録の数、反証の記録、相反する二つの模型、結語。 */
  const kan = (n) => { const d = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']; let r = ''; const h = Math.floor(n / 100), t = Math.floor(n % 100 / 10), o = n % 10; if (h) r += (h > 1 ? d[h] : '') + '百'; if (t) r += (t > 1 ? d[t] : '') + '十'; return r + d[o]; };
  if (!st.includes('**定義二十　魔法（第二の義）**') || st.split('\n').find((l, k, a) => a[k - 1] && a[k - 1].startsWith('**定義二十　')) !== '原文：' + INTUITION) bad.push('原理の定義二十の原文が、運営者の直観と一字一句同じでない');
  if (!mr.immune || !st.includes('で、' + kan(mr.immuneCount) + 'の記録を実現して確かめている')) bad.push('原理の定理二十四の記録の数が計算と違う');
  if (mr.refutable.wizardBreaks !== 'L10' || mr.refutable.plainBreaks !== 'L1' || !st.includes('x を魔法使いとすれば L10 が破れ（Λ > 30）、魔法使いとしなければ L1 が破れる')) bad.push('原理の定理二十五');
  if (!(mr.rival.plusAll && mr.rival.minusAll && mr.separate.plus && mr.separate.minusBreaks === 'L1')) bad.push('原理の定理二十六の模型');
  if (!st.includes('このサイトは、どの頁も上の帯で「' + FRAME + '」と名乗り')) bad.push('原理の第五巻：帯の文の引用が FRAME と違う');
  if (!st.includes('結語。魔法が知の内に在り得ないのは、無いからではなく、在ってはならないからである。在ってはならない所は知の内であり、在ってよい所は知の外である。')) bad.push('原理の第五巻の結語');
  if (!st.includes('人の四人以上なる時') || !mr.ring.every(Boolean) || mr.ring3.some((c) => c !== 1)) bad.push('原理の定理十八の人数');
  if (!st.includes('組は線の相から定まる形の上のものであり、人の属性にはよらない。') || !st.includes('人の属性は、どこにも置かない。')) bad.push('原理の第三巻：属性を置かないという断り');
  if (require('crypto').createHash('sha256').update(st.split('\n').filter((l) => /^\*\*(定義|要請|第[一二三四五六七八九十]+法則)/.test(l)).join('\n')).digest('hex') !== STRICT_SHA) bad.push('原理の本文が、確かめた文と違う');
  if (!st.includes('2²⁰ すなはち ' + (2 ** 20).toLocaleString('en-US') + ' 通り')) bad.push('原理の定理七の数');
  /* 条文：引いた条はすべて写しにあり、写しは手で変えておらず、頁に原文のまま出る。 */
  let S = {};
  try { S = JSON.parse(x['verification/statutes-texts.json']); } catch (e) { bad.push('条文の写しが読めない'); }
  const sha = require('crypto').createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.keys(S.texts || {}).sort().map((k) => [k, S.texts[k]])))).digest('hex');
  if (sha !== STATUTES_SHA) bad.push('条文の写しが変わった');
  const cited = ((/<!-- 条文 ([^>]+?) -->/.exec(x['src/legality.md']) || [, ''])[1]).split('、').filter(Boolean);
  if (cited.length !== 10) bad.push('引いた条文の数が ' + cited.length);
  const lp = x['site/legality.html'] || '';
  for (const k of cited) { if (!(S.texts || {})[k]) bad.push('写しに無い条：' + k); else if (!lp.includes(B.inline(S.texts[k]).replace(/<[^>]+>/g, ''))) bad.push('頁に原文が無い：' + k); }
  for (const k of cited) { const law = k.split(' ')[0], art = k.split(' ')[1]; if (!x['src/legality.md'].split('\n').some((l) => l.startsWith('| ' + law) && l.includes(art.replace(/^第/, '')))) bad.push('表に無い条：' + k); }
  for (const [f, w] of Object.entries(NOT_SCIENCE)) if (!x[f].includes(w)) bad.push(f + '：科学ではないという断り');
  if (!x['src/about.md'].includes('誰の性経験も評価しません。') || !x['src/about.md'].includes('特定の人を魔法使いと呼ぶものではありません。') || !x['src/about.md'].includes('下の「学術的な正文」のほかは、研究の頁とつないでいません。')) bad.push('断りと開示の三つの断り');
  if (!x['src/faq.md'].includes('このサイトは、誰からも何も集めません。')) bad.push('問い：何も集めない');
  const html = Object.keys(x).filter((f) => f.startsWith('site/') && f.endsWith('.html'));
  if (html.length !== B.PAGES.length + B.EN_PAGES.length + 2) bad.push('生成した頁の数が ' + html.length);
  for (const f of html) {
    const h = x[f], lang = langOf(f), W = LW[lang];
    if (!h.includes('<meta http-equiv="Content-Security-Policy" content="' + B.META_CSP + '">')) bad.push(f + '：CSP');
    if (!h.startsWith('<!DOCTYPE html>\n<html lang="' + lang + '">\n')) bad.push(f + '：html の lang が ' + lang + ' でない');
    if (!h.includes(W.FOOT)) bad.push(f + '：下の欄の断り');
    if (!h.includes('<span class="say">' + W.FRAME + '</span></p></aside>\n<header>')) bad.push(f + '：上の帯の断り');
    /* Search Console の所有の確認（2026-11-22）。運営者が受け取った値を、どの頁の head にも一つだけ置く。 */
    if ((h.match(/<meta name="google-site-verification" content="([^"]*)">/g) || []).join() !== '<meta name="google-site-verification" content="UEPpX5mfnLlhOBTBTETu-PmRO_Y4L2SmjEiaq_U1Zf8">' || h.indexOf('google-site-verification') > h.indexOf('</head>')) bad.push(f + '：Search Console の確認の値');
    /* 上の欄（2026-11-22）：クラスの紋と名とラテン語の添え名。紋は自分の assets から読み、代わりの文を持つ。 */
    /* 404 の頁は、どのディレクトリの所在でも出るので、つなぎと素材を根から書く（2026-11-23）。ほかの頁は、頁のある所から書く。 */
    const up = /^site\/404(\.en)?\.html$/.test(f) ? '/' : '';
    if (!h.includes(W.header(up))) bad.push(f + '：上の欄の紋と名と添え名');
    /* 本文へ飛ぶつなぎ（2026-11-23）。body の初めに一つ、飛び先の main は一つ。 */
    if (!h.includes('<body class="p-' + pageOf(f) + '">\n<a class="skip" href="#main">' + W.skip + '</a>\n') || (h.match(/<main\b[^>]*>/g) || []).join() !== '<main id="main">' || (h.match(/id="main"/g) || []).length !== 1) bad.push(f + '：本文へ飛ぶつなぎ');
    /* canonical と、検索に載せないこと。404 は canonical を出さず、noindex。ほかは、自分の所在の canonical を一つ。 */
    const canon = h.match(/<link rel="canonical" href="([^"]*)">/g) || [], noidx = /<meta name="robots" content="noindex">/.test(h);
    const self = f.replace(/^site\//, '');
    if (up ? (canon.length || !noidx) : (canon.join() !== '<link rel="canonical" href="' + B.urlOf(pageOf(f), lang) + '">' || self !== B.fileOf(pageOf(f), lang) + '.html' || noidx)) bad.push(f + '：canonical か noindex');
    if (up) for (const m of h.matchAll(/\s(?:src|href)="([^"]*)"/g)) if (!/^(\/|#|https:)/.test(m[1])) bad.push(f + '：根から書いていない所在 ' + m[1]);
    const foot = h.indexOf('<footer>') < 0 ? '' : h.slice(h.indexOf('<footer>'));
    if (!foot.includes(W.footFrame)) bad.push(f + '：下の欄の、別の枠だという断り');
    /* 下の欄の文は FOOT と比べるだけでは、FOOT ごと弱めても通る。決めた語を頁ごとに固める。 */
    for (const w of W.footWords) if (!foot.includes(w)) bad.push(f + '：下の欄の断り（' + w + '）');
    for (const w of W.footCaution) if (!foot.includes(w)) bad.push(f + '：下の欄の断り（' + w.slice(0, 8) + '）');
    for (const l of ['terms', 'privacy', 'requests', 'legality', 'about', 'design']) if (!h.includes(W.ruleHref(up, l)) && pageOf(f) !== l) bad.push(f + '：決まりの頁 ' + l + ' へのつなぎ');
    for (const d of W.disclose) if (!foot.includes(d)) bad.push(f + '：開示');
    /* 外へ読みに行く要素。canonical と、言葉の対（alternate、2026-11-23）は読みに行かないので除く。 */
    if (/<(script|img|link|iframe|source)\b(?![^>]*rel="(?:canonical|alternate)")[^>]*\s(src|href)="https?:/i.test(h)) bad.push(f + '：外へ読みに行く');
    if (/\sstyle="|<style|\son[a-z]+="/i.test(h)) bad.push(f + '：頁の中の style か事件の属性');
    /* 例外は一つ：断りと開示の「学術的な正文」が、確かめた DOI 一つだけを示す。 */
    const hh = pageOf(f) === 'about' ? h.split(PAPER_LINK).join('') : h;
    for (const a of AWAY) if (hh.toLowerCase().includes(a)) bad.push(f + '：' + a + ' につないでいる');
  }
  /* 頁の頭の説明と共有のカード（2026-11-23）。説明は頁ごとに違い、短く、短い断りで終える。カードは canonical の所在を指し、
   * 題と説明は頁の title と description と同じ。404 は所在を持たないので、カードを出さない。どの頁も、帯の色と、ホーム画面のアイコンを持つ。 */
  const descs = new Map();
  let card = null;
  try { card = readPng(x['#png:assets/card.png']); } catch (e) { bad.push('共有のカードが読めない：' + e.message); }
  const mastbg = (/--mastbg:\s*(#[0-9a-f]{6})/.exec(x['assets/style.css']) || [, ''])[1];
  for (const f of html) {
    const h = x[f], head = h.slice(0, h.indexOf('</head>')), lang = langOf(f), en = lang === 'en';
    const up = /^site\/404(\.en)?\.html$/.test(f) ? '/' : '';
    const meta = (k) => [...head.matchAll(new RegExp('<meta (?:property|name)="' + k.replace(/:/g, ':') + '" content="([^"]*)">', 'g'))].map((m) => m[1]);
    const d = meta('description');
    /* 英語の説明は、英字で 200 字まで、「It is a play, not science.」で終える（2026-11-23）。 */
    if (d.length !== 1 || !d[0].endsWith(en ? ' It is a play, not science.' : '遊びであり、科学ではありません。') || [...d[0]].length > (en ? 200 : 120)) bad.push(f + '：頁の説明（一つ、決めた長さまで、短い断りで終える）');
    else if (descs.has(d[0])) bad.push(f + '：頁の説明が ' + descs.get(d[0]) + ' と同じ'); else descs.set(d[0], f);
    if (meta('theme-color').join() !== mastbg) bad.push(f + '：帯の色が上の欄の夜の黒でない');
    if (!head.includes('<link rel="apple-touch-icon" href="' + up + 'assets/apple-touch-icon.png">')) bad.push(f + '：ホーム画面のアイコン');
    const og = (k) => meta('og:' + k);
    if (up) { if (/property="og:|name="twitter:/.test(head)) bad.push(f + '：404 に共有のカードがある'); continue; }
    const canon = (/<link rel="canonical" href="([^"]*)">/.exec(head) || [, ''])[1], title = (/<title>([^<]*)<\/title>/.exec(head) || [, ''])[1];
    const pair = B.hasEn(pageOf(f));
    const want = { type: 'website', site_name: en ? B.NAME_EN : B.NAME, locale: en ? 'en_US' : 'ja_JP', 'locale:alternate': pair ? (en ? 'ja_JP' : 'en_US') : '-', title, description: d[0], url: canon, image: B.BASE + 'assets/card.png', 'image:type': 'image/png',
      'image:width': String(card && card.w), 'image:height': String(card && card.h) };
    for (const [k, v] of Object.entries(want)) if ((og(k).join('\u0000') || '-') !== v || !v) bad.push(f + '：og:' + k + ' が ' + JSON.stringify(og(k)) + '（求めるのは ' + v + '）');
    if (og('image:alt').length !== 1 || og('image:alt')[0].length < 20) bad.push(f + '：og:image:alt');
    if (meta('twitter:card').join() !== 'summary_large_image') bad.push(f + '：twitter:card');
  }
  if (descs.size !== B.PAGES.length + B.EN_PAGES.length + 2) bad.push('頁の説明の数が頁の数と違う（' + descs.size + '）');
  if (card && (card.w !== 1200 || card.h !== 630)) bad.push('共有のカードが 1200×630 でない：' + card.w + '×' + card.h);
  /* はじめにの三つの紋（2026-11-22）：決めた三つの img が、どれも代わりの文を持ち、自分の assets から読む。 */
  const emb = [...B.EMBLEMS.matchAll(/<img\b[^>]*src="assets\/(emblem-[a-z]+\.svg)"[^>]*alt="([^"]+)"/g)];
  if (emb.length !== 3 || !(x['site/index.html'] || '').includes(B.EMBLEMS) || emb.some(([, f]) => !x['#assets'].split('\n').some((l) => l.startsWith(f + ' ')))) bad.push('はじめにの三つの紋');
  const js = x['assets/play.js'];
  if (/fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|document\.cookie|sendBeacon|WebSocket|innerHTML/.test(js)) bad.push('play.js が外へ送るか、残すか、innerHTML を使う');
  if (!js.includes('第六法則') || !/\$\('deeds'\)\.textContent = '0'/.test(js)) bad.push('play.js：見える成果がいつも 0 でない');
  /* 人に属性を付けない（2026-11-21 に利用者が、法的な危うさから外すと決めた）。コードに属性の名を持たない。 */
  const code = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  if (/gender|sex|age\b|nationality|race|religion|性別|年齢|国籍|宗教|職業/i.test(code)) bad.push('play.js が人に属性を付けている');
  if (!x['src/play.md'].includes('人には、名前も年齢も性別も、どんな属性も付けていません。見るのは、関係の移り変わりだけです。')) bad.push('遊び場：属性を付けないという断り');
  if ((x['src/play.md'].match(/^\| 第[二三四五六七八九十]法則 /mg) || []).length !== 9) bad.push('遊び場：法則と働きの表が九行でない');
  /* 生成物が元と同じか（site/ は手で直さない）。 */
  /* 英語の頁も、src/<名>.en.md から作ったものと同じ（2026-11-23）。 */
  const fresh = (s, lang) => { const md = x['src/' + B.fileOf(s, lang) + '.md'] || ''; return B.page(s, /^# (.+)$/m.exec(md)[1], B.render(md, B.fileOf(s, lang), lang), lang); };
  const freshOr = (s, lang) => { try { return fresh(s, lang); } catch (e) { bad.push('src/' + B.fileOf(s, lang) + '.md から作れない：' + e.message); return null; } };
  for (const [s, out] of B.PAGES) for (const lang of B.hasEn(out) ? B.LANGS : ['ja']) { const f = 'site/' + B.fileOf(out, lang) + '.html'; if (x[f] === undefined || x[f] !== freshOr(s, lang)) bad.push(f + ' が src から作ったものと違う（node build.js）'); }
  if (x['site/404.html'] !== B.page('404', '頁が見つかりません', B.NOT_FOUND)) bad.push('site/404.html が build.js から作ったものと違う（node build.js）');
  if (x['site/404.en.html'] !== B.page('404', 'Page not found', B.NOT_FOUND_EN, 'en')) bad.push('site/404.en.html が build.js から作ったものと違う（node build.js）');
  if (x['site/vercel.json'] !== B.VERCEL || x['site/robots.txt'] !== B.ROBOTS || x['site/sitemap.xml'] !== B.SITEMAP) bad.push('site の vercel.json・robots.txt・sitemap.xml が build.js から作ったものと違う（node build.js）');
  /* 配信の決まりに、廃れた指定（interest-cohort）を書かない。browsing-topics を止める（2026-11-23）。 */
  let V = {};
  try { V = JSON.parse(x['site/vercel.json']); } catch (e) { /* 下で落ちる */ }
  const pp = (((V.headers || [])[0] || {}).headers || []).find((z) => z.key === 'Permissions-Policy') || {};
  if (/interest-cohort/.test(pp.value || '') || !/(^|, )browsing-topics=\(\)/.test(pp.value || '')) bad.push('配信の Permissions-Policy：' + pp.value);
  /* 最終更新（2026-11-23）：どの頁の元にも、日付の行が一つあり、頁ではその日と、元のファイルの変更の記録へのリンクになる。 */
  for (const [s0, out0] of B.PAGES) for (const lang of B.hasEn(out0) ? B.LANGS : ['ja']) {
    const s = B.fileOf(s0, lang), out = B.fileOf(out0, lang), en = lang === 'en';
    const ds = [...(x['src/' + s + '.md'] || '').matchAll(en ? /^Last updated: (\d{4}-\d{2}-\d{2})\.$/mg : /^最終更新：(\d{4}-\d{2}-\d{2})。$/mg)].map((m) => m[1]);
    const d = ds[0], ok1 = ds.length === 1 && !isNaN(Date.parse(d + 'T00:00:00Z')) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;
    const link = '<a href="https://github.com/cpsbvbng26-dotcom/quiet-wizard/commits/main/src/' + s + '.md" rel="noopener">';
    if (!ok1) bad.push('src/' + s + '.md：最終更新の行が一つでないか、日付でない');
    else if (!(x['site/' + out + '.html'] || '').includes(en ? '<p class="updated">Last updated: <time datetime="' + d + '">' + d + '</time> (' + link + 'change history</a>).</p>'
      : '<p class="updated">最終更新：<time datetime="' + d + '">' + d + '</time>（' + link + '変更の記録</a>）。</p>')) bad.push('site/' + out + '.html：最終更新と変更の記録');
  }
  if (!x['src/terms.md'].includes('上の案内と下の欄からつなぐ頁には、どれも最終更新の日を書き、その頁の本文を最後に変えた日を示します。')) bad.push('利用規約：最終更新の日の断り');
  /* Search Console の確認の値を置くなら、個人情報の取り扱いにそう書き、頁が Google へ何も送らないことと、運営者の見る集計が Google の側のものであることを書く（2026-11-23）。 */
  if (html.some((f) => x[f].includes('google-site-verification')) && !['どの頁の頭にも、Google Search Console の所有の確認の値（`google-site-verification` の meta）を置いています。', '頁は、この値で Google へ何も送りません。', '運営者が Search Console で見られるのは、Google 検索の側で集められた集計です。'].every((w) => x['src/privacy.md'].includes(w))) bad.push('個人情報の取り扱い：Search Console の確認の値のこと');
  if (!x['src/about.md'].includes('Google Search Console の所有の確認の値を置いていますが、頁はそれで Google へ何も送りません')) bad.push('断りと開示：Search Console の確認の値のこと');
  /* 散文の数（2026-11-23）。遊び場を動かして数えた人の数・閾の幅・メーターの上限と、頁の文が同じこと。 */
  let sim = null, lo = null, hi = null;
  const PL = playOf(x);
  try { sim = simulatePlay(js, PL); lo = simulatePlay(js, PL, { first: 0 }); hi = simulatePlay(js, PL, { first: 0.9999999 }); } catch (e) { bad.push('遊び場のスクリプトを動かせない：' + e.message); }
  if (sim) {
    const n = sim.people, pm = x['src/play.md'];
    if (n !== 8 && !n) bad.push('遊び場の人の数が数えられない');
    for (const [f, w] of [['src/index.md', '[遊び場](play.html) ' + n + ' 人の関係の上で'], ['src/play.md', '下の遊び場では、' + n + ' 人と、そのあいだの関係の線だけを描きます。'], ['src/play.md', '魔法使いもほかの ' + (n - 1) + ' 人と同じ点で描く'], ['build.js', '<p class="small">' + n + ' 人と、隣り合う人どうしの関係の線だけが見えます。']]) if (!x[f].includes(w)) bad.push(f + '：人の数が遊び場と違う（' + w.slice(0, 20) + '）');
    /* 遊び場の説明（meta）の人の数も、遊び場を動かした人の数と同じ（2026-11-23）。 */
    if (!(x['site/play.html'] || '').includes('<meta name="description" content="' + n + ' 人の関係の上で')) bad.push('遊び場の説明の人の数が遊び場と違う');
    if (!(x['assets/play.js'] || '').includes("'外の目。' + N + ' 人と、")) bad.push('play.js：外の目の代わりの文の人の数を N から作っていない');
    if (lo.threshold !== 18 || hi.threshold !== 36 || !pm.includes('開くたびに ' + lo.threshold + ' から ' + hi.threshold + ' のあいだで決まる')) bad.push('遊び場の閾の幅が頁の文と違う：' + lo.threshold + '〜' + hi.threshold);
    if (sim.valuemax !== hi.threshold || hi.maxNow !== sim.valuemax) bad.push('遊び場のメーターの上限が閾の上限と違う');
    const figs = (pm.match(/^!\[[^\]]+\]\(fig:[a-z0-9-]+\)$/mg) || []).length;
    if (!pm.includes('下の' + KANJI_N[figs] + 'つの図で順に見て')) bad.push('遊び場：図の数が頁の文と違う（' + figs + '）');
    /* 魔法使い自身の線は、自分の成果で太らない（要請四・定理二十三）。ほかの線は太る。見える成果はいつも 0。 */
    if ([...sim.wizardWidths].join() !== '1' || ![...sim.widths].some((w) => Number(w) > 1)) bad.push('遊び場：魔法使い自身の線が太るか、どの線も太らない（' + [...sim.wizardWidths].join(',') + '）');
    if ([...sim.deeds].join() !== '0') bad.push('遊び場：見える成果が 0 でないことがある');
    /* 切り替わりの知らせは、閾と目安の三十を比べて言う。 */
    for (const [o, w] of [[lo, '閾は目安の三十より小さく、早めの切り替わりです。'], [hi, '閾は目安の三十より大きく、遅めの切り替わりです。']]) if (!o.notes.some((t) => t.includes('閾の ' + o.threshold + ' に届き') && t.includes(w))) bad.push('遊び場：切り替わりの知らせが早い遅いを言わない');
    /* 自動で過ごすあいだは読み上げず、始めと止めたときは読み上げる。 */
    if (sim.live.join() !== 'polite:on,off,off,off,off,off,polite:none') bad.push('遊び場：自動で過ごすときの読み上げ（' + sim.live.join() + '）');
    /* ボタンの名は、遊び方の箇条の太字の名と同じ。丸の数字を付けない。 */
    for (const m of PL.matchAll(/<button type="button" id="[a-z]+">([^<]+)<\/button>/g)) if (!pm.split('\n').some((l) => /^\d+\. \*\*/.test(l) && l.includes('**' + m[1] + '**'))) bad.push('遊び場のボタン「' + m[1] + '」が、遊び方の箇条にない');
    if (/[①-⑳]/.test(PL + x['assets/play.js'])) bad.push('遊び場に丸の数字がある');
  }
  /* 図の番号は、頁ごとに 1 から欠けずに振る（2026-11-23）。 */
  for (const [s] of B.PAGES) { const ns = [...(x['src/' + s + '.md'] || '').matchAll(/^!\[図(\d+) /mg)].map((m) => Number(m[1])); if (ns.some((k, i) => k !== i + 1)) bad.push('src/' + s + '.md：図の番号が 1 から並ばない（' + ns.join(',') + '）'); }
  /* ほかの頁から原理の項や巻へ飛ぶリンク（2026-11-23）：飛び先が原理の頁にあり、項ならその名、巻ならその見出しを指す。 */
  const sh = x['site/strict.html'] || '';
  let jumps = 0;
  for (const f of html.filter((k) => k !== 'site/strict.html')) for (const m of x[f].matchAll(/<a href="strict\.html#([a-z0-9-]+)">([^<]+)<\/a>/g)) {
    jumps++;
    const at = new RegExp('<(p|h2) id="' + m[1] + '">([\\s\\S]*?)</\\1>').exec(sh);
    if (!at || !at[2].replace(/<[^>]+>/g, '').replace(/^\s+/, '').startsWith(m[2])) bad.push(f + '：原理へのリンク「' + m[2] + '」の飛び先が違う（#' + m[1] + '）');
  }
  if (jumps < 5) bad.push('ほかの頁から原理の項へ飛ぶリンクが少ない（' + jumps + '）');
  /* はじめにの目次：原理の行は五つの巻を順に挙げ、決まりの行は下の欄の決まりの頁（断りと開示のほか）をすべて挙げる。 */
  const ix = x['src/index.md'] || '';
  const prin = (ix.split('\n').find((l) => l.startsWith('- [原理](strict.html)')) || '');
  const books = (x['src/strict.md'].match(/^## 第[一二三四五六七八九十]+巻/mg) || []).map((l) => l.slice(3));
  if (!books.length || (prin.match(/第[一二三四五六七八九十]+巻/g) || []).join() !== books.join()) bad.push('はじめにの原理の行が、巻を順に挙げていない');
  const rules = (ix.split('\n').find((l) => l.startsWith('- [決まり](terms.html)')) || '');
  for (const [s, , , top] of B.PAGES) if (!top && s !== 'about' && !rules.includes(/^# (.+)$/m.exec(x['src/' + s + '.md'])[1])) bad.push('はじめにの決まりの行に無い頁：' + s);
  /* 頁の中の目次（2026-11-23）：目次を置く頁では、目次がすべての見出しを順に挙げ、どの見出しにも飛び先がある。 */
  for (const f of html) {
    const t = x[f], nav = (/<nav class="toc"[\s\S]*?<\/nav>/.exec(t) || [''])[0];
    if (!nav) continue;
    const heads = [...t.matchAll(/<h([23]) id="(s[\d-]+)">/g)].map((m) => m[2]);
    const listed = [...nav.matchAll(/<a href="#(s[\d-]+)">/g)].map((m) => m[1]);
    if (!heads.length || listed.join() !== heads.join() || (t.match(/<h[23]>/g) || []).length) bad.push(f + '：頁の中の目次が見出しと合わない');
  }
  for (const s of ['legality', 'design', 'strict']) if (!/<nav class="toc"/.test(x['site/' + s + '.html'] || '')) bad.push('site/' + s + '.html：頁の中の目次が無い');
  /* 印刷では、上の帯と上の欄を黒字にする（2026-11-23）。 */
  const pr2 = ((/@media print \{([\s\S]*?)\} \}\n/.exec(x['assets/style.css']) || [, ''])[1]);
  if (!/\.frame, \.frame \*, header, header \* \{ color: #000 !important;/.test(pr2) || !/header \{ background: none !important;/.test(pr2)) bad.push('印刷で、上の帯と上の欄を黒字にしていない');
  return bad;
}

/* 原理の項と引き合い（2026-11-22）。build.js の読み方に頼らず、src/strict.md を別に読んで確かめる。
 * 項の番号が欠けずに並ぶこと、引いた項がすべて在ること、証明の引き合いが循環しないこと、後ろの項を引く証明は決めた一つだけで、
 * その証明が後ろの項の第一巻に依らないことを断っていること。頁では、項ごとに飛び先が一つあり、引き合いのリンクがその項を指し、目次がすべての項を順に挙げること。 */
const NUMS = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const num = (s) => { const i = s.indexOf('十'); if (i < 0) return NUMS[s]; return (i ? NUMS[s.slice(0, i)] : 1) * 10 + (s.slice(i + 1) ? NUMS[s.slice(i + 1)] : 0); };
/* 後ろの項を引いてよい証明。定理二は、第二巻の模型 M₀′ を、第一巻に依らずに組んだものとして引く。 */
const FORWARD_OK = { '定理二>定理十': '第二巻の定理十。その証は、第一巻の定理に依らず' };
/* 英語の原理（2026-11-23）。定理二が後ろの定理十を引く理由は、英語の証明の文にも書く。 */
const FORWARD_OK_EN = { 'Proposition 2>Proposition 10': 'Book II, Proposition 10, whose proof uses no proposition of Book I' };
const PRIN_COUNTS = { 定義: 20, 要請: 5, 法則: 10, 定理: 26, 系: 1 };
/* 日本語と英語の、項の頭と引き合いの読み方。英語は「**Definition 1. 」の形で、引き合いは単数の「Proposition 3」「Law 6」と大文字の Corollary。 */
const KIND_EN = { Definition: '定義', Postulate: '要請', Law: '法則', Proposition: '定理', Corollary: '系' };
const PV = {
  ja: { md: 'src/strict.md', html: 'site/strict.html', forward: FORWARD_OK, proof: /^証明。/, books: /<li><a href="#s\d+">第[一二三四五]巻/g, top: /^(第[一二三四五六七八九十]+巻|総注解)/,
    head: (l) => { const m = /^\*\*(定義|要請|定理|系)([一二三四五六七八九十]*)　|^\*\*第([一二三四五六七八九十]+)法則　/.exec(l); if (!m) return null; const kind = m[3] ? '法則' : m[1]; return { kind, n: m[3] ? num(m[3]) : (m[1] === '系' ? 1 : num(m[2])), label: kind === '法則' ? '第' + m[3] + '法則' : m[1] + (m[2] || '') }; },
    /* 系は「系の」の形で引く（「体系の」は除く）。注は、持ち主の項を引くものとして読む（「第十法則の注」「系の後の注」）。2026-11-23 に系を足した。 */
    cites: (t) => [...t.matchAll(/(定義|要請|定理)([一二三四五六七八九十]+)(?!つ)|第([一二三四五六七八九十]+)法則|(?<!体)(系)(?=の)/g)].map((c) => (c[4] ? '系' : c[3] ? '第' + c[3] + '法則' : c[1] + c[2])) },
  en: { md: 'src/strict.en.md', html: 'site/strict.en.html', forward: FORWARD_OK_EN, proof: /^Proof\. /, books: /<li><a href="#s\d+">Book (?:I|II|III|IV|V)\./g, top: /^(Book [IVX]+\b|General Scholium)/,
    head: (l) => { const m = /^\*\*(?:(Definition|Postulate|Proposition|Law) (\d+)|(Corollary))\. /.exec(l); if (!m) return null; return { kind: KIND_EN[m[1] || m[3]], n: m[3] ? 1 : Number(m[2]), label: m[3] ? 'Corollary' : m[1] + ' ' + m[2] }; },
    cites: (t) => [...t.matchAll(/\b(Definition|Postulate|Proposition) (\d+)\b|\bLaw (\d+)\b|\b(Corollary)\b/g)].map((c) => (c[4] ? 'Corollary' : c[3] ? 'Law ' + c[3] : c[1] + ' ' + c[2])) },
};
function principiaVerdict(x, lang) {
  const bad = [], P = PV[lang === 'en' ? 'en' : 'ja'];
  const lines = (x[P.md] || '').split('\n');
  const items = [], deps = {}, cites = [];
  let cur = null;
  for (const l of lines) {
    const m = P.head(l);
    if (m) {
      cur = m.label;
      items.push({ kind: m.kind, n: m.n, label: cur, id: { 定義: 'def', 要請: 'post', 法則: 'law', 定理: 'prop', 系: 'cor' }[m.kind] + '-' + m.n });
    } else if (/^## /.test(l)) cur = null;
    if (!cur) continue;
    const rest = m ? l.slice(l.indexOf('**', 2) + 2) : l;
    for (const t of P.cites(rest)) {
      cites.push(t);
      if (P.proof.test(l) && t !== cur) (deps[cur] = deps[cur] || []).push({ t, line: l });
    }
  }
  const pos = new Map(items.map((it, k) => [it.label, k]));
  for (const [k, want] of Object.entries(PRIN_COUNTS)) {
    const ns = items.filter((it) => it.kind === k).map((it) => it.n);
    if (ns.length !== want || ns.some((n, i) => n !== i + 1)) bad.push('原理の' + k + 'の番号が 1 から ' + want + ' まで欠けずに並んでいない（' + ns.join(',') + '）');
  }
  if (pos.size !== items.length) bad.push('原理に同じ番号の項が二つある');
  for (const t of cites) if (!pos.has(t)) bad.push('原理が、無い項を引いている：' + t);
  /* 証明の引き合いの循環。 */
  const state = {};
  const visit = (u, path) => { state[u] = 1; for (const { t } of deps[u] || []) { if (state[t] === 1) bad.push('原理の証明の引き合いが循環する：' + path.concat(u, t).join('→')); else if (!state[t]) visit(t, path.concat(u)); } state[u] = 2; };
  for (const it of items) if (!state[it.label]) visit(it.label, []);
  /* 後ろの項を引く証明。 */
  for (const [u, ds] of Object.entries(deps)) for (const { t, line } of ds) if (pos.get(t) > pos.get(u)) {
    const why = P.forward[u + '>' + t];
    if (!why) bad.push('原理の' + u + 'の証明が、後ろの' + t + 'を引いている');
    else if (!line.includes(why)) bad.push('原理の' + u + 'の証明が、' + t + 'を引く理由を断っていない');
  }
  /* 頁。 */
  const h = x[P.html] || '';
  for (const it of items) if ((h.match(new RegExp('id="' + it.id + '"', 'g')) || []).length !== 1) bad.push('原理の頁に、' + it.label + 'の飛び先が一つない');
  const byId = new Map(items.map((it) => [it.id, it.label]));
  for (const a of h.matchAll(/<a class="xref" href="#([a-z]+-\d+)">([^<]+)<\/a>/g)) if (byId.get(a[1]) !== a[2]) bad.push('原理の頁の引き合いのリンクが違う項を指す：' + a[2] + '→' + a[1]);
  const xrefs = (h.match(/class="xref"/g) || []).length;
  if (xrefs < 40) bad.push('原理の頁の引き合いのリンクが少ない（' + xrefs + '）');
  const toc = (/<nav class="toc"[\s\S]*?<\/nav>/.exec(h) || [''])[0];
  const order = [...toc.matchAll(/href="#((?:def|post|law|prop|cor)-\d+)"/g)].map((m) => m[1]);
  const want = ['定義', '要請', '法則', '定理', '系'].flatMap((k) => items.filter((it) => it.kind === k).map((it) => it.id));
  if (order.join() !== want.join()) bad.push('原理の索引が、すべての項を順に挙げていない');
  if (([...toc.matchAll(P.books)]).length !== 5) bad.push('原理の目次が五つの巻を挙げていない');
  /* 目次は入れ子（2026-11-23）：巻と総注解を上の段に、巻の中の見出しをその下の段に、頁の見出しをすべて順に挙げる。 */
  const tocBooks = (/<ol class="toc-books">([\s\S]*?)<\/ol><\/nav>|<ol class="toc-books">([\s\S]*?)<\/ol><details/.exec(toc) || [])[2] || '';
  const allH2 = [...h.matchAll(/<h2 id="(s\d+)">([\s\S]*?)<\/h2>/g)];
  if ([...tocBooks.matchAll(/href="#(s\d+)"/g)].map((m) => m[1]).join() !== allH2.map((m) => m[1]).join()) bad.push('原理の目次が、頁の見出しをすべて順に挙げていない');
  const topLevel = tocBooks.replace(/<ol>[\s\S]*?<\/ol>/g, '');
  const want2 = allH2.filter((m) => P.top.test(m[2].replace(/<[^>]+>/g, ''))).map((m) => m[1]);
  if ([...topLevel.matchAll(/href="#(s\d+)"/g)].map((m) => m[1]).join() !== want2.join()) bad.push('原理の目次の上の段が、巻と総注解でない');
  return bad;
}

/* 英語の頁（2026-11-23）。日本語の頁ごとの英語の頁が、作ったものと同じで、断りと開示を持ち、言葉の切り替えと hreflang の対が両向きに合い、
 * 原典と原理の原文が日本語のまま一字一句同じで、散文に書いた数が数えた数と同じこと。訳の文の中身は、決めた文で固める。 */
const EN_WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const enWord = (n) => (n < 20 ? EN_WORD[n] : EN_TENS[Math.floor(n / 10)] + (n % 10 ? '-' + EN_WORD[n % 10] : ''));
const cap = (t) => t[0].toUpperCase() + t.slice(1);
const SOLID_EN = { 正四面体: 'regular tetrahedron', 正六面体: 'regular hexahedron', 正八面体: 'regular octahedron', 正十二面体: 'regular dodecahedron', 正二十面体: 'regular icosahedron' };
const PLAYFUL_EN = '> This is a play.';
const NOT_SCIENCE_EN = { 'src/index.en.md': 'The "laws" here are not scientific laws.', 'src/canon.en.md': 'They are not scientific laws.', 'src/guide.en.md': 'nor is it a scientific claim.',
  'src/play.en.md': 'It measures nothing, predicts nothing, and records nothing.', 'src/faq.en.md': 'The laws of the canon were written from intuition; no experiment or survey has tested them.', 'src/about.en.md': 'They are not scientific laws.' };
const CLASS_NOTE_EN = 'A class here is a game metaphor, like a job in a role-playing game. It does not sort people into groups, and it is not something to pin on anyone.';
const CANON_NOTE_EN = ['This page is a translation, not the original.', 'it stands next to each English rendering below, unchanged.', 'Where they differ from the Japanese, the Japanese is the canon.'];
const LAW_EN = ['Establishment', 'Many Faces', 'Conservation', 'Reversal', 'Rule of Thumb', 'Return', 'Common Practice', 'Quagmire', 'Secrecy', 'Long Life'];
const EN_SAYS = {
  'src/strict.en.md': ["This version was written by Claude at the operator's request. It is not the canon.", 'It does not mean that the content is scientifically correct.',
    '**Proposition 4. These laws cannot be refuted by observing results from outside.**', '**Proposition 9. The ten laws are independent of each other. None of them follows from the other nine together with Definition 6.**',
    'Note. Following the note to Law 10 in Book I, this version reads L as something not visible from outside.', '**Proposition 5. A wizard is not superior to other people.**',
    "**Postulate 2. Worth.** A person's worth does not depend on whether they are a wizard, or on whether they are a virgin.", 'No attribute of a person is placed anywhere.',
    'The groups are a matter of shape, fixed by the signs of the lines; they do not depend on any attribute of a person.',
    '**Definition 16. Magic.** Magic is an action that produces a result by means of transmutation and returns that result to relationships between people that cannot be seen from outside.',
    'Conclusion. Magic is turning a negative into the positive on its opposite side and returning it to relationships no one can see.',
    'Conclusion. Magic cannot be within knowledge not because it does not exist, but because it must not be there. The place where it must not be is within knowledge; the place where it may be is outside knowledge.',
    'declares in its top band "' + FRAME_EN + '"', 'If x is made a wizard, L10 is broken (Λ > 30), and if x is not, L1 is broken', '**Corollary. Magic must not be within knowledge.**',
    "it is a translation, and the Japanese page is the original of this version."],
  'src/about.en.md': ["It judges no one's sexual experience.", 'It does not call any particular person a wizard.', 'Apart from "The scholarly text" below, it is not linked to any research page.',
    'Its DOI is not given here, because it has not been checked.', 'Inter Tight (Copyright 2022 The Inter Project Authors, SIL Open Font License 1.1)', "This site says nothing about anyone's sexual experience, the operator's included.",
    'The head of every page carries a Google Search Console ownership token, but the pages send nothing to Google with it', FRAME_EN,
    "**The English pages**: translations of the Japanese pages, written by Claude at the operator's request. If the two differ, the Japanese page governs."],
  'src/faq.en.md': ['This site collects nothing from anyone.', CLASS_NOTE_EN, 'It is not elitism.', FRAME_EN, 'The operator does not speak for wizards.'],
  'src/play.en.md': ['The people carry no names, ages, genders, or any other attributes. Only the changes in relationships are shown.'],
  'src/guide.en.md': ['Using this guide to decide that someone nearby is a wizard is outside this play.'],
  'src/about.md': ['- **英語の頁**：日本語の頁を、運営者の求めで Claude が英語に訳したものです。二つが食い違うときは、日本語の頁に従います。'],
};
function englishVerdict(x) {
  const bad = [];
  const html = Object.keys(x).filter((f) => /^site\/.+\.html$/.test(f));
  const pages = B.PAGES.map(([s]) => s);
  for (const s of B.EN_PAGES) { if (!pages.includes(s)) bad.push('英語の頁の一覧に、日本語の頁の無い名：' + s); if (!x['src/' + s + '.en.md']) bad.push('src/' + s + '.en.md が無い'); if (!x['site/' + s + '.en.html']) bad.push('site/' + s + '.en.html が無い'); }
  /* 言葉の切り替えと、hreflang の対。対は両向きに合う。 */
  const urlToFile = (u) => 'site/' + (u === B.BASE ? 'index.html' : u.slice(B.BASE.length));
  const altsOf = (h) => [...h.slice(0, h.indexOf('</head>')).matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map((m) => m[1] + ' ' + m[2]);
  for (const f of html) {
    const h = x[f], lang = langOf(f), page = pageOf(f), other = lang === 'en' ? 'ja' : 'en', up = page === '404' ? '/' : '', pair = B.hasEn(page);
    const sw = [...h.matchAll(/<a class="lang" href="([^"]*)" hreflang="([^"]*)" lang="([^"]*)">([^<]*)<\/a>/g)];
    const mast = (/<div class="mast">[\s\S]*?<\/div>/.exec(h) || [''])[0];
    if (pair) {
      const want = up + B.fileOf(page, other) + '.html';
      if (sw.length !== 1 || sw[0][1] !== want || sw[0][2] !== other || sw[0][3] !== other || sw[0][4] !== (other === 'en' ? 'English' : '日本語') || !mast.includes(sw[0][0])) bad.push(f + '：言葉の切り替えが、もう一つの言葉の同じ頁（' + want + '）を指していない');
      else if (!x['site/' + want.replace(/^\//, '')]) bad.push(f + '：言葉の切り替えの先の頁が無い');
    } else if (sw.length) bad.push(f + '：英語の頁の無い頁に、言葉の切り替えがある');
    const alts = altsOf(h);
    if (pair && page !== '404') {
      const want = ['ja ' + B.urlOf(page, 'ja'), 'en ' + B.urlOf(page, 'en'), 'x-default ' + B.urlOf(page, 'ja')];
      if (alts.join() !== want.join()) bad.push(f + '：hreflang の対が ' + alts.join(' / '));
      for (const a of alts) { const t = x[urlToFile(a.split(' ')[1])]; if (!t) bad.push(f + '：hreflang の先の頁が無い：' + a); else if (altsOf(t).join() !== alts.join()) bad.push(f + '：hreflang の対が、先の頁から指し返されていない：' + a); }
    } else if (alts.length) bad.push(f + '：hreflang を置かない頁に置いている');
    /* 頁の中のつなぎ：英語の頁から日本語の頁へは、まだ英語の無い頁だけ（hreflang="ja" を付ける）。日本語の頁から英語の頁へは、切り替えだけ。 */
    const body = h.slice(h.indexOf('<body'));
    for (const m of body.matchAll(/<a\b([^>]*)\shref="(\/?)([a-z0-9]+)(\.en)?\.html(#[^"]*)?"([^>]*)>/g)) {
      const attrs = m[1] + m[6];
      if (/class="lang"/.test(attrs)) continue;
      if (lang === 'en' && !m[4] && (B.hasEn(m[3]) || !/hreflang="ja"/.test(attrs))) bad.push(f + '：英語の頁から日本語の頁へつないでいる：' + m[3]);
      if (lang === 'ja' && m[4]) bad.push(f + '：日本語の頁から英語の頁へつないでいる：' + m[3]);
    }
  }
  /* sitemap：配る頁（404 のほか）をすべて挙げ、対のある頁は三つの alternate を持ち、頁の頭の対と同じ。 */
  const sm = x['site/sitemap.xml'] || '', locs = [];
  for (const m of sm.matchAll(/<url><loc>([^<]+)<\/loc>((?:<xhtml:link [^>]+\/>)*)<\/url>/g)) {
    locs.push(m[1]);
    const t = x[urlToFile(m[1])];
    const sa = [...m[2].matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\/>/g)].map((z) => z[1] + ' ' + z[2]);
    if (!t) bad.push('sitemap に、無い頁がある：' + m[1]); else if (sa.join() !== altsOf(t).join()) bad.push('sitemap の対が頁の頭と違う：' + m[1]);
  }
  const served = html.filter((f) => !/^site\/404/.test(f)).map((f) => B.urlOf(pageOf(f), langOf(f))).sort();
  if (locs.slice().sort().join() !== served.join() || !/xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/.test(sm)) bad.push('sitemap が配る頁と合わない');
  /* 断り：冒頭の「This is a play.」、科学ではないこと、内輪ノリ・選民思想・代表の断り、別の枠だという断り、クラスの断り。 */
  for (const s of B.EN_PAGES) if (!PLAIN.includes(s) && !(x['src/' + s + '.en.md'] || '').includes(PLAYFUL_EN)) bad.push('src/' + s + '.en.md：冒頭の「This is a play.」');
  for (const [f, w] of Object.entries(NOT_SCIENCE_EN)) if (!(x[f] || '').includes(w)) bad.push(f + '：科学ではないという断り');
  for (const f of ['src/index.en.md', 'src/about.en.md']) for (const w of CAUTION_EN) if (!(x[f] || '').includes(w)) bad.push(f + '：' + w.slice(0, 24));
  if ((/^> [^\n]+\n> ([^\n]+)/m.exec(x['src/index.en.md'] || '') || [])[1] !== FRAME_EN) bad.push('英語のはじめにの断りの二行目が、別の枠だという断りでない');
  if (B.FRAME_EN !== FRAME_EN) bad.push('英語の上の帯の文が、決めた文と違う');
  for (const [f, says] of Object.entries(EN_SAYS)) for (const w of says) if (!(x[f] || '').includes(w)) bad.push(f + '：' + w.slice(0, 40));
  /* 英語のクラス表：断り、スキルの名は法則の英語の名、引く条の並び。 */
  const cls = (/const CLASS_EN = `([\s\S]*?)`;/.exec(x['build.js'] || '') || [, ''])[1];
  if (!cls.includes('<p class="cls-note">' + CLASS_NOTE_EN + ' It is not an advanced class, and it is no stronger or better than any other class.</p>')) bad.push('英語のクラス表：職業のたとえで、人を分ける区分ではなく、上位職でもないという断り');
  const skills = [...cls.matchAll(/<li><b>([^<]+)<\/b><span>[^<]*<\/span><i>Law (\d+)<\/i><\/li>/g)];
  if (skills.length !== 6 || skills.some(([, nm, n]) => LAW_EN[n - 1] !== nm)) bad.push('英語のクラス表のスキルの名が、法則の名と合わない');
  if (!/<b>Status<\/b>Quagmire: [^<]*\(Law 8\)/.test(cls)) bad.push('英語のクラス表：状態が Law 8 Quagmire でない');
  if ((cls.match(/Law \d+|Definition \d+/g) || []).join(' ') !== 'Definition 8 Law 5 Law 2 Law 3 Law 4 Law 6 Law 9 Law 10 Law 8') bad.push('英語のクラス表が引く条');
  if (!(x['src/index.en.md'] || '').includes('<!-- class -->')) bad.push('英語のはじめにのクラス表');
  /* 英語の原典：訳だという断り、行ごとに日本語の原文を一字一句そのまま添える。 */
  const ce = x['src/canon.en.md'] || '', ch = x['site/canon.en.html'] || '';
  for (const w of CANON_NOTE_EN) if (!ce.includes(w)) bad.push('英語の原典：訳だという断り（' + w.slice(0, 24) + '）');
  if (!ce.includes('> 〘' + PREFACE + '〙') || !ch.includes('<span lang="ja">' + PREFACE + '</span>')) bad.push('英語の原典：前書きの原文');
  const rows = ce.split('\n').filter((l) => /^\| (Definition|Law) \d+ \|/.test(l));
  const wantRows = DEFS.map(([, w, d], i) => ['Definition ' + (i + 1), w, d]).concat(LAWS.map(([, w, d], i) => ['Law ' + (i + 1), w, d]));
  if (rows.length !== wantRows.length) bad.push('英語の原典の行の数が ' + rows.length);
  wantRows.forEach(([n, w, d], i) => {
    const c = (rows[i] || '').split(' | ');
    if (c[0] !== '| ' + n || !(c[1] || '').endsWith('〘' + w + '〙') || c[3] !== '〘' + d + '〙 |' || !(c[2] || '').trim()) bad.push('英語の原典の ' + n + ' の原文が、原典の文と同じでない');
    if (!ch.includes('<td role="cell" data-col="Original"><span lang="ja">' + d + '</span></td>')) bad.push('英語の原典の頁に ' + n + ' の原文が無い');
  });
  /* 英語の原理：原文の行は、項ごとに日本語の版と一字一句同じ。 */
  const origOf = (md, P) => { const o = {}; const ls = (md || '').split('\n'); ls.forEach((l, i) => { const m = P.head(l); if (m && /^原文：/.test(ls[i + 1] || '')) o[m.kind + m.n] = ls[i + 1]; }); return o; };
  const oj = origOf(x['src/strict.md'], PV.ja), oe = origOf(x['src/strict.en.md'], PV.en);
  const oCount = (md) => ((md || '').match(/^原文：/mg) || []).length;
  if (JSON.stringify(oj) !== JSON.stringify(oe) || oCount(x['src/strict.en.md']) !== oCount(x['src/strict.md'])) bad.push('英語の原理の原文の行が、日本語の版と一字一句同じでない：' + Object.keys(oj).filter((k) => oj[k] !== oe[k]).join(','));
  if (oe.定義20 !== '原文：' + INTUITION) bad.push('英語の原理の定義二十の原文が、運営者の直観と一字一句同じでない');
  const sh = x['site/strict.en.html'] || '';
  for (const o of Object.values(oe)) if (!sh.includes('<span class="orig-k">Original</span><span lang="ja">' + o.slice(3) + '</span>')) bad.push('英語の原理の頁に、原文の札と原文が無い：' + o.slice(3, 20));
  /* 英語の原理の数は、模型と計算から（散文の数）。 */
  const se = x['src/strict.en.md'] || '';
  const fmt = (n) => BigInt(n).toLocaleString('en-US');
  const sol = mr.solids, last = sol.length - 1;
  const nums = [
    [sol.map((o, i) => (i === last ? 'and ' : '') + fmt(o.orbits) + ' for the ' + SOLID_EN[o.name]).join(', '), '定理十三の数'],
    ['The orders of the rotation groups are ' + sol.slice(0, -1).map((o) => o.order).join(', ') + ' and ' + sol[last].order + ', in that order.', '回転の群の位数'],
    ...sol.map((o) => [cap(SOLID_EN[o.name]) + ': (', '定理十三の式（' + o.name + '）', fmt(o.orbits * BigInt(o.order)) + '/' + o.order + ' = ' + fmt(o.orbits) + '.']),
    [sol.map((o) => SOLID_EN[o.name] + ' ' + o.order + ' = ' + o.faces + ' × ' + o.stabilizer).join(', ') + '.', '定理十四の数'],
    ...sol.map((o) => [cap(SOLID_EN[o.name]) + ': ' + o.verts + ' − ' + o.edges + ' + ' + o.faces + ' = ' + o.euler + '.', '定理十五の数（' + o.name + '）']),
    ['A regular icosahedron has ' + enWord(sol[last].faces) + ' faces, so for it there are 2²⁰, that is ' + (2 ** 20).toLocaleString('en-US') + ' ways.', '定理七の数'],
    ['all ' + enWord(mr.magic.M0count) + ' of the actions a_s (21 ≤ s ≤ 100)', '定理二十二の数'],
    ['by realizing ' + mr.immuneCount + ' records', '定理二十四の記録の数'],
    ['Every element has the shape of one of the ' + enWord(sol.length) + ' regular polyhedra.', '正多面体の数'],
    ['the ' + enWord(DEFS.length) + ' definitions and ' + enWord(LAWS.length) + ' laws of the canon', '原典の定義と法則の数'],
    ['Definition 10 and the ' + enWord(((x['src/strict.md'] || '').split('## 第二巻')[0].match(/^\*\*要請[一二三四五]　/mg) || []).length) + ' postulates were added in this version.', '第一巻の要請の数'],
  ];
  for (const [w, k, w2] of nums) if (w2 ? !se.split('\n').some((l) => l.startsWith(w) && l.includes(' = ' + w2)) : !se.includes(w)) bad.push('英語の原理の' + k + 'が計算と違う');
  if (!se.includes('in a ring-shaped network of four or more people') && !se.includes('In a ring-shaped network of four or more people') || !mr.ring.every(Boolean) || mr.ring3.some((c) => c !== 1)) bad.push('英語の原理の定理十八の人数');
  if ((se.match(/^\| M[₀-₉]+ \|/mg) || []).length !== 10) bad.push('英語の原理の定理九の表が十行でない');
  if ((se.match(/Q\.E\.D\.$/mg) || []).length !== 26) bad.push('英語の原理の証明が二十六でない');
  if (!/<nav class="toc"/.test(sh)) bad.push('site/strict.en.html：頁の中の目次が無い');
  /* はじめにの英語：原理の行は五つの巻を順に、決まりの行は決まりの頁を挙げ、原典の数。 */
  const ie = x['src/index.en.md'] || '';
  const prin = ie.split('\n').find((l) => l.startsWith('- [Principia](strict.en.html)')) || '';
  const booksE = (se.match(/^## Book [IVX]+\./mg) || []).map((l) => l.slice(3, -1));
  if (!booksE.length || (prin.match(/Book [IVX]+\b/g) || []).join() !== booksE.join()) bad.push('英語のはじめにの原理の行が、巻を順に挙げていない');
  const rulesE = (ie.split('\n').find((l) => l.startsWith('- [Rules](terms.en.html)')) || '').toLowerCase();
  for (const [s, , , top] of B.PAGES) if (!top && s !== 'about') { const t = (/^# (.+)$/m.exec(x['src/' + s + '.en.md'] || '') || [, B.SHORT_EN[s]])[1].toLowerCase(); if (!rulesE.includes(t)) bad.push('英語のはじめにの決まりの行に無い頁：' + s); }
  const nd = enWord(DEFS.length), nl = enWord(LAWS.length);
  for (const [f, w] of [['src/index.en.md', cap(nd) + ' definitions and ' + nl + ' laws.'], ['build.js', "canon: 'Canon · " + nd + ' definitions, ' + nl + " laws'"], ['build.js', cap(nd) + ' definitions, ' + nl + " laws.',"], ['src/guide.en.md', 'the ' + enWord(LAWS.length) + ' laws of the canon']]) if (!(x[f] || '').includes(w)) bad.push(f + '：原典の数の文（' + w.slice(0, 30) + '）');
  if ((x['src/guide.en.md'] || '').split('\n').filter((l) => /^\| Law \d+ /.test(l)).length !== LAWS.length) bad.push('英語の図鑑：法則の表が十行でない');
  /* 遊び場の英語：動かして、人の数・閾の幅・図の数・知らせの文を確かめる。 */
  const js = x['assets/play.js'] || '', PE = playOf(x, 'en'), pe = x['src/play.en.md'] || '';
  if (!/document\.documentElement\.getAttribute\('lang'\) === 'en'/.test(js)) bad.push('play.js が頁の lang を読まない');
  let sim = null, lo = null, hi = null;
  try { sim = simulatePlay(js, PE, { lang: 'en' }); lo = simulatePlay(js, PE, { first: 0, lang: 'en' }); hi = simulatePlay(js, PE, { first: 0.9999999, lang: 'en' }); } catch (e) { bad.push('英語の遊び場を動かせない：' + e.message); }
  if (sim) {
    const n = sim.people;
    for (const [f, w] of [['src/index.en.md', 'A game on the relationships of ' + n + ' people'], ['src/play.en.md', 'The playground below draws only the ' + n + ' people'], ['src/play.en.md', 'the same dot as the other ' + (n - 1) + ' people'], ['build.js', '<p class="small">Only the ' + n + ' people and the lines between neighbours can be seen.'], ['build.js', "play: 'A playground on " + n + ' people']]) if (!(x[f] || '').includes(w)) bad.push(f + '：英語の人の数が遊び場と違う（' + w.slice(0, 24) + '）');
    if (lo.threshold !== 18 || hi.threshold !== 36 || !pe.includes('it is set somewhere between ' + lo.threshold + ' and ' + hi.threshold + '.')) bad.push('英語の遊び場：閾の幅が頁の文と違う');
    const figs = (pe.match(/^!\[[^\]]+\]\(fig:[a-z0-9-]+\)$/mg) || []).length;
    if (!pe.includes('The ' + enWord(figs) + ' figures below')) bad.push('英語の遊び場：図の数が頁の文と違う（' + figs + '）');
    if (sim.valuemax !== hi.threshold) bad.push('英語の遊び場のメーターの上限が閾の上限と違う');
    if ([...sim.wizardWidths].join() !== '1' || [...sim.deeds].join() !== '0') bad.push('英語の遊び場：魔法使い自身の線が太るか、見える成果が 0 でない');
    if (sim.live.join() !== 'polite:on,off,off,off,off,off,polite:none') bad.push('英語の遊び場：自動で過ごすときの読み上げ');
    for (const [o, w] of [[lo, 'so this is an early switch.'], [hi, 'so this is a late switch.']]) if (!o.notes.some((t) => t.includes('reached the threshold of ' + o.threshold + ',') && t.includes(w))) bad.push('英語の遊び場：切り替わりの知らせが早い遅いを言わない');
    const jp = /[぀-ヿ一-鿿]/;
    if (sim.notes.concat(lo.notes, hi.notes, [sim.state, sim.autoLabel]).some((t) => jp.test(t))) bad.push('英語の遊び場の知らせに日本語がある');
    if (!PE.includes('<b id="state">not yet</b>') || !['not yet', 'switched'].includes(sim.state)) bad.push('英語の遊び場の状態の文');
    for (const m of PE.matchAll(/<button type="button" id="([a-z]+)">([^<]+)<\/button>/g)) if (!pe.split('\n').some((l) => /^\d+\. \*\*/.test(l) && l.includes('**' + m[2] + '**'))) bad.push('英語の遊び場のボタン「' + m[2] + '」が、遊び方の箇条にない');
    if (!PE.includes('<button type="button" id="auto">' + sim.autoLabel + '</button>')) bad.push('英語の遊び場：止めたあとのボタンの名が、頁のボタンの名と違う');
    if ((pe.match(/^\| Law (?:[2-9]|10) /mg) || []).length !== 9) bad.push('英語の遊び場：法則と働きの表が九行でない');
  }
  /* 図の文字の英語：表に無い日本語を残さず、形を色の名で指さない。図の番号は頁ごとに 1 から。 */
  /* 図の文字の英語の表は、build.js の文から読む（壊し方が build.js を変えて確かめられるように）。 */
  const figEn = [...((/const FIG_EN = \{([\s\S]*?)\n\};/.exec(x['build.js'] || '') || [, ''])[1]).matchAll(/: (?:'([^']*)'|"([^"]*)")/g)].map((m) => m[1] || m[2]);
  if (figEn.length !== Object.keys(B.FIG_EN).length) bad.push('図の文字の英語の表が読めない');
  for (const v of figEn) if (/\b(black|white|gold(en)?|silver|red|blue|green|gr[ae]y|navy)\b|colou?r/i.test(v)) bad.push('図の文字の英語が色の名で形を指す：' + v);
  for (const f of html.filter((k) => langOf(k) === 'en')) for (const m of x[f].matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)) if (/[぀-ヿ一-鿿＀-￯]/.test(m[1])) bad.push(f + '：図の文字に日本語が残る（' + m[1] + '）');
  for (const s of B.EN_PAGES) { const ns = [...(x['src/' + s + '.en.md'] || '').matchAll(/^!\[Figure (\d+) /mg)].map((m) => Number(m[1])); const nj = [...(x['src/' + s + '.md'] || '').matchAll(/^!\[図(\d+) /mg)].length; if (ns.some((k, i) => k !== i + 1) || ns.length !== nj) bad.push('src/' + s + '.en.md：図の番号が 1 から並ばないか、日本語の頁と数が違う'); }
  /* ほかの英語の頁から英語の原理へ飛ぶリンク：飛び先が英語の原理にあり、その名か見出しを指す。 */
  let jumps = 0;
  for (const f of html.filter((k) => langOf(k) === 'en' && k !== 'site/strict.en.html')) for (const m of x[f].matchAll(/<a href="strict\.en\.html#([a-z0-9-]+)">([^<]+)<\/a>/g)) {
    jumps++;
    const at = new RegExp('<(p|h2) id="' + m[1] + '">([\\s\\S]*?)</\\1>').exec(sh);
    if (!at || !at[2].replace(/<[^>]+>/g, '').replace(/^\s+/, '').startsWith(m[2])) bad.push(f + '：英語の原理へのリンク「' + m[2] + '」の飛び先が違う（#' + m[1] + '）');
  }
  if (jumps < 5) bad.push('ほかの英語の頁から英語の原理の項へ飛ぶリンクが少ない（' + jumps + '）');
  /* デザインに関する法的な扱いは、英語の頁の書体と図の文字の扱いを書く。 */
  for (const w of ['英語の頁では、本文と見出しの英字も Inter Tight で組みます。', '英語の頁の図と場面の中の文字は、`build.js` の FIG_EN の表で英語に替えて描きます。図のファイルは一つのままです。英語の文字も、形を色の名で指しません。']) if (!(x['src/design.md'] || '').includes(w)) bad.push('デザインに関する法的な扱い：' + w.slice(0, 24));
  /* README の英語：別の枠だという断り、クラスの断り、開示（2026-11-23）。 */
  for (const w of [FRAME_EN, CLASS_NOTE_EN, 'Claude is not an author.', "if the two differ, the Japanese one governs."]) if (!(x['README.en.md'] || '').includes(w)) bad.push('README.en.md：' + w.slice(0, 30));
  /* 断りと開示の英語：学術的な正文の DOI は確かめた一つだけ。 */
  const ah = x['site/about.en.html'] || '';
  if (!ah.includes(PAPER_LINK) || ah.split('doi.org').length !== 2) bad.push('英語の断りと開示：学術的な正文の DOI は、確かめた一つだけ');
  return bad;
}

/* 英語の決まりの頁（2026-11-23）。条文は写しの日本語のまま置き、英語は「Summary, not a translation」の札を付けた要約。
 * 日本語の頁と同じ条を引き、抜粋は同じ文を切り出す。日本語の頁に従うという断りを一度だけ置く。頁の数と事実は、日本語の頁（検査が事実と照らしたもの）と同じ。 */
const EN_LEGAL_SAYS = {
  'src/terms.en.md': ['These terms are governed by Japanese law.', 'Disputes not settled that way fall under the court that the law designates.', "These terms do not reduce the operator's responsibility beyond what the law allows.",
    'This site charges no one anything.', 'Changes that are unfavourable to readers are announced on this page, with what changes and the date it takes effect, before that date.',
    'Whether the same or similar names are registered as trademarks has not been searched in the Japan Patent Office database.', 'Using the text or figures of this site as material to pry into, make fun of, or blame anyone for their sexual experience.',
    'The operator does not speak for wizards.', 'Every page linked from the top menu and the footer shows a last-updated date, which is the date its main text last changed.', 'It is not elitism'],
  'src/privacy.en.md': ['The site collects nothing.', 'It asks readers nothing about themselves: not sexual experience, not age, not name.', 'For people without a GitHub account, or who do not make their contact details public, there is currently no private way to get in touch.',
    'The head of every page carries a Google Search Console ownership token', 'The pages send nothing to Google with this token.', 'What the operator can see in Search Console is statistics collected on the Google Search side'],
  'src/requests.en.md': ['The title and text of an issue opened by anyone other than the operator are passed to the language model only when the writer consents within that issue.', 'Comments are not passed to the language model.', 'that entry is removed from the current version before any decision is made.'],
  'src/legality.en.md': ["It records the operator's own understanding and is not legal advice to readers.", 'It has not been checked by a lawyer.', 'No statute text is written from memory.', 'Statutes are shown in the Japanese original only. The English under each one is a summary, not a translation.'],
  'src/design.en.md': ["It records the operator's own understanding and is not legal advice to readers.", 'It has not been checked by a lawyer.', 'No statute text is written from memory.', 'The English beside them is a summary, not a translation.',
    'This page decides neither that they do nor that they do not.', 'None of the licences has been changed.', 'Whether the same or similar names, or similar shapes, are registered as trademarks or designs has not been searched in the Japan Patent Office database.',
    'When a part changes, this page and the check are corrected in the same change (the same PR).', 'Inter Tight is the only typeface distributed.', 'The card carries no Japanese text',
    'The Japanese page and this English page are corrected together.'],
  'src/design.md': ['英語の頁（`src/design.en.md`）の表と文も、同じ変更で直します。'],
};
function legalEnVerdict(x) {
  const bad = [];
  let S = {};
  try { S = JSON.parse(x['verification/statutes-texts.json']); } catch (e) { bad.push('条文の写しが読めない'); }
  const T = S.texts || {};
  const unesc = (t) => t.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  if (B.EN_PAGES.slice().sort().join() !== B.PAGES.map(([s]) => s).sort().join()) bad.push('英語の頁の無い頁がある');
  for (const [f, says] of Object.entries(EN_LEGAL_SAYS)) for (const w of says) if (!(x[f] || '').includes(w)) bad.push(f + '：' + w.slice(0, 40));
  /* 日本語の頁に従うという断り：英語の決まりの頁に一度だけ。 */
  for (const f of Object.keys(x).filter((k) => /^site\/.+\.html$/.test(k))) {
    const n = (x[f].match(/<p class="langnote">/g) || []).length, want = langOf(f) === 'en' && B.RULE_PAGES.includes(pageOf(f)) ? 1 : 0;
    if (n !== want || (want && !x[f].includes('<p class="langnote">This page is an English version of a Japanese page. If the two differ, the Japanese page governs.</p>'))) bad.push(f + '：日本語の頁に従うという断り（' + n + '）');
  }
  /* 条文：英語の頁の日本語の引用は、どれも写しの文の一部で、その下に要約の札。日本語の頁と同じ条を、同じ切り出しで引く。 */
  for (const s of ['legality', 'design']) {
    const jm = x['src/' + s + '.md'] || '', em = x['src/' + s + '.en.md'] || '', eh = x['site/' + s + '.en.html'] || '';
    const jFull = [...jm.matchAll(/<!-- 条文 ([^>]+?) -->/g)].flatMap((m) => m[1].split('、').map((k) => k.trim()));
    const jEx = [...jm.matchAll(/<!-- 抜粋 ([^>]+?) -->/g)].map((m) => m[1].split('｜').map((z) => z.trim()));
    const eFull = [...em.matchAll(/<!-- statute ([^>]+?) -->/g)].map((m) => m[1].split('｜').map((z) => z.trim()));
    const eEx = [...em.matchAll(/<!-- excerpt ([^>]+?) -->/g)].map((m) => m[1].split('｜').map((z) => z.trim()));
    if (eFull.map((e) => e[0]).sort().join() !== jFull.slice().sort().join()) bad.push(s + '.en：全文で引く条が日本語の頁と違う');
    if (JSON.stringify(eEx.map((e) => [e[0], ...e.slice(2, -1)]).sort()) !== JSON.stringify(jEx.map((e) => [e[0], ...e.slice(2)]).sort())) bad.push(s + '.en：抜粋の条か切り出した文が日本語の頁と違う');
    for (const e of eFull.concat(eEx)) if (!e[e.length - 1] || /[぀-ヿ一-鿿]/.test(e[e.length - 1]) || e.length < 2) bad.push(s + '.en：' + e[0] + ' の英語の要約が無い');
    const blocks = [...eh.matchAll(/<h3[^>]*>([^\n]*?)<span lang="ja">（([^）]+)）<\/span><\/h3>\n<blockquote lang="ja">((?:<p>[^<]*<\/p>)+)<\/blockquote>\n(<p class="summary"><span class="sum-k">([^<]*)<\/span>[^<]+<\/p>)?/g)];
    if (blocks.length !== jFull.length + jEx.length || (eh.match(/<blockquote lang="ja">/g) || []).length !== blocks.length) bad.push(s + '.en：条文の数が ' + blocks.length);
    for (const b of blocks) {
      const k = b[2], t = T[k] || '';
      if (!t) bad.push(s + '.en：写しに無い条 ' + k);
      for (const q of [...b[3].matchAll(/<p>([^<]*)<\/p>/g)].map((m) => unesc(m[1]))) if (!t.includes(q)) bad.push(s + '.en：' + k + ' の引用が写しの文の一部でない');
      if (b[5] !== 'Summary, not a translation') bad.push(s + '.en：' + k + ' の英語に「Summary, not a translation」の札が無い');
      if (!b[1].startsWith(B.statuteEn(k))) bad.push(s + '.en：' + k + ' の英語の名');
    }
    if ((eh.match(/<p class="note">Source: /g) || []).length !== 1 || !eh.includes('commit ' + String((S.from || {}).commit || '').slice(0, 7) + ')') || !eh.includes('recorded by the operator on ' + S.recorded)) bad.push(s + '.en：条文の出どころ');
  }
  /* 適法性の説明：表は、引いた条をすべて挙げる。 */
  const le = x['src/legality.en.md'] || '';
  for (const k of ((/<!-- 条文 ([^>]+?) -->/.exec(x['src/legality.md'] || '') || [, ''])[1]).split('、').filter(Boolean)) {
    const [law, art] = k.split(' '), num = (/^第(\d+)条(?:の(\d+))?/.exec(art) || []).slice(1).filter(Boolean).join('-');
    if (!le.split('\n').some((l) => l.startsWith('| ' + B.LAW_EN[law] + ', Article') && new RegExp('\\b' + num + '\\b').test(l))) bad.push('legality.en：表に無い条 ' + k);
  }
  /* 求めと連絡：答える日の数は日本語の頁と同じ。 */
  const days = (/(\d+) 日以内に答える/.exec(x['src/requests.md'] || '') || [])[1];
  if (!days || !(x['src/requests.en.md'] || '').includes('The operator aims to reply within ' + days + ' days.')) bad.push('requests.en：答える日の数が日本語の頁と違う');
  /* デザインに関する法的な扱い：部品の表と、数と事実は、日本語の頁（designVerdict が事実と照らしたもの）と同じ。 */
  const dj = x['src/design.md'] || '', de = x['src/design.en.md'] || '';
  const rowsOf = (md) => md.split('\n').filter((l) => l.startsWith('| ') && !/^\| (部品|Part|---)/.test(l));
  const filesOf = (md) => rowsOf(md).flatMap((l) => [...(l.split(' | ')[1] || '').matchAll(/`([^`]+)`/g)].map((m) => m[1])).sort().join('\n');
  const have = x['#parts'].split('\n').filter(Boolean).sort().join('\n');
  if (filesOf(de) !== have || !rowsOf(de).some((l) => l.startsWith('| Footer seal | MARK in `build.js`'))) bad.push('design.en：部品の表とファイルが合わない');
  for (const l of rowsOf(de)) { const c = l.split(' | '); const f = c[1] || '', lic = c[3] || ''; const want = /\.woff2|OFL/.test(f) ? 'SIL Open Font License 1.1' : /\.(css|js)`/.test(f) && !/MARK/.test(f) ? 'MIT, as code' : 'CC BY 4.0, as a figure'; if (!lic.includes(want)) bad.push('design.en：部品の表の許諾が違う：' + f.slice(0, 30)); }
  for (const m of dj.matchAll(/SHA-256 は ([0-9a-f]{64})/g)) if (!de.includes('SHA-256 is ' + m[1])) bad.push('design.en：SHA-256 が日本語の頁と違う');
  for (const m of dj.matchAll(/(\d+)×(\d+) の PNG/g)) if (!de.includes('A ' + m[1] + '×' + m[2] + ' PNG')) bad.push('design.en：PNG の大きさが日本語の頁と違う');
  const get = (re) => (re.exec(dj) || []).slice(1);
  const [chars] = get(/収める字は (\d+) 字です。/), [asc, sym, list] = get(/ASCII の (\d+) 字（U\+0020〜U\+007E）と、記号の (\d+) 字（([^）]+)）です。/);
  if (!chars || !de.includes('It holds ' + chars + ' characters.') || !de.includes('They are the ' + asc + ' ASCII characters (U+0020 to U+007E) and ' + sym + ' symbols (' + String(list).split('、').join(', ') + ').')) bad.push('design.en：書体の字の数と範囲が日本語の頁と違う');
  const [ver] = get(/Inter Tight（Version ([\d.]+)）/), [chr] = get(/Chromium（版 ([\d.]+)）/);
  if (!ver || !de.includes('Inter Tight (Version ' + ver + ')') || !chr || !de.includes('Chromium (version ' + chr + ')')) bad.push('design.en：書体か Chromium の版が日本語の頁と違う');
  const [sch, fg, bg, r] = get(/いちばん低いのは、(明るい|暗い)配色の (--\w+) と (--\w+) の ([\d.]+) です。/);
  if (!r || !de.includes('The lowest is the ' + (sch === '明るい' ? 'light' : 'dark') + " scheme's " + fg + ' against ' + bg + ', at ' + r + '.')) bad.push('design.en：いちばん低い色の比が日本語の頁と違う');
  const [eye, c1, c2, r2] = get(/遊び場の網で、いちばん低いのは、(魔法使いの目|外の目)の (#[0-9a-f]+) と地の (#[0-9a-f]+) の ([\d.]+) です。/);
  if (!r2 || !de.includes("The lowest in the playground's network is the " + (eye === '外の目' ? 'outside view' : "wizard's view") + "'s " + c1 + ' against the ground ' + c2 + ', at ' + r2 + '.')) bad.push('design.en：遊び場の網の色の比が日本語の頁と違う');
  const [ms1, ms2] = get(/一日の間を (\d+) ミリ秒から (\d+) ミリ秒に延ばします/);
  if (!ms1 || !de.includes('lengthens each day from ' + ms1 + ' milliseconds to ' + ms2 + ' milliseconds.')) bad.push('design.en：遊び場の間が日本語の頁と違う');
  const nr = x['#raster'].split('\n').filter((f) => f && !f.startsWith('site/')).length;
  if (!de.includes('are only the ' + enWord(nr) + ' PNGs')) bad.push('design.en：ラスターの画像の数が違う');
  const [els] = get(/SVG は、(.+) の要素だけで組んでいます。/), elist = String(els).split('、');
  if (!els || !de.includes('built only from the elements ' + elist.slice(0, -1).join(', ') + ' and ' + elist[elist.length - 1] + '.')) bad.push('design.en：SVG の要素が日本語の頁と違う');
  for (const [jk, ek] of [['名指す書体', 'Named typefaces'], ['端末の標準の書体を指す語', "Words that point to the device's default typefaces"]]) { const [v] = get(new RegExp('^' + jk + '：(.+)。$', 'm')); if (!v || !de.includes(ek + ': ' + v.split('、').join(', ') + '.')) bad.push('design.en：' + ek + ' が日本語の頁と違う'); }
  for (const [, q] of DESIGN_QUOTES) if (!de.includes('〘「' + q + '」〙')) bad.push('design.en：「」で引く語句を日本語のまま置いていない：' + q.slice(0, 12));
  for (const q of OFL_QUOTES) if (!de.includes('> ' + q)) bad.push('design.en：許諾の文の引用が違う：' + q.slice(0, 20));
  const formal = '障害を理由とする差別の解消の推進に関する法律（障害者差別解消法）';
  if (!de.includes('〘' + formal + '〙')) bad.push('design.en：障害者差別解消法の正式の名');
  for (const a of AWAY) if (de.toLowerCase().includes(a)) bad.push('design.en：' + a);
  return bad;
}

/* デザインに関する法的な扱い（src/design.md、2026-11-22）。頁に書いた事実を、ファイルと照らして確かめる。
 * 部品の表がファイルと過不足なく合うこと、配る書体と名指すだけの書体、書体の名前表と字、SVG の要素、ラスターの画像が無いこと、
 * 文字の色の比、動きを減らす設定、代わりの文、フォーカスの輪、拡大、条文の抜粋と引用が写しの文と一字一句同じこと。 */
const DESIGN_ELEMENTS = ['svg', 'g', 'path', 'polygon', 'circle', 'ellipse', 'rect', 'line', 'text'];
const DESIGN_DRAWN = ['circle', 'line'];
const DESIGN_CODES = 'U+00B7、U+2013、U+2014、U+2018、U+2019、U+201C、U+201D、U+2026';
/* 頁の文が「」で引く、条文の語句。どれも写しの文の一部であること。 */
const DESIGN_QUOTES = [
  ['著作権法 第2条第1項第1号', '思想又は感情を創作的に表現したもの'],
  ['著作権法 第19条', 'すでに著作者が表示しているところに従つて著作者名を表示することができる'],
  ['意匠法 第2条', '機器の操作の用に供されるもの又は機器がその機能を発揮した結果として表示されるもの'],
  ['意匠法 第23条', '業として'],
  ['商標法 第25条', '指定商品又は指定役務について登録商標の使用をする権利を専有する'],
  ['不正競争防止法 第2条第1項第1号・第2号', '商品等表示'],
  ['不正競争防止法 第2条第1項第3号', '商品の形態'],
  ['不正競争防止法 第2条第1項第3号', '模倣した商品'],
  ['障害者差別解消法 第2条', '事業者'],
  ['障害者差別解消法 第2条', '商業その他の事業を行う者'],
  ['障害者差別解消法 第8条', '不当な差別的取扱い'],
  ['障害者差別解消法 第8条', '必要かつ合理的な配慮'],
];
/* 頁が許諾の文から引く英語の文。空白の折り返しを詰めて、許諾の文の一部であること。 */
const OFL_QUOTES = ['to use, study, copy, merge, embed, modify, redistribute, and sell modified and unmodified copies of the Font Software',
  'The requirement for fonts to remain under this license does not apply to any document created using the Font Software',
  '"Modified Version" refers to any derivative made by adding to, deleting, or substituting -- in part or in whole -- any of the components of the Original Version'];
/* PNG を読む（2026-11-23）。依存を足さずに、頭（IHDR）と、画素（IDAT を zlib で解き、行ごとの filter を戻したもの）を読む。8 bit の RGB と RGBA だけ。 */
function readPng(b64) {
  const buf = Buffer.from(b64 || '', 'base64');
  if (buf.length < 33 || buf.toString('latin1', 0, 8) !== '\x89PNG\r\n\x1a\n') throw new Error('PNG でない');
  let p = 8, w = 0, h = 0, depth = 0, ctype = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; ctype = d[9]; if (d[12]) throw new Error('飛び越しの PNG'); }
    if (type === 'IDAT') idat.push(d);
    p += 12 + len;
    if (type === 'IEND') break;
  }
  const bpp = { 2: 3, 6: 4 }[ctype];
  if (depth !== 8 || !bpp) throw new Error('8 bit の RGB か RGBA でない');
  const raw = require('zlib').inflateSync(Buffer.concat(idat)), stride = w * bpp, px = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? px[y * stride + i - bpp] : 0, b = y ? px[(y - 1) * stride + i] : 0, c = y && i >= bpp ? px[(y - 1) * stride + i - bpp] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
      if (pred === undefined) throw new Error('filter ' + f);
      px[y * stride + i] = (src[i] + pred) & 255;
    }
  }
  const at = (x, y) => '#' + [0, 1, 2].map((k) => px[y * stride + x * bpp + k].toString(16).padStart(2, '0')).join('');
  return { w, h, at, sha: require('crypto').createHash('sha256').update(buf).digest('hex') };
}
function contrast(a, b) {
  const L = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const x = L(a), y = L(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function designVerdict(x) {
  const bad = [];
  const md = x['src/design.md'] || '', h = x['site/design.html'] || '', css = (x['assets/style.css'] || '').replace(/\/\*[\s\S]*?\*\//g, '');
  let pages = [];
  try { pages = JSON.parse(x['#pages']); } catch (e) { /* 下で落ちる */ }
  if (!pages.some(([s, out, , top]) => s === 'design' && out === 'design' && top === false)) bad.push('デザインに関する法的な扱いが、下の欄の決まりの頁にない');
  if (!/^# デザインに関する法的な扱い$/m.test(md)) bad.push('頁の題');
  /* 部品の表：ファイルの欄に挙げたファイルと、リポジトリにある部品のファイルが、過不足なく同じ。 */
  const rows = md.split('\n').filter((l) => l.startsWith('| ') && !/^\| (部品|---)/.test(l));
  const listed = rows.flatMap((l) => [...(l.split(' | ')[1] || '').matchAll(/`([^`]+)`/g)].map((m) => m[1])).sort();
  const have = x['#parts'].split('\n').filter(Boolean);
  if (listed.join('\n') !== have.join('\n')) bad.push('部品の表とファイルが合わない：表だけ ' + listed.filter((f) => !have.includes(f)).join(',') + ' / ファイルだけ ' + have.filter((f) => !listed.includes(f)).join(','));
  if (new Set(listed).size !== listed.length) bad.push('部品の表に同じファイルが二度ある');
  if (!rows.some((l) => l.includes('`build.js` の MARK')) || !(x['build.js'] || '').includes("const MARK = '<svg")) bad.push('頁の上の印（build.js の MARK）');
  /* 許諾：利用規約のとおり。 */
  if (!x['src/terms.md'].includes('文（原典を含む）と図は、CC BY 4.0 で使えます。コードは MIT です。')) bad.push('利用規約の、図とコードの許諾');
  for (const l of rows) { const c = l.split(' | '); const f = c[1] || '', lic = c[3] || ''; const want = /\.woff2|OFL/.test(f) ? 'SIL Open Font License 1.1' : /\.(css|js)`/.test(f) && !/MARK/.test(f) ? 'コードとして MIT' : '図として CC BY 4.0'; if (!lic.includes(want)) bad.push('部品の表の許諾が違う：' + f.slice(0, 30)); }
  /* 配る書体：@font-face は Inter Tight を自分のファイルから読む一つだけ。 */
  const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
  if (faces.length !== 1 || !/font-family:\s*"Inter Tight"/.test(faces[0]) || !/src:\s*url\(intertight\.woff2\)/.test(faces[0])) bad.push('配る書体が Inter Tight 一つでない');
  if (!md.includes('配る書体は Inter Tight だけです。')) bad.push('頁：配る書体');
  /* 名指すだけの書体：style.css の書体の並びと、GitHub で見る図の指定から読む。 */
  const stacks = [...css.matchAll(/(?:--display|--serif|--sans|font-family)\s*:\s*([^;}]+)/g), ...String(B.FIG_STYLE).matchAll(/font-family:([^;}]+)/g)].map((m) => m[1]).filter((v) => !/var\(/.test(v));
  const names = [...new Set(stacks.flatMap((v) => v.split(',').map((t) => t.trim().replace(/^"|"$/g, ''))))].filter((t) => t !== 'Inter Tight');
  const GENERIC = ['system-ui', '-apple-system', 'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'ui-sans-serif', 'ui-serif', 'ui-monospace'];
  const fam = names.filter((t) => !GENERIC.includes(t)).sort(), gen = names.filter((t) => GENERIC.includes(t)).sort();
  const line = (k) => ((new RegExp('^' + k + '：(.+)。$', 'm').exec(md) || [, ''])[1]).split('、').filter(Boolean).sort();
  if (line('名指す書体').join() !== fam.join()) bad.push('名指す書体の並びが style.css と合わない：' + fam.join(','));
  if (line('端末の標準の書体を指す語').join() !== gen.join()) bad.push('端末の標準の書体を指す語が style.css と合わない：' + gen.join(','));
  /* 書体の名前表と字。 */
  let F = {};
  try { F = JSON.parse(x['#font']); } catch (e) { /* 下で落ちる */ }
  const N = F.names || {}, codes = F.codes || [];
  if (!String(N[0] || '').startsWith('Copyright 2022 The Inter Project Authors')) bad.push('書体の名前表：著作権の欄');
  if (!String(N[13] || '').includes('SIL Open Font License, Version 1.1')) bad.push('書体の名前表：許諾の欄');
  if (N[1] !== 'Inter Tight' || N[5] !== 'Version 3.004' || !md.includes('Inter Tight（Version 3.004）')) bad.push('書体の名前表：名と版');
  if (!/trademark/.test(N[7] || '') || !/\bInter\b/.test(N[7] || '')) bad.push('書体の名前表：商標の記載');
  const ascii = codes.filter((c) => c >= 0x20 && c <= 0x7e), rest = codes.filter((c) => c < 0x20 || c > 0x7e);
  const u = (c) => 'U+' + c.toString(16).toUpperCase().padStart(4, '0');
  if (!md.includes('収める字は ' + codes.length + ' 字です。') || codes.length !== 103) bad.push('書体の字の数が頁と違う：' + codes.length);
  if (ascii.length !== 95 || !md.includes('ASCII の ' + ascii.length + ' 字（U+0020〜U+007E）と、記号の ' + rest.length + ' 字（' + rest.map(u).join('、') + '）です。') || rest.map(u).join('、') !== DESIGN_CODES) bad.push('書体の字の範囲が頁と違う');
  if (codes.some((c) => c >= 0x3000)) bad.push('書体に、かなや漢字がある');
  /* 許諾の文：予約された書体名の定めが無く、引いた文が許諾の文にある。 */
  const ofl = x['assets/OFL-InterTight.txt'] || '';
  if (/Reserved Font Name/.test(ofl.split('This Font Software is licensed')[0])) bad.push('許諾の文の著作権の行に、予約された書体名がある');
  const flat = ofl.replace(/\s+/g, ' ');
  for (const q of OFL_QUOTES) if (!flat.includes(q) || !md.includes('> ' + q)) bad.push('許諾の文の引用が違う：' + q.slice(0, 20));
  if (!x['src/about.md'].includes('Inter Tight（Copyright 2022 The Inter Project Authors、')) bad.push('断りと開示の、書体の著作者名');
  /* SVG：決めた要素だけで組み、ほかのファイルを参照しない。 */
  const svgs = ['src/hero.svg.part', ...Object.keys(x).filter((f) => /^assets\/.+\.svg$/.test(f) || /^src\/figs\/.+\.svg$/.test(f))].map((f) => [f, x[f] || '']).concat([['build.js の MARK', String(B.MARK)]]);
  const used = new Set();
  for (const [f, t] of svgs) {
    if (!t) bad.push(f + ' が読めない');
    for (const m of t.matchAll(/<([a-zA-Z][\w:-]*)/g)) used.add(m[1]);
    if (/href|<image|<use|<foreignObject|base64|url\(|@import/i.test(t)) bad.push(f + '：ほかのファイルか画像を参照している');
  }
  if ([...used].sort().join() !== [...DESIGN_ELEMENTS].sort().join()) bad.push('SVG の要素が頁と違う：' + [...used].sort().join(','));
  if (!md.includes('SVG は、' + DESIGN_ELEMENTS.join('、') + ' の要素だけで組んでいます。')) bad.push('頁：SVG の要素');
  const drawn = [...new Set([...(x['assets/play.js'] || '').matchAll(/\bel\('([a-z]+)'/g)].map((m) => m[1]))].sort();
  if (drawn.join() !== DESIGN_DRAWN.join() || /createElement(?!NS\(ns, name\))/.test(x['assets/play.js'] || '') || !md.includes('遊び場のスクリプトが描く要素は、circle と line だけです。')) bad.push('遊び場のスクリプトが描く要素：' + drawn.join(','));
  /* 図の中の文字は、形を色の名で指さない（2026-11-23）。図の線の色は、暗い配色で明るく変わる。 */
  for (const f of Object.keys(x).filter((k) => /^src\/figs\/.+\.svg$/.test(k) || k === 'src/hero.svg.part')) for (const m of (x[f] || '').matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)) if (/[黒白金銀赤青緑灰紺]|色/.test(m[1])) bad.push(f + '：図の文字が色の名で形を指す（' + m[1] + '）');
  if (!md.includes('図の中の文字は、形を色の名で指しません。')) bad.push('頁：図の文字と色の名');
  /* 遊び場の網の色（2026-11-23）：動かして描いた線と点の色と、二つの目の地の色の比は 3 以上（WCAG 1.4.11）。地と同じ塗りは、地として除く。 */
  const eyeBg = (w) => ((new RegExp('\\.eye\\.' + w + ' \\{ background: (#[0-9a-f]{6}); \\}').exec(css)) || [, ''])[1];
  let netLow = null;
  try {
    const sim = simulatePlay(x['assets/play.js'] || '', playOf(x));
    for (const w of ['inner', 'outer']) {
      const bg = eyeBg(w);
      if (!bg) { bad.push('遊び場の ' + w + ' の地の色が読めない'); continue; }
      for (const c of sim.colors[w]) {
        const col = c.replace(/^fill:/, '');
        if (!/^#[0-9a-f]{6}$/.test(col)) { bad.push('遊び場の網の色が読めない：' + c); continue; }
        if (col === bg) continue;
        const r = contrast(col, bg);
        if (r < 3) bad.push('遊び場の網の ' + col + ' と地の ' + bg + ' の比が 3 より低い：' + r.toFixed(2));
        if (!netLow || r < netLow.r) netLow = { r, at: (w === 'inner' ? '魔法使いの目' : '外の目') + 'の ' + col + ' と地の ' + bg };
      }
    }
  } catch (e) { bad.push('遊び場のスクリプトを動かせない：' + e.message); }
  if (!netLow || !md.includes('遊び場の網の線と点の色と、二つの目の地の色の比は、3 以上です。遊び場の網で、いちばん低いのは、' + netLow.at + ' の ' + netLow.r.toFixed(2) + ' です。')) bad.push('頁の、遊び場の網の色の比が計算と違う：' + (netLow ? netLow.at + ' ' + netLow.r.toFixed(2) : ''));
  /* 本文へ飛ぶつなぎと印刷は、頁の文のとおり（つなぎと印刷の中身は、約束の検査が頁と style.css で見る）。 */
  for (const w of ['どの頁にも、本文へ飛ぶつなぎ（「本文へ」）を、頁の初めに置いています。', '印刷では、上の帯と上の欄とクラス表を、白地の黒字にします。']) if (!md.includes(w)) bad.push('頁：' + w.slice(0, 16));
  /* ラスターの画像は、共有のカードとホーム画面のアイコンの二枚と、site/assets のその写しだけ（2026-11-23 まで一枚もなかった）。 */
  const RASTER = ['assets/apple-touch-icon.png', 'assets/card.png'];
  if (x['#raster'] !== RASTER.concat(RASTER.map((f) => 'site/' + f)).sort().join('\n')) bad.push('ラスターの画像が決めた二枚とその写しでない：' + x['#raster'].split('\n').join(','));
  if (!md.includes('ラスターの画像（PNG、JPEG、GIF、WebP、ICO など）は、共有のカード（`assets/card.png`）とホーム画面のアイコン（`assets/apple-touch-icon.png`）の' + KANJI_N[RASTER.length] + '枚だけです。')) bad.push('頁：ラスターの画像の数');
  /* 二枚の PNG：大きさ、SHA-256 が部品の表のとおり、四隅が上の欄の夜の黒、金の画素がある。 */
  const mast = Object.fromEntries([...((/:root\s*\{([^}]*)\}/.exec(css) || [, ''])[1]).matchAll(/--([a-z]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
  for (const [f, w, hh] of [['assets/card.png', 1200, 630], ['assets/apple-touch-icon.png', 180, 180]]) {
    let im = null;
    try { im = readPng(x['#png:' + f]); } catch (e) { bad.push(f + ' が読めない：' + e.message); continue; }
    if (im.w !== w || im.h !== hh) bad.push(f + ' の大きさが ' + im.w + '×' + im.h);
    const row = rows.find((l) => l.split(' | ')[1] === '`' + f + '`') || '';
    if (!row.includes(w + '×' + hh + ' の PNG') || !row.includes('SHA-256 は ' + im.sha + ' |')) bad.push(f + '：部品の表の大きさか SHA-256 が、ファイルと違う');
    if ([[0, 0], [im.w - 1, 0], [0, im.h - 1 - 14], [im.w - 1, im.h - 1 - 14]].some(([a, b]) => im.at(a, b) !== mast.mastbg)) bad.push(f + '：隅が上の欄の夜の黒でない');
    let gold = 0;
    const g = mast.mastgold || '#000000', near = (c) => [1, 3, 5].every((k) => Math.abs(parseInt(c.slice(k, k + 2), 16) - parseInt(g.slice(k, k + 2), 16)) <= 6);
    for (let yy = 0; yy < im.h; yy += 2) for (let xx = 0; xx < im.w; xx += 2) if (near(im.at(xx, yy))) gold++;
    if (gold * 4 < im.w * im.h * 0.01) bad.push(f + '：金の色の画素が少ない（' + gold + '）');
  }
  /* カードの文字は英字だけで、配る書体の収める字のうちにある。描くスクリプトが読むのは、assets の部品だけ。 */
  const cj = x['tools/card.js'] || '';
  const words = (/const WORDS = \{([^}]*)\}/.exec(cj) || [, ''])[1];
  const chars = [...words.matchAll(/: '([^']*)'/g)].map((m) => m[1]).join('');
  if (!chars || [...chars].some((ch) => !codes.includes(ch.codePointAt(0)))) bad.push('カードの文字に、配る書体の収めない字がある：' + chars);
  for (const m of cj.matchAll(/\bA\('([^']+)'\)|svg\('([^']+)'\)/g)) if (!x['#assets'].split('\n').some((l) => l.startsWith((m[1] || m[2]) + ' '))) bad.push('tools/card.js が assets に無いものを読む：' + (m[1] || m[2]));
  if (/https?:\/\/(?!www\.w3\.org)/.test(cj.replace(/\/\*[\s\S]*?\*\//g, ''))) bad.push('tools/card.js が外を読む');
  if (!md.includes('カードには和文を置いていません。')) bad.push('頁：カードに和文を置かない');
  /* 文字の色の比：明るい配色と暗い配色の、四つの文字の色と二つの地の色。 */
  const tok = (block) => Object.fromEntries([...block.matchAll(/--([a-z]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
  const light = tok((/:root\s*\{([^}]*)\}/.exec(css) || [, ''])[1]);
  const dark = tok((/@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]*)\}/.exec(css) || [, ''])[1]);
  let low = null;
  for (const [nm, set] of [['明るい配色', light], ['暗い配色', dark]]) for (const fg of ['ink', 'muted', 'accent', 'gold']) for (const bg of ['bg', 'tint']) {
    if (!set[fg] || !set[bg]) { bad.push(nm + 'の --' + fg + ' か --' + bg + ' が読めない'); continue; }
    const r = contrast(set[fg], set[bg]);
    if (r < 4.5) bad.push(nm + 'の --' + fg + ' と --' + bg + ' の比が 4.5 より低い：' + r.toFixed(2));
    if (!low || r < low.r) low = { r, at: nm + 'の --' + fg + ' と --' + bg };
  }
  /* 上の欄（2026-11-22）：どちらの配色でも同じ夜の黒の地に、三つの文字の色。 */
  for (const fg of ['mastink', 'mastmuted', 'mastgold']) {
    if (!light[fg] || !light.mastbg || dark[fg] || dark.mastbg) { bad.push('上の欄の --' + fg + ' か --mastbg が読めないか、暗い配色で変えている'); continue; }
    const r = contrast(light[fg], light.mastbg);
    if (r < 4.5) bad.push('上の欄の --' + fg + ' と --mastbg の比が 4.5 より低い：' + r.toFixed(2));
    if (r < low.r) low = { r, at: '上の欄の --' + fg + ' と --mastbg' };
  }
  if (!md.includes('上の欄の文字の色（--mastink、--mastmuted、--mastgold）と地の色（--mastbg）の比も 4.5 以上です。')) bad.push('頁：上の欄の色の比');
  if (!low || !md.includes('いちばん低いのは、' + low.at + ' の ' + low.r.toFixed(2) + ' です。')) bad.push('頁の、いちばん低い色の比が計算と違う：' + (low ? low.at + ' ' + low.r.toFixed(2) : ''));
  /* 動きを減らす設定：animation を持つ規則は、どれも設定のときに止まる。場面の切り替えの移り変わりも止まる。 */
  const rmBlocks = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\)\s*\{((?:\s*[^{}]+\{[^{}]*\})*)\s*\}/g)].map((m) => m[1]);
  const rules = (t) => [...t.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].split(',').map((z) => z.trim()), body: m[2] }));
  const rest2 = css.replace(/@media \(prefers-reduced-motion: reduce\)\s*\{((?:\s*[^{}]+\{[^{}]*\})*)\s*\}/g, '');
  const stopA = new Set(rmBlocks.flatMap((b) => rules(b).filter((r) => /animation:\s*none/.test(r.body)).flatMap((r) => r.sel)));
  const stopT = new Set(rmBlocks.flatMap((b) => rules(b).filter((r) => /transition:\s*none/.test(r.body)).flatMap((r) => r.sel)));
  const animated = rules(rest2).filter((r) => /(^|;)\s*animation:\s*(?!none)/.test(r.body)).flatMap((r) => r.sel).filter((z) => !z.startsWith('@'));
  if (!animated.length) bad.push('animation を持つ規則が見つからない（読み方の誤り）');
  for (const z of animated) if (!stopA.has(z)) bad.push('動きを減らす設定で止まらない animation：' + z);
  if (!stopT.has('.scene .layer')) bad.push('動きを減らす設定で、場面の切り替えの移り変わりが止まらない');
  if (!/reduce \? 1500 : 800\)/.test(x['assets/play.js'] || '') || !md.includes('一日の間を 800 ミリ秒から 1500 ミリ秒に延ばします。')) bad.push('遊び場の、動きを減らす設定のときの間');
  /* 代わりの文、フォーカスの輪、拡大。生成したすべての頁で。 */
  for (const f of Object.keys(x).filter((k) => /^site\/.+\.html$/.test(k))) {
    const t = x[f];
    for (const m of t.matchAll(/<img\b[^>]*>/g)) if (!/\salt="[^"]+"/.test(m[0])) bad.push(f + '：alt の無い img');
    for (const m of t.matchAll(/<svg\b[^>]*>/g)) if (!/aria-hidden="true"/.test(m[0]) && !(/role="img"/.test(m[0]) && /aria-label="[^"]+"/.test(m[0]))) bad.push(f + '：代わりの文も aria-hidden も無い svg');
    const vp = (/<meta name="viewport" content="([^"]*)">/.exec(t) || [, null])[1];
    if (vp === null || /maximum-scale|user-scalable|minimum-scale/.test(vp)) bad.push(f + '：拡大を止める viewport');
  }
  if (!/(^|\})\s*:focus-visible\s*\{\s*outline:\s*2px solid/.test(css) || /:focus-visible\s*\{[^}]*outline:\s*(none|0)/.test(css.replace('.p-index main > ul > li > a:focus-visible { outline: none; }', ''))) bad.push('フォーカスの輪');
  if (!css.includes('.p-index main > ul > li:has(a:focus-visible) { outline: 2px solid')) bad.push('はじめにの目次で、フォーカスの輪を項に描いていない');
  /* 条文：引いた条はすべて写しにあり、抜粋は写しの文の一部で、頁に原文のまま出る。出どころのコミットを書く。 */
  let S = {};
  try { S = JSON.parse(x['verification/statutes-texts.json']); } catch (e) { bad.push('条文の写しが読めない'); }
  const T = S.texts || {};
  const full = [...md.matchAll(/<!-- 条文 ([^>]+?) -->/g)].flatMap((m) => m[1].split('、').map((k) => k.trim()));
  const ex = [...md.matchAll(/<!-- 抜粋 ([^>]+?) -->/g)].map((m) => m[1].split('｜').map((z) => z.trim()));
  for (const k of full) { if (!T[k]) bad.push('写しに無い条：' + k); else if (!h.includes(B.inline(T[k]).replace(/<[^>]+>/g, ''))) bad.push('頁に原文が無い：' + k); }
  for (const [k, where, ...ps] of ex) {
    if (!T[k]) { bad.push('写しに無い条：' + k); continue; }
    if (!where || !ps.length) bad.push('抜粋の形：' + k);
    for (const q of ps) { if (!T[k].includes(q)) bad.push('抜粋が写しの文に無い：' + k); else if (!h.includes('<p>' + B.inline(q).replace(/<[^>]+>/g, '') + '</p>')) bad.push('頁に抜粋が無い：' + k); }
    if (!h.includes('長い条なので、' + where + 'だけを、写しの文から一字一句そのまま切り出しています。')) bad.push('抜粋の断り：' + k);
  }
  const cited = new Set(full.concat(ex.map((e) => e[0])));
  for (const k of ['著作権法 第2条第1項第1号', '著作権法 第10条第1項第4号', '著作権法 第19条', '著作権法 第20条', '意匠法 第2条', '意匠法 第23条', '商標法 第25条', '不正競争防止法 第2条第1項第1号・第2号', '不正競争防止法 第2条第1項第3号', '障害者差別解消法 第2条', '障害者差別解消法 第8条']) if (!cited.has(k)) bad.push('頁の文が拠る条を引いていない：' + k);
  for (const [k, q] of DESIGN_QUOTES) if (!(T[k] || '').includes(q) || !md.includes('「' + q + '」')) bad.push('頁が「」で引く語句が写しと違う：' + q.slice(0, 16));
  if ((h.match(/<p class="note">出どころ：/g) || []).length !== 1 || !h.includes('コミット ' + String((S.from || {}).commit || '').slice(0, 7) + '）') || String((S.from || {}).commit || '').slice(0, 7) !== '85dd680' || !h.includes('運営者が ' + S.recorded + ' に記した文の写し')) bad.push('条文の出どころ（コミットと記した日）');
  const formal = '障害を理由とする差別の解消の推進に関する法律（障害者差別解消法）';
  if (md.indexOf(formal) < 0 || md.indexOf('障害者差別解消法') < md.indexOf(formal)) bad.push('障害者差別解消法の正式の名を、初めに書いていない');
  /* 研究の系列と、ほかの遊びの国の名を出さない（決めごと 4）。 */
  for (const a of AWAY) if (md.toLowerCase().includes(a) || h.toLowerCase().includes(a)) bad.push('デザインの頁：' + a);
  return bad;
}

console.log('\n1. 約束・原典・外への要求・生成物');
const real = files();
const now = verdict(real);
ok('原典の定義九つと法則十が一字一句そのまま、どの頁も遊びと断り、科学ではないと書き、下の欄に断りと開示、CSP、外へ読みに行かず、研究の系列につながず、遊び場は何も送らず残さず、生成物が元と同じ。404 は根から書き、目次・最終更新・本文へのつなぎ・原理へのリンクがあり、散文の数が遊び場を動かした数と同じ', now.length === 0, now.slice(0, 6).join(' / '));

console.log('\n2. 壊して確かめる');
const mut = (f, a, b) => Object.assign({}, real, { [f]: String(real[f]).replace(a, b) });
const breaks = [
  ['原典の一字を変える', mut('src/canon.md', '負は消えない。蓄積する。', '負は消える。')],
  ['原典の法則を一つ外す', mut('src/canon.md', /\| 第八法則[^\n]+\n/, '')],
  ['原典の前書きを外す', mut('src/canon.md', '> ' + PREFACE, '')],
  ['頁の冒頭の断りを外す', mut('src/guide.md', PLAYFUL, '>')],
  ['科学ではないという断りを外す', mut('src/faq.md', NOT_SCIENCE['src/faq.md'], '')],
  ['性経験を評価しないという断りを外す', mut('src/about.md', '誰の性経験も評価しません。', '')],
  ['下の欄の断りを外す', mut('site/index.html', B.FOOT, '')],
  ['開示を外す', mut('site/play.html', DISCLOSE[0], '')],
  ['外の画像を読む', mut('site/guide.html', '</main>', '<img src="https://example.com/x.png" alt=""></main>')],
  ['研究の頁へつなぐ', mut('site/about.html', '</main>', '<a href="https://cpsbvbng26-dotcom.github.io/">研究</a></main>')],
  ['遊び場が数を送る', mut('assets/play.js', 'day += 1;', "day += 1; fetch('/x');")],
  ['遊び場が蓄積を残す', mut('assets/play.js', 'stock += negs.length;', "stock += negs.length; localStorage.setItem('s', stock);")],
  ['人に属性を付ける', mut('assets/play.js', 'var N = 8, pos = [];', "var N = 8, pos = [], gender = [];")],
  ['属性を付けないという断りを外す', mut('src/play.md', '人には、名前も年齢も性別も、どんな属性も付けていません。', '')],
  ['法則と働きの表から一行外す', mut('src/play.md', /\| 第六法則 還元 [^\n]+\n/, '')],
  ['見える成果を数える', mut('assets/play.js', "$('deeds').textContent = '0';", "$('deeds').textContent = String(deeds);")],
  ['生成した頁を手で直す', mut('site/faq.html', '何かが起きるとは、原典のどこにも', '何かが起きると、原典の')],
  ['頁の中に style を書く', mut('site/canon.html', '<main id="main">', '<main id="main" style="color:red">')],
  ['準拠法を外す', mut('src/terms.md', 'この決まりは日本法に準拠します。', '')],
  ['責任を軽くする', mut('src/terms.md', 'この決まりは、法令が認める以上に運営者の責任を軽くしません。', '運営者は一切の責任を負いません。')],
  ['集めると書く', mut('src/privacy.md', 'サイトは、何も集めません。', 'サイトは、アクセスを解析します。')],
  ['同意なく issue を言語モデルに渡す', mut('src/requests.md', '書いた人がその issue の中で同意したときだけ、', '')],
  ['弁護士の確認の断りを外す', mut('src/legality.md', '弁護士の確認は受けていません。', '')],
  ['条文の写しを手で変える', mut('verification/statutes-texts.json', '三年以下の拘禁刑', '二年以下の拘禁刑')],
  ['写しに無い条を引く', mut('src/legality.md', '民法 第548条の2 -->', '民法 第548条の2、刑法 第999条 -->')],
  ['頁の条文を手で変える', mut('site/legality.html', '公然と人を侮辱した者は', '人を侮辱した者は')],
  ['原理の定理を一つ外す', mut('src/strict.md', '**定理六　', '定理六　')],
  ['原理の原文を一字変える', mut('src/strict.md', '原文：負は消えない。蓄積する。', '原文：負は消えない。')],
  ['原理の第十法則を逆さにする', mut('src/strict.md', '長く生くるは難し。', '長く生くるは易し。')],
  ['原理の定理十三の数を違える', mut('src/strict.md', '正二十面体 17,824 通り', '正二十面体 17,842 通り')],
  ['原理の定理十三の式を違える', mut('src/strict.md', '552/24 = 23。', '552/24 = 22。')],
  ['原理の独立の表から一行外す', mut('src/strict.md', /\| M₈ \|[^\n]+\n/, '')],
  ['原理から第十法則の注の役を外す', mut('src/strict.md', '注。この版は、第一巻の第十法則の注から、L を外より見えざるものと読む。', '')],
  ['原理の定理十五の数を違える', mut('src/strict.md', '正十二面体：20 − 30 + 12 = 2。', '正十二面体：20 − 30 + 12 = 3。')],
  ['原理の定理十四の数を違える', mut('src/strict.md', '正十二面体 60 = 12 × 5', '正十二面体 60 = 12 × 4')],
  ['原理の定理十八の人数を違える', mut('src/strict.md', '人の四人以上なる時', '人の三人以上なる時')],
  ['原理の第三巻から属性の断りを外す', mut('src/strict.md', '人の属性は、どこにも置かない。', '')],
  ['原理の定理二十二の数を違える', mut('src/strict.md', 'の八十がみな', 'の九十がみな')],
  ['原理から魔法の結語を外す', mut('src/strict.md', '結語。魔法とは、負を、その逆の正に転じ、見えざる関係へ還すことである。', '')],
  ['運営者の直観を一字変える', mut('src/strict.md', '原文：' + INTUITION, '原文：' + INTUITION.replace('存在してはならない', '存在できない'))],
  ['原理の定理二十四の記録の数を違える', mut('src/strict.md', 'で、百十二の記録を', 'で、百二十の記録を')],
  ['原理から第五巻の結語を外す', mut('src/strict.md', '結語。魔法が知の内に在り得ないのは、', '魔法が知の内に在り得ないのは、')],
  ['原理の定理七の数を違える', mut('src/strict.md', '1,048,576 通り', '1,048,567 通り')],
  ['原理から値の要請を外す', mut('src/strict.md', '**要請二　値**　人の値は、魔法使ひたると否と、童貞たると否とに由らず。', '**要請二　値**　魔法使ひは尊し。')],
  ['厳密版を原典と称する', mut('src/strict.md', 'この版は、運営者の求めで Claude が書いたものです。原典ではありません。', 'この版が原典です。')],
  ['決まりの頁へのつなぎを外す', mut('site/faq.html', '<a href="privacy.html">', '<a href="x.html">')],
  ['内輪ノリの断りを外す', mut('src/index.md', 'これは内輪ノリであり、気分を害する方がいる可能性があります。ご注意ください。', '')],
  ['選民思想の断りを外す', mut('src/about.md', '選民思想ではありません。', '')],
  ['代表の断りを外す', mut('site/guide.html', '運営者は魔法使いの代表ではありません。', '')],
  ['論文の DOI をもう一つ足す', mut('site/about.html', '</main>', '<a href="https://doi.org/10.5281/zenodo.99999999">x</a></main>')],
  ['研究の頁へ、正文の例外の外でつなぐ', mut('site/faq.html', '</main>', '<a href="https://doi.org/10.5281/zenodo.23114131">x</a></main>')],
  ['英語の版の DOI を確かめずに書く', mut('src/about.md', 'その DOI は、ここには書いていません。確かめていないためです。', 'DOI は 10.5281/zenodo.0 です。')],
  ['外のスクリプトを読む', mut('site/play.html', '<script src="assets/play.js" defer></script>', '<script src="https://cdn.example.com/x.js"></script>')],
  ['学術的な活動とは別の枠だという断りを外す', mut('src/index.md', FRAME, '')],
  ['上の帯を外す', mut('site/strict.html', /<aside class="frame"[^\n]+\n/, '')],
  ['上の帯の文を弱める', mut('site/terms.html', '<span class="say">' + FRAME, '<span class="say">これは娯楽です。')],
  ['下の欄の、別の枠だという断りを外す', Object.assign({}, real, { 'site/faq.html': real['site/faq.html'].split('<footer>')[0] + '<footer>' + real['site/faq.html'].split('<footer>')[1].replace('運営者の学術的な活動とは別の、エンターテインメントの枠です。', '') })],
  ['下の欄から「科学の法則ではなく」を外す', Object.assign({}, real, { 'site/guide.html': real['site/guide.html'].split('<footer>')[0] + '<footer>' + real['site/guide.html'].split('<footer>')[1].replace('科学の法則ではなく、', '') })],
  ['下の欄を消す', mut('site/privacy.html', /<footer>[\s\S]*<\/footer>/, '')],
  ['上の帯を見た目で隠す', mut('assets/style.css', '/* 上の帯：娯楽の枠 */', '/* 上の帯：娯楽の枠 */\n.frame { display: none; }')],
  ['はじめにの断りの行を入れ替える', mut('src/index.md', '> これは遊びです。\n> ' + FRAME, '> ' + FRAME + '\n> これは遊びです。')],
  ['クラス表の断りを外す', mut('build.js', '<p class="cls-note">' + CLASS_NOTE, '<p class="cls-note">')],
  ['クラスを上位職にする', mut('build.js', '上位職ではなく、ほかのクラスより強くも偉くもありません。', '最上位の職です。')],
  ['スキルの名を法則と違えて「最強」にする', mut('build.js', '<li><b>多面</b>', '<li><b>最強</b>')],
  ['外見に原典の言わない条を引く', mut('build.js', '傘を持った人が立っているだけ</dd>', '傘を持った人が立っているだけ（第七法則）</dd>')],
  ['転職の条件に第一法則を引く', mut('build.js', '切り替わりのとき（定義八）', '三十歳まで童貞のとき（第一法則）')],
  ['問いからクラスの断りを外す', mut('src/faq.md', CLASS_NOTE, '')],
  ['はじめにからクラス表を外す', mut('src/index.md', '<!-- class -->', '')],
  ['書体の許諾の文を外す', mut('assets/OFL-InterTight.txt', 'SIL OPEN FONT LICENSE Version 1.1', '')],
  ['断りと開示から書体の許諾を外す', mut('src/about.md', 'Inter Tight（Copyright 2022 The Inter Project Authors、SIL Open Font License 1.1）', 'Inter Tight')],
  ['書体を外から読む', mut('assets/style.css', 'src: url(intertight.woff2)', 'src: url(https://fonts.example.com/x.woff2)')],
  ['書体の中身を差し替える', Object.assign({}, real, { '#assets': real['#assets'].replace(FONT_SHA, '0'.repeat(64)) })],
  ['書体をもう一つ足す', Object.assign({}, real, { '#assets': real['#assets'] + '\nextra.woff2 ' + '0'.repeat(64) })],
  ['site/assets を作り直さない', Object.assign({}, real, { '#site-assets': real['#site-assets'].replace(/style\.css [0-9a-f]+/, 'style.css ' + '0'.repeat(64)) })],
  ['背景の印を外から読む', mut('assets/style.css', 'mask: url(mark.svg)', 'mask: url(https://x.example/m.svg)')],
  ['PRINCIPIA.md を手で直す', mut('PRINCIPIA.md', '負は滅せず、積もる。', '負は滅す。')],
  ['PRINCIPIA.md から開示を外す', Object.assign({}, real, { 'PRINCIPIA.md': real['PRINCIPIA.md'].replace('Claude は著者ではありません。', '') })],
  ['README から別の枠だという断りを外す', mut('README.md', FRAME, '')],
  ['事件の属性を書く', mut('site/play.html', '<button type="button" id="scene">', '<button type="button" id="scene" onclick="x()">')],
  ['Search Console の確認の値を変える', mut('site/terms.html', 'UEPpX5mfnLlhOBTBTETu-PmRO_Y4L2SmjEiaq_U1Zf8', 'x')],
  ['Search Console の確認を外す', mut('site/index.html', /<meta name="google-site-verification"[^>]*>\n/, '')],
  ['上の欄から紋を外す', mut('site/guide.html', '<img class="crest" src="assets/emblem-crest.svg" alt="クラスの紋" width="34" height="40">', '')],
  ['上の欄の添え名を変える', mut('site/faq.html', '>Magus Occultus</span>', '>Stealth Wizard</span>')],
  ['はじめにから紋を一つ外す', mut('site/index.html', '<img src="assets/emblem-dial.svg"', '<img src="assets/missing.svg"')],
  ['はじめにの紋の代わりの文を消す', Object.assign({}, real, { 'site/index.html': real['site/index.html'].replace('alt="原理の印：正二十面体の線画"', 'alt=""') })],
  ['デザインの頁から弁護士の断りを外す', mut('src/design.md', '弁護士の確認は受けていません。', '')],
  ['デザインの頁へのつなぎを外す', mut('site/terms.html', '<a href="design.html">', '<a href="x.html">')],
  ['デザインの頁を手で直す', mut('site/design.html', '配る書体は Inter Tight だけです。', '配る書体は二つです。')],
  /* 2026-11-23 に足した壊し方。 */
  ['404 の頁で素材を相対の所在で読む', mut('site/404.html', 'href="/assets/style.css"', 'href="assets/style.css"')],
  ['404 の頁に canonical を出す', mut('site/404.html', '<meta name="robots" content="noindex">', '<link rel="canonical" href="https://quiet-wizard.vercel.app/404.html">')],
  ['ほかの頁を検索から外す', mut('site/faq.html', '</head>', '<meta name="robots" content="noindex">\n</head>')],
  ['404 の頁を手で直す', mut('site/404.html', 'たぶん本当にありません', 'ありません')],
  ['本文へ飛ぶつなぎを外す', mut('site/guide.html', '<a class="skip" href="#main">本文へ</a>\n', '')],
  ['本文の飛び先を外す', mut('site/terms.html', '<main id="main">', '<main>')],
  ['配信の決まりに廃れた指定を戻す', mut('site/vercel.json', 'browsing-topics=()', 'interest-cohort=()')],
  ['sitemap を手で直す', mut('site/sitemap.xml', '</urlset>', '<url><loc>https://quiet-wizard.vercel.app/x.html</loc></url>\n</urlset>')],
  ['最終更新の行を外す', mut('src/guide.md', /\n最終更新：[0-9-]+。\n/, '\n')],
  ['最終更新を日付でなくする', mut('src/canon.md', /最終更新：[0-9-]+。/, '最終更新：2026-02-30。')],
  ['頁から変更の記録を外す', mut('site/play.html', /（<a href="[^"]+\/commits\/main\/src\/play\.md" rel="noopener">変更の記録<\/a>）/, '')],
  ['利用規約から最終更新の断りを外す', mut('src/terms.md', '上の案内と下の欄からつなぐ頁には、どれも最終更新の日を書き、', '')],
  ['個人情報の取り扱いから Search Console のことを外す', mut('src/privacy.md', '頁は、この値で Google へ何も送りません。', '')],
  ['断りと開示から Search Console のことを外す', mut('src/about.md', 'Google Search Console の所有の確認の値を置いていますが、', '')],
  ['遊び場の人の数を変える', mut('assets/play.js', 'var N = 8, pos = [];', 'var N = 9, pos = [];')],
  ['頁のほかの人の数を違える', mut('src/play.md', 'ほかの 7 人', 'ほかの 6 人')],
  ['はじめにの人の数を違える', mut('src/index.md', '[遊び場](play.html) 8 人', '[遊び場](play.html) 6 人')],
  ['外の目の代わりの文の人の数を書き込む', mut('assets/play.js', "'外の目。' + N + ' 人と、", "'外の目。8 人と、")],
  ['閾の幅を変える', mut('assets/play.js', '18 + Math.floor(Math.random() * 19)', '16 + Math.floor(Math.random() * 21)')],
  ['メーターの上限を違える', mut('build.js', 'aria-valuemax="36"', 'aria-valuemax="40"')],
  ['図の数を違える', mut('src/play.md', '下の五つの図', '下の四つの図')],
  ['魔法使い自身の線を、自分の成果で太らせる', mut('assets/play.js', 'return s !== 0;', 'return true;')],
  ['自動で過ごすあいだも読み上げる', mut('assets/play.js', "$('note').setAttribute('aria-live', 'off'); ", '')],
  ['止めても読み上げを戻さない', mut('assets/play.js', "\n      $('note').setAttribute('aria-live', 'polite');", '')],
  ['切り替わりの知らせから早めの断りを外す', mut('assets/play.js', '閾は目安の三十より小さく、早めの切り替わりです。', '')],
  ['ボタンに丸の数字を戻す', mut('build.js', '>場面を変える</button>', '>① 場面を変える</button>')],
  ['ボタンの名を箇条と違える', mut('build.js', '>一日を過ごす</button>', '>次の日</button>')],
  ['図の番号を頁をまたいで続ける', mut('src/strict.md', '![図1 和・偏・衝', '![図6 和・偏・衝')],
  ['原理へのリンクの飛び先を違える', mut('site/faq.html', 'strict.html#prop-3', 'strict.html#prop-4')],
  ['原理の巻へのリンクの飛び先を違える', mut('site/index.html', 'strict.html#s9', 'strict.html#s8')],
  ['はじめにの決まりの行からデザインの頁を外す', mut('src/index.md', '、デザインに関する法的な扱いは', 'は')],
  ['はじめにの原理の行から巻を一つ外す', mut('src/index.md', '第三巻は関係の力学、', '')],
  ['頁の中の目次の見出しを違える', mut('site/design.html', '<a href="#s2">', '<a href="#s9">')],
  ['長い頁から目次を外す', mut('site/legality.html', /<nav class="toc"[\s\S]*?<\/nav>/, '')],
  ['共有のカードの画像を外す', mut('site/strict.html', /<meta property="og:image" content="[^"]*">\n/, '')],
  ['共有のカードの所在を canonical と違える', mut('site/faq.html', '<meta property="og:url" content="https://quiet-wizard.vercel.app/faq.html">', '<meta property="og:url" content="https://quiet-wizard.vercel.app/">')],
  ['共有のカードの大きさを違える', mut('site/guide.html', '<meta property="og:image:width" content="1200">', '<meta property="og:image:width" content="1201">')],
  ['共有のカードの題を頁の題と違える', mut('site/about.html', /<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="魔法使い">')],
  ['X のカードを外す', mut('site/canon.html', '<meta name="twitter:card" content="summary_large_image">\n', '')],
  ['404 に共有のカードを出す', mut('site/404.html', '</head>', '<meta property="og:type" content="website">\n</head>')],
  ['頁の説明を別の頁と同じにする', mut('site/guide.html', /<meta name="description" content="[^"]*">/, '<meta name="description" content="' + B.DESC.index + B.DESC_TAIL + '">')],
  ['頁の説明から断りを外す', mut('site/terms.html', '示します。遊びであり、科学ではありません。">', '示します。">')],
  ['帯の色を変える', mut('site/play.html', '<meta name="theme-color" content="#0d0f13">', '<meta name="theme-color" content="#ffffff">')],
  ['ホーム画面のアイコンを外す', mut('site/requests.html', '<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">\n', '')],
  ['遊び場の説明の人の数を違える', mut('site/play.html', '<meta name="description" content="8 人', '<meta name="description" content="7 人')],
  ['印刷で上の欄を黒字にしない', mut('assets/style.css', '.frame, .frame *, header, header * { color: #000 !important;', '.frame, .frame * { color: #000 !important;')],
];
const missed = breaks.filter(([, y]) => verdict(y).length === 0).map(([k]) => k);
ok('壊して確かめる：原典の一字・法則・前書き・冒頭の断り・科学・性経験・下の欄・開示・外の画像・研究へのリンク・送る・残す・成果を数える・手で直す・style のどれでも落ちる（' + (breaks.length - missed.length) + ' / ' + breaks.length + '）', missed.length === 0, missed.join(' / '));

console.log('\n3. 原理の項と引き合い');
const pv = principiaVerdict(real);
ok('原理の項は番号が欠けずに並び、引いた項はすべて在り、証明の引き合いは循環せず、後ろを引く証明は決めた一つで理由を断り、頁は項ごとに飛び先を持ち、リンクと索引が項に合う', pv.length === 0, pv.join(' / '));
const pmut = (f, a, b) => Object.assign({}, real, { [f]: String(real[f]).replace(a, b) });
const pbreaks = [
  ['無い項を引く', pmut('src/strict.md', '定義九により、目安は時を定めず。', '定義九と定理三十により、目安は時を定めず。')],
  ['証明の引き合いを循環させる', pmut('src/strict.md', 'Obs はともに空で、𝒪 = {Obs} について等しい。', 'Obs はともに空で（定理二）、𝒪 = {Obs} について等しい。')],
  ['証明が後ろの項を引く', pmut('src/strict.md', '第五法則もまた、三十歳を目安と言ふのみ。', '第五法則もまた、三十歳を目安と言ふのみ（定理十九）。')],
  ['後ろを引く理由の断りを外す', pmut('src/strict.md', '（第二巻の定理十。その証は、第一巻の定理に依らず）', '（定理十）')],
  ['定理の番号を飛ばす', pmut('src/strict.md', '**定理七　', '**定理八　')],
  ['頁から飛び先を一つ外す', pmut('site/strict.html', 'id="law-6"', '')],
  ['引き合いのリンクを違う項に向ける', pmut('site/strict.html', '<a class="xref" href="#law-6">第六法則</a>', '<a class="xref" href="#law-5">第六法則</a>')],
  ['索引から項を一つ外す', pmut('site/strict.html', /<a href="#def-7"[^>]*>[^<]*<\/a>/, '')],
  /* 2026-11-23 に足した壊し方。 */
  ['証明が後ろの系の注を引く', pmut('src/strict.md', '科学ではないと名乗る。ゆえに原理は異端である。', '科学ではないと名乗る（系の後の注）。ゆえに原理は異端である。')],
  ['目次から巻の中の見出しを外す', pmut('site/strict.html', /(<ol class="toc-books"><li><a href="#s1">[^<]*<\/a>)<ol>[\s\S]*?<\/ol>/, '$1')],
  ['目次の上の段に巻でない見出しを出す', pmut('site/strict.html', /(<ol class="toc-books"><li><a href="#s1">[^<]*<\/a>)<ol>/, '$1</li>')],
];
const pmissed = pbreaks.filter(([, y]) => principiaVerdict(y).length === 0).map(([k]) => k);
ok('壊して確かめる：無い項・循環・後ろを引く・理由の断り・番号の飛び・飛び先・リンクの向き・索引のどれでも落ちる（' + (pbreaks.length - pmissed.length) + ' / ' + pbreaks.length + '）', pmissed.length === 0, pmissed.join(' / '));
/* 英語の原理（2026-11-23）。同じ確かめを、src/strict.en.md と site/strict.en.html に行う。 */
const pve = principiaVerdict(real, 'en');
ok('英語の原理も、項の番号が欠けずに並び、引いた項はすべて在り、引き合いは循環せず、後ろを引く証明は決めた一つで理由を断り、飛び先・リンク・索引・目次が項と見出しに合う', pve.length === 0, pve.join(' / '));
const pebreaks = [
  ['英語の原理で無い項を引く', pmut('src/strict.en.md', 'By Definition 9, a rule of thumb does not fix the time.', 'By Definition 9 and Proposition 30, a rule of thumb does not fix the time.')],
  ['英語の原理で証明の引き合いを循環させる', pmut('src/strict.en.md', 'Obs is empty in both, so they are equal', 'Obs is empty in both (Proposition 2), so they are equal')],
  ['英語の原理で証明が後ろの項を引く', pmut('src/strict.en.md', 'Law 5, too, calls thirty only a rule of thumb.', 'Law 5, too, calls thirty only a rule of thumb (Proposition 19).')],
  ['英語の原理で後ろを引く理由の断りを外す', pmut('src/strict.en.md', '(Book II, Proposition 10, whose proof uses no proposition of Book I)', '(Proposition 10)')],
  ['英語の原理で定理の番号を飛ばす', pmut('src/strict.en.md', '**Proposition 7. ', '**Proposition 8. ')],
  ['英語の原理の頁から飛び先を一つ外す', pmut('site/strict.en.html', 'id="law-6"', '')],
  ['英語の原理の引き合いのリンクを違う項に向ける', pmut('site/strict.en.html', '<a class="xref" href="#law-6">Law 6</a>', '<a class="xref" href="#law-5">Law 6</a>')],
  ['英語の原理の索引から項を一つ外す', pmut('site/strict.en.html', /<a href="#def-7"[^>]*>[^<]*<\/a>/, '')],
  ['英語の原理で証明が後ろの系を引く', pmut('src/strict.en.md', 'and that it is not science. So the Principia is heterodox.', 'and that it is not science (see the Corollary). So the Principia is heterodox.')],
  ['英語の原理の目次の上の段に巻でない見出しを出す', pmut('site/strict.en.html', /(<ol class="toc-books"><li><a href="#s1">[^<]*<\/a>)<ol>/, '$1</li>')],
];
const pemissed = pebreaks.filter(([, y]) => principiaVerdict(y, 'en').length === 0).map(([k]) => k);
ok('壊して確かめる：英語の原理でも、無い項・循環・後ろを引く・理由の断り・番号の飛び・飛び先・リンクの向き・索引・目次のどれでも落ちる（' + (pebreaks.length - pemissed.length) + ' / ' + pebreaks.length + '）', pemissed.length === 0, pemissed.join(' / '));

console.log('\n4. デザインに関する法的な扱い');
const dv = designVerdict(real);
ok('部品の表はファイルと過不足なく合い、配る書体と名指すだけの書体、書体の名前表と字、SVG の要素、ラスターの画像が無いこと、色の比、動きを減らす設定、代わりの文、フォーカスの輪、拡大、条文の抜粋と引用が、頁の文のとおり', dv.length === 0, dv.join(' / '));
const dmut = (f, a, b) => Object.assign({}, real, { [f]: String(real[f]).replace(a, b) });
const fontMut = (fn) => { const F = JSON.parse(real['#font']); fn(F); return Object.assign({}, real, { '#font': JSON.stringify(F) }); };
const dbreaks = [
  ['部品の表から一行外す', dmut('src/design.md', /\| ファビコン \|[^\n]+\n/, '')],
  ['表に無い部品のファイルを足す', Object.assign({}, real, { '#parts': (real['#parts'] + '\nassets/og.svg').split('\n').sort().join('\n') })],
  ['部品の表の許諾を変える', dmut('src/design.md', '| コードとして MIT | 検査が、色の比', '| 図として CC BY 4.0 | 検査が、色の比')],
  ['名指す書体を一つ書き落とす', dmut('src/design.md', 'Helvetica Neue、Arial、', 'Helvetica Neue、')],
  ['style.css で書体の名を一つ足す', dmut('assets/style.css', '"Noto Sans JP", sans-serif;', '"Noto Sans JP", Meiryo, sans-serif;')],
  ['外の書体をもう一つ配る', dmut('assets/style.css', '@font-face {', '@font-face { font-family: "X"; src: url(x.woff2); }\n@font-face {')],
  ['書体の名前表から許諾の欄を外す', fontMut((F) => { delete F.names[13]; })],
  ['書体にかなを足す', fontMut((F) => { F.codes.push(0x3042); })],
  ['頁の書体の字の数を違える', dmut('src/design.md', '収める字は 103 字です。', '収める字は 100 字です。')],
  ['許諾の文に予約された書体名を足す', dmut('assets/OFL-InterTight.txt', '(https://github.com/rsms/inter-tight)', '(https://github.com/rsms/inter-tight), with Reserved Font Name "Inter".')],
  ['許諾の文の引用を一語変える', dmut('src/design.md', '> to use, study, copy, merge, embed, modify,', '> to use, study, copy, merge, embed,')],
  ['上の欄の文字を暗くする', dmut('assets/style.css', '--mastmuted: #a9afb9;', '--mastmuted: #3a3f48;')],
  ['頁から上の欄の色の比を外す', dmut('src/design.md', '- 上の欄の文字の色（--mastink、--mastmuted、--mastgold）と地の色（--mastbg）の比も 4.5 以上です。', '-')],
  ['三つの紋の一つに画像を埋める', dmut('assets/emblem-seal.svg', '</svg>', '<image href="data:image/png;base64,AAAA" width="1" height="1"/></svg>')],
  ['ファビコンに画像を埋める', dmut('assets/favicon.svg', '</svg>', '<image href="data:image/png;base64,AAAA" width="1" height="1"/></svg>')],
  ['図に別の要素を足す', dmut('src/figs/fig-faces.svg', '</svg>', '<polyline points="0,0 1,1"/></svg>')],
  ['遊び場のスクリプトが別の要素を描く', dmut('assets/play.js', "el('line'", "el('rect'")],
  ['ラスターの画像を置く', Object.assign({}, real, { '#raster': 'assets/og.png' })],
  ['文字の色の比を下げる', dmut('assets/style.css', '--muted: #555b65;', '--muted: #9aa0a8;')],
  ['頁の色の比の数を違える', dmut('src/design.md', 'の 5.73 です。', 'の 5.80 です。')],
  ['動きを減らす設定から一つ外す', dmut('assets/style.css', '{ .drift { animation: none; }', '{ .drift-x { animation: none; }')],
  ['場面の移り変わりを止めない', dmut('assets/style.css', '.scene .layer, .eye-switch .knob::after', '.eye-switch .knob::after')],
  ['遊び場の間を延ばさない', dmut('assets/play.js', 'reduce ? 1500 : 800', '800')],
  ['図の代わりの文を外す', dmut('site/play.html', /<svg role="img" aria-label="[^"]+" /, '<svg ')],
  ['拡大を止める', dmut('site/design.html', 'initial-scale=1, viewport-fit=cover', 'initial-scale=1, maximum-scale=1, viewport-fit=cover')],
  ['フォーカスの輪を消す', dmut('assets/style.css', ':focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }', ':focus-visible { outline: none; }')],
  ['抜粋を写しに無い文にする', dmut('src/design.md', '第二十条 著作者は、その著作物及びその題号の同一性', '第二十条 著作者は、その著作物の同一性')],
  ['頁の条文を手で変える', dmut('site/design.html', '業として登録意匠及びこれに類似する意匠', '登録意匠及びこれに類似する意匠')],
  ['頁の文が拠る条を引かない', dmut('src/design.md', '<!-- 条文 障害者差別解消法 第8条 -->', '')],
  ['「」で引く語句を一字変える', dmut('src/design.md', '「思想又は感情を創作的に表現したもの」', '「思想又は感情を創作的に表現したものの」')],
  ['条文の出どころのコミットを外す', dmut('site/design.html', '、コミット 85dd680）', '）')],
  ['障害者差別解消法の正式の名を外す', dmut('src/design.md', '障害を理由とする差別の解消の推進に関する法律（障害者差別解消法）', '障害者差別解消法')],
  ['決まりの頁の一覧から外す', Object.assign({}, real, { '#pages': JSON.stringify(B.PAGES.filter(([k]) => k !== 'design')) })],
  /* 2026-11-23 に足した壊し方。 */
  ['図の文字で形を色の名で指す', dmut('src/figs/fig-interface.svg', '細い線の辺は相＋、太い帯の辺は相−', '金の辺は相＋、黒の帯は相−')],
  ['頁から図の文字と色の名の断りを外す', dmut('src/design.md', '- 図の中の文字は、形を色の名で指しません。', '-')],
  ['遊び場の網の線を薄くする', dmut('assets/play.js', "'#7a8089'", "'#8f959d'")],
  ['頁の遊び場の網の色の比を違える', dmut('src/design.md', 'の #12161c の 3.12 です。', 'の #12161c の 3.20 です。')],
  ['頁から本文へ飛ぶつなぎの文を外す', dmut('src/design.md', 'どの頁にも、本文へ飛ぶつなぎ（「本文へ」）を、頁の初めに置いています。', '')],
  ['共有のカードを別の画像に差し替える', Object.assign({}, real, { '#png:assets/card.png': real['#png:assets/apple-touch-icon.png'] })],
  ['部品の表のカードの SHA-256 を違える', dmut('src/design.md', /(\| `assets\/card\.png` \|[^|]*SHA-256 は )[0-9a-f]{64}/, '$1' + '0'.repeat(64))],
  ['ラスターの画像の数を頁と違える', dmut('src/design.md', 'アイコン（`assets/apple-touch-icon.png`）の二枚だけです。', 'アイコン（`assets/apple-touch-icon.png`）の一枚だけです。')],
  ['ラスターの写しを一枚落とす', Object.assign({}, real, { '#raster': real['#raster'].replace('\nsite/assets/card.png', '') })],
  ['カードに和文を書く', dmut('tools/card.js', "title: 'STEALTH WIZARD'", "title: 'ステルス・ウィザード'")],
  ['カードが assets に無いものを読む', dmut('tools/card.js', "svg('emblem-seal.svg')", "svg('photo.svg')")],
  ['カードが外を読む', dmut('tools/card.js', "const font = 'data:font/woff2;base64,'", "const remote = 'https://fonts.example.com/x.woff2'; const font = 'data:font/woff2;base64,'")],
  ['頁から書体で作った文書の許諾の引用を外す', dmut('src/design.md', '> The requirement for fonts to remain under this license does not apply to any document created using the Font Software', '>')],
  ['部品の表からカードを描くスクリプトを外す', dmut('src/design.md', /\| カードとアイコンを描くスクリプト \|[^\n]+\n/, '')],
  ['頁から印刷の文を外す', dmut('src/design.md', '印刷では、上の帯と上の欄とクラス表を、白地の黒字にします。', '')],
];
const dmissed = dbreaks.filter(([, y]) => designVerdict(y).length === 0).map(([k]) => k);
ok('壊して確かめる：部品の表・許諾・書体の名・書体の名前表と字・許諾の文・SVG の要素・ラスター・色の比・動き・代わりの文・拡大・フォーカス・条文の抜粋と引用と出どころ・正式の名のどれでも落ちる（' + (dbreaks.length - dmissed.length) + ' / ' + dbreaks.length + '）', dmissed.length === 0, dmissed.join(' / '));

/* 最終更新の日と、リポジトリの履歴（2026-11-23）。頁の元のファイルを最後に変えた日（UTC）より、最終更新の日が前でないこと。
 * まだ記録していない変更があれば、今日（UTC）を求める。履歴の浅い複製（CI の既定）では、日が分からないので省く。 */
function gitDates() {
  const cp = require('child_process');
  try {
    if (cp.execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() !== 'false') return null;
    const env = Object.assign({}, process.env, { TZ: 'UTC' }), today = new Date().toISOString().slice(0, 10), out = {};
    for (const f of [...B.PAGES.map(([s]) => 'src/' + s + '.md'), ...B.EN_PAGES.map((s) => 'src/' + s + '.en.md')]) {
      const dirty = cp.spawnSync('git', ['diff', '--quiet', 'HEAD', '--', f], { cwd: ROOT }).status !== 0;
      out[f] = dirty ? today : cp.execFileSync('git', ['log', '-1', '--format=%cd', '--date=format-local:%Y-%m-%d', '--', f], { cwd: ROOT, env }).toString().trim();
    }
    return out;
  } catch (e) { return null; }
}
function updatedVerdict(x, dates) {
  const bad = [];
  for (const [f, d] of Object.entries(dates)) { const u = ((langOf(f) === 'en' ? /^Last updated: (\d{4}-\d{2}-\d{2})\.$/m : /^最終更新：(\d{4}-\d{2}-\d{2})。$/m).exec(x[f] || '') || [, ''])[1]; if (!u || u < d) bad.push(f + '：最終更新 ' + u + ' が、最後に変えた日 ' + d + ' より前'); }
  return bad;
}
console.log('\n5. 最終更新の日と履歴');
const gd = gitDates();
if (!gd) console.log('  省  履歴の浅い複製なので、最終更新の日と履歴の突き合わせを省きました');
else {
  const uv = updatedVerdict(real, gd);
  ok('どの頁の最終更新の日も、元のファイルを最後に変えた日より前でない', uv.length === 0, uv.join(' / '));
  const late = Object.assign({}, gd, { 'src/guide.md': '2099-01-01' });
  ok('壊して確かめる：元のファイルを最終更新の日より後に変えたことにすると落ちる', updatedVerdict(real, late).length === 1);
}

console.log('\n6. 英語の頁');
const ev = englishVerdict(real).concat(legalEnVerdict(real));
ok('英語の頁は作ったものと同じで、どの頁にも英語の断りと開示、言葉の切り替え、両向きの hreflang の対があり、原典と原理の原文は日本語のまま一字一句同じで、散文の数が数えた数と同じ', ev.length === 0, ev.join(' / '));
const emut = (f, a, b) => Object.assign({}, real, { [f]: String(real[f]).replace(a, b) });
const ebreaks = [
  ['英語の頁の上の帯を外す', emut('site/faq.en.html', /<aside class="frame"[^\n]+\n/, '')],
  ['英語の上の帯の文を弱める', emut('site/guide.en.html', '<span class="say">' + FRAME_EN, '<span class="say">This is entertainment.')],
  ['英語の下の欄から科学の法則ではないという断りを外す', emut('site/play.en.html', 'The laws written here are not scientific laws. ', '')],
  ['英語の下の欄から内輪ノリの断りを外す', emut('site/canon.en.html', 'This is an in-joke, and some people may find it offensive. Please keep that in mind. It is not elitism', 'It is not elitism')],
  ['英語の下の欄から訳の開示を外す', emut('site/about.en.html', 'The English pages were translated from the Japanese by Claude. Text', 'Text')],
  ['英語の頁の CSP を緩める', emut('site/guide.en.html', "content=\"default-src 'none';", "content=\"default-src *;")],
  ['英語の頁の lang を ja にする', emut('site/index.en.html', '<html lang="en">', '<html lang="ja">')],
  ['日本語の頁から言葉の切り替えを外す', emut('site/faq.html', /<a class="lang"[^>]*>English<\/a>/, '')],
  ['言葉の切り替えの先を違える', emut('site/canon.en.html', 'href="canon.html" hreflang="ja"', 'href="index.html" hreflang="ja"')],
  ['hreflang の対の片方を外す', emut('site/guide.en.html', /<link rel="alternate" hreflang="ja"[^>]*>\n/, '')],
  ['hreflang の x-default を英語の頁にする', emut('site/play.html', '<link rel="alternate" hreflang="x-default" href="https://quiet-wizard.vercel.app/play.html">', '<link rel="alternate" hreflang="x-default" href="https://quiet-wizard.vercel.app/play.en.html">')],
  ['og:locale:alternate を外す', emut('site/faq.en.html', '<meta property="og:locale:alternate" content="ja_JP">\n', '')],
  ['英語の頁の og:locale を ja_JP にする', emut('site/about.en.html', '<meta property="og:locale" content="en_US">', '<meta property="og:locale" content="ja_JP">')],
  ['英語の頁の説明から断りを外す', emut('site/canon.en.html', ' It is a play, not science.">', '">')],
  ['sitemap から英語の頁を外す', emut('site/sitemap.xml', /<url><loc>https:\/\/quiet-wizard\.vercel\.app\/faq\.en\.html<\/loc>[^\n]*\n/, '')],
  ['sitemap の対を違える', emut('site/sitemap.xml', '<url><loc>https://quiet-wizard.vercel.app/guide.html</loc><xhtml:link rel="alternate" hreflang="ja" href="https://quiet-wizard.vercel.app/guide.html"/>', '<url><loc>https://quiet-wizard.vercel.app/guide.html</loc><xhtml:link rel="alternate" hreflang="ja" href="https://quiet-wizard.vercel.app/faq.html"/>')],
  ['日本語の頁から英語の頁へつなぐ', emut('site/faq.html', '</main>', '<a href="play.en.html">x</a></main>')],
  ['英語の頁から日本語の頁へつなぐ', emut('site/faq.en.html', '</main>', '<a href="play.html">x</a></main>')],
  ['英語の頁を手で直す', emut('site/guide.en.html', 'There is no way to tell.', 'There is a way to tell.')],
  ['英語の 404 の頁で素材を相対の所在で読む', emut('site/404.en.html', 'href="/assets/style.css"', 'href="assets/style.css"')],
  ['英語の冒頭の断りを外す', emut('src/guide.en.md', '> This is a play. ', '> ')],
  ['英語の科学ではないという断りを外す', emut('src/faq.en.md', NOT_SCIENCE_EN['src/faq.en.md'], '')],
  ['英語のはじめにの断りの行を入れ替える', emut('src/index.en.md', '> This is a play.\n> ' + FRAME_EN, '> ' + FRAME_EN + '\n> This is a play.')],
  ['英語の断りと開示から内輪ノリの断りを外す', emut('src/about.en.md', CAUTION_EN[0], '')],
  ['英語のクラス表の断りを外す', emut('build.js', '<p class="cls-note">' + CLASS_NOTE_EN, '<p class="cls-note">')],
  ['英語のクラスを上位職にする', emut('build.js', 'It is not an advanced class, and it is no stronger or better than any other class.</p>', 'It is the top class.</p>')],
  ['英語のスキルの名を法則と違える', emut('build.js', '<li><b>Many Faces</b>', '<li><b>Strongest</b>')],
  ['英語のクラス表の転職に第一法則を引く', emut('build.js', 'At the switch (Definition 8)', 'At thirty (Law 1)')],
  ['英語の原典の原文を一字変える', emut('src/canon.en.md', '〘負は消えない。蓄積する。〙', '〘負は消える。〙')],
  ['英語の原典から訳の断りを外す', emut('src/canon.en.md', CANON_NOTE_EN[0], '')],
  ['英語の原典から行を一つ外す', emut('src/canon.en.md', /\| Law 8 [^\n]+\n/, '')],
  ['英語の原典の前書きの原文を外す', emut('src/canon.en.md', '> 〘' + PREFACE + '〙', '> ' + PREFACE)],
  ['英語の原理の原文を一字変える', emut('src/strict.en.md', '原文：負は消えない。蓄積する。', '原文：負は消えない。')],
  ['英語の原理で運営者の直観を一字変える', emut('src/strict.en.md', '原文：' + INTUITION, '原文：' + INTUITION.replace('存在してはならない', '存在できない'))],
  ['英語の原理から原文の行を一つ外す', emut('src/strict.en.md', '原文：性経験のない者をいう。\n', '')],
  ['英語の原理の定理十三の数を違える', emut('src/strict.en.md', 'and 17,824 for the regular icosahedron', 'and 17,842 for the regular icosahedron')],
  ['英語の原理の定理十三の式を違える', emut('src/strict.en.md', '552/24 = 23.', '552/24 = 22.')],
  ['英語の原理の定理十五の数を違える', emut('src/strict.en.md', 'Regular dodecahedron: 20 − 30 + 12 = 2.', 'Regular dodecahedron: 20 − 30 + 12 = 3.')],
  ['英語の原理の定理二十二の数を違える', emut('src/strict.en.md', 'all eighty of the actions', 'all ninety of the actions')],
  ['英語の原理の記録の数を違える', emut('src/strict.en.md', 'by realizing 112 records', 'by realizing 120 records')],
  ['英語の原理の定理十八の人数を違える', emut('src/strict.en.md', /network of four or more people/g, 'network of three or more people')],
  ['英語の原理の要請の数を違える', emut('src/strict.en.md', 'Definition 10 and the two postulates', 'Definition 10 and the three postulates')],
  ['英語の原理の原典の数を違える', emut('src/strict.en.md', /the nine definitions and ten laws of the canon/g, 'the eight definitions and ten laws of the canon')],
  ['英語の原理を原典と称する', emut('src/strict.en.md', "This version was written by Claude at the operator's request. It is not the canon.", 'This version is the canon.')],
  ['英語の原理から値の要請を外す', emut('src/strict.en.md', "A person's worth does not depend on whether they are a wizard, or on whether they are a virgin.", 'Wizards are worth more.')],
  ['英語の原理の頁から原文の札を外す', emut('site/strict.en.html', /<span class="orig-k">Original<\/span>/g, '<span class="orig-k"></span>')],
  ['英語の遊び場のほかの人の数を違える', emut('src/play.en.md', 'the other 7 people', 'the other 6 people')],
  ['英語のはじめにの人の数を違える', emut('src/index.en.md', 'relationships of 8 people', 'relationships of 6 people')],
  ['英語の遊び場の閾の幅を違える', emut('src/play.en.md', 'between 18 and 36.', 'between 18 and 30.')],
  ['英語の遊び場の図の数を違える', emut('src/play.en.md', 'The five figures below', 'The four figures below')],
  ['遊び場が頁の lang を読まない', emut('assets/play.js', "document.documentElement.getAttribute('lang') === 'en'", 'false')],
  ['英語の遊び場の知らせに日本語を混ぜる', emut('assets/play.js', "started: 'Days now pass on their own.", "started: '日が自動で進みます。Days now pass on their own.")],
  ['英語の遊び場の知らせから早めの断りを外す', emut('assets/play.js', 'so this is an early switch.', 'so this is a switch.')],
  ['英語の遊び場のボタンの名を箇条と違える', emut('build.js', '>Live one day</button>', '>Next day</button>')],
  ['英語の遊び場から属性の断りを外す', emut('src/play.en.md', 'The people carry no names, ages, genders, or any other attributes.', '')],
  ['図の文字の英語で形を色の名で指す', Object.assign({}, real, { 'build.js': real['build.js'].replace("'thin-line edge: sign +, thick-band edge: sign −'", "'gold edge: sign +, black band: sign −'") })],
  ['英語の図の番号を頁をまたいで続ける', emut('src/strict.en.md', '![Figure 1 Concord', '![Figure 6 Concord')],
  ['英語の原理へのリンクの飛び先を違える', emut('site/faq.en.html', 'strict.en.html#prop-3', 'strict.en.html#prop-4')],
  ['英語のはじめにの原理の行から巻を一つ外す', emut('src/index.en.md', 'Book III the dynamics of relationships, ', '')],
  ['英語のはじめにの原典の数を違える', emut('src/index.en.md', 'Nine definitions and ten laws.', 'Ten definitions and ten laws.')],
  ['英語の図鑑の法則の表から一行外す', emut('src/guide.en.md', /\| Law 6 Return [^\n]+\n/, '')],
  ['英語の断りと開示に DOI をもう一つ足す', emut('site/about.en.html', '</main>', '<a href="https://doi.org/10.5281/zenodo.99999999">x</a></main>')],
  ['英語の断りと開示から英語の頁の開示を外す', emut('src/about.en.md', 'If the two differ, the Japanese page governs.', '')],
  ['日本語の断りと開示から英語の頁の開示を外す', emut('src/about.md', '二つが食い違うときは、日本語の頁に従います。', '')],
  ['デザインの頁から英語の図の文字の扱いを外す', emut('src/design.md', '英語の文字も、形を色の名で指しません。', '')],
  /* 英語の決まりの頁（2026-11-23）。 */
  ['英語の利用規約から準拠法を外す', emut('src/terms.en.md', 'These terms are governed by Japanese law.', '')],
  ['英語の利用規約で責任を軽くする', emut('src/terms.en.md', "These terms do not reduce the operator's responsibility beyond what the law allows.", 'The operator bears no responsibility at all.')],
  ['英語の個人情報で集めると書く', emut('src/privacy.en.md', 'The site collects nothing.', 'The site collects analytics.')],
  ['英語の求めと連絡で同意なく issue を言語モデルに渡す', emut('src/requests.en.md', ' only when the writer consents within that issue', '')],
  ['英語の求めと連絡の答える日数を違える', emut('src/requests.en.md', 'within 7 days.', 'within 3 days.')],
  ['英語の適法性の説明から弁護士の確認の断りを外す', emut('src/legality.en.md', 'It has not been checked by a lawyer.', '')],
  ['英語の決まりの頁から日本語の頁に従う断りを外す', emut('site/terms.en.html', /<p class="langnote">[^<]*<\/p>\n?/, '')],
  ['日本語の頁に従う断りを二度置く', emut('site/design.en.html', '</main>', '<p class="langnote">This page is an English version of a Japanese page. If the two differ, the Japanese page governs.</p></main>')],
  ['英語の条文の要約から札を外す', emut('site/legality.en.html', 'Summary, not a translation</span>', 'Translation</span>')],
  ['英語の頁の条文を手で変える', emut('site/legality.en.html', '公然と人を侮辱した者は', '人を侮辱した者は')],
  ['英語の頁で条を一つ引かない', emut('src/legality.en.md', /<!-- statute 民法 第709条[^\n]*\n/, '')],
  ['英語の抜粋を写しに無い文にする', emut('src/design.en.md', '第二十条 著作者は、その著作物及びその題号の同一性', '第二十条 著作者は、その著作物の同一性')],
  ['英語の条文の要約を外す', emut('src/legality.en.md', '｜Whoever publicly insults a person, even without stating facts, is punished.', '')],
  ['英語の条文の出どころのコミットを外す', emut('site/design.en.html', ', commit 85dd680)', ')')],
  ['英語の適法性の説明の表から条を外す', emut('src/legality.en.md', /\| Civil Code, Article 709 [^\n]+\n/, '')],
  ['英語の部品の表から一行外す', emut('src/design.en.md', /\| Favicon \|[^\n]+\n/, '')],
  ['英語の部品の表のカードの SHA-256 を違える', emut('src/design.en.md', /(\| `assets\/card\.png` \|[^|]*SHA-256 is )[0-9a-f]{64}/, '$1' + '0'.repeat(64))],
  ['英語の部品の表の許諾を変える', emut('src/design.en.md', '| MIT, as code | The check confirms the contrast ratios', '| CC BY 4.0, as a figure | The check confirms the contrast ratios')],
  ['英語の書体の字の数を違える', emut('src/design.en.md', 'It holds 103 characters.', 'It holds 100 characters.')],
  ['英語の色の比の数を違える', emut('src/design.en.md', ', at 5.73.', ', at 5.80.')],
  ['英語の遊び場の網の色の比を違える', emut('src/design.en.md', ', at 3.12.', ', at 3.20.')],
  ['英語のラスターの画像の数を違える', emut('src/design.en.md', 'are only the two PNGs', 'are only the three PNGs')],
  ['英語の名指す書体を一つ書き落とす', emut('src/design.en.md', 'Helvetica Neue, Arial, Hiragino', 'Helvetica Neue, Hiragino')],
  ['英語の「」で引く語句を一字変える', emut('src/design.en.md', '〘「業として」〙', '〘「業」〙')],
  ['英語の許諾の文の引用を一語変える', emut('src/design.en.md', '> to use, study, copy, merge, embed, modify,', '> to use, study, copy, merge, embed,')],
  ['英語のデザインの頁で研究の系列の名を出す', emut('src/design.en.md', 'Laws outside Japan have not been looked into.', 'Laws outside Japan have not been looked into. See orcid.org.')],
  ['英語の README から別の枠だという断りを外す', emut('README.en.md', FRAME_EN, '')],
  ['英語の README からクラスの断りを外す', emut('README.en.md', CLASS_NOTE_EN, '')],
  ['日本語のデザインの頁から英語の頁の表を直す断りを外す', emut('src/design.md', '英語の頁（`src/design.en.md`）の表と文も、同じ変更で直します。', '')],
  ['英語の断りと開示から英語の版の DOI の断りを外す', emut('src/about.en.md', 'Its DOI is not given here, because it has not been checked.', 'Its DOI is 10.5281/zenodo.0.')],
];
const emissed = ebreaks.filter(([, y]) => englishVerdict(y).length === 0 && legalEnVerdict(y).length === 0 && verdict(y).length === 0).map(([k]) => k);
ok('壊して確かめる：英語の頁の断り・切り替え・hreflang・sitemap・原文・数・遊び場・図の文字のどれでも落ちる（' + (ebreaks.length - emissed.length) + ' / ' + ebreaks.length + '）', emissed.length === 0, emissed.join(' / '));

console.log('\n' + '-'.repeat(48));
if (fails.length) { console.log(pass + ' 件が通り、' + fails.length + ' 件が通りませんでした。'); process.exit(1); }
console.log(pass + ' 件すべて通りました。');
