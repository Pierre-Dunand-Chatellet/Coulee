/* Le nageur de la scène d'accueil.

   Un squelette (bassin, colonne, cou, deux bras, deux jambes) et des formes effilées dessinées
   par-dessus : cuisse plus large que mollet, épaule plus large que poignet. Pas de traits d'épaisseur
   constante, pas de disque posé sur un corps.

   Les os gardent toujours leur longueur : bras et jambes sont résolus par cinématique inverse à
   deux os, on ne règle donc que la hanche, les mains et les pieds. Le nageur regarde vers la
   GAUCHE (x négatif = devant), comme le reste de la scène.

   Trois poses clés (A accroupi sur le plot, B extension, C coulée). NAGEUR.appliquer(groupe, t)
   les mélange : t = 0 pour A, 1 pour B, 2 pour C. Entre deux poses, les membres tournent autour
   de leur articulation (angle et portée interpolés, pas les positions) : c'est un vrai mouvement,
   pas un fondu enchaîné. Le HTML contient déjà la pose A ; le script ne change que l'attribut d. */
(function (racine) {
  'use strict';

  var RAD = Math.PI / 180;

  // Longueurs des os, en unités SVG (≈ 165 par mètre).
  var OS = { bassin: 30, rachis: 56, cou: 30, bras: 54, avbras: 48, main: 20, cuisse: 75, jambe: 73, pied: 31, talon: 6 };

  // Rayons des articulations : chaque forme est le contour de deux disques consécutifs.
  var R = {
    hanche: 19.5, taille: 15.5, torse: 19.5, epaule: 15.5,
    cou: 9, tete: 20.5,
    bras: 15.6, coude: 9.4, poignet: 6.4, doigts: 4.4,
    cuisse: 18.5, genou: 12.2, mollet: 12.6, cheville: 6.9, orteil: 3.8
  };

  var COULEUR = {
    corps: '#EAF2FF', loin: '#9FB4D4',
    tissu: '#22E0C8', tissuLoin: '#17A99A',
    bonnet: '#22E0C8', lunette: '#0B2B4F',
    cerne: '#04101D'          // le « détourage » qui sépare un membre du corps qu'il recouvre
  };
  var CERNE = 3.4;            // épaisseur du trait de détourage (la moitié dépasse du membre)

  /* --------------------------------------------------------------------
     Poses clés. Angles en degrés, absolus : 0 = vers la droite, 90 = vers
     le bas, 180 = vers la gauche (l'avant du nageur), 270 = vers le haut.
     Mains et pieds sont donnés en positions (ou directement en angle et
     portée : a, r) ; ils sont convertis en angle et portée autour de l'épaule
     et de la hanche, c'est ce qui se mélange.
     La pose A est écrite dans le repère du MONDE (celui du plot) : les mains
     tombent sur la lèvre du plateau, les pieds posent dessus. DEPART est le
     point du monde où se trouve l'origine locale du nageur (au milieu du tronc).
     -------------------------------------------------------------------- */
  var DEPART = { x: 1990, y: 232 };

  var POSES_BRUTES = [
    { // A — accroupi sur le plot, mains à la lèvre du plateau
      monde: true,
      hanche: [2052, 234], bassin: 161, rachis: 161, cou: 205, face: 142,
      brasN: { poignet: [1965, 351], main: 96 }, brasF: { poignet: [1972, 352], main: 93 },
      jambeN: { cheville: [1999.8, 341.1], pied: 162.6 }, jambeF: { cheville: [2028, 334.5], pied: 162.6 }
    },
    { // B — extension, le corps s'ouvre : dos cambré, bras qui partent devant, jambes qui traînent
      hanche: [43, 2], bassin: 178, rachis: 189, cou: 196, face: 178,
      brasN: { a: 207, r: 100, main: 205 }, brasF: { a: 203, r: 100, main: 201 },
      jambeN: { a: 14, r: 142, pied: 32 }, jambeF: { a: 18, r: 142, pied: 36 }
    },
    { // C — la coulée : bras tendus, tête entre les bras, jambes jointes, pointes
      hanche: [43, 8], bassin: 181, rachis: 182, cou: 189, face: 170,
      brasN: { a: 188, r: 102, main: 187 }, brasF: { a: 186, r: 102, main: 185 },
      jambeN: { a: 3, r: 148, pied: 5 }, jambeF: { a: 5, r: 148, pied: 7 }
    }
  ];

  /* ---------- géométrie ---------- */
  function vec(a, d, l) { return [a[0] + Math.cos(d * RAD) * l, a[1] + Math.sin(d * RAD) * l]; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpP(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; }
  function lerpA(a, b, t) { return a + (((b - a + 540) % 360) - 180) * t; }
  function n1(v) { return (Math.round(v * 10) / 10).toString(); }
  function pt(p) { return n1(p[0]) + ' ' + n1(p[1]); }

  // Deux os de longueurs l1 et l2 entre une racine et une cible. `s` choisit le côté du coude/genou.
  function deuxOs(origine, cible, l1, l2, s) {
    var dx = cible[0] - origine[0], dy = cible[1] - origine[1];
    var d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
    var dd = Math.min(l1 + l2 - 0.01, Math.max(Math.abs(l1 - l2) + 0.01, d));
    var ux = dx / d, uy = dy / d;
    var a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
    var h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    return {
      joint: [origine[0] + ux * a - uy * h * s, origine[1] + uy * a + ux * h * s],
      bout: [origine[0] + ux * dd, origine[1] + uy * dd]
    };
  }

  // Contour d'un tronc de cône à bouts ronds entre deux disques (tangentes extérieures + deux arcs).
  function capsule(a, ra, b, rb) {
    var dx = b[0] - a[0], dy = b[1] - a[1];
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d <= Math.abs(ra - rb) + 0.05) return disque(ra >= rb ? a : b, Math.max(ra, rb));
    var ux = dx / d, uy = dy / d;
    var k = (ra - rb) / d, q = Math.sqrt(1 - k * k);
    var m1 = [ux * k - uy * q, uy * k + ux * q];
    var m2 = [ux * k + uy * q, uy * k - ux * q];
    var p1 = [a[0] + m1[0] * ra, a[1] + m1[1] * ra], p2 = [b[0] + m1[0] * rb, b[1] + m1[1] * rb];
    var p3 = [b[0] + m2[0] * rb, b[1] + m2[1] * rb], p4 = [a[0] + m2[0] * ra, a[1] + m2[1] * ra];
    return 'M' + pt(p1) + 'L' + pt(p2) +
      'A' + n1(rb) + ' ' + n1(rb) + ' 0 ' + (rb < ra ? 1 : 0) + ' 0 ' + pt(p3) +
      'L' + pt(p4) +
      'A' + n1(ra) + ' ' + n1(ra) + ' 0 ' + (ra < rb ? 1 : 0) + ' 0 ' + pt(p1) + 'Z';
  }
  function disque(c, r) {
    return 'M' + pt([c[0] - r, c[1]]) + 'A' + n1(r) + ' ' + n1(r) + ' 0 1 0 ' + pt([c[0] + r, c[1]]) +
      'A' + n1(r) + ' ' + n1(r) + ' 0 1 0 ' + pt([c[0] - r, c[1]]) + 'Z';
  }
  // Tranche de membre à coupe droite (le bas d'un maillot) : un trapèze entre deux sections.
  function tranche(a, ra, b, rb) {
    var dx = b[0] - a[0], dy = b[1] - a[1], d = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / d, ny = dx / d;
    return 'M' + pt([a[0] + nx * ra, a[1] + ny * ra]) + 'L' + pt([b[0] + nx * rb, b[1] + ny * rb]) +
      'L' + pt([b[0] - nx * rb, b[1] - ny * rb]) + 'L' + pt([a[0] - nx * ra, a[1] - ny * ra]) + 'Z';
  }

  /* ---------- le squelette ---------- */
  function colonne(p) {
    var H = p.hanche;
    var T = vec(H, p.bassin, OS.bassin);
    var S = vec(T, p.rachis, OS.rachis);
    var u = [Math.cos(p.rachis * RAD), Math.sin(p.rachis * RAD)];
    var poitrine = vec(T, p.rachis, OS.rachis * 0.62);
    poitrine = [poitrine[0] - u[1] * 2.2, poitrine[1] + u[0] * 2.2];   // la poitrine est un peu décalée vers le dos
    return { H: H, T: T, S: S, C: poitrine, tete: vec(S, p.cou, OS.cou), face: p.face };
  }

  // Une pose brute → une pose « polaire » : cibles exprimées en (angle, portée) autour de l'épaule / la hanche.
  function polaire(o, c) { var dx = c[0] - o[0], dy = c[1] - o[1]; return { a: Math.atan2(dy, dx) / RAD, r: Math.sqrt(dx * dx + dy * dy) }; }
  function convertir(b) {
    var dec = b.monde ? [DEPART.x, DEPART.y] : [0, 0];
    var loc = function (p) { return [p[0] - dec[0], p[1] - dec[1]]; };
    var p = { hanche: loc(b.hanche), bassin: b.bassin, rachis: b.rachis, cou: b.cou, face: b.face };
    var sq = colonne(p);
    ['brasN', 'brasF'].forEach(function (k) { var q = b[k].poignet ? polaire(sq.S, loc(b[k].poignet)) : b[k]; p[k] = { a: q.a, r: q.r, main: b[k].main }; });
    ['jambeN', 'jambeF'].forEach(function (k) { var q = b[k].cheville ? polaire(sq.H, loc(b[k].cheville)) : b[k]; p[k] = { a: q.a, r: q.r, pied: b[k].pied }; });
    return p;
  }
  var POSES = POSES_BRUTES.map(convertir);

  function melange(a, b, t, pliage) {
    var o = { hanche: lerpP(a.hanche, b.hanche, t), bassin: lerpA(a.bassin, b.bassin, t), rachis: lerpA(a.rachis, b.rachis, t),
      cou: lerpA(a.cou, b.cou, t), face: lerpA(a.face, b.face, t) };
    // 0 aux poses clés, 1 à mi-chemin : au départ du plot le membre se plie puis se déplie (le pied
    // décolle au lieu de traverser le plateau) ; en vol le corps est déjà tendu, rien à replier.
    var repli = Math.sin(Math.PI * t) * pliage;
    ['brasN', 'brasF'].forEach(function (k) { o[k] = { a: lerpA(a[k].a, b[k].a, t), r: lerp(a[k].r, b[k].r, t) * (1 - 0.1 * repli), main: lerpA(a[k].main, b[k].main, t) }; });
    ['jambeN', 'jambeF'].forEach(function (k) { o[k] = { a: lerpA(a[k].a, b[k].a, t), r: lerp(a[k].r, b[k].r, t) * (1 - 0.26 * repli), pied: lerpA(a[k].pied, b[k].pied, t) }; });
    return o;
  }

  // Coup de jambes de dauphin (o entre −1 et 1) : la hanche monte, les jambes puis les pieds fouettent vers le bas.
  function ondule(p, o) {
    var q = { hanche: [p.hanche[0], p.hanche[1] - 4 * o], bassin: p.bassin + 3 * o, rachis: p.rachis + 3 * o, cou: p.cou, face: p.face, brasN: p.brasN, brasF: p.brasF };
    ['jambeN', 'jambeF'].forEach(function (k) { q[k] = { a: p[k].a + 12 * o, r: p[k].r, pied: p[k].pied + 26 * o }; });
    return q;
  }

  function pose(t, onde) {
    t = Math.max(0, Math.min(POSES.length - 1, t));
    var i = Math.min(POSES.length - 2, Math.floor(t));
    var p = melange(POSES[i], POSES[i + 1], t - i, i === 0 ? 1 : 0);
    return onde ? ondule(p, onde) : p;
  }

  function squelette(p) {
    var sq = colonne(p);
    ['N', 'F'].forEach(function (c) {
      var b = p['bras' + c], j = p['jambe' + c];
      var br = deuxOs(sq.S, vec(sq.S, b.a, b.r), OS.bras, OS.avbras, -1);
      sq['coude' + c] = br.joint; sq['poignet' + c] = br.bout; sq['doigts' + c] = vec(br.bout, b.main, OS.main);
      var jb = deuxOs(sq.H, vec(sq.H, j.a, j.r), OS.cuisse, OS.jambe, 1);
      sq['genou' + c] = jb.joint; sq['cheville' + c] = jb.bout;
      sq['orteil' + c] = vec(jb.bout, j.pied, OS.pied); sq['talon' + c] = vec(jb.bout, j.pied + 180, OS.talon);
    });
    return sq;
  }

  /* ---------- le dessin ---------- */
  function jambe(sq, c) {
    return capsule(sq.H, R.cuisse, sq['genou' + c], R.genou) +
      capsule(sq['genou' + c], R.genou, sq['cheville' + c], R.cheville) +
      disque(lerpP(sq['genou' + c], sq['cheville' + c], 0.3), R.mollet) +
      capsule(sq['talon' + c], R.cheville, sq['orteil' + c], R.orteil);
  }
  function bras(sq, c) {
    return capsule(sq.S, R.bras, sq['coude' + c], R.coude) +
      capsule(sq['coude' + c], R.coude, sq['poignet' + c], R.poignet) +
      capsule(sq['poignet' + c], R.poignet, sq['doigts' + c], R.doigts);
  }
  function maillot(sq, c) {
    var m = lerpP(sq.H, sq['genou' + c], 0.4);
    return tranche(sq.H, R.cuisse + 0.5, m, lerp(R.cuisse, R.genou, 0.4) + 0.5);
  }

  // Repère de la tête : f = direction du visage, haut = dessus du crâne.
  function reperTete(sq) {
    var f = [Math.cos(sq.face * RAD), Math.sin(sq.face * RAD)];
    return { f: f, haut: [-f[1], f[0]] };
  }
  // Le visage est un disque posé en bas-devant du crâne ; le bonnet est le reste du disque de la tête.
  function visage(sq) {
    var r = reperTete(sq);
    var c = [sq.tete[0] + r.f[0] * 0.62 * R.tete - r.haut[0] * 0.26 * R.tete, sq.tete[1] + r.f[1] * 0.62 * R.tete - r.haut[1] * 0.26 * R.tete];
    return { c: c, r: 0.8 * R.tete };
  }
  function bonnet(sq) {
    var v = visage(sq), C = sq.tete, Rt = R.tete;
    var dx = v.c[0] - C[0], dy = v.c[1] - C[1], d = Math.sqrt(dx * dx + dy * dy);
    var u = [dx / d, dy / d], tn = [-u[1], u[0]];
    var a = (Rt * Rt - v.r * v.r + d * d) / (2 * d), h = Math.sqrt(Math.max(0, Rt * Rt - a * a));
    var base = [C[0] + u[0] * a, C[1] + u[1] * a];
    var i1 = [base[0] + tn[0] * h, base[1] + tn[1] * h], i2 = [base[0] - tn[0] * h, base[1] - tn[1] * h];
    var sens1 = ((i1[0] - C[0]) * (-u[1]) - (i1[1] - C[1]) * (-u[0])) > 0 ? 1 : 0;   // le grand arc passe du côté opposé au visage
    var sens2 = ((i2[0] - v.c[0]) * (-u[1]) - (i2[1] - v.c[1]) * (-u[0])) > 0 ? 1 : 0;
    return 'M' + pt(i1) + 'A' + n1(Rt) + ' ' + n1(Rt) + ' 0 ' + (a > 0 ? 1 : 0) + ' ' + sens1 + ' ' + pt(i2) +
      'A' + n1(v.r) + ' ' + n1(v.r) + ' 0 ' + (d - a < 0 ? 1 : 0) + ' ' + sens2 + ' ' + pt(i1) + 'Z';
  }
  function lunettes(sq) {
    var r = reperTete(sq), f = r.f, haut = r.haut;
    var c = [sq.tete[0] + f[0] * R.tete * 0.5, sq.tete[1] + f[1] * R.tete * 0.5];
    var fin = [sq.tete[0] - f[0] * R.tete * 0.95 + haut[0] * R.tete * 0.06, sq.tete[1] - f[1] * R.tete * 0.95 + haut[1] * R.tete * 0.06];
    return { lentille: capsule(c, 4.8, [c[0] - f[0] * 2.4, c[1] - f[1] * 2.4], 4.8), brin: 'M' + pt(c) + 'L' + pt(fin) };
  }

  // La liste ordonnée des formes, de l'arrière vers l'avant. `cerne` = opacité du détourage (true = 1).
  function dessiner(sq, t) {
    var lun = lunettes(sq);
    // En vol, bras et jambes ne se chevauchent plus : le trait de séparation s'efface (pas de couture à l'épaule).
    var oc = 1 - Math.max(0, Math.min(1, (t - 0.6) / 0.35));
    return [
      { id: 'jambe-f', d: jambe(sq, 'F'), fill: COULEUR.loin, cerne: true },
      { id: 'maillot-f', d: maillot(sq, 'F'), fill: COULEUR.tissuLoin },
      { id: 'bras-f', d: bras(sq, 'F'), fill: COULEUR.loin, cerne: true },
      { id: 'torse', d: capsule(sq.H, R.hanche, sq.T, R.taille) + capsule(sq.T, R.taille, sq.C, R.torse) + capsule(sq.C, R.torse, sq.S, R.epaule), fill: COULEUR.corps, cerne: true },
      { id: 'maillot-t', d: disque(sq.H, R.hanche + 0.5), fill: COULEUR.tissu },
      { id: 'jambe-n', d: jambe(sq, 'N'), fill: COULEUR.corps, cerne: oc },
      { id: 'maillot-n', d: maillot(sq, 'N') + disque(sq.H, R.hanche + 0.5), fill: COULEUR.tissu },
      { id: 'cou', d: capsule(sq.S, R.cou, sq.tete, R.cou - 0.5), fill: COULEUR.corps },
      { id: 'bras-n', d: bras(sq, 'N'), fill: COULEUR.corps, cerne: oc },
      { id: 'tete', d: disque(sq.tete, R.tete), fill: COULEUR.corps, cerne: true },
      { id: 'bonnet', d: bonnet(sq), fill: COULEUR.bonnet },
      { id: 'brin', d: lun.brin, fill: 'none', trait: COULEUR.lunette, epaisseur: 2.6 },
      { id: 'lentille', d: lun.lentille, fill: COULEUR.lunette }
    ];
  }

  function opacite(c) { return Math.round(c * 100) / 100; }

  // Le balisage SVG d'une pose (13 chemins) : il sert à écrire le HTML d'origine et la silhouette des couloirs.
  function balisage(t, avecId) {
    return dessiner(squelette(pose(t)), t).map(function (f) {
      var attrs = (avecId ? ' id="n-' + f.id + '"' : '') + ' d="' + f.d + '" fill="' + f.fill + '"';
      if (f.trait) attrs += ' stroke="' + f.trait + '" stroke-width="' + f.epaisseur + '" stroke-linecap="round"';
      else if (f.cerne) attrs += ' stroke="' + COULEUR.cerne + '" stroke-width="' + CERNE + '" stroke-linejoin="round" paint-order="stroke"' +
        (f.cerne === true ? '' : ' stroke-opacity="' + opacite(f.cerne) + '"');
      return '<path' + attrs + '/>';
    }).join('');
  }

  // Met à jour un groupe déjà rempli par le HTML : seuls d et l'opacité du détourage changent, et seulement s'ils ont changé.
  function appliquer(groupe, t, onde) {
    var formes = dessiner(squelette(pose(t, onde)), t), els = groupe.children;
    for (var i = 0; i < formes.length; i++) {
      var el = els[i], f = formes[i];
      if (el.getAttribute('d') !== f.d) el.setAttribute('d', f.d);
      if (typeof f.cerne === 'number') {
        var o = String(opacite(f.cerne));
        if (el.getAttribute('stroke-opacity') !== o) el.setAttribute('stroke-opacity', o);
      }
    }
  }

  // Étendue du nageur dans son repère local (pour caler la sortie de cadre et le contact avec le plot).
  function etendue(t, onde) {
    var sq = squelette(pose(t, onde));
    var pts = [[sq.tete, R.tete], [sq.H, R.hanche], [sq.S, R.epaule]];
    ['N', 'F'].forEach(function (c) {
      pts.push([sq['doigts' + c], R.doigts], [sq['orteil' + c], R.orteil], [sq['talon' + c], R.cheville], [sq['cheville' + c], R.cheville], [sq['genou' + c], R.genou], [sq['coude' + c], R.coude]);
    });
    var e = { gauche: 1e9, droite: -1e9, haut: 1e9, bas: -1e9 };
    pts.forEach(function (q) {
      e.gauche = Math.min(e.gauche, q[0][0] - q[1]); e.droite = Math.max(e.droite, q[0][0] + q[1]);
      e.haut = Math.min(e.haut, q[0][1] - q[1]); e.bas = Math.max(e.bas, q[0][1] + q[1]);
    });
    return e;
  }

  var API = {
    DEPART: DEPART, OS: OS, R: R, COULEUR: COULEUR, CERNE: CERNE, POSES: POSES,
    squelette: function (t, onde) { return squelette(pose(t, onde)); },
    dessin: function (t, onde) { return dessiner(squelette(pose(t, onde)), t); },
    balisage: balisage, appliquer: appliquer, etendue: etendue
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else racine.NAGEUR = API;
})(typeof window !== 'undefined' ? window : this);
