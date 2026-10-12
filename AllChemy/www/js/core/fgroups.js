/* AllChemy – functional-group perception with chemistry attached to each group
   (IR bands, acid/base character, typical reactions). AC.fg.analyze(mol) → {groups, acids, bases, summary} */
(function () {
  'use strict';
  const AC = (window.AC = window.AC || {});
  const FG = (AC.fg = {});

  /* ---------- knowledge table ---------- */
  // cls: hydrocarbon | halogen | oxygen | carbonyl | nitrogen | sulfur | phosphorus | other
  const K = {
    alkane: { name: 'Alkane (C–C, C–H σ framework)', cls: 'hydrocarbon', ir: [['2850–2960', 'C–H stretch (sp³)'], ['1350–1470', 'CH₂/CH₃ bending']], rx: ['Radical halogenation (hν)', 'Combustion', 'Cracking / reforming'], note: 'Non-polar, unreactive towards acids, bases and most oxidants.' },
    alkene: { name: 'Alkene (C=C)', cls: 'hydrocarbon', ir: [['3010–3095', '=C–H stretch'], ['1620–1680', 'C=C stretch (weak–medium)'], ['650–1000', '=C–H out-of-plane bend']], rx: ['Electrophilic addition (HX, X₂, H₂O/H⁺)', 'Hydrogenation (H₂, Pd/C)', 'Epoxidation (mCPBA)', 'Oxidative cleavage (O₃; KMnO₄)', 'Polymerisation'], note: 'Electron-rich π bond → attacked by electrophiles (Markovnikov addition).' },
    alkyne: { name: 'Alkyne (C≡C)', cls: 'hydrocarbon', ir: [['3260–3330', '≡C–H stretch (terminal, sharp, strong)'], ['2100–2260', 'C≡C stretch (weak)']], rx: ['Addition of HX / X₂ (twice)', 'Hydration (Hg²⁺/H₂SO₄) → ketone', 'Partial hydrogenation (Lindlar → cis-alkene)', 'Deprotonation of terminal C–H (pKa ≈ 25)'], acid: 25, acidSite: 'terminal ≡C–H', note: 'sp carbon is relatively electronegative; terminal alkynes are weakly acidic.' },
    arene: { name: 'Benzene ring (aromatic)', cls: 'hydrocarbon', ir: [['3000–3100', 'Ar–H stretch'], ['1450–1600', 'ring C=C stretch (2–3 bands)'], ['690–900', 'C–H out-of-plane bend (substitution pattern)']], rx: ['Electrophilic aromatic substitution (nitration, halogenation, Friedel–Crafts, sulfonation)', 'Hydrogenation (forcing)', 'Side-chain oxidation (KMnO₄)'], note: '6 π electrons (Hückel 4n+2): substitution rather than addition.' },
    heteroarene: { name: 'Heteroaromatic ring', cls: 'nitrogen', ir: [['3000–3100', 'Ar–H stretch'], ['1400–1620', 'ring stretches']], rx: ['Electrophilic substitution (π-excessive rings) / nucleophilic substitution (π-deficient rings)'], note: 'Aromatic ring containing N, O or S.' },
    pyridineN: { name: 'Pyridine-type nitrogen (sp², lone pair in plane)', cls: 'nitrogen', ir: [['1570–1600', 'C=N / ring stretch']], base: 5.2, baseSite: 'aromatic N lone pair', rx: ['Protonation / alkylation at N', 'N-oxide formation'], note: 'Lone pair is not part of the aromatic sextet → basic (pKaH ≈ 5 for pyridine, ≈ 7 for imidazole).' },
    pyrroleNH: { name: 'Pyrrole-type N–H (lone pair in the π system)', cls: 'nitrogen', ir: [['3300–3500', 'N–H stretch']], acid: 17, acidSite: 'N–H (indole/pyrrole)', rx: ['Deprotonation with strong base', 'Electrophilic substitution on the ring carbons'], note: 'Lone pair is part of the aromatic sextet → essentially non-basic.' },
    haloalkane: { name: 'Haloalkane (C(sp³)–X)', cls: 'halogen', ir: [['1000–1400', 'C–F stretch'], ['600–800', 'C–Cl stretch'], ['500–680', 'C–Br stretch']], rx: ['SN2 / SN1 substitution', 'E2 / E1 elimination', 'Grignard / organolithium formation', 'Radical reactions'], note: 'Polar C–X bond makes carbon electrophilic; leaving-group ability I > Br > Cl >> F.' },
    arylhalide: { name: 'Aryl halide (C(aromatic)–X)', cls: 'halogen', ir: [['1000–1100', 'Ar–X stretch']], rx: ['Cross-coupling (Suzuki, Heck, Buchwald–Hartwig)', 'Nucleophilic aromatic substitution (if activated)', 'Grignard formation'], note: 'C–X bond is strengthened by resonance; resistant to SN1/SN2.' },
    vinylhalide: { name: 'Vinyl halide (C=C–X)', cls: 'halogen', ir: [['1600–1650', 'C=C stretch']], rx: ['Cross-coupling', 'Polymerisation (e.g. PVC)'], note: '' },
    alcohol1: { name: 'Primary alcohol (R–CH₂–OH)', cls: 'oxygen', ir: [['3200–3550', 'O–H stretch (broad, strong; H-bonded)'], ['1000–1260', 'C–O stretch']], acid: 16, acidSite: 'O–H', rx: ['Oxidation → aldehyde → carboxylic acid', 'Esterification (RCOOH, H⁺)', 'Dehydration → alkene / ether', 'Conversion to R–X (SOCl₂, PBr₃, HX)', 'Deprotonation (Na) → alkoxide'], note: 'Amphoteric but extremely weakly acidic/basic in water (pKa ≈ 16).' },
    alcohol2: { name: 'Secondary alcohol (R₂CH–OH)', cls: 'oxygen', ir: [['3200–3550', 'O–H stretch (broad)'], ['1000–1260', 'C–O stretch']], acid: 17, acidSite: 'O–H', rx: ['Oxidation → ketone', 'Esterification', 'Dehydration → alkene', 'SN1 with HX'], note: '' },
    alcohol3: { name: 'Tertiary alcohol (R₃C–OH)', cls: 'oxygen', ir: [['3200–3550', 'O–H stretch (broad)'], ['1100–1200', 'C–O stretch']], acid: 18, acidSite: 'O–H', rx: ['Resistant to oxidation', 'Dehydration (easy, E1)', 'SN1 with HX (Lucas test: immediate)'], note: '' },
    phenol: { name: 'Phenol (Ar–OH)', cls: 'oxygen', ir: [['3200–3600', 'O–H stretch (broad)'], ['1200–1260', 'C–O stretch (aryl)']], acid: 10, acidSite: 'phenolic O–H', rx: ['Deprotonation by NaOH → phenoxide', 'Electrophilic substitution (activated ring: ortho/para)', 'Gives colour with FeCl₃ (violet)', 'Williamson ether synthesis; esterification (acyl chlorides)'], note: 'Phenoxide is resonance-stabilised → much more acidic than alcohols (pKa ≈ 10).' },
    enol: { name: 'Enol (C=C–OH)', cls: 'oxygen', ir: [['3200–3600', 'O–H'], ['1620–1680', 'C=C']], acid: 11, acidSite: 'enol O–H', rx: ['Keto–enol tautomerism', 'Reacts as a nucleophile at carbon'], note: '' },
    ether: { name: 'Ether (C–O–C)', cls: 'oxygen', ir: [['1050–1150', 'C–O–C stretch (strong, no O–H)']], base: -3.5, baseSite: 'ether O (very weak)', rx: ['Cleavage by HI / HBr (strong acid)', 'Peroxide formation on storage', 'Good aprotic solvents (Et₂O, THF)'], note: 'Unreactive; Lewis-basic oxygen lone pairs.' },
    epoxide: { name: 'Epoxide (3-membered cyclic ether)', cls: 'oxygen', ir: [['1250', 'ring C–O (symmetric stretch)'], ['810–950', 'ring deformation']], rx: ['Ring opening by nucleophiles (strain ≈ 114 kJ/mol)', 'Acid-catalysed hydrolysis → 1,2-diol'], note: 'Highly strained → reactive electrophile.' },
    aldehyde: { name: 'Aldehyde (R–CHO)', cls: 'carbonyl', ir: [['1720–1740', 'C=O stretch (strong)'], ['2700–2850', 'aldehydic C–H (two bands ≈ 2720, 2820)']], rx: ['Oxidation → carboxylic acid (Tollens, Fehling, K₂Cr₂O₇)', 'Reduction → primary alcohol (NaBH₄)', 'Nucleophilic addition (HCN, RMgX, ROH → acetal)', 'Aldol / Cannizzaro; 2,4-DNPH test (orange ppt)'], note: 'Most reactive carbonyl: less hindered and more electrophilic than a ketone.' },
    ketone: { name: 'Ketone (R–CO–R′)', cls: 'carbonyl', ir: [['1705–1725', 'C=O stretch (strong; 1685–1695 if conjugated)']], rx: ['Reduction → secondary alcohol', 'Nucleophilic addition (RMgX → tertiary alcohol)', 'α-Halogenation, enolate chemistry (aldol)', 'Resists mild oxidants (no Tollens)', '2,4-DNPH test (orange ppt)'], note: 'α-C–H acidity pKa ≈ 19–20.' },
    acid: { name: 'Carboxylic acid (R–COOH)', cls: 'carbonyl', ir: [['2500–3300', 'O–H stretch (very broad, dimer)'], ['1700–1725', 'C=O stretch'], ['1210–1320', 'C–O stretch']], acid: 4.8, acidSite: 'carboxylic O–H', rx: ['Neutralisation (→ carboxylate salt)', 'Esterification (R′OH, H⁺)', 'Conversion to acyl chloride (SOCl₂), amide (via acid chloride)', 'Reduction (LiAlH₄) → primary alcohol', 'Decarboxylation (β-keto acids)'], note: 'Conjugate base (carboxylate) is resonance-stabilised: pKa ≈ 4–5.' },
    carboxylate: { name: 'Carboxylate (R–COO⁻)', cls: 'carbonyl', ir: [['1550–1610', 'asymmetric COO⁻ stretch'], ['1300–1420', 'symmetric COO⁻ stretch']], base: 4.8, baseSite: 'carboxylate O (conjugate base of an acid)', rx: ['Protonation → carboxylic acid', 'Soap formation with long chains'], note: 'Weak base; salts are ionic and water-soluble.' },
    ester: { name: 'Ester (R–COO–R′)', cls: 'carbonyl', ir: [['1735–1750', 'C=O stretch (1715–1730 if aryl/conjugated)'], ['1000–1300', 'two C–O stretches']], rx: ['Hydrolysis (acid, or base = saponification)', 'Transesterification', 'Reduction (LiAlH₄ → 2 alcohols)', 'Claisen condensation; Grignard (→ tertiary alcohol)'], note: 'Often fruity-smelling; α-C–H pKa ≈ 25.' },
    lactone: { name: 'Lactone (cyclic ester)', cls: 'carbonyl', ir: [['1735–1780', 'C=O stretch (higher in small rings)']], rx: ['Ring-opening hydrolysis', 'Ring-opening polymerisation'], note: '' },
    anhydride: { name: 'Acid anhydride (RCO–O–COR)', cls: 'carbonyl', ir: [['1800–1830', 'C=O asym.'], ['1740–1775', 'C=O sym. (two bands)']], rx: ['Hydrolysis → 2 RCOOH', 'Acylation of alcohols/amines (e.g. aspirin synthesis)'], note: 'Reactive acylating agent.' },
    acylhalide: { name: 'Acyl halide (R–CO–X)', cls: 'carbonyl', ir: [['1790–1815', 'C=O stretch (high frequency)']], rx: ['Violent hydrolysis (HX fumes)', 'Reacts with alcohols → esters, amines → amides', 'Friedel–Crafts acylation'], note: 'The most reactive carboxylic-acid derivative.' },
    amide1: { name: 'Primary amide (R–CONH₂)', cls: 'carbonyl', ir: [['3100–3500', 'N–H stretch (two bands)'], ['1630–1690', 'C=O (amide I)'], ['1550–1640', 'N–H bend (amide II)']], rx: ['Hydrolysis (acid/base, forcing)', 'Hofmann rearrangement (Br₂/NaOH)', 'Dehydration → nitrile', 'Reduction (LiAlH₄) → amine'], note: 'Resonance delocalises the N lone pair → essentially neutral (not basic).' },
    amide2: { name: 'Secondary amide (R–CONH–R′)', cls: 'carbonyl', ir: [['3250–3350', 'N–H stretch (one band)'], ['1630–1680', 'C=O (amide I)'], ['1520–1570', 'N–H bend (amide II)']], rx: ['Hydrolysis (forcing)', 'Reduction → secondary amine'], note: 'The peptide bond is a secondary amide.' },
    amide3: { name: 'Tertiary amide (R–CONR′₂)', cls: 'carbonyl', ir: [['1630–1670', 'C=O (amide I); no N–H']], rx: ['Hydrolysis (forcing)', 'Reduction → tertiary amine'], note: '' },
    lactam: { name: 'Lactam (cyclic amide)', cls: 'carbonyl', ir: [['1650–1780', 'C=O (β-lactams ≈ 1760–1780)']], rx: ['Ring-opening hydrolysis (β-lactam antibiotics acylate bacterial enzymes)'], note: '' },
    urea: { name: 'Urea / ureide (N–CO–N)', cls: 'carbonyl', ir: [['1630–1700', 'C=O stretch'], ['3200–3450', 'N–H']], rx: ['Hydrolysis (urease) → NH₃ + CO₂'], note: 'Neutral.' },
    carbamate: { name: 'Carbamate (N–CO–O)', cls: 'carbonyl', ir: [['1680–1740', 'C=O stretch'], ['3300–3450', 'N–H']], rx: ['Hydrolysis / deprotection (Boc, Cbz)'], note: '' },
    carbonate: { name: 'Carbonate ester (O–CO–O)', cls: 'carbonyl', ir: [['1740–1780', 'C=O stretch']], rx: ['Hydrolysis', 'Polymerisation (polycarbonate)'], note: '' },
    thioester: { name: 'Thioester (R–CO–S–R′)', cls: 'carbonyl', ir: [['1680–1700', 'C=O stretch']], rx: ['Acyl transfer (acetyl-CoA)'], note: '' },
    amine1: { name: 'Primary amine (R–NH₂)', cls: 'nitrogen', ir: [['3300–3500', 'N–H stretch (two bands)'], ['1590–1650', 'N–H bend'], ['1020–1250', 'C–N stretch']], base: 10.6, baseSite: 'amine N lone pair', rx: ['Protonation → ammonium salt', 'Acylation → amide', 'Alkylation (SN2)', 'Imine formation with aldehydes/ketones', 'Diazotisation (aromatic amines, HNO₂)'], note: 'Lone pair on N makes it a base and nucleophile (pKaH ≈ 10–11).' },
    amine2: { name: 'Secondary amine (R₂NH)', cls: 'nitrogen', ir: [['3300–3350', 'N–H stretch (one weak band)'], ['1020–1250', 'C–N stretch']], base: 10.8, baseSite: 'amine N lone pair', rx: ['Protonation', 'Acylation → amide', 'Enamine formation', 'Nitrosamine formation (HNO₂; carcinogenic)'], note: '' },
    amine3: { name: 'Tertiary amine (R₃N)', cls: 'nitrogen', ir: [['1020–1250', 'C–N stretch (no N–H)']], base: 9.8, baseSite: 'amine N lone pair', rx: ['Protonation', 'Quaternisation with R–X', 'N-oxide formation'], note: '' },
    aniline: { name: 'Aromatic amine (Ar–NH₂ / Ar–NR₂)', cls: 'nitrogen', ir: [['3350–3500', 'N–H (two bands for NH₂)'], ['1250–1360', 'Ar–N stretch']], base: 4.6, baseSite: 'aryl amine N (lone pair delocalised)', rx: ['Diazotisation (NaNO₂/HCl, 0–5 °C)', 'Electrophilic substitution (very activated)', 'Acetylation'], note: 'Lone pair conjugates with the ring → ~10⁶ times weaker base than alkylamines (pKaH ≈ 4.6).' },
    ammonium: { name: 'Ammonium / quaternary ammonium (N⁺)', cls: 'nitrogen', ir: [['2800–3200', 'N⁺–H stretch (broad)']], acid: 10.6, acidSite: 'N⁺–H (conjugate acid of an amine)', rx: ['Deprotonation by base → amine', 'Hofmann elimination (quaternary)'], note: 'Ionic; water-soluble.' },
    imine: { name: 'Imine (C=N)', cls: 'nitrogen', ir: [['1640–1690', 'C=N stretch']], base: 7, baseSite: 'imine N', rx: ['Hydrolysis → carbonyl + amine', 'Reduction → amine'], note: '' },
    oxime: { name: 'Oxime (C=N–OH)', cls: 'nitrogen', ir: [['3100–3600', 'O–H'], ['1640–1690', 'C=N']], rx: ['Beckmann rearrangement', 'Hydrolysis'], acid: 11, acidSite: 'oxime O–H', note: '' },
    nitrile: { name: 'Nitrile (C≡N)', cls: 'nitrogen', ir: [['2210–2260', 'C≡N stretch (sharp, medium)']], rx: ['Hydrolysis → amide → carboxylic acid', 'Reduction (LiAlH₄/H₂) → primary amine', 'Grignard → ketone'], note: 'sp N is very weakly basic.' },
    nitro: { name: 'Nitro (–NO₂)', cls: 'nitrogen', ir: [['1500–1570', 'asymmetric N–O stretch'], ['1300–1370', 'symmetric N–O stretch']], rx: ['Reduction → amine (Sn/HCl, H₂)', 'Strongly deactivating & meta-directing on arenes'], note: 'Strongly electron-withdrawing; many nitro compounds are explosive.' },
    azo: { name: 'Azo (–N=N–)', cls: 'nitrogen', ir: [['1400–1450', 'N=N (weak)']], rx: ['Azo dyes (coloured, extended conjugation)', 'Reduction → amines'], note: '' },
    hydrazine: { name: 'Hydrazine (N–N)', cls: 'nitrogen', ir: [['3200–3400', 'N–H']], base: 8, baseSite: 'N lone pair', rx: ['Strong reducing agent', 'Hydrazone formation'], note: '' },
    isocyanate: { name: 'Isocyanate (–N=C=O)', cls: 'nitrogen', ir: [['2250–2275', 'N=C=O asym. stretch (very strong)']], rx: ['Addition of alcohols → urethanes', 'Hydrolysis → amine + CO₂'], note: '' },
    thiol: { name: 'Thiol (R–SH)', cls: 'sulfur', ir: [['2550–2600', 'S–H stretch (weak)']], acid: 10.5, acidSite: 'S–H', rx: ['Oxidation → disulfide (R–S–S–R)', 'Deprotonation → thiolate (strong nucleophile)', 'Binds heavy metals (Hg²⁺, Pb²⁺)'], note: 'More acidic than alcohols; foul odour.' },
    sulfide: { name: 'Sulfide / thioether (C–S–C)', cls: 'sulfur', ir: [['600–700', 'C–S stretch (weak)']], rx: ['Oxidation → sulfoxide → sulfone', 'S-alkylation → sulfonium'], note: '' },
    disulfide: { name: 'Disulfide (S–S)', cls: 'sulfur', ir: [['500–540', 'S–S stretch (weak)']], rx: ['Reduction → 2 thiols (cysteine/cystine)'], note: 'Cross-links in proteins (e.g. insulin).' },
    sulfoxide: { name: 'Sulfoxide (S=O)', cls: 'sulfur', ir: [['1030–1070', 'S=O stretch (strong)']], rx: ['Oxidation → sulfone', 'Reduction → sulfide'], note: 'Polar aprotic (DMSO).' },
    sulfone: { name: 'Sulfone (O=S=O between two carbons)', cls: 'sulfur', ir: [['1120–1160', 'S=O sym.'], ['1290–1350', 'S=O asym.']], rx: ['Stable; α-carbanion chemistry (Julia olefination)'], note: '' },
    sulfonicacid: { name: 'Sulfonic acid / sulfonate (–SO₃H)', cls: 'sulfur', ir: [['1150–1250', 'S=O asym.'], ['1030–1060', 'S=O sym.']], acid: -2, acidSite: 'S–O–H (strong acid)', rx: ['Strong acid catalysis', 'Detergent head groups'], note: 'Strong acid (pKa ≈ −2).' },
    sulfonamide: { name: 'Sulfonamide (–SO₂NH–)', cls: 'sulfur', ir: [['1140–1180', 'S=O sym.'], ['1300–1370', 'S=O asym.'], ['3250–3350', 'N–H']], acid: 10, acidSite: 'sulfonamide N–H', rx: ['Hydrolysis (forcing)', 'Sulfa-drug pharmacophore'], note: '' },
    phosphate: { name: 'Phosphate / phosphonate ester (P=O)', cls: 'phosphorus', ir: [['1250–1300', 'P=O stretch'], ['900–1050', 'P–O–C stretch']], acid: 2, acidSite: 'P–O–H (first ionisation)', rx: ['Hydrolysis (enzymatic: ATP → ADP + Pi)', 'Phosphoryl transfer'], note: 'Energy currency (ATP) and DNA backbone.' },
    phosphine: { name: 'Phosphine (R₃P)', cls: 'phosphorus', ir: [['2280–2440', 'P–H (if present)']], base: 8, baseSite: 'P lone pair', rx: ['Ligand in organometallic catalysts', 'Oxidation → phosphine oxide'], note: '' },
    aminoacid: { name: 'α-Amino acid (H₂N–CHR–COOH)', cls: 'nitrogen', ir: [['2500–3200', 'zwitterion N⁺–H / O–H broad'], ['1580–1650', 'COO⁻ / N–H']], acid: 2.3, base: 9.6, acidSite: 'α-COOH', baseSite: 'α-NH₃⁺ → NH₂', rx: ['Peptide bond formation', 'Ninhydrin test (purple)', 'Decarboxylation → amine'], note: 'Exists as a zwitterion at physiological pH; amphoteric.' },
    metal: { name: 'Metal–ligand / ionic metal centre', cls: 'other', ir: [], rx: [], note: 'Contains a metal: coordination or ionic bonding.' },
    ionic: { name: 'Ionic bond (metal cation + anion)', cls: 'other', ir: [], rx: ['Dissolves/dissociates in polar solvents (if soluble)', 'Precipitation, double displacement'], note: 'Electrostatic lattice; high melting point; conducts when molten/aqueous.' },
  };
  FG.knowledge = K;

  /* ---------- helpers ---------- */
  FG.analyze = function (mol0) {
    const { mol: m, map } = AC.collapseH(mol0);
    const n = m.atoms.length;
    const A = m.atoms;
    const el = (i) => A[i].el;
    const H = (i) => A[i].h || 0;
    const nb = (i) => m.adj[i].map((x) => ({ j: x.j, o: x.bond.order, ar: !!x.bond.arom }));
    const deg = (i) => m.adj[i].length;
    const found = {}; // id -> array of atom arrays (original indices)
    const add = (id, atoms) => { (found[id] = found[id] || []).push(atoms.map((a) => map[a])); };
    const isTermO = (j) => el(j) === 'O' && deg(j) === 1;
    const dblTermO = (i) => nb(i).find((x) => isTermO(x.j) && x.o === 2 && !x.ar);
    const isCarbonylC = (i) => el(i) === 'C' && !!dblTermO(i);
    const inRing = (i) => m.inRing(i);
    const ringBondIn = (i, j) => m.rings.some((r) => r.includes(i) && r.includes(j));
    const carbonylNeighbor = (i) => nb(i).some((x) => isCarbonylC(x.j));
    const sulfonylNeighbor = (i) => nb(i).some((x) => el(x.j) === 'S' && nb(x.j).filter((y) => isTermO(y.j)).length >= 1 && A[x.j].charge >= 0);

    // ---- aromatic rings
    const aromRings = m.rings.filter((r) => m.isAromaticRing(r));
    aromRings.forEach((r) => {
      const hetero = r.filter((i) => el(i) !== 'C');
      if (!hetero.length && r.length === 6) add('arene', r);
      else if (!hetero.length) add('arene', r);
      else add('heteroarene', r);
      r.forEach((i) => {
        if (el(i) === 'N' && A[i].charge === 0) {
          if (H(i) > 0) add('pyrroleNH', [i]);
          else if (deg(i) === 2) add('pyridineN', [i]);
        }
      });
    });
    // ---- per atom classification
    for (let i = 0; i < n; i++) {
      const e = el(i);
      const nbs = nb(i);
      if (e === 'C') {
        if (isCarbonylC(i)) {
          const o = dblTermO(i).j;
          const others = nbs.filter((x) => x.j !== o);
          const lig = others.map((x) => ({ j: x.j, e: el(x.j) }));
          const hetero = lig.filter((x) => x.e !== 'C');
          const hcount = H(i);
          const ring = inRing(i);
          const key = hetero.map((x) => x.e).sort().join('');
          if (A[i].arom) {
            if (hetero.some((x) => x.e === 'N')) add(hetero.filter((x) => x.e === 'N').length >= 2 ? 'urea' : 'lactam', [i, o]);
            else add('ketone', [i, o]);
          } else if (!hetero.length) {
            if (hcount >= 1 || lig.length === 1) add('aldehyde', [i, o]); else add('ketone', [i, o]);
          } else if (key === 'O') {
            const X = hetero[0].j;
            if (A[X].charge < 0 && deg(X) === 1) add('carboxylate', [i, o, X]);
            else if (H(X) > 0 && deg(X) === 1) add('acid', [i, o, X]);
            else if (nb(X).some((y) => y.j !== i && isCarbonylC(y.j))) add('anhydride', [i, o, X]);
            else if (inRing(i) && inRing(X) && ringBondIn(i, X)) add('lactone', [i, o, X]);
            else add('ester', [i, o, X]);
          } else if (key === 'OO') {
            add('carbonate', [i, o]);
          } else if (key === 'N') {
            const N = hetero[0].j;
            if (inRing(i) && inRing(N) && ringBondIn(i, N)) add('lactam', [i, o, N]);
            else {
              const hN = H(N), cN = nb(N).filter((y) => y.j !== i).length;
              add(hN >= 2 ? 'amide1' : hN === 1 ? 'amide2' : 'amide3', [i, o, N]);
            }
          } else if (key === 'NN') add('urea', [i, o]);
          else if (key === 'NO') add('carbamate', [i, o]);
          else if (key === 'S') add('thioester', [i, o]);
          else if (['Cl', 'Br', 'F', 'I'].includes(key)) add('acylhalide', [i, o, hetero[0].j]);
        }
      }
      if (e === 'C' && !A[i].arom) {
        nbs.forEach((x) => {
          if (x.j < i) return;
          const f = el(x.j);
          if (f === 'C' && !x.ar && !A[x.j].arom) {
            if (x.o === 2) {
              // C=C (not part of an aromatic ring)
              add('alkene', [i, x.j]);
              // enol
              [i, x.j].forEach((c) => nb(c).forEach((y) => { if (el(y.j) === 'O' && H(y.j) > 0 && y.o === 1 && deg(y.j) === 1) add('enol', [c, y.j]); }));
            } else if (x.o === 3) add('alkyne', [i, x.j]);
          }
        });
        // C≡N
        nbs.forEach((x) => { if (el(x.j) === 'N' && x.o === 3) add('nitrile', [i, x.j]); });
        // C=N
        nbs.forEach((x) => {
          if (el(x.j) === 'N' && x.o === 2 && !x.ar && !A[i].arom) {
            const N = x.j;
            const oh = nb(N).find((y) => el(y.j) === 'O' && H(y.j) > 0);
            const other = nb(N).filter((y) => y.j !== i);
            if (oh) add('oxime', [i, N, oh.j]);
            else if (nb(i).some((y) => el(y.j) === 'O' && y.o === 2)) add('isocyanate', [i, N]);
            else add('imine', [i, N]);
          }
        });
      }
      if (e === 'C') {
        // halides
        nbs.forEach((x) => {
          if (['F', 'Cl', 'Br', 'I'].includes(el(x.j)) && A[x.j].charge === 0) {
            if (A[i].arom) add('arylhalide', [i, x.j]);
            else if (nb(i).some((y) => y.o === 2 && el(y.j) === 'C' && y.j !== x.j) && !isCarbonylC(i)) add('vinylhalide', [i, x.j]);
            else if (!isCarbonylC(i)) add('haloalkane', [i, x.j]);
          }
        });
        // alcohol / phenol / ether / epoxide
        nbs.forEach((x) => {
          const O = x.j;
          if (el(O) !== 'O' || x.o !== 1 || A[O].charge !== 0) return;
          if (isCarbonylC(i)) return;
          if (H(O) > 0 && deg(O) === 1) {
            if (A[i].arom) add('phenol', [i, O]);
            else if (nb(i).some((y) => y.o === 2 && el(y.j) === 'C')) { /* enol handled */ }
            else {
              const heavyC = nb(i).filter((y) => el(y.j) !== 'H' && y.j !== O).length;
              add(heavyC <= 1 ? 'alcohol1' : heavyC === 2 ? 'alcohol2' : 'alcohol3', [i, O]);
            }
          }
        });
      }
      if (e === 'O' && A[i].charge === 0 && deg(i) === 2 && H(i) === 0) {
        const [a, b] = nbs;
        if (el(a.j) === 'C' && el(b.j) === 'C' && a.o === 1 && b.o === 1 && !isCarbonylC(a.j) && !isCarbonylC(b.j)) {
          const ring3 = m.rings.some((r) => r.length === 3 && r.includes(i));
          if (ring3) add('epoxide', [a.j, i, b.j]); else add('ether', [a.j, i, b.j]);
        }
      }
      if (e === 'N') {
        const arNbr = nbs.some((x) => A[x.j].arom && el(x.j) === 'C');
        if (A[i].charge === 1 && !A[i].arom) {
          const nitroO = nbs.filter((x) => el(x.j) === 'O');
          if (nitroO.length === 2 && deg(i) === 3) add('nitro', [i, nitroO[0].j, nitroO[1].j]);
          else if (nbs.every((x) => x.o === 1) && deg(i) + H(i) === 4) add('ammonium', [i]);
        } else if (A[i].charge === 0 && !A[i].arom) {
          const nitroO = nbs.filter((x) => el(x.j) === 'O' && x.o === 2);
          if (nitroO.length === 2) add('nitro', [i, nitroO[0].j, nitroO[1].j]);
          else if (nbs.some((x) => el(x.j) === 'N' && x.o === 2)) { if (el(nbs.find((x) => el(x.j) === 'N' && x.o === 2).j) === 'N' && i < nbs.find((x) => el(x.j) === 'N' && x.o === 2).j) add('azo', [i, nbs.find((x) => el(x.j) === 'N' && x.o === 2).j]); }
          else if (nbs.every((x) => x.o === 1)) {
            const bad = carbonylNeighbor(i) || sulfonylNeighbor(i) || nbs.some((x) => ['N', 'O', 'S', 'P'].includes(el(x.j)) && el(x.j) !== 'N') || nbs.some((x) => el(x.j) === 'C' && nb(x.j).some((y) => y.o === 2 && ['N', 'O'].includes(el(y.j))) && !isCarbonylC(x.j));
            const hydrazine = nbs.some((x) => el(x.j) === 'N' && x.o === 1);
            if (hydrazine) add('hydrazine', [i]);
            else if (!bad && nbs.every((x) => ['C', 'H'].includes(el(x.j)))) {
              const c = nbs.length;
              const total = c + H(i);
              if (total === 3 && c >= 1) {
                if (arNbr) add('aniline', [i]);
                else add(c === 1 ? 'amine1' : c === 2 ? 'amine2' : 'amine3', [i]);
              }
            }
          }
        }
      }
      if (e === 'S') {
        const to = nbs.filter((x) => isTermO(x.j) && x.o === 2);
        const oN = to.length;
        const others = nbs.filter((x) => !(isTermO(x.j) && x.o === 2));
        if (oN === 0 && A[i].charge === 0) {
          if (H(i) > 0 && deg(i) === 1) add('thiol', [i, others[0] ? others[0].j : i]);
          else if (deg(i) === 2 && others.length === 2) {
            if (others.every((x) => el(x.j) === 'C')) add('sulfide', [i]);
            else if (others.some((x) => el(x.j) === 'S') && i < others.find((x) => el(x.j) === 'S').j) add('disulfide', [i, others.find((x) => el(x.j) === 'S').j]);
          }
        } else if (oN === 1 && others.length === 2 && others.every((x) => el(x.j) === 'C')) add('sulfoxide', [i]);
        else if (oN === 2) {
          const oh = others.find((x) => el(x.j) === 'O' && (H(x.j) > 0 || A[x.j].charge < 0));
          const nn = others.find((x) => el(x.j) === 'N');
          if (oh) add('sulfonicacid', [i, oh.j]);
          else if (nn) add('sulfonamide', [i, nn.j]);
          else if (others.every((x) => el(x.j) === 'C')) add('sulfone', [i]);
        }
      }
      if (e === 'P') {
        const to = nbs.filter((x) => isTermO(x.j) && x.o === 2);
        if (to.length) add('phosphate', [i]);
        else if (A[i].charge === 0 && deg(i) + H(i) === 3) add('phosphine', [i]);
      }
    }
    // α-amino acid
    (found.acid || []).forEach((g) => {
      const c = g[0];
      const ci = map.indexOf(c);
      nb(ci).forEach((x) => { if (el(x.j) === 'C' && x.o === 1) nb(x.j).forEach((y) => { if (el(y.j) === 'N' && (found.amine1 || found.amine2 || found.amine3 || []).some((z) => z[0] === map[y.j])) add('aminoacid', [map[x.j], map[ci]]); }); });
    });
    // alkyl / alkane framework: sp3 carbons bonded only to carbon and hydrogen
    const alkylC = [];
    A.forEach((a, i) => { if (a.el === 'C' && !a.arom && nb(i).every((x) => x.o === 1 && el(x.j) === 'C' && !A[x.j].arom || (x.o === 1 && el(x.j) === 'C'))) alkylC.push(i); });
    const pureAlkyl = alkylC.filter((i) => nb(i).every((x) => x.o === 1 && el(x.j) === 'C'));
    if (pureAlkyl.length) add('alkane', pureAlkyl);
    // metals & ionic
    const hasMetal = A.some((a) => AC.isMetal && AC.isMetal(a.el));
    if (hasMetal) {
      (found.metal = found.metal || []).push(A.map((a, i) => (AC.isMetal(a.el) ? map[i] : -1)).filter((i) => i >= 0));
    }
    // build result list
    const order = ['hydrocarbon', 'halogen', 'oxygen', 'carbonyl', 'nitrogen', 'sulfur', 'phosphorus', 'other'];
    const groups = Object.keys(found).map((id) => {
      const k = K[id] || { name: id, cls: 'other', ir: [], rx: [], note: '' };
      // de-duplicate identical atom sets
      const seen = new Set();
      const sites = found[id].filter((a) => { const key = a.slice().sort().join(','); if (seen.has(key)) return false; seen.add(key); return true; });
      return Object.assign({ id, count: sites.length, sites }, k);
    }).sort((a, b) => order.indexOf(a.cls) - order.indexOf(b.cls) || a.name.localeCompare(b.name));
    const acids = [], bases = [];
    groups.forEach((g) => {
      if (g.acid !== undefined && g.acid !== null && g.id !== 'ammonium') acids.push({ site: g.acidSite || g.name, pKa: g.acid, count: g.count, group: g.id });
      if (g.id === 'ammonium') acids.push({ site: g.acidSite, pKa: g.acid, count: g.count, group: g.id });
      if (g.base !== undefined && g.base !== null && g.id !== 'carboxylate') bases.push({ site: g.baseSite || g.name, pKaH: g.base, count: g.count, group: g.id });
      if (g.id === 'carboxylate') bases.push({ site: g.baseSite, pKaH: g.base, count: g.count, group: g.id });
    });
    // amino acid: avoid double counting
    const hasAA = !!found.aminoacid;
    const filteredAcids = hasAA ? acids.filter((a) => a.group !== 'acid' && a.group !== 'aminoacid') .concat(acids.filter((a) => a.group === 'aminoacid')) : acids;
    const filteredBases = hasAA ? bases.filter((a) => !['amine1', 'amine2', 'amine3'].includes(a.group)).concat(bases.filter((a) => a.group === 'aminoacid')) : bases;
    return { groups, acids: filteredAcids.sort((a, b) => a.pKa - b.pKa), bases: filteredBases.sort((a, b) => b.pKaH - a.pKaH), byId: found, summary: groups.map((g) => (g.count > 1 ? g.count + '× ' : '') + g.name.replace(/ \(.*\)$/, '')).join(', ') };
  };

  /* overall acid–base character from group analysis and charge */
  FG.character = function (res, charge) {
    const strongAcid = res.acids.filter((a) => a.pKa < 3.5).length;
    const weakAcid = res.acids.filter((a) => a.pKa >= 3.5 && a.pKa <= 11).length;
    const strongBase = res.bases.filter((b) => b.pKaH > 8).length;
    const weakBase = res.bases.filter((b) => b.pKaH > 3 && b.pKaH <= 8).length;
    const ac = strongAcid + weakAcid, ba = strongBase + weakBase;
    let label;
    if (ac && ba) label = 'amphoteric (has both acidic and basic sites)';
    else if (strongAcid) label = 'strong acid';
    else if (weakAcid) label = 'weak acid';
    else if (strongBase) label = 'base (amine-type)';
    else if (weakBase) label = 'weak base';
    else label = 'neutral in water (no ionisable group in the pH 3–11 range)';
    return label;
  };
})();
