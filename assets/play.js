/* 関係の遊び場。人には名前も年齢も性別も、どんな属性も付けない。見るのは関係の移り変わりだけ。
 * ブラウザの中だけで動き、何も送らず、何も残さない（断りと開示「集めるもの」）。 */
(function () {
  'use strict';
  var root = document.getElementById('play');
  if (!root) return;
  var ns = 'http://www.w3.org/2000/svg';
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
      line(out, pq[0], pq[1], '#8f959d', w);
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
    $('state').textContent = switched ? '切り替わった' : 'まだ';
    $('negs').textContent = String(negs);
    $('fill').style.width = Math.min(100, Math.round(100 * stock / 36)) + '%';
    $('meter').setAttribute('aria-valuenow', String(Math.min(stock, 36)));
    $('meter').className = switched ? 'meter on' : 'meter';
    $('total').textContent = String(total);
    $('deeds').textContent = '0';
    $('inner').setAttribute('aria-label', '魔法使いの目。' + (N - 1) + ' 人への面のうち負が ' + negs + '。関係の太さの合計 ' + total + '。');
    $('outer').setAttribute('aria-label', '外の目。8 人と、その関係の線だけが見える。関係の太さの合計 ' + total + '。');
  }
  function note(t) { $('note').textContent = t; }
  /* 一日。負の面を向けた人の数だけ、負が溜まる（第三法則）。切り替わったあとは、負を向けた相手との関係から、その逆が正として顕れ、
   * 成果が生まれる。成果は、相手と、その隣の人とのあいだの関係を太くする（第六法則）。魔法使い自身の数には入らない。 */
  function live() {
    day += 1;
    var negs = [];
    for (var q = 1; q < N; q++) if (face[q] === 'neg') negs.push(q);
    stock += negs.length;
    var flash = null, msg;
    if (!switched && stock >= threshold) {
      switched = true;
      msg = day + ' 日め。蓄積が閾に届き、負を向けた相手との線の逆が、正として光り始めました（第四法則）。早いことがあるのは第五法則によります。遅いこともあるのは、遊び場の作りです。';
    } else if (switched && negs.length) {
      /* 成果は、相手と、その隣のどちらかの人との関係へ入る。隣が魔法使いのこともある。外の目で、魔法使いの線だけが細いままにならないように。 */
      negs.forEach(function (r) { var s = Math.random() < 0.5 ? (r + 1) % N : (r + N - 1) % N; var k = key(r, s); tie[k] = (tie[k] || 0) + 1; flash = k; deeds += 1; });
      msg = day + ' 日め。成果が ' + negs.length + ' つ生まれ、相手とその隣の人との関係が太くなりました。外の目にも線は太く見えますが、誰のおかげかは見えません（第六法則）。';
    } else if (switched) {
      msg = day + ' 日め。今日は負を向けた相手がいないので、成果はありません。場面を変えると、向ける面が変わります（第二法則）。';
    } else {
      msg = day + ' 日め。負を向けた ' + negs.length + ' 人ぶん、負が溜まりました。負は消えません（第三法則）。';
    }
    draw(reduce ? null : flash);
    note(msg);
  }
  $('scene').addEventListener('click', function () { scene(); draw(null); note('場面が変わり、魔法使いがそれぞれの人へ向ける面が選び直されました（第二法則）。人そのものは変わりません。'); });
  $('live').addEventListener('click', live);
  $('auto').addEventListener('click', function () {
    if (timer) {
      clearInterval(timer); timer = null; this.textContent = '④ 自動で過ごす';
      note(switched ? '画面の動きを止めました。原典では、成った者の脳は止まりません（第八法則）。' : '画面の動きを止めました。');
    } else {
      timer = setInterval(function () { if (Math.random() < 0.3) scene(); live(); }, reduce ? 1500 : 800);
      this.textContent = '④ 止める';
      note('日が自動で進みます。ときどき場面も変わります。');
    }
  });
  scene();
  draw(null);
}());
