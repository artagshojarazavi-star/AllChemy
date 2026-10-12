/* AllChemy – the 118 elements.
   Row format: Sym|Name|atomic mass|Pauling EN|melting K|boiling K|density g/cm³|covalent radius pm|1st ionisation eV|common oxidation states|year discovered
   Values are standard reference values (rounded). Blank = unknown / not applicable. */
(function () {
  'use strict';
  const AC = (window.AC = window.AC || {});

  const RAW = `H|Hydrogen|1.008|2.20|13.99|20.27|0.00008988|31|13.598|+1,-1|1766
He|Helium|4.0026||0.95|4.22|0.0001785|28|24.587|0|1895
Li|Lithium|6.94|0.98|453.65|1603|0.534|128|5.392|+1|1817
Be|Beryllium|9.0122|1.57|1560|2742|1.85|96|9.323|+2|1798
B|Boron|10.81|2.04|2349|4200|2.34|84|8.298|+3|1808
C|Carbon|12.011|2.55|3823|4098|2.267|76|11.260|+4,+2,-4|-3750
N|Nitrogen|14.007|3.04|63.15|77.36|0.0012506|71|14.534|-3,+3,+5|1772
O|Oxygen|15.999|3.44|54.36|90.20|0.001429|66|13.618|-2|1774
F|Fluorine|18.998|3.98|53.48|85.03|0.001696|57|17.423|-1|1886
Ne|Neon|20.180||24.56|27.07|0.0008999|58|21.565|0|1898
Na|Sodium|22.990|0.93|370.87|1156|0.971|166|5.139|+1|1807
Mg|Magnesium|24.305|1.31|923|1363|1.738|141|7.646|+2|1755
Al|Aluminium|26.982|1.61|933.47|2792|2.70|121|5.986|+3|1825
Si|Silicon|28.085|1.90|1687|3538|2.329|111|8.152|+4,-4|1824
P|Phosphorus|30.974|2.19|317.3|553.7|1.82|107|10.487|-3,+3,+5|1669
S|Sulfur|32.06|2.58|388.36|717.87|2.067|105|10.360|-2,+4,+6|-2000
Cl|Chlorine|35.45|3.16|171.6|239.11|0.003214|102|12.968|-1,+1,+3,+5,+7|1774
Ar|Argon|39.948||83.80|87.30|0.0017837|106|15.760|0|1894
K|Potassium|39.098|0.82|336.53|1032|0.862|203|4.341|+1|1807
Ca|Calcium|40.078|1.00|1115|1757|1.55|176|6.113|+2|1808
Sc|Scandium|44.956|1.36|1814|3109|2.989|170|6.561|+3|1879
Ti|Titanium|47.867|1.54|1941|3560|4.54|160|6.828|+4,+3,+2|1791
V|Vanadium|50.942|1.63|2183|3680|6.11|153|6.746|+5,+4,+3,+2|1801
Cr|Chromium|51.996|1.66|2180|2944|7.15|139|6.767|+6,+3,+2|1797
Mn|Manganese|54.938|1.55|1519|2334|7.44|139|7.434|+7,+4,+2|1774
Fe|Iron|55.845|1.83|1811|3134|7.874|132|7.902|+3,+2|-3000
Co|Cobalt|58.933|1.88|1768|3200|8.86|126|7.881|+2,+3|1735
Ni|Nickel|58.693|1.91|1728|3186|8.912|124|7.640|+2|1751
Cu|Copper|63.546|1.90|1357.77|2835|8.96|132|7.726|+2,+1|-9000
Zn|Zinc|65.38|1.65|692.68|1180|7.134|122|9.394|+2|1746
Ga|Gallium|69.723|1.81|302.91|2477|5.907|122|5.999|+3|1875
Ge|Germanium|72.630|2.01|1211.4|3093|5.323|120|7.899|+4,+2|1886
As|Arsenic|74.922|2.18|1090|887|5.776|119|9.789|-3,+3,+5|1250
Se|Selenium|78.971|2.55|494|958|4.809|120|9.752|-2,+4,+6|1817
Br|Bromine|79.904|2.96|265.8|332.0|3.122|120|11.814|-1,+1,+3,+5|1826
Kr|Krypton|83.798|3.00|115.78|119.93|0.003733|116|14.000|0,+2|1898
Rb|Rubidium|85.468|0.82|312.46|961|1.532|220|4.177|+1|1861
Sr|Strontium|87.62|0.95|1050|1655|2.64|195|5.695|+2|1790
Y|Yttrium|88.906|1.22|1799|3609|4.469|190|6.217|+3|1794
Zr|Zirconium|91.224|1.33|2128|4682|6.506|175|6.634|+4|1789
Nb|Niobium|92.906|1.6|2750|5017|8.57|164|6.759|+5,+3|1801
Mo|Molybdenum|95.95|2.16|2896|4912|10.22|154|7.092|+6,+4|1778
Tc|Technetium|98|1.9|2430|4538|11.5|147|7.28|+7,+4|1937
Ru|Ruthenium|101.07|2.2|2607|4423|12.37|146|7.360|+3,+4,+8|1844
Rh|Rhodium|102.91|2.28|2237|3968|12.41|142|7.459|+3|1803
Pd|Palladium|106.42|2.20|1828.05|3236|12.02|139|8.337|+2,+4|1803
Ag|Silver|107.87|1.93|1234.93|2435|10.501|145|7.576|+1|-3000
Cd|Cadmium|112.41|1.69|594.22|1040|8.69|144|8.994|+2|1817
In|Indium|114.82|1.78|429.75|2345|7.31|142|5.786|+3|1863
Sn|Tin|118.71|1.96|505.08|2875|7.287|139|7.344|+4,+2|-3000
Sb|Antimony|121.76|2.05|903.78|1860|6.685|139|8.608|+3,+5,-3|-3000
Te|Tellurium|127.60|2.1|722.66|1261|6.232|138|9.010|-2,+4,+6|1782
I|Iodine|126.90|2.66|386.85|457.4|4.93|139|10.451|-1,+1,+5,+7|1811
Xe|Xenon|131.29|2.60|161.4|165.05|0.005887|140|12.130|0,+2,+4,+6|1898
Cs|Caesium|132.91|0.79|301.59|944|1.873|244|3.894|+1|1860
Ba|Barium|137.33|0.89|1000|2170|3.594|215|5.212|+2|1808
La|Lanthanum|138.91|1.10|1193|3737|6.145|207|5.577|+3|1839
Ce|Cerium|140.12|1.12|1068|3716|6.770|204|5.539|+3,+4|1803
Pr|Praseodymium|140.91|1.13|1208|3793|6.773|203|5.473|+3|1885
Nd|Neodymium|144.24|1.14|1297|3347|7.007|201|5.525|+3|1885
Pm|Promethium|145|1.13|1315|3273|7.26|199|5.582|+3|1945
Sm|Samarium|150.36|1.17|1345|2067|7.52|198|5.644|+3,+2|1879
Eu|Europium|151.96|1.2|1099|1802|5.243|198|5.670|+3,+2|1901
Gd|Gadolinium|157.25|1.2|1585|3546|7.895|196|6.150|+3|1880
Tb|Terbium|158.93|1.2|1629|3503|8.229|194|5.864|+3|1843
Dy|Dysprosium|162.50|1.22|1680|2840|8.55|192|5.939|+3|1886
Ho|Holmium|164.93|1.23|1734|2993|8.795|192|6.022|+3|1878
Er|Erbium|167.26|1.24|1802|3141|9.066|189|6.108|+3|1843
Tm|Thulium|168.93|1.25|1818|2223|9.321|190|6.184|+3|1879
Yb|Ytterbium|173.05|1.1|1097|1469|6.965|187|6.254|+3,+2|1878
Lu|Lutetium|174.97|1.27|1925|3675|9.84|187|5.426|+3|1907
Hf|Hafnium|178.49|1.3|2506|4876|13.31|175|6.825|+4|1923
Ta|Tantalum|180.95|1.5|3290|5731|16.65|170|7.550|+5|1802
W|Tungsten|183.84|2.36|3695|5828|19.25|162|7.864|+6,+4|1783
Re|Rhenium|186.21|1.9|3459|5869|21.02|151|7.834|+7,+4|1925
Os|Osmium|190.23|2.2|3306|5285|22.59|144|8.438|+4,+8|1803
Ir|Iridium|192.22|2.20|2719|4701|22.56|141|8.967|+3,+4|1803
Pt|Platinum|195.08|2.28|2041.4|4098|21.45|136|8.959|+2,+4|1735
Au|Gold|196.97|2.54|1337.33|3129|19.282|136|9.226|+3,+1|-3000
Hg|Mercury|200.59|2.00|234.32|629.88|13.534|132|10.438|+2,+1|-3000
Tl|Thallium|204.38|1.62|577|1746|11.85|145|6.108|+1,+3|1861
Pb|Lead|207.2|2.33|600.61|2022|11.34|146|7.417|+2,+4|-3000
Bi|Bismuth|208.98|2.02|544.7|1837|9.78|148|7.286|+3|1753
Po|Polonium|209|2.0|527|1235|9.196|140|8.414|+4,+2|1898
At|Astatine|210|2.2|575|610||150|9.3|-1,+1|1940
Rn|Radon|222||202|211.3|0.00973|150|10.749|0|1900
Fr|Francium|223|0.7|300|950||260|4.073|+1|1939
Ra|Radium|226|0.9|973|2010|5.5|221|5.278|+2|1898
Ac|Actinium|227|1.1|1323|3471|10.07|215|5.17|+3|1899
Th|Thorium|232.04|1.3|2115|5061|11.72|206|6.307|+4|1829
Pa|Protactinium|231.04|1.5|1841|4300|15.37|200|5.89|+5,+4|1913
U|Uranium|238.03|1.38|1405.3|4404|19.1|196|6.194|+6,+4,+3|1789
Np|Neptunium|237|1.36|917|4273|20.45|190|6.266|+5,+4,+6,+3|1940
Pu|Plutonium|244|1.28|912.5|3501|19.84|187|6.026|+4,+3,+5,+6|1940
Am|Americium|243|1.13|1449|2880|13.69|180|5.974|+3|1944
Cm|Curium|247|1.28|1613|3383|13.51|169|5.991|+3|1944
Bk|Berkelium|247|1.3|1259|2900|14.78||6.198|+3,+4|1949
Cf|Californium|251|1.3|1173|1743|15.1||6.282|+3|1950
Es|Einsteinium|252|1.3|1133||8.84||6.42|+3|1952
Fm|Fermium|257|1.3|1800|||||6.50|+3|1952
Md|Mendelevium|258|1.3|1100|||||6.58|+3,+2|1955
No|Nobelium|259|1.3|1100|||||6.65|+2,+3|1958
Lr|Lawrencium|266|1.3|1900|||||4.9|+3|1961
Rf|Rutherfordium|267||||||||+4|1964
Db|Dubnium|268||||||||+5|1967
Sg|Seaborgium|269||||||||+6|1974
Bh|Bohrium|270||||||||+7|1981
Hs|Hassium|277||||||||+8|1984
Mt|Meitnerium|278||||||||+3|1982
Ds|Darmstadtium|281||||||||+2|1994
Rg|Roentgenium|282||||||||+3|1994
Cn|Copernicium|285||||||||+2|1996
Nh|Nihonium|286||||||||+1|2004
Fl|Flerovium|289||||||||+2|1998
Mc|Moscovium|290||||||||+1|2003
Lv|Livermorium|293||||||||+2|2000
Ts|Tennessine|294||||||||-1|2010
Og|Oganesson|294||||||||0|2002`;

  /* Facts: what the name comes from / main uses (short, one line). */
  const FACTS = {
    H: 'Most abundant element in the universe; fuel of stars, key in water and all organic matter.',
    He: 'Second lightest element; inert gas used for cooling MRI magnets and in balloons.',
    Li: 'Lightest metal; used in rechargeable batteries and mood-stabilising medicine.',
    Be: 'Light, stiff metal used in aerospace and X-ray windows; toxic dust.',
    B: 'Metalloid in borosilicate glass, detergents (borax) and plant nutrition.',
    C: 'Backbone of organic chemistry; exists as diamond, graphite, graphene and fullerenes.',
    N: 'Makes up 78 % of air; essential in proteins, DNA and fertilisers.',
    O: 'Supports respiration and combustion; most abundant element in Earth’s crust.',
    F: 'Most electronegative element; in toothpaste (fluoride) and Teflon.',
    Ne: 'Noble gas that glows red-orange in neon signs.',
    Na: 'Soft reactive metal; in table salt and essential for nerve signals.',
    Mg: 'Light structural metal; centre of chlorophyll; burns with a brilliant white flame.',
    Al: 'Light, corrosion-resistant metal used in cans, aircraft and foil.',
    Si: 'Basis of electronics (chips) and glass; second most abundant crust element.',
    P: 'Essential in DNA, ATP and bones; used in fertilisers and matches.',
    S: 'Yellow non-metal used for sulfuric acid, rubber vulcanisation and gunpowder.',
    Cl: 'Greenish toxic gas; disinfects water and is in table salt and PVC.',
    Ar: 'Inert gas filling light bulbs and used as a welding shield.',
    K: 'Reactive metal; vital for nerve function; used in fertilisers.',
    Ca: 'Builds bones, teeth and shells; found in limestone and cement.',
    Sc: 'Rare light metal used in strong aluminium alloys for sports gear.',
    Ti: 'Strong, light, corrosion-proof metal for aircraft and implants.',
    V: 'Added to steel to harden it; vanadium redox batteries.',
    Cr: 'Gives stainless steel its shine; chrome plating.',
    Mn: 'Essential for steelmaking and in dry-cell batteries.',
    Fe: 'Most-used metal (steel); the core of haemoglobin carries oxygen in blood.',
    Co: 'Used in magnets, battery cathodes and vitamin B12.',
    Ni: 'Used in stainless steel, coins and rechargeable batteries.',
    Cu: 'Excellent electrical conductor; used in wiring, pipes, and alloys like brass.',
    Zn: 'Galvanises steel against rust; essential trace element.',
    Ga: 'Melts in your hand (29.8 °C); used in LEDs and semiconductors.',
    Ge: 'Semiconductor used in fibre optics and infrared lenses.',
    As: 'Metalloid notorious as a poison; used in semiconductors (GaAs).',
    Se: 'Photoconductor and essential trace element; used in glass decolouring.',
    Br: 'Dark-red liquid non-metal; flame retardants and photography history.',
    Kr: 'Noble gas used in high-performance lighting and lasers.',
    Rb: 'Soft reactive alkali metal used in atomic clocks.',
    Sr: 'Gives fireworks a crimson red colour.',
    Y: 'Used in red phosphors, LEDs and superconductors.',
    Zr: 'Corrosion-proof metal for nuclear fuel cladding.',
    Nb: 'Alloyed in steels; superconducting magnets.',
    Mo: 'High-melting metal that strengthens steel; key in enzymes.',
    Tc: 'First artificially made element; Tc-99m is the most used medical imaging isotope.',
    Ru: 'Hard platinum-group metal used in electronics and catalysts.',
    Rh: 'Rare, shiny metal for catalytic converters.',
    Pd: 'Catalytic converters and hydrogen absorption; cross-coupling catalyst.',
    Ag: 'Best electrical and thermal conductor; jewellery, mirrors, photography.',
    Cd: 'Used in NiCd batteries and pigments; toxic.',
    In: 'Used in touchscreens (ITO) and low-melting alloys.',
    Sn: 'Used in solder, tin plating and bronze.',
    Sb: 'Hardens lead alloys; flame retardants.',
    Te: 'Used in solar panels (CdTe) and thermoelectrics.',
    I: 'Needed for thyroid hormones; purple vapour; antiseptic tincture.',
    Xe: 'Noble gas for ion thrusters, anaesthetic and flash lamps.',
    Cs: 'Most electropositive stable metal; defines the second via atomic clocks.',
    Ba: 'Heavy metal; BaSO4 is used as an X-ray contrast agent; green fireworks.',
    La: 'Gives its name to the lanthanides; used in camera lenses and hybrid batteries.',
    Ce: 'Most abundant rare earth; used in catalytic converters and lighter flints.',
    Pr: 'Gives glass and ceramics a green-yellow colour.',
    Nd: 'Makes the strongest permanent magnets (NdFeB).',
    Pm: 'Radioactive rare earth; no stable isotopes.',
    Sm: 'Samarium–cobalt magnets, resistant to high temperature.',
    Eu: 'Red and blue phosphors in screens and euro banknotes.',
    Gd: 'MRI contrast agents; strongly magnetic.',
    Tb: 'Green phosphors and magnetostrictive alloys.',
    Dy: 'Boosts neodymium magnets for high-temperature use.',
    Ho: 'Highest magnetic moment of any element; lasers.',
    Er: 'Erbium-doped fibre amplifiers for telecommunications.',
    Tm: 'Rare; portable X-ray sources and lasers.',
    Yb: 'Atomic clocks and lasers.',
    Lu: 'Densest, hardest rare earth; PET scanner detectors.',
    Hf: 'Control rods in nuclear reactors; chip insulators.',
    Ta: 'Very corrosion-resistant; capacitors in phones.',
    W: 'Highest melting point of all metals; light-bulb filaments, tool steel.',
    Re: 'Used in jet-engine superalloys.',
    Os: 'Densest naturally occurring element.',
    Ir: 'Extremely corrosion-resistant; spark plugs; linked to the dinosaur-era impact layer.',
    Pt: 'Noble catalyst; catalytic converters, jewellery, cisplatin chemotherapy.',
    Au: 'Noble, inert, malleable metal; jewellery, electronics, currency.',
    Hg: 'Only metal liquid at room temperature; thermometers (historic), toxic.',
    Tl: 'Very toxic; once used as rat poison.',
    Pb: 'Dense, soft metal; batteries and radiation shielding; toxic.',
    Bi: 'Heaviest effectively stable element; stomach remedies (bismuth subsalicylate).',
    Po: 'Highly radioactive; discovered by Marie and Pierre Curie.',
    At: 'Rarest naturally occurring element; extremely radioactive.',
    Rn: 'Radioactive noble gas that seeps from soil into buildings.',
    Fr: 'Extremely rare, highly unstable alkali metal.',
    Ra: 'Radioactive; once used in luminous paint; discovered by the Curies.',
    Ac: 'Radioactive; glows blue in the dark.',
    Th: 'Radioactive, abundant; potential nuclear fuel.',
    Pa: 'Rare radioactive actinide.',
    U: 'Fuel of nuclear reactors; U-235 is fissile.',
    Np: 'First transuranium element, made in 1940.',
    Pu: 'Used in nuclear weapons and spacecraft power sources.',
    Am: 'Used in household smoke detectors.',
    Cm: 'Named after Marie and Pierre Curie; powers space probes.',
    Bk: 'Synthetic actinide made in tiny amounts.',
    Cf: 'Strong neutron source used to start reactors.',
    Es: 'Synthetic, found first in nuclear-test debris.',
    Fm: 'Synthetic, found first in nuclear-test debris.',
    Md: 'Synthetic, made one atom at a time.',
    No: 'Synthetic actinide.',
    Lr: 'Synthetic, last actinide.',
    Rf: 'Synthetic superheavy element.', Db: 'Synthetic superheavy element.', Sg: 'Synthetic superheavy element.',
    Bh: 'Synthetic superheavy element.', Hs: 'Synthetic superheavy element.', Mt: 'Synthetic superheavy element.',
    Ds: 'Synthetic superheavy element.', Rg: 'Synthetic superheavy element.', Cn: 'Synthetic, possibly volatile.',
    Nh: 'Synthetic, first element discovered in Asia (Japan).', Fl: 'Synthetic, near the predicted island of stability.',
    Mc: 'Synthetic superheavy element.', Lv: 'Synthetic superheavy element.',
    Ts: 'Synthetic, heaviest halogen.', Og: 'Heaviest known element; synthetic noble-gas group member.',
  };

  const NOBLE_Z = [2, 10, 18, 36, 54, 86];
  const NOBLE_SYM = { 2: 'He', 10: 'Ne', 18: 'Ar', 36: 'Kr', 54: 'Xe', 86: 'Rn' };
  const MADELUNG = [[1, 0], [2, 0], [2, 1], [3, 0], [3, 1], [4, 0], [3, 2], [4, 1], [5, 0], [4, 2], [5, 1], [6, 0], [4, 3], [5, 2], [6, 1], [7, 0], [5, 3], [6, 2], [7, 1]];
  const EXC = {
    24: '3d5 4s1', 29: '3d10 4s1', 41: '4d4 5s1', 42: '4d5 5s1', 44: '4d7 5s1', 45: '4d8 5s1', 46: '4d10', 47: '4d10 5s1',
    57: '5d1 6s2', 58: '4f1 5d1 6s2', 64: '4f7 5d1 6s2', 78: '4f14 5d9 6s1', 79: '4f14 5d10 6s1',
    89: '6d1 7s2', 90: '6d2 7s2', 91: '5f2 6d1 7s2', 92: '5f3 6d1 7s2', 93: '5f4 6d1 7s2', 96: '5f7 6d1 7s2', 103: '5f14 7s2 7p1',
  };
  const LETTERS = 'spdf';

  function aufbau(Z) {
    const occ = {};
    let left = Z;
    for (const [n, l] of MADELUNG) {
      if (left <= 0) break;
      const cap = 2 * (2 * l + 1);
      const k = Math.min(cap, left);
      occ[n + LETTERS[l]] = k;
      left -= k;
    }
    return occ;
  }
  /* returns {full:'1s2 2s2 ...', short:'[Ar] 3d10 4s1', occ:{...}} */
  function econfig(Z) {
    let core = 0;
    for (const nz of NOBLE_Z) if (nz < Z) core = nz;
    let occ;
    if (EXC[Z]) {
      // exceptions are listed as everything beyond the previous noble-gas core
      occ = core ? Object.assign({}, aufbau(core)) : {};
      EXC[Z].split(' ').forEach((t) => (occ[t.slice(0, 2)] = (occ[t.slice(0, 2)] || 0) + parseInt(t.slice(2), 10)));
    } else occ = aufbau(Z);
    const order = Object.keys(occ).filter((k) => occ[k] > 0).sort((a, b) => (a[0] - b[0]) || (LETTERS.indexOf(a[1]) - LETTERS.indexOf(b[1])));
    const full = order.map((k) => k + occ[k]).join(' ');
    let short = full;
    if (core) {
      const coreOcc = aufbau(core);
      const rest = order.filter((k) => occ[k] - (coreOcc[k] || 0) > 0);
      short = '[' + NOBLE_SYM[core] + '] ' + rest.map((k) => k + (occ[k] - (coreOcc[k] || 0))).join(' ');
    }
    return { full, short, occ: Object.fromEntries(order.map((k) => [k, occ[k]])), order };
  }

  function position(Z, period) {
    // main-table position (col 1..18, row 1..7); f-block rows 9 (lanthanides) and 10 (actinides)
    if (Z === 1) return { group: 1, period: 1, col: 1, row: 1 };
    if (Z === 2) return { group: 18, period: 1, col: 18, row: 1 };
    if (Z >= 57 && Z <= 71) return { group: null, period: 6, col: Z - 57 + 3, row: 9 };
    if (Z >= 89 && Z <= 103) return { group: null, period: 7, col: Z - 89 + 3, row: 10 };
    const starts = { 2: 3, 3: 11, 4: 19, 5: 37, 6: 55, 7: 87 };
    const p = period;
    const s = starts[p];
    let off = Z - s; // 0-based within period
    let g;
    if (p <= 3) g = off < 2 ? off + 1 : off + 11;
    else if (p <= 5) g = off + 1;
    else {
      // periods 6, 7: skip f-block (15 elements) after group 2
      g = off < 2 ? off + 1 : off - 13; // the 15 f-block elements (La-Lu / Ac-Lr) are skipped
    }
    return { group: g, period: p, col: g, row: p };
  }

  const PERIOD_END = [2, 10, 18, 36, 54, 86, 118];
  const METALLOIDS = new Set(['B', 'Si', 'Ge', 'As', 'Sb', 'Te']);
  const NONMETALS = new Set(['H', 'C', 'N', 'O', 'P', 'S', 'Se']);
  const POST = new Set(['Al', 'Ga', 'In', 'Sn', 'Tl', 'Pb', 'Bi', 'Po', 'Nh', 'Fl', 'Mc', 'Lv']);
  const HALOGENS = new Set(['F', 'Cl', 'Br', 'I', 'At', 'Ts']);
  const NOBLE = new Set(['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn', 'Og']);
  const ALKALI = new Set(['Li', 'Na', 'K', 'Rb', 'Cs', 'Fr']);
  const ALKEARTH = new Set(['Be', 'Mg', 'Ca', 'Sr', 'Ba', 'Ra']);

  AC.CATEGORIES = {
    'alkali': { name: 'Alkali metal', color: '#ef6b73' },
    'alkaline': { name: 'Alkaline earth metal', color: '#f2a65a' },
    'transition': { name: 'Transition metal', color: '#6aa9ff' },
    'post': { name: 'Post-transition metal', color: '#7cc7b7' },
    'metalloid': { name: 'Metalloid', color: '#b8c15d' },
    'nonmetal': { name: 'Reactive nonmetal', color: '#58c98b' },
    'halogen': { name: 'Halogen', color: '#4cc3d9' },
    'noble': { name: 'Noble gas', color: '#b28cf0' },
    'lanthanide': { name: 'Lanthanide', color: '#e58fc3' },
    'actinide': { name: 'Actinide', color: '#d77aa0' },
  };

  const num = (s) => (s === '' || s === undefined ? null : Number(s));
  const EL = [];
  RAW.split('\n').forEach((line, i) => {
    const f = line.split('|');
    const Z = i + 1;
    const sym = f[0];
    let period = 1;
    for (let p = 0; p < PERIOD_END.length; p++) if (Z <= PERIOD_END[p]) { period = p + 1; break; }
    const pos = position(Z, period);
    let cat;
    if (ALKALI.has(sym)) cat = 'alkali';
    else if (ALKEARTH.has(sym)) cat = 'alkaline';
    else if (Z >= 57 && Z <= 71) cat = 'lanthanide';
    else if (Z >= 89 && Z <= 103) cat = 'actinide';
    else if (NOBLE.has(sym)) cat = 'noble';
    else if (HALOGENS.has(sym)) cat = 'halogen';
    else if (METALLOIDS.has(sym)) cat = 'metalloid';
    else if (NONMETALS.has(sym)) cat = 'nonmetal';
    else if (POST.has(sym)) cat = 'post';
    else cat = 'transition';
    let block;
    if (cat === 'lanthanide' || cat === 'actinide') block = 'f';
    else if (pos.group <= 2 || sym === 'He') block = 's';
    else if (pos.group >= 13) block = 'p';
    else block = 'd';
    const mp = num(f[4]);
    const bp = num(f[5]);
    let state = 'unknown';
    if (bp !== null && mp !== null) state = bp < 293 ? 'gas' : mp < 293 ? 'liquid' : 'solid';
    else if (mp !== null) state = mp < 293 ? 'liquid' : 'solid';
    if (sym === 'He') state = 'gas';
    const cfg = econfig(Z);
    // unpaired electrons
    let unpaired = 0;
    for (const k of Object.keys(cfg.occ)) {
      const l = LETTERS.indexOf(k[1]);
      const orb = 2 * l + 1;
      const e = cfg.occ[k];
      unpaired += e <= orb ? e : 2 * orb - e;
      if (e === 2 * orb) unpaired -= 0;
    }
    // full subshells contribute 0 automatically (2*orb - e = 0)
    const shells = {};
    for (const k of Object.keys(cfg.occ)) shells[k[0]] = (shells[k[0]] || 0) + cfg.occ[k];
    const yr = num(f[10]);
    EL.push({
      Z, sym, name: f[1], mass: num(f[2]), en: num(f[3]), mp, bp, density: num(f[6]), rcov: num(f[7]), ie1: num(f[8]),
      ox: f[9].split(',').filter(Boolean), year: yr, ancient: yr !== null && yr < 0, period, group: pos.group, col: pos.col, row: pos.row,
      cat, block, state, config: cfg.full, configShort: cfg.short, occ: cfg.occ, shells, unpaired,
      valence: Z <= 2 ? Z : null, fact: FACTS[sym] || '',
    });
  });
  // main-group valence electrons
  EL.forEach((e) => {
    if (e.block === 's') e.valence = e.sym === 'He' ? 2 : e.group;
    else if (e.block === 'p') e.valence = e.group - 10;
    else e.valence = null;
  });

  AC.EL = EL;
  AC.EL_BY_SYM = Object.fromEntries(EL.map((e) => [e.sym, e]));
  AC.el = (s) => AC.EL_BY_SYM[s] || null;
  AC.elByZ = (z) => EL[z - 1];
  AC.isMetal = (s) => {
    const e = AC.EL_BY_SYM[s];
    return !!e && ['alkali', 'alkaline', 'transition', 'post', 'lanthanide', 'actinide'].includes(e.cat);
  };
  AC.ELEMENT_NAMES = Object.fromEntries(EL.map((e) => [e.name.toLowerCase(), e.sym]));
  AC.ELEMENT_NAMES.aluminum = 'Al';
  AC.ELEMENT_NAMES.cesium = 'Cs';
  AC.ELEMENT_NAMES.sulphur = 'S';
})();
