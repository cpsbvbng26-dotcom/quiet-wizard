#!/usr/bin/env node
/* 地味な魔法使いの検査。約束が消えていないか、原典が一字も変わっていないか、外へ何も要求しないかを確かめ、壊して落ちることも確かめる。
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
const PLAIN = ['canon', 'about', 'terms', 'privacy', 'requests', 'legality'];
/* 条文の写しの SHA-256。写しを手で書き換えれば落ちる。 */
const STATUTES_SHA = '2b9c3d93789219ba70780df5d9bbb1492dfea4f9dd2f056fd3bb4f5e898c7e32';
const LEGAL = {
  'src/terms.md': ['この決まりは日本法に準拠します。', '話し合いで解決しない紛争は、法令の定める裁判所が管轄します。', 'この決まりは、法令が認める以上に運営者の責任を軽くしません。', 'このサイトは、誰からも料金を取りません。', '読む人に不利になる変更は、変える中身と効力の生じる日を、その日より前にこの頁で示します。', '同じ名や似た名の商標が登録されているかは、特許庁のデータベースで調べていません。', 'このサイトの文や図を、人の性経験を詮索したり、からかったり、責めたりする材料にすること。'],
  'src/privacy.md': ['サイトは、何も集めません。', '性経験・年齢・名前など、読む人についての何も尋ねません。', 'GitHub のアカウントを持たない人や、連絡先を公開しない人が、非公開で知らせる道は、いまはありません。'],
  'src/requests.md': ['運営者のほかの人が開いた issue の題と本文は、書いた人がその issue の中で同意したときだけ、言語モデルに渡します。', 'コメントは、言語モデルに渡しません。', '判断の前に、その記載をいまの版から外します。'],
  'src/legality.md': ['運営者の側の理解を書いたもので、読む人への法的な助言ではありません。', '弁護士の確認は受けていません。', '法令の文を記憶から書いてはいません。'],
  'src/about.md': ['このサイトは、運営者を含め、誰の性経験についても何も述べません。'],
  'src/strict.md': ['この版は、運営者の求めで Claude が書いたものです。原典ではありません。', '「厳密」なのは言葉の運びのことで、中身が科学として正しいという意味ではありません。', '命題四 この法則は、成果の観測では反証できない'],
};
/* 利用者が正文とした論文。DataCite で確かめた版の DOI。 */
const PAPER_LINK = '<a href="https://doi.org/10.5281/zenodo.23114131" rel="noopener">10.5281/zenodo.23114131</a>';
/* 利用者が求めた断り（2026-11-21）。 */
const CAUTION = ['これは内輪ノリであり、気分を害する方がいる可能性があります。ご注意ください。', '選民思想ではありません。', '運営者は、魔法使いの代表ではありません。'];
const NOT_SCIENCE = { 'src/index.md': '科学の法則ではありません。', 'src/canon.md': '科学の法則ではありません。', 'src/guide.md': '科学の主張でもありません。', 'src/play.md': '何も測らず、何も占わず、何も記録しません。', 'src/faq.md': '原典の法則は、直観から書かれた文で、実験や調査で確かめたものではありません。', 'src/about.md': '科学の法則ではありません。' };
const DISCLOSE = ['遊びの部分は Claude（Anthropic の言語モデル）が書きました。Claude は著者ではありません。', '文は CC BY 4.0、コードは MIT。'];
/* 研究の系列と、ほかの遊びの国へはつながない。 */
const AWAY = ['cpsbvbng26-dotcom.github.io', 'sophaxis', 'nusquama', 'zenodo.org', 'orcid.org', 'doi.org', 'researchmap', 'osf.io', 'ssrn', 'psyarxiv'];

function files() {
  const x = {};
  for (const f of ['README.md', 'CLAUDE.md', 'build.js', 'assets/play.js', 'verification/statutes-texts.json', ...B.PAGES.map(([s]) => 'src/' + s + '.md')]) x[f] = R(f);
  for (const f of fs.existsSync(path.join(ROOT, 'site')) ? fs.readdirSync(path.join(ROOT, 'site')) : []) if (/\.html$/.test(f)) x['site/' + f] = R('site/' + f);
  return x;
}

