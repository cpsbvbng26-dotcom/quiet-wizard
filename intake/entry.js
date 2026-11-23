#!/usr/bin/env node
/* みんなの図鑑の受付（2026-11-23）。読む人が GitHub の issue の様式で寄せた場面の、欄と印を確かめる。
 *
 *   node intake/entry.js               issue の事件のファイル（GITHUB_EVENT_PATH）から issue の番号を読み、API で issue を読み直して確かめ、
 *                                      ラベル（entry: complete か entry: incomplete）と、決まった文のコメント一つを付ける
 *   node intake/entry.js --labels      様式と受付が使う三つのラベルが無ければ作る（main への push のとき）
 *   node intake/entry.js --self-test   作り物の issue の本文と、作り物の API で、落ちるべきものを落とし、閉じず・鍵を掛けず・消さないことを確かめる
 *
 * ここに置く理由：tools/ は見た目の部品の置き場で、変えればデザインに関する法的な扱いの表に載る（決めごと 20）。これは部品ではない。
 *
 * 決め：
 * - どの issue も閉じない。鍵を掛けない。消さない。題も本文も書き換えない。何も頁に載せない。載せるのは、運営者が data/entries.json を直す PR だけ。
 * - issue の題と本文を、ログにも、環境の変数にも、シェルにも、ワークフローの式にも出さない。ログに出すのは issue の番号と、決まった語だけ。
 *   issue は事件のファイルから番号だけを読み、本文は API から読む（事件のファイルの本文は、開いた時のもので古いことがある）。
 * - 呼んでよい API は、下の ALLOWED に挙げたものだけ。ほかを呼ぼうとすれば、送る前に止まる。
 * - コメントは一つだけ。前に付けたコメント（印 MARK で始まる、機械のもの）があれば、それを書き換える。同じ文なら何もしない。
 *
 * 様式（.github/ISSUE_TEMPLATE/entry.yml と config.yml）は、この台の FORM から build.js が作る生成物。手で直さない。 */
'use strict';
const fs = require('fs');

/* 十の法則の名（原典の名と、英語の頁の名）。check.js が原典の表と英語の名に突き合わせる。 */
const LAWS = [
  ['第一法則', '成立', 'Establishment'], ['第二法則', '多面', 'Many Faces'], ['第三法則', '保存', 'Conservation'], ['第四法則', '反転', 'Reversal'],
  ['第五法則', '目安', 'Rule of Thumb'], ['第六法則', '還元', 'Return'], ['第七法則', '共通', 'Common Practice'], ['第八法則', '泥沼', 'Quagmire'],
  ['第九法則', '秘匿', 'Secrecy'], ['第十法則', '長命', 'Long Life'],
];
const lawOption = (n) => LAWS[n - 1][0] + ' ' + LAWS[n - 1][1] + ' / Law ' + n + ' ' + LAWS[n - 1][2];
/* 長さ。字は Unicode の符号位置で数え、空白も一字に数え、改行は数えない。 */
const LIMITS = { title: { ja: [1, 30], en: [1, 80] }, text: { ja: [10, 200], en: [20, 600] } };
const len = (s) => [...String(s).replace(/\r?\n/g, '')].length;
const LANG_OPTIONS = { ja: '日本語 / Japanese', en: '英語 / English' };
const JA_CHARS = /[぀-ヿ一-鿿ｦ-ﾟ]/;

/* 必須の印。id、短い名（コメントに出す）、様式の文。 */
const BOXES = [
  ['adult', '十八歳以上', '十八歳以上です。 / I am 18 or older.'],
  ['original', '自分で書いた文', '自分で新しく書いた文です。他人の文や作品を写していません。 / I wrote this text myself. It copies no one else\'s text or work.'],
  ['noperson', '実在の人を書かない', '実在の人や、誰のことか分かる人を、名指しも描写もしていません。 / It names or describes no real or identifiable person.'],
  ['nosex', '性経験に触れない', '誰の性経験にも触れていません。性的な描写もありません。 / It says nothing about anyone\'s sexual experience, and has no sexual content.'],
  ['nowizard', '魔法使いと言わない', '自分やほかの誰かを、魔法使いだと言っていません。 / It does not claim that I or anyone else is a wizard.'],
  ['play', '遊びの文', '遊びの文で、科学でも助言でもありません。 / It is play, not science or advice.'],
  ['licence', '許諾と名の表示', 'この文を CC BY 4.0 で許諾します。名の表示は「名の表示」の欄の印のとおりで、印が無ければ名を出しません。運営者は、載せないことも、載せた後で外すこともあります。 / I license this text under CC BY 4.0. Credit follows the box under "Credit"; without it, no name is shown. The operator may decline the text, or remove it later.'],
  ['edits', '手を入れることへの同意', '載せるときに、運営者が次の三つに限って手を入れることに同意します。長さを詰めること。表記（字、句読点、かなと漢字）をそろえること。このサイトの決めに合わない語を替えること。意味の変わる直しは、この issue で尋ねてからにします。 / I agree that, when adding the text, the operator may change it in these three ways only: shortening it, making the notation consistent (characters, punctuation, kana and kanji), and replacing words that do not fit the rules of this site. A change of meaning is asked about in this issue first.'],
];
const CREDIT_BOX = 'GitHub の名を、寄せた人として頁に出してよい。 / My GitHub username may be shown on the site as the contributor.';
/* 決めごと 12 の同意の文。運営者の別のリポジトリの誤りの知らせの様式と、同じ文にしてある。 */
const CONSENT_JA = 'この issue の題と本文を、運営者が Claude（Anthropic、米国）に渡すことに同意します。';
const CONSENT_EN = 'I consent to the operator giving the title and text of this issue to Claude (Anthropic, United States).';
const CONSENT_BOX = CONSENT_JA + ' / ' + CONSENT_EN;
/* issue が開いたその時から公開されるという断り。様式の初めの欄と、場面の欄の説明に置く。 */
const PUBLIC_JA = 'issue は、開いたその時から GitHub で公開されます。運営者が読む前から、誰でも読めます。開いた人の GitHub の名も、一緒に出ます。';
const PUBLIC_EN = 'An issue is public on GitHub from the moment it is opened, before the operator reads it. Anyone can read it, and the GitHub username of the person who opened it is shown with it.';

