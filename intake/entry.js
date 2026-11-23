#!/usr/bin/env node
/* みんなの図鑑の受付（2026-11-23）。読む人が GitHub の issue の様式で寄せた場面の、欄と印を確かめる。
 *
 *   node intake/entry.js               issue の事件のファイル（GITHUB_EVENT_PATH）から issue の番号を読み、API で issue を読み直して確かめ、
 *                                      ラベル（entry: complete か entry: incomplete か entry: not accepted）と、決まった文のコメント一つを付ける
 *   node intake/entry.js --labels      様式と受付が使う四つのラベルが無ければ作る（main への push のとき）
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
 * - 寄せの数の上限（2026-11-23 に運営者が決めた。EFFECTIVE の日から開いた issue に当てる）。
 *   一つのアカウントから ACCOUNT_CAP 件まで：このリポジトリで同じアカウント（GitHub の利用者の id で見る）がこの issue より前に開いた、
 *   ラベル entry の付いた issue を、開いているか閉じたかを問わずに数える。読むのは GitHub の公開の一覧だけで、名も数も残さず、ログにもコメントにも出さない。
 *   一つの法則に LAW_CAP 件まで：data/entries.json に、その法則の場面が LAW_CAP 件あれば受けない。
 *   上限に当たれば、ラベル entry: not accepted と、そのことを言うコメントを付ける。閉じない。
 * - 載せる場面には、寄せた人の名を出さない（2026-11-23 に運営者が決めた）。様式に名の表示の欄は無く、data/entries.json にも名の欄は無い。
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
/* 寄せの数の上限（2026-11-23）。図鑑の全体は、多くて LAWS.length × LAW_CAP 件。日は日本時間で、issue を開いた日で見る。 */
const ACCOUNT_CAP = 3;
const LAW_CAP = 5;
const EFFECTIVE = '2026-12-08';
const ANNOUNCED = '2026-11-24';
const jstDay = (iso) => { const t = Date.parse(iso); return Number.isFinite(t) ? new Date(t + 9 * 3600e3).toISOString().slice(0, 10) : null; };
/* 開いた日が読めなければ、上限を当てる側に倒す。 */
const limitsApply = (createdAt) => { const d = jstDay(createdAt); return d === null || d >= EFFECTIVE; };
const lawCounts = (data) => LAWS.map((x, i) => ((data && Array.isArray(data.entries)) ? data.entries : []).filter((e) => e && e.law === i + 1).length);
const fullLaws = (data) => lawCounts(data).map((c, i) => [c, i + 1]).filter(([c]) => c >= LAW_CAP).map(([, n]) => n);
const JA_CHARS = /[぀-ヿ一-鿿ｦ-ﾟ]/;

/* 必須の印。id、短い名（コメントに出す）、様式の文。 */
const BOXES = [
  ['adult', '十八歳以上', '十八歳以上です。 / I am 18 or older.'],
  ['original', '自分で書いた文', '自分で新しく書いた文です。他人の文や作品を写していません。 / I wrote this text myself. It copies no one else\'s text or work.'],
  ['noperson', '実在の人を書かない', '実在の人や、誰のことか分かる人を、名指しも描写もしていません。 / It names or describes no real or identifiable person.'],
  ['nosex', '性経験に触れない', '誰の性経験にも触れていません。性的な描写もありません。 / It says nothing about anyone\'s sexual experience, and has no sexual content.'],
  ['nowizard', '魔法使いと言わない', '自分やほかの誰かを、魔法使いだと言っていません。 / It does not claim that I or anyone else is a wizard.'],
  ['play', '遊びの文', '遊びの文で、科学でも助言でもありません。 / It is play, not science or advice.'],
  ['licence', '許諾と名を出さないこと', 'この文を CC BY 4.0 で許諾します。頁では名を出さないことを選び、名の表示を求めません。運営者は、載せないことも、載せた後で外すこともあります。 / I license this text under CC BY 4.0, and choose to have no name shown on the site: I do not ask for credit. The operator may decline the text, or remove it later.'],
  ['edits', '手を入れることへの同意', '載せるときに、運営者が次の三つに限って手を入れることに同意します。長さを詰めること。表記（字、句読点、かなと漢字）をそろえること。このサイトの決めに合わない語を替えること。意味の変わる直しは、この issue で尋ねてからにします。 / I agree that, when adding the text, the operator may change it in these three ways only: shortening it, making the notation consistent (characters, punctuation, kana and kanji), and replacing words that do not fit the rules of this site. A change of meaning is asked about in this issue first.'],
];
/* 決めごと 12 の同意の文。運営者の別のリポジトリの誤りの知らせの様式と、同じ文にしてある。 */
const CONSENT_JA = 'この issue の題と本文を、運営者が Claude（Anthropic、米国）に渡すことに同意します。';
const CONSENT_EN = 'I consent to the operator giving the title and text of this issue to Claude (Anthropic, United States).';
const CONSENT_BOX = CONSENT_JA + ' / ' + CONSENT_EN;
/* issue が開いたその時から公開されるという断り。様式の初めの欄と、場面の欄の説明に置く。 */
const PUBLIC_JA = 'issue は、開いたその時から GitHub で公開されます。運営者が読む前から、誰でも読めます。開いた人の GitHub の名も、一緒に出ます。';
const PUBLIC_EN = 'An issue is public on GitHub from the moment it is opened, before the operator reads it. Anyone can read it, and the GitHub username of the person who opened it is shown with it.';

