/* 関係の遊び場。人には名前も年齢も性別も、どんな属性も付けない。見るのは関係の移り変わりだけ。
 * ブラウザの中だけで動き、何も送らず、何も残さない（断りと開示「集めるもの」）。 */
(function () {
  'use strict';
  var root = document.getElementById('play');
  if (!root) return;
  var ns = 'http://www.w3.org/2000/svg';
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* 頁の言葉（html の lang）を読み、知らせと状態の文を選ぶ（2026-11-23）。何も残さない。 */
  var en = document.documentElement && document.documentElement.getAttribute('lang') === 'en';
  var T = en ? {
    state: function (s) { return s ? 'switched' : 'not yet'; },
    inner: function (negs, total) { return "The wizard's view. Of the faces shown to " + (N - 1) + ' people, ' + negs + ' are negative. Total thickness of relationships: ' + total + '.'; },
    outer: function (total) { return 'The outside view. Only the ' + N + ' people and the lines of their relationships can be seen. Total thickness of relationships: ' + total + '.'; },
    switched: function (day) {
      return 'Day ' + day + '. The store reached the threshold of ' + threshold + ', and the opposite of each line where a negative was shown began to glow as positive (Law 4). '
        + (threshold < 30 ? 'The threshold is below the rule-of-thumb thirty, so this is an early switch. An early switch is possible by Law 5.'
          : threshold > 30 ? 'The threshold is above the rule-of-thumb thirty, so this is a late switch. A late switch is how this playground is built.' : 'The threshold is exactly the rule-of-thumb thirty.');
    },
    deeds: function (day, n) { return 'Day ' + day + '. ' + (n === 1 ? 'One result was' : n + ' results were') + ' produced, and the relationship between each partner and their neighbour grew thicker. The outside view sees thicker lines too, but not whose doing it was (Law 6).'; },
    none: function (day) { return 'Day ' + day + '. Nobody was shown a negative today, so there are no results. Changing the scene changes the faces shown (Law 2).'; },
    stock: function (day, n) { return 'Day ' + day + '. The store grew by ' + n + ', one for each person shown a negative. Negatives do not fade (Law 3).'; },
    scene: 'The scene changed, and the face the wizard shows each person was chosen again (Law 2). The people themselves did not change.',
    auto: 'Let the days run', stop: 'Stop', stopped: 'Motion on the screen stopped.', stoppedOn: 'Motion on the screen stopped. In the canon, the brain of one who has become a wizard does not stop (Law 8).',
    started: 'Days now pass on their own. Now and then the scene changes too.'
  } : {
    state: function (s) { return s ? '切り替わった' : 'まだ'; },
    inner: function (negs, total) { return '魔法使いの目。' + (N - 1) + ' 人への面のうち負が ' + negs + '。関係の太さの合計 ' + total + '。'; },
    outer: function (total) { return '外の目。' + N + ' 人と、その関係の線だけが見える。関係の太さの合計 ' + total + '。'; },
    switched: function (day) {
      /* 閾は蓄積の数で、歳ではない。三十歳の目安を三十に見立て、閾がそれより小さいか大きいかで、早めか遅めかを言う（2026-11-23）。 */
      return day + ' 日め。蓄積が閾の ' + threshold + ' に届き、負を向けた相手との線の逆が、正として光り始めました（第四法則）。'
        + (threshold < 30 ? '閾は目安の三十より小さく、早めの切り替わりです。早いことがあるのは第五法則によります。'
          : threshold > 30 ? '閾は目安の三十より大きく、遅めの切り替わりです。遅いこともあるのは、遊び場の作りです。' : '閾は、ちょうど目安の三十です。');
    },
    deeds: function (day, n) { return day + ' 日め。成果が ' + n + ' つ生まれ、相手とその隣の人との関係が太くなりました。外の目にも線は太く見えますが、誰のおかげかは見えません（第六法則）。'; },
    none: function (day) { return day + ' 日め。今日は負を向けた相手がいないので、成果はありません。場面を変えると、向ける面が変わります（第二法則）。'; },
    stock: function (day, n) { return day + ' 日め。負を向けた ' + n + ' 人ぶん、負が溜まりました。負は消えません（第三法則）。'; },
    scene: '場面が変わり、魔法使いがそれぞれの人へ向ける面が選び直されました（第二法則）。人そのものは変わりません。',
    auto: '自動で過ごす', stop: '止める', stopped: '画面の動きを止めました。', stoppedOn: '画面の動きを止めました。原典では、成った者の脳は止まりません（第八法則）。',
    started: '日が自動で進みます。ときどき場面も変わります。'
  };
  /* 人は 8 人。0 番が魔法使い。外の目では、ほかの人と同じに描く。 */
  var N = 8, pos = [];
  for (var i = 0; i < N; i++) { var a = -Math.PI / 2 + 2 * Math.PI * i / N; pos.push([150 + 100 * Math.cos(a), 120 + 95 * Math.sin(a)]); }
  /* 閾は、開くたびに 18 から 36 のあいだで決まる。三十は目安にすぎない（第五法則）。 */
  var threshold = 18 + Math.floor(Math.random() * 19);
  var stock = 0, day = 0, switched = false, deeds = 0, timer = null;
  /* 魔法使いが、それぞれの人へ向ける面。場面で変わる（第二法則）。 */
  var face = [];
  /* ほかの人どうしの関係の太さ。成果はここへ還元される（第六法則）。 */
  var tie = {};
  function key(p, q) { return p < q ? p + '-' + q : q + '-' + p; }
  function scene() { face = [null]; for (var k = 1; k < N; k++) face.push(Math.random() < 0.5 ? 'neg' : 'pos'); }
  /* はじめは、隣り合う人どうしが細い線でつながる。魔法使いも、その輪の中の一人。 */
  for (var p = 0; p < N; p++) tie[key(p, (p + 1) % N)] = 1;
  function el(name, attrs) { var e = document.createElementNS(ns, name); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function line(svg, p, q, color, width, dash) {
    var l = el('line', { x1: pos[p][0], y1: pos[p][1], x2: pos[q][0], y2: pos[q][1] });
    l.style.stroke = color; l.style.strokeWidth = String(width); l.style.strokeLinecap = 'round'; if (dash) l.style.strokeDasharray = '3 5';
    svg.appendChild(l); return l;
  }
  function node(svg, i, color, ring) {
    var c = el('circle', { cx: pos[i][0], cy: pos[i][1], r: 7 });
    c.style.fill = ring ? '#12161c' : color; c.style.stroke = ring ? '#d8b157' : 'none'; c.style.strokeWidth = ring ? '2' : '0';
    svg.appendChild(c);
  }
  function draw(flash) {
    var inn = $('inner'), out = $('outer');
    [inn, out].forEach(function (s) { while (s.firstChild) s.removeChild(s.firstChild); });
    /* ほかの人どうしの関係。両方の目に見える。 */
    Object.keys(tie).forEach(function (k) {
      var pq = k.split('-').map(Number), w = 1 + Math.min(tie[k] - 1, 8) * 0.9;
      line(inn, pq[0], pq[1], flash === k ? '#d8b157' : '#5d6672', w);
      line(out, pq[0], pq[1], '#7a8089', w);
    });
    /* 魔法使いからの面。魔法使いの目にだけ、負か正かが見える。切り替わったあとは、負の逆が正として光る（第四法則）。 */
    for (var q = 1; q < N; q++) {
      var neg = face[q] === 'neg';
      line(inn, 0, q, switched && neg ? '#d8b157' : (neg ? '#9ca3ad' : '#f2e6c9'), switched && neg ? 2.4 : 1.2, neg && !switched);
      /* 外の目には、魔法使いが向ける面の線を描かない。描けば、だれが魔法使いか分かってしまう。 */
    }
    for (var i = 0; i < N; i++) { node(inn, i, '#9ca3ad', i === 0); node(out, i, '#5d636b', false); }
    var negs = face.filter(function (f) { return f === 'neg'; }).length;
    var total = Object.keys(tie).reduce(function (s, k) { return s + tie[k]; }, 0);
    $('day').textContent = String(day);
    $('stock').textContent = String(stock);
    $('state').textContent = T.state(switched);
    $('negs').textContent = String(negs);
    $('fill').style.width = Math.min(100, Math.round(100 * stock / 36)) + '%';
    $('meter').setAttribute('aria-valuenow', String(Math.min(stock, 36)));
    $('meter').className = switched ? 'meter on' : 'meter';
    $('total').textContent = String(total);
    $('deeds').textContent = '0';
    $('inner').setAttribute('aria-label', T.inner(negs, total));
    $('outer').setAttribute('aria-label', T.outer(total));
  }
  function note(t) { $('note').textContent = t; }
  /* 一日。負の面を向けた人の数だけ、負が溜まる（第三法則）。切り替わったあとは、負を向けた相手との関係から、その逆が正として顕れ、
   * 成果が生まれる。成果は、相手と、その隣の人とのあいだの関係を太くする（第六法則）。魔法使い自身の数には入らない。
   * 隣は魔法使いでない人から選ぶ。魔法使い自身の線は、自分の成果では太らない（原理の要請四・定理二十三。2026-11-23 に直した）。 */
  function live() {
    day += 1;
    var negs = [];
    for (var q = 1; q < N; q++) if (face[q] === 'neg') negs.push(q);
    stock += negs.length;
    var flash = null, msg;
    if (!switched && stock >= threshold) {
      switched = true;
      msg = T.switched(day);
    } else if (switched && negs.length) {
      /* 成果は、相手と、その隣の人との関係へ入る。隣は、魔法使いでない人から選ぶ。 */
      negs.forEach(function (r) {
        var nb = [(r + 1) % N, (r + N - 1) % N].filter(function (s) { return s !== 0; });
        var k = key(r, nb[Math.floor(Math.random() * nb.length)]); tie[k] = (tie[k] || 0) + 1; flash = k; deeds += 1;
      });
      msg = T.deeds(day, negs.length);
    } else if (switched) {
      msg = T.none(day);
    } else {
      msg = T.stock(day, negs.length);
    }
    draw(reduce ? null : flash);
    note(msg);
  }
  $('scene').addEventListener('click', function () { scene(); draw(null); note(T.scene); });
  $('live').addEventListener('click', live);
  $('auto').addEventListener('click', function () {
    if (timer) {
      clearInterval(timer); timer = null; this.textContent = T.auto;
      $('note').setAttribute('aria-live', 'polite');
      note(switched ? T.stoppedOn : T.stopped);
    } else {
      /* 自動で過ごすあいだは、日ごとの知らせを読み上げない（止めると戻す）。始めの知らせだけは読み上げる。 */
      timer = setInterval(function () { $('note').setAttribute('aria-live', 'off'); if (Math.random() < 0.3) scene(); live(); }, reduce ? 1500 : 800);
      this.textContent = T.stop;
      note(T.started);
    }
  });
  scene();
  draw(null);
}());