const SITE = 'https://quiet-wizard.vercel.app/';
const REPO = 'cpsbvbng26-dotcom/quiet-wizard';
const LABEL = { entry: 'entry', complete: 'entry: complete', incomplete: 'entry: incomplete' };
const LABEL_META = {
  entry: ['c9a227', 'みんなの図鑑に寄せた場面 / A scene sent to the Field Guide by Visitors'],
  complete: ['2c7a4b', '様式の欄と印がそろっている（intake/entry.js） / The fields and boxes of the form are complete'],
  incomplete: ['b0563a', '様式の欄か印が足りない（intake/entry.js） / A field or box of the form is missing'],
};

/* 様式の欄。[種類, id, 見出し, 説明, 中身]。見出しは、GitHub が本文に「### 見出し」として書く。 */
const FIELDS = [
  ['dropdown', 'law', '法則 / Law', 'どの法則の場面か / The law the scene shows', { options: LAWS.map((x, i) => lawOption(i + 1)), required: true }],
  ['input', 'title', '題 / Title', '短い題。日本語は ' + LIMITS.title.ja[1] + ' 字まで、英語は ' + LIMITS.title.en[1] + ' 文字まで / A short title: up to ' + LIMITS.title.ja[1] + ' characters in Japanese, ' + LIMITS.title.en[1] + ' in English', { required: true }],
  ['textarea', 'text', '場面 / Scene',
    '一つか二つの文。日本語は ' + LIMITS.text.ja[0] + ' 字から ' + LIMITS.text.ja[1] + ' 字まで、英語は ' + LIMITS.text.en[0] + ' 文字から ' + LIMITS.text.en[1] + ' 文字まで。空白も一字に数え、改行は数えません。実在の人、誰のことか分かる人、GitHub の名（@ で始まる名）、リンクは、場面に入れない決めです。' + PUBLIC_JA
    + ' / One or two sentences: ' + LIMITS.text.ja[0] + ' to ' + LIMITS.text.ja[1] + ' characters in Japanese, ' + LIMITS.text.en[0] + ' to ' + LIMITS.text.en[1] + ' in English. Spaces count; line breaks do not. Real or identifiable people, GitHub usernames (names starting with @) and links are kept out of the scene. ' + PUBLIC_EN,
    { required: true }],
  ['dropdown', 'lang', '言葉 / Language', '場面を書いた言葉。訳さずに、書いた言葉のまま載せます / The language the scene is written in. It is shown as written, without translation', { options: [LANG_OPTIONS.ja, LANG_OPTIONS.en], required: true }],
  ['checkboxes', 'checks', '確かめ / Checks', 'どれも印が要ります。印の無い欄があれば、受付の機械がそのことをコメントで知らせます / Every box is needed. If one is left empty, the intake says so in a comment',
    { boxes: BOXES.map(([, , t]) => [t, true]) }],
  ['checkboxes', 'credit', '名の表示 / Credit', '任意です。印が無ければ、頁にも data/entries.json にも名を書きません / Optional. Without it, no name is written on the site or in data/entries.json', { boxes: [[CREDIT_BOX, false]] }],
  ['checkboxes', 'consent', '言語モデルに渡ること / Use of a language model',
    '運営者は、このリポジトリの手入れを、言語モデル Claude（Anthropic、米国）の手を借りて行います。この欄に印があれば、その作業のあいだ、この issue の題と本文が Claude に渡ることがあります。運営者は、これを個人情報保護法第 28 条の外国にある第三者への提供として扱います。米国の制度と Anthropic の措置は、[個人情報の取り扱い](' + SITE + 'privacy.html)の「言語モデルに渡すこと」にあります。印は任意です。印が無ければ、運営者が自分で読み、題と本文を言語モデルに渡しません。コメントは、印があっても渡しません。同意は、この issue で、いつでも撤回できます。'
    + '\nThe operator maintains this repository with the help of Claude, the language model of Anthropic (United States). If this box is ticked, the title and text of this issue may be given to Claude during that work. The operator treats this as a provision of personal data to a third party in a foreign country under Article 28 of Japan\'s Act on the Protection of Personal Information. The system of the United States and Anthropic\'s measures are set out in the section "Giving issues to a language model" of the [privacy policy](' + SITE + 'privacy.en.html). The box is optional. Without it, the operator reads the issue in person and gives its title and text to no language model. Comments are not given to it even with the box. The consent can be withdrawn at any time in this issue.',
    { boxes: [[CONSENT_BOX, false]] }],
];
const INTRO = [
  'これは遊びです。科学ではありません。',
  '寄せるのは、原典の十の法則のどれかが、暮らしの中で地味に現れる場面です。作り話か、誰にでもありそうな場面です。[図鑑](' + SITE + 'guide.html)の「十の法則の、地味な現れ」と同じ種類の文です。',
  PUBLIC_JA,
  'サイトに載るのは、運営者が読んで選んだ場面だけです。受付の機械は、欄と印を確かめてラベルとコメントを付けるだけで、何も載せず、issue を閉じません。',
  '載せた場面を外すこと、名を隠すこと、この issue を直すか消すことは、いつでも求められます（[求めと連絡](' + SITE + 'requests.html)）。寄せた場面の決まりは[利用規約](' + SITE + 'terms.html)の「寄せた場面」に、扱う情報は[個人情報の取り扱い](' + SITE + 'privacy.html)にあります。',
  '',
  'This is a play, not science.',
  'What is sent here is a scene in which one of the ten laws of the canon quietly shows up in daily life: a made-up scene, or one that could happen to anyone. It is the same kind of text as "How the ten laws quietly show" in the [field guide](' + SITE + 'guide.en.html).',
  PUBLIC_EN,
  'Only scenes that the operator has read and chosen appear on the site. The intake only checks the fields and boxes and adds a label and a comment; it publishes nothing and closes no issue.',
  'Removing an added scene, hiding the name, and editing or deleting this issue can be asked for at any time ([requests and contact](' + SITE + 'requests.en.html)). The rules for scenes are in "Scenes sent in" of the [terms of use](' + SITE + 'terms.en.html), and the information handled is in the [privacy policy](' + SITE + 'privacy.en.html).',
];