const SITE = 'https://quiet-wizard.vercel.app/';
const REPO = 'cpsbvbng26-dotcom/quiet-wizard';
const LABEL = { entry: 'entry', complete: 'entry: complete', incomplete: 'entry: incomplete', declined: 'entry: not accepted' };
const LABEL_META = {
  entry: ['c9a227', 'みんなの図鑑に寄せた場面 / A scene sent to the Field Guide by Visitors'],
  complete: ['2c7a4b', '様式の欄と印がそろっている（intake/entry.js） / The fields and boxes of the form are complete'],
  incomplete: ['b0563a', '様式の欄か印が足りない（intake/entry.js） / A field or box of the form is missing'],
  declined: ['6b6f76', '寄せの数の上限に当たり、受けない（intake/entry.js） / Not accepted: a limit on the number of scenes applies'],
};

/* 様式の欄。[種類, id, 見出し, 説明, 中身]。見出しは、GitHub が本文に「### 見出し」として書く。 */
const FIELDS = [
  ['dropdown', 'law', '法則 / Law', 'どの法則の場面か。図鑑に場面が ' + LAW_CAP + ' 件載った法則の寄せは、受けません（' + EFFECTIVE + ' から） / The law the scene shows. A law with ' + LAW_CAP + ' scenes in the guide takes no more (from ' + EFFECTIVE + ')', { options: LAWS.map((x, i) => lawOption(i + 1)), required: true }],
  ['input', 'title', '題 / Title', '短い題。日本語は ' + LIMITS.title.ja[1] + ' 字まで、英語は ' + LIMITS.title.en[1] + ' 文字まで / A short title: up to ' + LIMITS.title.ja[1] + ' characters in Japanese, ' + LIMITS.title.en[1] + ' in English', { required: true }],
  ['textarea', 'text', '場面 / Scene',
    '一つか二つの文。日本語は ' + LIMITS.text.ja[0] + ' 字から ' + LIMITS.text.ja[1] + ' 字まで、英語は ' + LIMITS.text.en[0] + ' 文字から ' + LIMITS.text.en[1] + ' 文字まで。空白も一字に数え、改行は数えません。実在の人、誰のことか分かる人、GitHub の名（@ で始まる名）、リンクは、場面に入れない決めです。' + PUBLIC_JA
    + ' / One or two sentences: ' + LIMITS.text.ja[0] + ' to ' + LIMITS.text.ja[1] + ' characters in Japanese, ' + LIMITS.text.en[0] + ' to ' + LIMITS.text.en[1] + ' in English. Spaces count; line breaks do not. Real or identifiable people, GitHub usernames (names starting with @) and links are kept out of the scene. ' + PUBLIC_EN,
    { required: true }],
  ['dropdown', 'lang', '言葉 / Language', '場面を書いた言葉。訳さずに、書いた言葉のまま載せます / The language the scene is written in. It is shown as written, without translation', { options: [LANG_OPTIONS.ja, LANG_OPTIONS.en], required: true }],
  ['checkboxes', 'checks', '確かめ / Checks', 'どれも印が要ります。印の無い欄があれば、受付の機械がそのことをコメントで知らせます / Every box is needed. If one is left empty, the intake says so in a comment',
    { boxes: BOXES.map(([, , t]) => [t, true]) }],
  ['checkboxes', 'consent', '言語モデルに渡ること / Use of a language model',
    '運営者は、このリポジトリの手入れを、言語モデル Claude（Anthropic、米国）の手を借りて行います。この欄に印があれば、その作業のあいだ、この issue の題と本文が Claude に渡ることがあります。運営者は、これを個人情報保護法第 28 条の外国にある第三者への提供として扱います。米国の制度と Anthropic の措置は、[個人情報の取り扱い](' + SITE + 'privacy.html)の「言語モデルに渡すこと」にあります。印は任意です。印が無ければ、運営者が自分で読み、題と本文を言語モデルに渡しません。コメントは、印があっても渡しません。同意は、この issue で、いつでも撤回できます。'
    + '\nThe operator maintains this repository with the help of Claude, the language model of Anthropic (United States). If this box is ticked, the title and text of this issue may be given to Claude during that work. The operator treats this as a provision of personal data to a third party in a foreign country under Article 28 of Japan\'s Act on the Protection of Personal Information. The system of the United States and Anthropic\'s measures are set out in the section "Giving issues to a language model" of the [privacy policy](' + SITE + 'privacy.en.html). The box is optional. Without it, the operator reads the issue in person and gives its title and text to no language model. Comments are not given to it even with the box. The consent can be withdrawn at any time in this issue.',
    { boxes: [[CONSENT_BOX, false]] }],
];
const INTRO = [
  'これは遊びです。科学ではありません。',
  '寄せるのは、原典の十の法則のどれかが、暮らしの中で地味に現れる場面です。作り話か、誰にでもありそうな場面です。[図鑑](' + SITE + 'guide.html)の「十の法則の、地味な現れ」と同じ種類の文です。',
  PUBLIC_JA,
  'サイトに載るのは、運営者が読んで選んだ場面だけです。頁には、寄せた人の名を出しません。受付の機械は、欄と印と寄せの数を確かめてラベルとコメントを付けるだけで、何も載せず、issue を閉じません。',
  '寄せは、一つの GitHub のアカウントにつき ' + ACCOUNT_CAP + ' 件までです。選ばれなかった寄せも、取り下げた寄せも数えます。図鑑に場面が ' + LAW_CAP + ' 件載った法則の寄せは、受けません。どちらも ' + EFFECTIVE + ' から開いた issue に当てます。',
  '載せた場面を外すこと、この issue を直すか消すことは、いつでも求められます（[求めと連絡](' + SITE + 'requests.html)）。寄せた場面の決まりは[利用規約](' + SITE + 'terms.html)の「寄せた場面」に、扱う情報は[個人情報の取り扱い](' + SITE + 'privacy.html)にあります。',
  '',
  'This is a play, not science.',
  'What is sent here is a scene in which one of the ten laws of the canon quietly shows up in daily life: a made-up scene, or one that could happen to anyone. It is the same kind of text as "How the ten laws quietly show" in the [field guide](' + SITE + 'guide.en.html).',
  PUBLIC_EN,
  'Only scenes that the operator has read and chosen appear on the site. No name of the sender is shown there. The intake only checks the fields, the boxes and the number of scenes sent, and adds a label and a comment; it publishes nothing and closes no issue.',
  'Each GitHub account can send ' + ACCOUNT_CAP + ' scenes at most, counting scenes not chosen and scenes withdrawn. A law with ' + LAW_CAP + ' scenes in the guide takes no more. Both apply to issues opened from ' + EFFECTIVE + '.',
  'Removing an added scene, and editing or deleting this issue, can be asked for at any time ([requests and contact](' + SITE + 'requests.en.html)). The rules for scenes are in "Scenes sent in" of the [terms of use](' + SITE + 'terms.en.html), and the information handled is in the [privacy policy](' + SITE + 'privacy.en.html).',
];