function verdict(x) {
  const bad = [];
  const canon = x['src/canon.md'];
  for (const [n, w, d] of DEFS.concat(LAWS)) if (!canon.includes('| ' + n + ' | ' + w + ' | ' + d + ' |')) bad.push('原典の ' + n + ' が一字一句そのままでない');
  if ((canon.match(/^\| 定義/mg) || []).length !== 9 || (canon.match(/^\| 第.+法則 \|/mg) || []).length !== 10) bad.push('原典の定義が九つ、法則が十でない');
  if (!canon.includes('> ' + PREFACE) || !canon.includes('文には手を入れていません。')) bad.push('原典の前書きか、手を入れていないという断り');
  for (const [s] of B.PAGES) if (!PLAIN.includes(s) && !x['src/' + s + '.md'].includes(PLAYFUL)) bad.push('src/' + s + '.md：冒頭の「これは遊びです」');
  for (const [f, says] of Object.entries(LEGAL)) for (const w of says) if (!x[f].includes(w)) bad.push(f + '：' + w.slice(0, 24));
  for (const f of ['src/index.md', 'src/about.md']) for (const w of CAUTION) if (!x[f].includes(w)) bad.push(f + '：' + w.slice(0, 20));
  if (!x['src/faq.md'].includes('選民思想ではありません。') || !x['src/terms.md'].includes('運営者は、魔法使いの代表ではありません。')) bad.push('問いか利用規約の断り');
  if (!(x['site/about.html'] || '').includes(PAPER_LINK) || (x['site/about.html'] || '').split('doi.org').length !== 2) bad.push('学術的な正文の DOI は、確かめた一つだけ');
  if (!x['src/about.md'].includes('その DOI は、ここには書いていません。確かめていないためです。')) bad.push('英語の版の DOI を確かめていないという断り');
  /* 厳密版の数：定義十、法則十、命題六。 */
  const st = x['src/strict.md'];
  if ((st.match(/^\*\*定義[一二三四五六七八九十]+′ /mg) || []).length !== 10 || (st.match(/^\*\*第[一二三四五六七八九十]+法則′ /mg) || []).length !== 10 || (st.match(/^\*\*命題[一二三四五六] /mg) || []).length !== 6) bad.push('厳密版の定義・法則・命題の数');
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
  if (html.length !== B.PAGES.length + 1) bad.push('生成した頁の数が ' + html.length);
  for (const f of html) {
    const h = x[f];
    if (!h.includes('<meta http-equiv="Content-Security-Policy" content="' + B.META_CSP + '">')) bad.push(f + '：CSP');
    if (!h.includes(B.FOOT)) bad.push(f + '：下の欄の断り');
    for (const w of ['内輪ノリであり、気分を害する方がいる可能性があります。ご注意ください。', '選民思想ではなく、運営者は魔法使いの代表ではありません。']) if (!h.includes(w)) bad.push(f + '：下の欄の断り（' + w.slice(0, 8) + '）');
    for (const l of ['terms', 'privacy', 'requests', 'legality', 'about']) if (!h.includes('href="' + l + '.html"') && f !== 'site/' + l + '.html') bad.push(f + '：決まりの頁 ' + l + ' へのつなぎ');
    for (const d of DISCLOSE) if (!h.includes(d)) bad.push(f + '：開示');
    /* 外へ読みに行く要素。canonical は読みに行かないので除く。 */
    if (/<(script|img|link|iframe|source)\b(?![^>]*rel="canonical")[^>]*\s(src|href)="https?:/i.test(h)) bad.push(f + '：外へ読みに行く');
    if (/\sstyle="|<style|\son[a-z]+="/i.test(h)) bad.push(f + '：頁の中の style か事件の属性');
    /* 例外は一つ：断りと開示の「学術的な正文」が、確かめた DOI 一つだけを示す。 */
    const hh = f === 'site/about.html' ? h.split(PAPER_LINK).join('') : h;
    for (const a of AWAY) if (hh.toLowerCase().includes(a)) bad.push(f + '：' + a + ' につないでいる');
  }
  const js = x['assets/play.js'];
  if (/fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|document\.cookie|sendBeacon|WebSocket|innerHTML/.test(js)) bad.push('play.js が外へ送るか、残すか、innerHTML を使う');
  if (!js.includes('第六法則') || !/\$\('deeds'\)\.textContent = '0'/.test(js)) bad.push('play.js：見える成果がいつも 0 でない');
  /* 人に属性を付けない（2026-11-21 に利用者が、法的な危うさから外すと決めた）。コードに属性の名を持たない。 */
  const code = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  if (/gender|sex|age\b|nationality|race|religion|性別|年齢|国籍|宗教|職業/i.test(code)) bad.push('play.js が人に属性を付けている');
  if (!x['src/play.md'].includes('人には、名前も年齢も性別も、どんな属性も付けていません。見るのは、関係の移り変わりだけです。')) bad.push('遊び場：属性を付けないという断り');
  if ((x['src/play.md'].match(/^\| 第[二三四五六七八九十]法則 /mg) || []).length !== 9) bad.push('遊び場：法則と働きの表が九行でない');
  /* 生成物が元と同じか（site/ は手で直さない）。 */
  const fresh = (s) => { const md = x['src/' + s + '.md']; return B.page(s, /^# (.+)$/m.exec(md)[1], B.statutes(B.markdown(md).replace('<!-- play -->', B.PLAY).replace('<!-- hero -->', B.HERO))); };
  const freshOr = (s) => { try { return fresh(s); } catch (e) { bad.push('src/' + s + '.md から作れない：' + e.message); return null; } };
  for (const [s, out] of B.PAGES) if (x['site/' + out + '.html'] !== undefined && x['site/' + out + '.html'] !== freshOr(s)) bad.push('site/' + out + '.html が src から作ったものと違う（node build.js）');
  return bad;
}

console.log('\n1. 約束・原典・外への要求・生成物');
const real = files();
const now = verdict(real);
ok('原典の定義九つと法則十が一字一句そのまま、どの頁も遊びと断り、科学ではないと書き、下の欄に断りと開示、CSP、外へ読みに行かず、研究の系列につながず、遊び場は何も送らず残さず、生成物が元と同じ', now.length === 0, now.slice(0, 6).join(' / '));

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
  ['頁の中に style を書く', mut('site/canon.html', '<main>', '<main style="color:red">')],
  ['準拠法を外す', mut('src/terms.md', 'この決まりは日本法に準拠します。', '')],
  ['責任を軽くする', mut('src/terms.md', 'この決まりは、法令が認める以上に運営者の責任を軽くしません。', '運営者は一切の責任を負いません。')],
  ['集めると書く', mut('src/privacy.md', 'サイトは、何も集めません。', 'サイトは、アクセスを解析します。')],
  ['同意なく issue を言語モデルに渡す', mut('src/requests.md', '書いた人がその issue の中で同意したときだけ、', '')],
  ['弁護士の確認の断りを外す', mut('src/legality.md', '弁護士の確認は受けていません。', '')],
  ['条文の写しを手で変える', mut('verification/statutes-texts.json', '三年以下の拘禁刑', '二年以下の拘禁刑')],
  ['写しに無い条を引く', mut('src/legality.md', '民法 第548条の2 -->', '民法 第548条の2、刑法 第999条 -->')],
  ['頁の条文を手で変える', mut('site/legality.html', '公然と人を侮辱した者は', '人を侮辱した者は')],
  ['厳密版の命題を一つ外す', mut('src/strict.md', '**命題五 ', '命題五 ')],
  ['厳密版を原典と称する', mut('src/strict.md', 'この版は、運営者の求めで Claude が書いたものです。原典ではありません。', 'この版が原典です。')],
  ['決まりの頁へのつなぎを外す', mut('site/faq.html', '<a href="privacy.html">', '<a href="x.html">')],
  ['内輪ノリの断りを外す', mut('src/index.md', 'これは内輪ノリであり、気分を害する方がいる可能性があります。ご注意ください。', '')],
  ['選民思想の断りを外す', mut('src/about.md', '選民思想ではありません。', '')],
  ['代表の断りを外す', mut('site/guide.html', '運営者は魔法使いの代表ではありません。', '')],
  ['論文の DOI をもう一つ足す', mut('site/about.html', '</main>', '<a href="https://doi.org/10.5281/zenodo.99999999">x</a></main>')],
  ['研究の頁へ、正文の例外の外でつなぐ', mut('site/faq.html', '</main>', '<a href="https://doi.org/10.5281/zenodo.23114131">x</a></main>')],
  ['英語の版の DOI を確かめずに書く', mut('src/about.md', 'その DOI は、ここには書いていません。確かめていないためです。', 'DOI は 10.5281/zenodo.0 です。')],
  ['外の台本を読む', mut('site/play.html', '<script src="assets/play.js" defer></script>', '<script src="https://cdn.example.com/x.js"></script>')],
  ['事件の属性を書く', mut('site/play.html', '<button type="button" id="scene">', '<button type="button" id="scene" onclick="x()">')],
];
const missed = breaks.filter(([, y]) => verdict(y).length === 0).map(([k]) => k);
ok('壊して確かめる：原典の一字・法則・前書き・冒頭の断り・科学・性経験・下の欄・開示・外の画像・研究へのリンク・送る・残す・成果を数える・手で直す・style のどれでも落ちる（' + (breaks.length - missed.length) + ' / ' + breaks.length + '）', missed.length === 0, missed.join(' / '));

console.log('\n' + '-'.repeat(48));
if (fails.length) { console.log(pass + ' 件が通り、' + fails.length + ' 件が通りませんでした。'); process.exit(1); }
console.log(pass + ' 件すべて通りました。');