/* YAML は、一行の値を JSON の文字列で書く（YAML の二重引用の文字列として読める）。長い文は「|」の塊にする。 */
function form() {
  const q = JSON.stringify;
  const block = (t, ind) => t.split('\n').map((l) => (l ? ind + l : '')).join('\n');
  const out = ['# 生成物：intake/entry.js の FORM から node build.js が作る。手で直さない。', 'name: ' + q('みんなの図鑑に場面を寄せる / Send a scene to the Field Guide by Visitors'),
    'description: ' + q('十の法則が暮らしの中で地味に現れる場面を寄せる / A made-up everyday scene in which one of the ten laws quietly shows'),
    'title: ' + q('みんなの図鑑: '), 'labels: [' + q(LABEL.entry) + ']', 'body:', '  - type: markdown', '    attributes:', '      value: |', block(INTRO.join('\n\n').replace(/\n\n\n\n/, '\n\n'), '        ')];
  for (const [type, id, label, desc, o] of FIELDS) {
    out.push('  - type: ' + type, '    id: ' + id, '    attributes:', '      label: ' + q(label));
    if (desc.includes('\n')) out.push('      description: |', block(desc, '        ')); else out.push('      description: ' + q(desc));
    if (o.options) out.push('      options:', ...o.options.map((x) => '        - ' + q(x)));
    if (o.boxes) out.push('      options:', ...o.boxes.flatMap(([t, r]) => ['        - label: ' + q(t), '          required: ' + r]));
    if (o.required) out.push('    validations:', '      required: true');
  }
  return out.join('\n') + '\n';
}
/* 様式の一覧の設定。白紙の issue（求めや知らせ）も開けるまま、求めと連絡の頁へのつなぎを添える。 */
function config() {
  const q = JSON.stringify;
  return ['# 生成物：intake/entry.js から node build.js が作る。手で直さない。', 'blank_issues_enabled: true', 'contact_links:',
    '  - name: ' + q('求めと連絡 / Requests and contact'), '    url: ' + q(SITE + 'requests.html'),
    '    about: ' + q('誤りの知らせ、記載や場面を外す求め、名を隠す求めは、白紙の issue で受けます / Error reports and requests to remove an entry or a scene, or to hide a name, are received as blank issues')].join('\n') + '\n';
}

/* 載せない決めの語（2026-11-23）。控えめな一覧で、はっきりした形だけを拾う。ここに当たらなくても、運営者が読んで決める。
 * 一つ目の組は、性経験を言う語（決めごと 1）。二つ目の組は、人を魔法使いと呼ぶ形（決めごと 2）：敬称や続柄や一人称の後の「は魔法使い」、
 * 英語の「Mr X is a wizard」「my boss is a wizard」「I am a wizard」。三つ目の組は、誰かを指しうる印：GitHub の名（@名）とリンク。 */