/* 場面が LAW_CAP 件載った法則の名。様式の法則の欄の説明と、みんなの図鑑の頁に出す。選択肢そのものは十のまま置く
 * （GitHub の様式は選択肢の無い欄を受けず、受付は選択肢の文で法則を読むため。閉じた法則を選んだ寄せは、受付が知らせる）。 */
const fullLawText = (data, lang) => {
  const f = fullLaws(data);
  if (lang === 'en') return f.length ? f.map((n) => 'Law ' + n + ' ' + LAWS[n - 1][2]).join(', ') : 'none';
  return f.length ? f.map((n) => LAWS[n - 1][0] + ' ' + LAWS[n - 1][1]).join('、') : 'なし';
};
/* YAML は、一行の値を JSON の文字列で書く（YAML の二重引用の文字列として読める）。長い文は「|」の塊にする。
 * 法則の欄の説明は、載せた場面（data/entries.json）から作る。場面を足したら node build.js で作り直す。 */
function form(data) {
  if (!data || !Array.isArray(data.entries)) throw new Error('様式を作るには、載せた場面（data/entries.json）が要る');
  const q = JSON.stringify;
  const block = (t, ind) => t.split('\n').map((l) => (l ? ind + l : '')).join('\n');
  const out = ['# 生成物：intake/entry.js の FORM から node build.js が作る。手で直さない。', 'name: ' + q('みんなの図鑑に場面を寄せる / Send a scene to the Field Guide by Visitors'),
    'description: ' + q('十の法則が暮らしの中で地味に現れる場面を寄せる / A made-up everyday scene in which one of the ten laws quietly shows'),
    'title: ' + q('みんなの図鑑: '), 'labels: [' + q(LABEL.entry) + ']', 'body:', '  - type: markdown', '    attributes:', '      value: |', block(INTRO.join('\n\n').replace(/\n\n\n\n/, '\n\n'), '        ')];
  for (const [type, id, label, d0, o] of FIELDS) {
    const desc = id === 'law' ? d0.replace(' / ', '。いま ' + LAW_CAP + ' 件載っている法則：' + fullLawText(data, 'ja') + ' / ') + '. Laws with ' + LAW_CAP + ' now: ' + fullLawText(data, 'en') : d0;
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
    '    about: ' + q('誤りの知らせと、記載や場面を外す求めは、白紙の issue で受けます / Error reports and requests to remove an entry or a scene are received as blank issues')].join('\n') + '\n';
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
  return { complete: miss.length === 0, miss, entry: { law, lang, title, text, consent: ticked(v.consent, CONSENT_BOX) } };
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
/* 上限に当たったときの文。アカウントの名も、数えた issue の番号も書かない。法則は、十の法則の決まった名だけを書く。 */
function limitText(k, law) {
  if (k === 'account-full') return ['このアカウントが前に開いた寄せの issue が、すでに ' + ACCOUNT_CAP + ' 件以上あります。寄せは一つのアカウントにつき ' + ACCOUNT_CAP + ' 件までで、選ばれなかった寄せも、取り下げた寄せも数えます。',
    'This account has already opened ' + ACCOUNT_CAP + ' or more issues sending scenes. Each account can send ' + ACCOUNT_CAP + ' scenes at most, counting scenes not chosen and scenes withdrawn.'];
  if (k === 'law-full') return ['選んだ法則（' + LAWS[law - 1][0] + ' ' + LAWS[law - 1][1] + '）には、図鑑に場面が ' + LAW_CAP + ' 件載っています。' + LAW_CAP + ' 件載った法則の寄せは、受けません。',
    'The chosen law (Law ' + law + ' ' + LAWS[law - 1][2] + ') already has ' + LAW_CAP + ' scenes in the guide. A law with ' + LAW_CAP + ' scenes takes no more.'];
  throw new Error('知らない上限：' + k);
}
function comment(v, lim) {
  const tail = ['この issue は閉じず、鍵も掛けず、消しません。', 'This issue is not closed, locked or deleted.'];
  if (lim && lim.length) return [MARK, 'みんなの図鑑の寄せの数の上限に当たるので、この寄せは受けません。', ...lim.map((k) => '- ' + limitText(k, v.entry.law)[0]),
    '上限は、利用規約の「寄せた場面」にあり、' + EFFECTIVE + ' から開いた issue に当てます。', tail[0], '',
    'This scene is not accepted, because a limit on the number of scenes for the Field Guide by Visitors applies.', ...lim.map((k) => '- ' + limitText(k, v.entry.law)[1]),
    'The limits are in "Scenes sent in" of the terms of use, and apply to issues opened from ' + EFFECTIVE + '.', tail[1]].join('\n');
  if (v.complete) return [MARK, 'みんなの図鑑の様式の欄と印が、そろっています。受付の機械が確かめたのは、法則、題、場面の長さ、言葉、確かめの印だけです。',
    '載せるかどうかは、運営者が読んで決めます。載せるときは、運営者が data/entries.json に足す変更を作ります。機械は何も載せません。', tail[0], '',
    'The fields and boxes of the form for the Field Guide by Visitors are complete. The intake checked only the law, the title, the length of the scene, the language and the boxes.',
    'Whether it is added is decided by the operator, who reads it. If it is added, the operator makes a change that adds it to data/entries.json. The intake publishes nothing.', tail[1]].join('\n');
  return [MARK, 'みんなの図鑑の様式の欄と印に、足りないところがあります。', ...v.miss.map((k) => '- ' + MISS_TEXT[k][0]), '本文を編集すると、受付の機械がもう一度確かめます。', tail[0], '',
    'Something is missing from the fields or boxes of the form for the Field Guide by Visitors.', ...v.miss.map((k) => '- ' + MISS_TEXT[k][1]), 'Editing the body makes the intake check again.', tail[1]].join('\n');
}

/* 載せた場面（data/entries.json）の形。build.js と check.js が使う。足りなければ、決まった語で返す。
 * 寄せた人の名の欄は持たない（2026-11-23。頁に名を出さないため）。一つの法則の場面は LAW_CAP 件まで。 */
const ENTRY_KEYS = ['issue', 'law', 'title', 'text', 'lang', 'edited', 'accepted'];
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
    if (typeof e.edited !== 'boolean') bad.push(at + 'edited が真偽でない');
    const ok = typeof e.accepted === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.accepted) && new Date(e.accepted + 'T00:00:00Z').toISOString().slice(0, 10) === e.accepted;
    if (!ok) bad.push(at + '載せた日が日付でない'); else if (today && e.accepted > today) bad.push(at + '載せた日が今日より後');
  });
  lawCounts(d).forEach((c, i) => { if (c > LAW_CAP) bad.push('法則 ' + (i + 1) + ' の場面が ' + c + ' 件で、' + LAW_CAP + ' 件を超える'); });
  return bad;
}