const WIZ = '(?:魔法使い|まほうつかい|ステルス・ウィザード|ウィザード)';
const FORBIDDEN = [
  ['sex-ja', /童貞|処女|性経験|性交|セックス|初体験|経験人数|肉体関係|風俗|エッチ/],
  ['sex-en', /\b(?:virgin(?:s|ity)?|sex(?:ual|ually)?|intercourse|hook(?:ed|s)?\s+up|slept\s+with)\b/i],
  ['wizard-ja', new RegExp('(?:さん|くん|君|ちゃん|氏|様|先生|先輩|後輩|部長|課長|係長|社長|上司|同僚|父|母|兄|姉|弟|妹|夫|妻|彼|彼女|私|僕|俺|わたし|ぼく|おれ|自分)(?:は|が|も|こそ)、?(?:もう|きっと|実は|やはり|たぶん)?' + WIZ)],
  ['wizard-en', /\b(?:(?:Mr|Mrs|Ms|Mx|Dr|Prof)\.?\s+[A-Z][\w'-]*|my\s+(?:boss|colleague|co-?worker|friend|father|mother|dad|mum|mom|brother|sister|husband|wife|partner|neighbou?r|teacher|manager)|I|I'm|I\s+am|you)\s+(?:is|am|are|was|were|became|has\s+become|have\s+become)?\s*(?:a|the|already\s+a|surely\s+a)?\s*(?:stealth\s+)?wizards?\b/i],
  ['mention', /(^|[^\w.@])@[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\b/],
  ['link', /https?:\/\/|www\./i],
];
const forbidden = (s) => FORBIDDEN.filter(([, re]) => re.test(String(s))).map(([id]) => id);

/* GitHub が様式から書く本文を、見出しごとに分ける。空の欄は「_No response_」。 */
function parse(body) {
  const out = {};
  const parts = String(body || '').replace(/\r\n?/g, '\n').split(/^### /m).slice(1);
  for (const p of parts) {
    const nl = p.indexOf('\n'), head = (nl < 0 ? p : p.slice(0, nl)).trim(), val = (nl < 0 ? '' : p.slice(nl + 1)).trim();
    const f = FIELDS.find((x) => x[2] === head);
    if (!f || out[f[1]] !== undefined) continue;
    out[f[1]] = val === '_No response_' ? '' : val;
  }
  return out;
}
const ticked = (val, label) => String(val || '').split('\n').some((l) => l.trim() === '- [X] ' + label || l.trim() === '- [x] ' + label);
/* 確かめる。足りないものを、決まった語で返す。 */
function verdict(body) {
  const v = parse(body), miss = [];
  const law = LAWS.findIndex((x, i) => v.law === lawOption(i + 1)) + 1;
  if (!law) miss.push('law');
  const lang = Object.keys(LANG_OPTIONS).find((k) => v.lang === LANG_OPTIONS[k]) || null;
  if (!lang) miss.push('lang');
  const L = lang || 'ja';
  const title = (v.title || '').trim(), text = (v.text || '').trim();
  if (!title) miss.push('title-empty'); else if (len(title) > LIMITS.title[L][1] || /\n/.test(title)) miss.push('title-long');
  if (!text) miss.push('text-empty'); else if (len(text) < LIMITS.text[L][0]) miss.push('text-short'); else if (len(text) > LIMITS.text[L][1]) miss.push('text-long');
  if (lang === 'ja' && text && !JA_CHARS.test(title + text)) miss.push('lang-mismatch');
  if (lang === 'en' && JA_CHARS.test(title + text)) miss.push('lang-mismatch');
  for (const [id, , label] of BOXES) if (!ticked(v.checks, label)) miss.push('box:' + id);
  if (forbidden(title + '\n' + text).length) miss.push('words');
  return { complete: miss.length === 0, miss, entry: { law, lang, title, text, credit_allowed: ticked(v.credit, CREDIT_BOX), consent: ticked(v.consent, CONSENT_BOX) } };
}
/* コメントの文。決まった語だけでできていて、issue の題や本文を写さない。 */
const MARK = '<!-- entry-intake -->';
const MISS_TEXT = {
  law: ['法則が、十の法則のどれでもありません。', 'The law is not one of the ten.'],
  lang: ['言葉が、日本語か英語のどちらでもありません。', 'The language is neither Japanese nor English.'],
  'title-empty': ['題がありません。', 'There is no title.'],
  'title-long': ['題が、決めた長さ（日本語は ' + LIMITS.title.ja[1] + ' 字、英語は ' + LIMITS.title.en[1] + ' 文字）を超えているか、改行を含みます。', 'The title is longer than the limit (' + LIMITS.title.ja[1] + ' characters in Japanese, ' + LIMITS.title.en[1] + ' in English), or contains a line break.'],
  'text-empty': ['場面がありません。', 'There is no scene.'],
  'text-short': ['場面が、決めた長さ（日本語は ' + LIMITS.text.ja[0] + ' 字、英語は ' + LIMITS.text.en[0] + ' 文字）に足りません。', 'The scene is shorter than the minimum (' + LIMITS.text.ja[0] + ' characters in Japanese, ' + LIMITS.text.en[0] + ' in English).'],
  'text-long': ['場面が、決めた長さ（日本語は ' + LIMITS.text.ja[1] + ' 字、英語は ' + LIMITS.text.en[1] + ' 文字）を超えています。', 'The scene is longer than the limit (' + LIMITS.text.ja[1] + ' characters in Japanese, ' + LIMITS.text.en[1] + ' in English).'],
  'lang-mismatch': ['選んだ言葉と、題か場面の文字が合いません（英語の場面に、かなや漢字があるなど）。', 'The chosen language does not match the characters of the title or the scene (kana or kanji in an English scene, for example).'],
  words: ['題か場面に、載せない決めの語に当たる語があります。一覧は intake/entry.js の FORBIDDEN です（性経験の語、人を魔法使いと呼ぶ形、@ で始まる名、リンク）。', 'The title or the scene contains a word that this site does not publish. The list is FORBIDDEN in intake/entry.js (words for sexual experience, calling a person a wizard, names starting with @, links).'],
};
for (const [id, short, label] of BOXES) MISS_TEXT['box:' + id] = ['「' + short + '」の印がありません。', 'The box "' + label.split(' / ')[1] + '" is not ticked.'];
function comment(v) {
  const tail = ['この issue は閉じず、鍵も掛けず、消しません。', 'This issue is not closed, locked or deleted.'];
  if (v.complete) return [MARK, 'みんなの図鑑の様式の欄と印が、そろっています。受付の機械が確かめたのは、法則、題、場面の長さ、言葉、確かめの印だけです。',
    '載せるかどうかは、運営者が読んで決めます。載せるときは、運営者が data/entries.json に足す変更を作ります。機械は何も載せません。', tail[0], '',
    'The fields and boxes of the form for the Field Guide by Visitors are complete. The intake checked only the law, the title, the length of the scene, the language and the boxes.',
    'Whether it is added is decided by the operator, who reads it. If it is added, the operator makes a change that adds it to data/entries.json. The intake publishes nothing.', tail[1]].join('\n');
  return [MARK, 'みんなの図鑑の様式の欄と印に、足りないところがあります。', ...v.miss.map((k) => '- ' + MISS_TEXT[k][0]), '本文を編集すると、受付の機械がもう一度確かめます。', tail[0], '',
    'Something is missing from the fields or boxes of the form for the Field Guide by Visitors.', ...v.miss.map((k) => '- ' + MISS_TEXT[k][1]), 'Editing the body makes the intake check again.', tail[1]].join('\n');
}

/* 載せた場面（data/entries.json）の形。build.js と check.js が使う。足りなければ、決まった語で返す。 */
const ENTRY_KEYS = ['issue', 'law', 'title', 'text', 'lang', 'credit', 'credit_allowed', 'edited', 'accepted'];
const USERNAME = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
function validateData(d, today) {
  const bad = [];
  if (!d || typeof d !== 'object' || Array.isArray(d) || Object.keys(d).sort().join() !== '_,entries' || typeof d._ !== 'string' || !Array.isArray(d.entries)) return ['data/entries.json の形が {"_": 説明, "entries": [...]} でない'];
  const seen = new Set();
  d.entries.forEach((e, i) => {
    const at = '場面 ' + (i + 1) + '：';
    if (!e || typeof e !== 'object' || Object.keys(e).sort().join() !== ENTRY_KEYS.slice().sort().join()) { bad.push(at + '欄が ' + ENTRY_KEYS.join('・') + ' でない'); return; }
    if (!Number.isInteger(e.issue) || e.issue < 1 || seen.has(e.issue)) bad.push(at + 'issue の番号が正の整数でないか、重なる'); seen.add(e.issue);
    if (!Number.isInteger(e.law) || e.law < 1 || e.law > 10) bad.push(at + '法則の番号が 1 から 10 でない');
    if (!['ja', 'en'].includes(e.lang)) bad.push(at + '言葉が ja か en でない');
    const L = e.lang === 'en' ? 'en' : 'ja';
    for (const k of ['title', 'text']) {
      if (typeof e[k] !== 'string' || e[k] !== e[k].trim() || /[\n\r<>]/.test(e[k])) { bad.push(at + k + ' が、前後に空白の無い一行の文でないか、< > を含む'); continue; }
      if (len(e[k]) < LIMITS[k][L][0] || len(e[k]) > LIMITS[k][L][1]) bad.push(at + k + ' の長さが決めた範囲の外');
    }
    if (typeof e.title === 'string' && typeof e.text === 'string') {
      if (L === 'en' && JA_CHARS.test(e.title + e.text)) bad.push(at + '英語の場面に、かなか漢字がある');
      if (L === 'ja' && !JA_CHARS.test(e.title + e.text)) bad.push(at + '日本語の場面に、かなも漢字もない');
      const w = forbidden(e.title + '\n' + e.text);
      if (w.length) bad.push(at + '載せない決めの語に当たる（' + w.join(',') + '）');
    }
    if (typeof e.credit_allowed !== 'boolean' || typeof e.edited !== 'boolean') bad.push(at + 'credit_allowed か edited が真偽でない');
    if (e.credit !== null && !(typeof e.credit === 'string' && USERNAME.test(e.credit))) bad.push(at + 'credit が null でも GitHub の名の形でもない');
    if (e.credit !== null && e.credit_allowed !== true) bad.push(at + '名を出してよいという印が無いのに、credit がある');
    const ok = typeof e.accepted === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.accepted) && new Date(e.accepted + 'T00:00:00Z').toISOString().slice(0, 10) === e.accepted;
    if (!ok) bad.push(at + '載せた日が日付でない'); else if (today && e.accepted > today) bad.push(at + '載せた日が今日より後');
  });
  return bad;
}

/* GitHub の API。呼んでよいものだけを通す。閉じる・鍵を掛ける・消す・題や本文を変える呼び出しは、ここで止まる。 */
/* [方法, 所在, 送ってよい欄]。GET と DELETE は何も送らない。 */
const ALLOWED = [['GET', /^\/issues\/\d+$/, null], ['GET', /^\/issues\/\d+\/comments\?per_page=100&page=\d+$/, null], ['POST', /^\/labels$/, ['name', 'color', 'description']],
  ['POST', /^\/issues\/\d+\/labels$/, ['labels']], ['DELETE', /^\/issues\/\d+\/labels\/[^/]+$/, null], ['POST', /^\/issues\/\d+\/comments$/, ['body']], ['PATCH', /^\/issues\/comments\/\d+$/, ['body']]];
function guard(method, url, body) {
  const a = ALLOWED.find(([m, re]) => m === method && re.test(url));
  if (!a) throw new Error('呼んでよくない API：' + method + ' ' + url.split('?')[0]);
  const keys = body === undefined ? null : Object.keys(body || {});
  if (a[2] === null ? keys !== null : !keys || !keys.length || keys.some((k) => !a[2].includes(k))) throw new Error('送ってよくない欄：' + method + ' ' + url.split('?')[0]);
}
function client(token, fetchImpl, repo) {
  return async (method, url, body) => {
    guard(method, url, body);
    const r = await fetchImpl('https://api.github.com/repos/' + repo + url, { method,
      headers: { authorization: 'Bearer ' + token, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'quiet-wizard-entry', 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body) });
    if (method === 'POST' && url === '/labels' && r.status === 422) return null;
    if (method === 'DELETE' && r.status === 404) return null;
    if (!r.ok) throw new Error(method + ' ' + url.split('?')[0] + ' の答えが ' + r.status);
    return r.status === 204 ? null : r.json();
  };
}
async function ensureLabels(gh, keys) {
  for (const k of keys) await gh('POST', '/labels', { name: LABEL[k], color: LABEL_META[k][0], description: LABEL_META[k][1] });
}
/* 一つの issue を確かめる。log には番号と決まった語だけを渡す。 */
async function run(gh, n, log) {
  const i = await gh('GET', '/issues/' + n);
  if (!i || i.pull_request || i.state !== 'open') return log('#' + n + '：開いた issue でないので、何もしません。');
  const names = (i.labels || []).map((l) => (typeof l === 'string' ? l : l.name));
  if (!names.includes(LABEL.entry)) return log('#' + n + '：ラベル entry が無いので、何もしません。');
  const v = verdict(i.body), want = v.complete ? LABEL.complete : LABEL.incomplete, other = v.complete ? LABEL.incomplete : LABEL.complete;
  await ensureLabels(gh, ['complete', 'incomplete']);
  if (!names.includes(want)) await gh('POST', '/issues/' + n + '/labels', { labels: [want] });
  if (names.includes(other)) await gh('DELETE', '/issues/' + n + '/labels/' + encodeURIComponent(other));
  const text = comment(v);
  let mine = null;
  for (let page = 1; page <= 30 && !mine; page++) {
    const list = await gh('GET', '/issues/' + n + '/comments?per_page=100&page=' + page);
    if (!Array.isArray(list)) throw new Error('コメントの一覧が一覧でない');
    mine = list.find((c) => c && c.user && c.user.type === 'Bot' && String(c.body || '').startsWith(MARK)) || null;
    if (list.length < 100) break;
  }
  if (!mine) await gh('POST', '/issues/' + n + '/comments', { body: text });
  else if (mine.body !== text) await gh('PATCH', '/issues/comments/' + mine.id, { body: text });
  log('#' + n + '：' + (v.complete ? 'そろっている' : '足りない（' + v.miss.join(',') + '）') + '。ラベルとコメントを改めました。');
}

/* 作り物の本文を、GitHub が様式から書く形で組む。 */
function bodyFrom(o) {
  const parts = [];
  for (const [type, id, label, , opt] of FIELDS) {
    let val = o[id];
    if (type === 'checkboxes') val = opt.boxes.map(([t], k) => '- [' + ((o[id] || [])[k] ? 'X' : ' ') + '] ' + t).join('\n');
    parts.push('### ' + label + '\n\n' + (val === undefined || val === '' ? '_No response_' : val));
  }
  return parts.join('\n\n');
}
function selfTest() {
  let pass = 0; const fails = [];
  const t = (name, cond) => { if (cond) pass++; else fails.push(name); };
  const all = BOXES.map(() => true);
  /* 試験の作り物。投稿ではない。 */
  const good = { law: lawOption(3), title: '試験の作り物の題', text: 'これは受付の試験のための作り物の文で、寄せられた場面ではありません。', lang: LANG_OPTIONS.ja, checks: all, credit: [false], consent: [false] };
  const goodEn = { law: lawOption(8), title: 'A made-up test title', text: 'This is made-up text for testing the intake. It is not a scene that anyone sent in.', lang: LANG_OPTIONS.en, checks: all, credit: [true], consent: [true] };
  const g = verdict(bodyFrom(good)), ge = verdict(bodyFrom(goodEn));
  t('そろった日本語の本文が通る', g.complete && g.entry.law === 3 && g.entry.lang === 'ja' && !g.entry.credit_allowed && !g.entry.consent);
  t('そろった英語の本文が通り、名の表示と同意の印を読む', ge.complete && ge.entry.law === 8 && ge.entry.lang === 'en' && ge.entry.credit_allowed && ge.entry.consent);
  t('[x] の小文字の印も読む', verdict(bodyFrom(good).replace(/- \[X\]/g, '- [x]')).complete);
  t('CRLF の本文も読む', verdict(bodyFrom(good).replace(/\n/g, '\r\n')).complete);
  const cases = [
    ['法則が無い', Object.assign({}, good, { law: '' }), 'law'], ['法則が十のどれでもない', Object.assign({}, good, { law: '第十一法則 創作 / Law 11 Invented' }), 'law'],
    ['言葉が無い', Object.assign({}, good, { lang: '' }), 'lang'], ['題が無い', Object.assign({}, good, { title: '' }), 'title-empty'],
    ['題が長い', Object.assign({}, good, { title: 'あ'.repeat(LIMITS.title.ja[1] + 1) }), 'title-long'], ['英語の題が長い', Object.assign({}, goodEn, { title: 'a'.repeat(LIMITS.title.en[1] + 1) }), 'title-long'],
    ['場面が無い', Object.assign({}, good, { text: '' }), 'text-empty'], ['場面が短い', Object.assign({}, good, { text: 'あ'.repeat(LIMITS.text.ja[0] - 1) }), 'text-short'],
    ['場面が長い', Object.assign({}, good, { text: 'あ'.repeat(LIMITS.text.ja[1] + 1) }), 'text-long'], ['英語の場面が長い', Object.assign({}, goodEn, { text: 'a '.repeat(LIMITS.text.en[1]) + 'a' }), 'text-long'],
    ['英語の場面に漢字', Object.assign({}, goodEn, { text: goodEn.text + ' 魔法' }), 'lang-mismatch'], ['日本語の場面に、かなも漢字もない', Object.assign({}, good, { title: 'test', text: 'only latin letters here, nothing else' }), 'lang-mismatch'],
    ['性経験の語', Object.assign({}, good, { text: good.text + '童貞のまま。' }), 'words'], ['英語の性経験の語', Object.assign({}, goodEn, { text: goodEn.text + ' Still a virgin.' }), 'words'],
    ['敬称の後の「は魔法使い」', Object.assign({}, good, { text: good.text + '田中さんは魔法使いだ。' }), 'words'], ['一人称の「は魔法使い」', Object.assign({}, good, { text: good.text + '私はもう魔法使いです。' }), 'words'],
    ['英語の「Mr X is a wizard」', Object.assign({}, goodEn, { text: goodEn.text + ' Mr Smith is a wizard.' }), 'words'], ['英語の「my boss is a wizard」', Object.assign({}, goodEn, { text: goodEn.text + ' My boss is surely a wizard.' }), 'words'],
    ['英語の「I am a wizard」', Object.assign({}, goodEn, { text: goodEn.text + ' I am a wizard.' }), 'words'],
    ['GitHub の名', Object.assign({}, good, { text: good.text + '@someone より。' }), 'words'], ['リンク', Object.assign({}, good, { text: good.text + 'https://example.com' }), 'words'],
    ...BOXES.map(([id], k) => ['印「' + id + '」が無い', Object.assign({}, good, { checks: all.map((x, j) => j !== k) }), 'box:' + id]),
  ];
  for (const [name, o, code] of cases) { const v = verdict(bodyFrom(o)); t('落ちる：' + name, !v.complete && v.miss.includes(code)); }
  t('落ちる：様式を通らない本文', !verdict('何かを寄せたい').complete);
  t('落ちる：印の文を書き換えた本文', !verdict(bodyFrom(good).replace('十八歳以上です。', '十八歳以上かもしれません。')).complete);
  t('名の表示の印が無ければ、名を出してよいと読まない', !verdict(bodyFrom(good)).entry.credit_allowed);
  t('同意の印が無ければ、同意と読まない', !verdict(bodyFrom(Object.assign({}, goodEn, { consent: [false] }))).entry.consent);
  /* コメントは決まった語だけで、題も本文も写さない。 */
  const bad = verdict(bodyFrom(Object.assign({}, good, { checks: all.map((x, j) => j !== 0), text: good.text + '田中さんは魔法使いだ。' })));
  t('コメントに題も本文も写さない', !comment(bad).includes('田中') && !comment(bad).includes(good.title) && comment(bad).startsWith(MARK) && comment(g).startsWith(MARK));
  t('コメントが、足りないものを日本語と英語で挙げる', comment(bad).includes(MISS_TEXT['box:adult'][0]) && comment(bad).includes(MISS_TEXT['box:adult'][1]) && comment(bad).includes(MISS_TEXT.words[0]));
  /* 載せた場面の形。 */
  const e0 = { issue: 1, law: 3, title: '試験の作り物の題', text: 'これは検査のための作り物の文で、寄せられた場面ではありません。', lang: 'ja', credit: null, credit_allowed: false, edited: false, accepted: '2026-11-23' };
  const D = (...es) => ({ _: 'x', entries: es });
  t('載せた場面：正しい形が通る', validateData(D(e0, Object.assign({}, e0, { issue: 2, lang: 'en', title: 'A made-up title', text: 'Made-up text for the check, not a scene anyone sent in.', credit: 'octo-cat', credit_allowed: true })), '2026-11-23').length === 0);
  t('載せた場面：零件が通る', validateData(D(), '2026-11-23').length === 0);
  for (const [name, d] of [['名の印なしに名を出す', D(Object.assign({}, e0, { credit: 'octo-cat' }))], ['法則が 11', D(Object.assign({}, e0, { law: 11 }))], ['番号が重なる', D(e0, Object.assign({}, e0))],
    ['欄が足りない', D((({ edited, ...r }) => r)(e0))], ['欄が多い', D(Object.assign({}, e0, { email: 'x' }))], ['性経験の語', D(Object.assign({}, e0, { text: e0.text + '童貞の話。' }))],
    ['場面が長い', D(Object.assign({}, e0, { text: 'あ'.repeat(201) }))], ['載せた日が先', D(Object.assign({}, e0, { accepted: '2099-01-01' }))], ['名の形でない', D(Object.assign({}, e0, { credit: 'a b', credit_allowed: true }))],
    ['< を含む', D(Object.assign({}, e0, { text: e0.text + '<b>' }))], ['形が違う', { entries: [] }]]) t('載せた場面：落ちる：' + name, validateData(d, '2026-11-23').length > 0);
  /* 呼んでよくない API は、送る前に止まる。 */
  for (const [m, u, b] of [['PATCH', '/issues/5', { state: 'closed' }], ['PUT', '/issues/5/lock', {}], ['DELETE', '/issues/5', undefined], ['PATCH', '/issues/5', { title: 'x' }], ['PATCH', '/issues/5', { body: 'x' }], ['DELETE', '/issues/comments/9', undefined], ['POST', '/issues/5/comments', { body: 'x', state: 'closed' }]]) {
    let stopped = false; try { guard(m, u, b); } catch (e) { stopped = true; } t('止まる：' + m + ' ' + u + ' ' + JSON.stringify(b || {}), stopped);
  }
  return { pass, fails };
}
/* 作り物の API で、事件から確かめまでを通す。 */
async function selfTestRun() {
  let pass = 0; const fails = [];
  const t = (name, cond) => { if (cond) pass++; else fails.push(name); };
  const all = BOXES.map(() => true);
  const secret = '試験の作り物の秘密の語';
  const mk = (o) => bodyFrom(Object.assign({ law: lawOption(6), title: secret, text: 'これは受付の試験のための作り物の文で、' + secret + 'を含みます。', lang: LANG_OPTIONS.ja, checks: all, credit: [false], consent: [false] }, o));
  async function sim(issue, comments = []) {
    const calls = [], logs = [];
    let cs = comments.slice();
    const fake = async (u, opt) => {
      const url = u.replace('https://api.github.com/repos/' + REPO, ''), body = opt.body ? JSON.parse(opt.body) : undefined;
      calls.push([opt.method, url.split('?')[0], body]);
      const res = (status, j) => ({ ok: status < 300, status, json: async () => j });
      if (opt.method === 'GET' && /^\/issues\/\d+$/.test(url)) return res(200, issue);
      if (opt.method === 'GET') return res(200, cs);
      if (opt.method === 'POST' && url === '/labels') return res(422, {});
      if (opt.method === 'POST' && /comments$/.test(url)) { cs.push({ id: 77, user: { type: 'Bot' }, body: body.body }); return res(201, {}); }
      return res(200, {});
    };
    await run(client('x', fake, REPO), issue.number, (s) => logs.push(s));
    return { calls, logs };
  }
  const base = { number: 4, state: 'open', labels: [{ name: 'entry' }] };
  const r1 = await sim(Object.assign({}, base, { body: mk({}) }));
  t('そろった issue に complete のラベルとコメント一つ', r1.calls.some(([m, u, b]) => m === 'POST' && u === '/issues/4/labels' && b.labels[0] === LABEL.complete) && r1.calls.filter(([m, u]) => m === 'POST' && u === '/issues/4/comments').length === 1);
  const r2 = await sim(Object.assign({}, base, { body: mk({ checks: all.map((x, j) => j !== 1) }), labels: [{ name: 'entry' }, { name: LABEL.complete }] }));
  t('足りない issue に incomplete を付け、complete を外す', r2.calls.some(([m, u, b]) => m === 'POST' && u === '/issues/4/labels' && b.labels[0] === LABEL.incomplete) && r2.calls.some(([m, u]) => m === 'DELETE' && u === '/issues/4/labels/' + encodeURIComponent(LABEL.complete)));
  const old = { id: 9, user: { type: 'Bot' }, body: comment(verdict(mk({}))) };
  const r3 = await sim(Object.assign({}, base, { body: mk({}), labels: [{ name: 'entry' }, { name: LABEL.complete }] }), [old]);
  t('同じ文のコメントがあれば、足さず書き換えもしない', !r3.calls.some(([m, u]) => (m === 'POST' || m === 'PATCH') && /comments/.test(u)));
  const r4 = await sim(Object.assign({}, base, { body: mk({ law: '' }), labels: [{ name: 'entry' }, { name: LABEL.complete }] }), [old]);
  t('違う文になれば、前のコメントを書き換える', r4.calls.some(([m, u]) => m === 'PATCH' && u === '/issues/comments/9') && !r4.calls.some(([m, u]) => m === 'POST' && /comments$/.test(u)));
  const human = { id: 10, user: { type: 'User' }, body: MARK + ' 人が書いた' };
  const r5 = await sim(Object.assign({}, base, { body: mk({}) }), [human]);
  t('人のコメントは書き換えない', !r5.calls.some(([m, u]) => m === 'PATCH' && u === '/issues/comments/10'));
  for (const [name, iss] of [['ラベル entry の無い issue', Object.assign({}, base, { body: mk({}), labels: [] })], ['閉じた issue', Object.assign({}, base, { body: mk({}), state: 'closed' })], ['PR', Object.assign({}, base, { body: mk({}), pull_request: {} })]]) {
    const r = await sim(iss); t(name + 'には何も書かない', r.calls.every(([m]) => m === 'GET'));
  }
  const every = [r1, r2, r3, r4, r5];
  t('どの呼び出しも、閉じず・鍵を掛けず・消さず・題と本文を変えない', every.every((r) => r.calls.every(([m, u, b]) => !/lock/.test(u) && !(m === 'PATCH' && /^\/issues\/\d+$/.test(u)) && !(m === 'DELETE' && !/\/labels\//.test(u)) && !(b && ('state' in b || 'locked' in b || 'title' in b)))));
  t('ログに題も本文も出さない', every.every((r) => r.logs.every((l) => !l.includes(secret) && !l.includes('作り物の文'))));
  return { pass, fails };
}

async function main() {
  const arg = process.argv[2];
  if (arg === '--self-test') {
    const a = selfTest(), b = await selfTestRun();
    const fails = a.fails.concat(b.fails);
    for (const f of fails) console.log('  落  ' + f);
    console.log((a.pass + b.pass) + ' 件が通り、' + fails.length + ' 件が落ちました。');
    process.exit(fails.length ? 1 : 0);
  }
  const token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) throw new Error('GITHUB_TOKEN と GITHUB_REPOSITORY が要る');
  const gh = client(token, fetch, repo);
  if (arg === '--labels') { await ensureLabels(gh, ['entry', 'complete', 'incomplete']); console.log('ラベルを確かめました。'); return; }
  if (arg) throw new Error('知らない引数：' + arg);
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const n = Number(event.issue && event.issue.number);
  if (!Number.isInteger(n) || n < 1) throw new Error('事件に issue の番号が無い');
  await run(gh, n, (s) => console.log(s));
}
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { LAWS, lawOption, LIMITS, len, BOXES, CREDIT_BOX, CONSENT_JA, CONSENT_EN, CONSENT_BOX, PUBLIC_JA, PUBLIC_EN, LABEL, FIELDS, INTRO, form, config, FORBIDDEN, forbidden,
  parse, verdict, comment, MARK, MISS_TEXT, validateData, ENTRY_KEYS, USERNAME, ALLOWED, guard, client, run, bodyFrom, selfTest, selfTestRun };