/* GitHub の API。呼んでよいものだけを通す。閉じる・鍵を掛ける・消す・題や本文を変える呼び出しは、ここで止まる。 */
/* [方法, 所在, 送ってよい欄]。GET と DELETE は何も送らない。 */
const ALLOWED = [['GET', /^\/issues\/\d+$/, null], ['GET', /^\/issues\/\d+\/comments\?per_page=100&page=\d+$/, null], ['GET', /^\/issues\?state=all&creator=[A-Za-z0-9-]+&labels=entry&per_page=100&page=\d+$/, null], ['POST', /^\/labels$/, ['name', 'color', 'description']],
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
/* 同じアカウントが、この issue より前に開いた寄せ（ラベル entry の issue）の数。開いているか閉じたかを問わない。
 * アカウントは利用者の id で見る（名を変えても同じに数える）。名は一覧を引くためにだけ使い、残さず、ログにも出さない。消された issue は一覧に出ないので数えられない。 */
async function priorEntries(gh, i) {
  const login = i.user && i.user.login, id = i.user && i.user.id;
  if (typeof login !== 'string' || !USERNAME.test(login) || !Number.isInteger(id)) throw new Error('issue を開いたアカウントが読めない');
  let count = 0;
  for (let page = 1; page <= 30; page++) {
    const list = await gh('GET', '/issues?state=all&creator=' + login + '&labels=entry&per_page=100&page=' + page);
    if (!Array.isArray(list)) throw new Error('issue の一覧が一覧でない');
    count += list.filter((x) => x && !x.pull_request && Number.isInteger(x.number) && x.number < i.number && x.user && x.user.id === id
      && (x.labels || []).some((l) => (typeof l === 'string' ? l : l && l.name) === LABEL.entry)).length;
    if (list.length < 100) break;
  }
  return count;
}
/* 上限。EFFECTIVE より前に開いた issue には当てない。 */
async function limits(gh, i, v, data) {
  if (!limitsApply(i.created_at)) return [];
  const lim = [];
  if (v.entry.law && lawCounts(data)[v.entry.law - 1] >= LAW_CAP) lim.push('law-full');
  if (await priorEntries(gh, i) >= ACCOUNT_CAP) lim.push('account-full');
  return lim;
}
/* 一つの issue を確かめる。log には番号と決まった語だけを渡す。data は載せた場面（data/entries.json）。 */
async function run(gh, n, log, data) {
  if (!data || !Array.isArray(data.entries)) throw new Error('載せた場面（data/entries.json）が要る');
  const i = await gh('GET', '/issues/' + n);
  if (!i || i.pull_request || i.state !== 'open') return log('#' + n + '：開いた issue でないので、何もしません。');
  const names = (i.labels || []).map((l) => (typeof l === 'string' ? l : l.name));
  if (!names.includes(LABEL.entry)) return log('#' + n + '：ラベル entry が無いので、何もしません。');
  const v = verdict(i.body), lim = await limits(gh, i, v, data);
  const state = lim.length ? 'declined' : v.complete ? 'complete' : 'incomplete';
  await ensureLabels(gh, ['complete', 'incomplete', 'declined']);
  if (!names.includes(LABEL[state])) await gh('POST', '/issues/' + n + '/labels', { labels: [LABEL[state]] });
  for (const k of ['complete', 'incomplete', 'declined']) if (k !== state && names.includes(LABEL[k])) await gh('DELETE', '/issues/' + n + '/labels/' + encodeURIComponent(LABEL[k]));
  const text = comment(v, lim);
  let mine = null;
  for (let page = 1; page <= 30 && !mine; page++) {
    const list = await gh('GET', '/issues/' + n + '/comments?per_page=100&page=' + page);
    if (!Array.isArray(list)) throw new Error('コメントの一覧が一覧でない');
    mine = list.find((c) => c && c.user && c.user.type === 'Bot' && String(c.body || '').startsWith(MARK)) || null;
    if (list.length < 100) break;
  }
  if (!mine) await gh('POST', '/issues/' + n + '/comments', { body: text });
  else if (mine.body !== text) await gh('PATCH', '/issues/comments/' + mine.id, { body: text });
  log('#' + n + '：' + (lim.length ? '受けない（' + lim.join(',') + '）' : v.complete ? 'そろっている' : '足りない（' + v.miss.join(',') + '）') + '。ラベルとコメントを改めました。');
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
  const good = { law: lawOption(3), title: '試験の作り物の題', text: 'これは受付の試験のための作り物の文で、寄せられた場面ではありません。', lang: LANG_OPTIONS.ja, checks: all, consent: [false] };
  const goodEn = { law: lawOption(8), title: 'A made-up test title', text: 'This is made-up text for testing the intake. It is not a scene that anyone sent in.', lang: LANG_OPTIONS.en, checks: all, consent: [true] };
  const g = verdict(bodyFrom(good)), ge = verdict(bodyFrom(goodEn));
  t('そろった日本語の本文が通る', g.complete && g.entry.law === 3 && g.entry.lang === 'ja' && !g.entry.consent);
  t('そろった英語の本文が通り、同意の印を読む', ge.complete && ge.entry.law === 8 && ge.entry.lang === 'en' && ge.entry.consent);
  t('読んだ寄せに、名の表示の欄が無い', !('credit_allowed' in g.entry) && !('credit' in g.entry) && !FIELDS.some(([, id]) => id === 'credit'));
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
  t('同意の印が無ければ、同意と読まない', !verdict(bodyFrom(Object.assign({}, goodEn, { consent: [false] }))).entry.consent);
  /* コメントは決まった語だけで、題も本文も写さない。 */
  const bad = verdict(bodyFrom(Object.assign({}, good, { checks: all.map((x, j) => j !== 0), text: good.text + '田中さんは魔法使いだ。' })));
  t('コメントに題も本文も写さない', !comment(bad).includes('田中') && !comment(bad).includes(good.title) && comment(bad).startsWith(MARK) && comment(g).startsWith(MARK));
  t('コメントが、足りないものを日本語と英語で挙げる', comment(bad).includes(MISS_TEXT['box:adult'][0]) && comment(bad).includes(MISS_TEXT['box:adult'][1]) && comment(bad).includes(MISS_TEXT.words[0]));
  const lc = comment(g, ['law-full', 'account-full']);
  t('上限のコメントが、二つの上限を日本語と英語で挙げ、題を写さない', lc.startsWith(MARK) && lc.includes(limitText('law-full', 3)[0]) && lc.includes(limitText('law-full', 3)[1]) && lc.includes(limitText('account-full')[0]) && lc.includes(limitText('account-full')[1]) && !lc.includes(good.title) && lc.includes('第三法則 保存'));
  /* 載せた場面の形。名の欄は無い。一つの法則に LAW_CAP 件まで。 */
  const e0 = { issue: 1, law: 3, title: '試験の作り物の題', text: 'これは検査のための作り物の文で、寄せられた場面ではありません。', lang: 'ja', edited: false, accepted: '2026-11-23' };
  const D = (...es) => ({ _: 'x', entries: es });
  const many = (law, k) => Array.from({ length: k }, (x, j) => Object.assign({}, e0, { issue: 100 * law + j, law }));
  t('載せた場面：正しい形が通る', validateData(D(e0, Object.assign({}, e0, { issue: 2, lang: 'en', title: 'A made-up title', text: 'Made-up text for the check, not a scene anyone sent in.' })), '2026-11-23').length === 0);
  t('載せた場面：零件が通る', validateData(D(), '2026-11-23').length === 0);
  t('載せた場面：一つの法則に ' + LAW_CAP + ' 件、十の法則で ' + LAWS.length * LAW_CAP + ' 件が通る', validateData(D(...LAWS.flatMap((x, i) => many(i + 1, LAW_CAP))), '2026-11-23').length === 0);
  for (const [name, d] of [['名を書く', D(Object.assign({}, e0, { credit: 'octo-cat' }))], ['名の印の欄を書く', D(Object.assign({}, e0, { credit_allowed: false }))], ['法則が 11', D(Object.assign({}, e0, { law: 11 }))], ['番号が重なる', D(e0, Object.assign({}, e0))],
    ['欄が足りない', D((({ edited, ...r }) => r)(e0))], ['欄が多い', D(Object.assign({}, e0, { email: 'x' }))], ['性経験の語', D(Object.assign({}, e0, { text: e0.text + '童貞の話。' }))],
    ['場面が長い', D(Object.assign({}, e0, { text: 'あ'.repeat(201) }))], ['載せた日が先', D(Object.assign({}, e0, { accepted: '2099-01-01' }))],
    ['一つの法則に ' + (LAW_CAP + 1) + ' 件', D(...many(4, LAW_CAP + 1))],
    ['< を含む', D(Object.assign({}, e0, { text: e0.text + '<b>' }))], ['形が違う', { entries: [] }]]) t('載せた場面：落ちる：' + name, validateData(d, '2026-11-23').length > 0);
  t('場面が ' + LAW_CAP + ' 件載った法則を数える', fullLaws(D(...many(2, LAW_CAP), ...many(7, LAW_CAP - 1))).join() === '2' && fullLawText(D(...many(2, LAW_CAP)), 'ja') === '第二法則 多面' && fullLawText(D(), 'en') === 'none');
  /* 効き始める日。日本時間で、issue を開いた日で見る。 */
  /* 2026-11-23 に運営者が決めた数と、利用規約で示した日。数を変えるなら、利用規約で前もって示してから。 */
  t('上限は、一つのアカウントから 3 件、一つの法則に 5 件、図鑑の全体で 50 件。効く日は 2026-12-08、示した日は 2026-11-24', ACCOUNT_CAP === 3 && LAW_CAP === 5 && LAWS.length * LAW_CAP === 50 && EFFECTIVE === '2026-12-08' && ANNOUNCED === '2026-11-24');
  t('上限は ' + EFFECTIVE + ' の日本時間の零時から当たる', !limitsApply('2026-12-07T14:59:59Z') && limitsApply('2026-12-07T15:00:00Z') && limitsApply(undefined) && EFFECTIVE > ANNOUNCED);
  /* 呼んでよくない API は、送る前に止まる。 */
  for (const [m, u, b] of [['PATCH', '/issues/5', { state: 'closed' }], ['PUT', '/issues/5/lock', {}], ['DELETE', '/issues/5', undefined], ['PATCH', '/issues/5', { title: 'x' }], ['PATCH', '/issues/5', { body: 'x' }], ['DELETE', '/issues/comments/9', undefined], ['POST', '/issues/5/comments', { body: 'x', state: 'closed' }],
    ['GET', '/issues?state=open&creator=octo-cat&labels=entry&per_page=100&page=1', undefined], ['GET', '/issues?state=all&creator=a/b&labels=entry&per_page=100&page=1', undefined], ['GET', '/issues?state=all&creator=octo-cat&per_page=100&page=1', undefined], ['GET', '/search/issues?q=author:octo-cat', undefined]]) {
    let stopped = false; try { guard(m, u, b); } catch (e) { stopped = true; } t('止まる：' + m + ' ' + u.split('?')[0] + ' ' + JSON.stringify(b || {}) + (u.includes('?') ? '（問いの形が違う）' : ''), stopped);
  }
  let through = true; try { guard('GET', '/issues?state=all&creator=octo-cat&labels=entry&per_page=100&page=2', undefined); } catch (e) { through = false; }
  t('通る：同じアカウントの寄せの一覧', through);
  return { pass, fails };
}
/* 作り物の API で、事件から確かめまでを通す。 */
async function selfTestRun() {
  let pass = 0; const fails = [];
  const t = (name, cond) => { if (cond) pass++; else fails.push(name); };
  const all = BOXES.map(() => true);
  const secret = '試験の作り物の秘密の語';
  const who = 'fixture-sender';
  const mk = (o) => bodyFrom(Object.assign({ law: lawOption(6), title: secret, text: 'これは受付の試験のための作り物の文で、' + secret + 'を含みます。', lang: LANG_OPTIONS.ja, checks: all, consent: [false] }, o));
  const e0 = { issue: 1, law: 6, title: '試験の作り物の題', text: 'これは検査のための作り物の文で、寄せられた場面ではありません。', lang: 'ja', edited: false, accepted: '2026-11-23' };
  const data0 = { _: 'x', entries: [] };
  const full6 = { _: 'x', entries: Array.from({ length: LAW_CAP }, (x, j) => Object.assign({}, e0, { issue: 900 + j })) };
  const four6 = { _: 'x', entries: full6.entries.slice(1) };
  /* 前に開いた寄せの一覧。id 7 が寄せた人。 */
  const prior = (k, extra = []) => [...Array.from({ length: k }, (x, j) => ({ number: 10 + j, state: j % 2 ? 'closed' : 'open', user: { login: who, id: 7 }, labels: [{ name: 'entry' }] })), ...extra];
  async function sim(issue, comments = [], data = data0, listed = []) {
    const calls = [], logs = [];
    let cs = comments.slice();
    const fake = async (u, opt) => {
      const url = u.replace('https://api.github.com/repos/' + REPO, ''), body = opt.body ? JSON.parse(opt.body) : undefined;
      calls.push([opt.method, url.split('?')[0], body, url]);
      const res = (status, j) => ({ ok: status < 300, status, json: async () => j });
      if (opt.method === 'GET' && /^\/issues\/\d+$/.test(url)) return res(200, issue);
      if (opt.method === 'GET' && /^\/issues\?/.test(url)) return res(200, /&page=1$/.test(url) ? listed : []);
      if (opt.method === 'GET') return res(200, cs);
      if (opt.method === 'POST' && url === '/labels') return res(422, {});
      if (opt.method === 'POST' && /comments$/.test(url)) { cs.push({ id: 77, user: { type: 'Bot' }, body: body.body }); return res(201, {}); }
      return res(200, {});
    };
    await run(client('x', fake, REPO), issue.number, (s) => logs.push(s), data);
    return { calls, logs, comment: cs.length ? cs[cs.length - 1].body : '' };
  }
  const base = { number: 40, state: 'open', labels: [{ name: 'entry' }], user: { login: who, id: 7 }, created_at: '2026-12-08T00:00:00Z' };
  const labelled = (r, l) => r.calls.some(([m, u, b]) => m === 'POST' && u === '/issues/40/labels' && b.labels[0] === l);
  const r1 = await sim(Object.assign({}, base, { body: mk({}) }));
  t('そろった issue に complete のラベルとコメント一つ', labelled(r1, LABEL.complete) && r1.calls.filter(([m, u]) => m === 'POST' && u === '/issues/40/comments').length === 1);
  const r2 = await sim(Object.assign({}, base, { body: mk({ checks: all.map((x, j) => j !== 1) }), labels: [{ name: 'entry' }, { name: LABEL.complete }] }));
  t('足りない issue に incomplete を付け、complete を外す', labelled(r2, LABEL.incomplete) && r2.calls.some(([m, u]) => m === 'DELETE' && u === '/issues/40/labels/' + encodeURIComponent(LABEL.complete)));
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
  /* 一つのアカウントから ACCOUNT_CAP 件まで。前に開いた寄せは、開いていても閉じていても数える。 */
  const a2 = await sim(Object.assign({}, base, { body: mk({}) }), [], data0, prior(ACCOUNT_CAP - 1));
  t('前の寄せが ' + (ACCOUNT_CAP - 1) + ' 件なら、' + ACCOUNT_CAP + ' 件目を受ける', labelled(a2, LABEL.complete) && !labelled(a2, LABEL.declined));
  const a3 = await sim(Object.assign({}, base, { body: mk({}), labels: [{ name: 'entry' }, { name: LABEL.complete }] }), [], data0, prior(ACCOUNT_CAP));
  t('前の寄せが ' + ACCOUNT_CAP + ' 件（閉じたものを含む）なら、' + (ACCOUNT_CAP + 1) + ' 件目は受けず、not accepted を付けて complete を外し、そのことをコメントで知らせる',
    labelled(a3, LABEL.declined) && a3.calls.some(([m, u]) => m === 'DELETE' && u === '/issues/40/labels/' + encodeURIComponent(LABEL.complete)) && a3.comment.includes(limitText('account-full')[0]) && a3.comment.includes(limitText('account-full')[1]));
  const a3i = await sim(Object.assign({}, base, { body: mk({ checks: all.map((x, j) => j !== 0) }) }), [], data0, prior(ACCOUNT_CAP));
  t('欄が足りなくても、上限に当たれば not accepted', labelled(a3i, LABEL.declined) && !labelled(a3i, LABEL.incomplete));
  const others = [{ number: 11, user: { login: who, id: 8 }, labels: [{ name: 'entry' }] }, { number: 12, user: { login: who, id: 7 }, labels: [{ name: 'entry' }], pull_request: {} },
    { number: 13, user: { login: who, id: 7 }, labels: [{ name: 'question' }] }, { number: 40, user: { login: who, id: 7 }, labels: [{ name: 'entry' }] }, { number: 41, user: { login: who, id: 7 }, labels: [{ name: 'entry' }] }, { number: 42, user: { login: who, id: 7 }, labels: [{ name: 'entry' }] }];
  const ao = await sim(Object.assign({}, base, { body: mk({}) }), [], data0, prior(ACCOUNT_CAP - 1, others));
  t('ほかのアカウント・PR・ラベル entry の無い issue・この issue 自身・後に開いた寄せは数えない', labelled(ao, LABEL.complete) && !labelled(ao, LABEL.declined));
  const listUrl = a3.calls.find(([m, u]) => m === 'GET' && u === '/issues');
  t('一覧は、同じアカウントの、ラベル entry の、開いているものも閉じたものも引く', !!listUrl && listUrl[3] === '/issues?state=all&creator=' + who + '&labels=entry&per_page=100&page=1');
  let threw = false; try { await sim(Object.assign({}, base, { body: mk({}), user: { login: 'bad name', id: 7 } })); } catch (e) { threw = !String(e.message).includes('bad name'); }
  t('アカウントが読めなければ止まり、その名を出さない', threw);
  /* 一つの法則に LAW_CAP 件まで。data/entries.json で数える。 */
  const l4 = await sim(Object.assign({}, base, { body: mk({}) }), [], four6);
  t('法則の場面が ' + (LAW_CAP - 1) + ' 件なら受ける', labelled(l4, LABEL.complete));
  const l5 = await sim(Object.assign({}, base, { body: mk({}) }), [], full6);
  t('法則の場面が ' + LAW_CAP + ' 件なら受けず、そのことをコメントで知らせる', labelled(l5, LABEL.declined) && l5.comment.includes(limitText('law-full', 6)[0]) && l5.comment.includes(limitText('law-full', 6)[1]));
  const l5o = await sim(Object.assign({}, base, { body: mk({ law: lawOption(7) }) }), [], full6);
  t('ほかの法則の寄せは受ける', labelled(l5o, LABEL.complete));
  /* 効き始める日より前に開いた issue には、上限を当てない。 */
  const early = Object.assign({}, base, { created_at: '2026-12-07T14:59:59Z' });
  const b1 = await sim(Object.assign({}, early, { body: mk({}) }), [], full6, prior(ACCOUNT_CAP + 2));
  t(EFFECTIVE + ' より前に開いた issue には上限を当てず、一覧も引かない', labelled(b1, LABEL.complete) && !b1.calls.some(([m, u]) => m === 'GET' && u === '/issues'));
  const every = [r1, r2, r3, r4, r5, a2, a3, a3i, ao, l4, l5, l5o, b1];
  t('どの呼び出しも、閉じず・鍵を掛けず・消さず・題と本文を変えない', every.every((r) => r.calls.every(([m, u, b]) => !/lock/.test(u) && !(m === 'PATCH' && /^\/issues\/\d+$/.test(u)) && !(m === 'DELETE' && !/\/labels\//.test(u)) && !(b && ('state' in b || 'locked' in b || 'title' in b)))));
  t('ログに題も本文もアカウントの名も出さない', every.every((r) => r.logs.every((l) => !l.includes(secret) && !l.includes('作り物の文') && !l.includes(who))));
  t('コメントに題も本文もアカウントの名も出さない', every.every((r) => !r.comment.includes(secret) && !r.comment.includes(who)));
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
  if (arg === '--labels') { await ensureLabels(gh, ['entry', 'complete', 'incomplete', 'declined']); console.log('ラベルを確かめました。'); return; }
  if (arg) throw new Error('知らない引数：' + arg);
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const n = Number(event.issue && event.issue.number);
  if (!Number.isInteger(n) || n < 1) throw new Error('事件に issue の番号が無い');
  /* 載せた場面は、checkout した既定の枝のものを読む。形が違えば止まる。 */
  const data = JSON.parse(fs.readFileSync(require('path').join(__dirname, '..', 'data', 'entries.json'), 'utf8'));
  const bad = validateData(data);
  if (bad.length) throw new Error('data/entries.json の形が違う');
  await run(gh, n, (s) => console.log(s), data);
}
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { LAWS, lawOption, LIMITS, len, ACCOUNT_CAP, LAW_CAP, EFFECTIVE, ANNOUNCED, jstDay, limitsApply, lawCounts, fullLaws, fullLawText, limitText, priorEntries, limits, BOXES, CONSENT_JA, CONSENT_EN, CONSENT_BOX, PUBLIC_JA, PUBLIC_EN, LABEL, FIELDS, INTRO, form, config, FORBIDDEN, forbidden,
  parse, verdict, comment, MARK, MISS_TEXT, validateData, ENTRY_KEYS, USERNAME, ALLOWED, guard, client, run, bodyFrom, selfTest, selfTestRun };
