// Original SVG art for the private card: palms, pomegranates, fan flowers, diamonds and a kilim band.
// Everything is drawn in code so the same SVG can be shown on the page and painted into the saved image.

const WINE = '#7d1f2e';
const WINE_DEEP = '#5a1220';
const RED = '#a3202f';
const PINK = '#d98d8a';
const LEAF = '#7e8b45';
const LEAF_DARK = '#5f6b31';
const TRUNK = '#9a6a42';
const ORANGE = '#e39a5c';
const CREAM = '#f8eee2';

const r1 = (n) => Math.round(n * 10) / 10;

/** One pinnate palm frond: a curved midrib with leaflets on both sides. */
function frondPath(x, y, angle, length, droop) {
  const a = (angle * Math.PI) / 180;
  const p0 = [x, y];
  const p1 = [x + Math.cos(a) * length * 0.55, y + Math.sin(a) * length * 0.55 - length * 0.12];
  const p2 = [x + Math.cos(a) * length, y + Math.sin(a) * length + droop * length];
  const at = (t) => [
    (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
    (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1],
  ];
  const tangent = (t) => {
    const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
    const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
    const d = Math.hypot(dx, dy) || 1;
    return [dx / d, dy / d];
  };
  let d = `M${r1(p0[0])} ${r1(p0[1])}Q${r1(p1[0])} ${r1(p1[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  for (let t = 0.14; t < 0.97; t += 0.065) {
    const [bx, by] = at(t);
    const [tx, ty] = tangent(t);
    const l = length * 0.3 * (1 - t * 0.75);
    for (const side of [1, -1]) {
      const nx = -ty * side;
      const ny = tx * side;
      const ex = bx + (nx * 0.75 + tx * 0.65) * l;
      const ey = by + (ny * 0.75 + ty * 0.65) * l + l * 0.25;
      d += `M${r1(bx)} ${r1(by)}L${r1(ex)} ${r1(ey)}`;
    }
  }
  return d;
}

export function Palm({ x = 0, y = 0, s = 1, dates = false, flip = false, tint = LEAF }) {
  const fronds = [
    [-178, 44, 0.3], [-150, 48, 0.18], [-124, 46, 0.06], [-100, 40, 0], [-78, 44, 0.04],
    [-54, 48, 0.14], [-28, 46, 0.28], [-4, 42, 0.42], [-196, 38, 0.46],
  ];
  const rings = [];
  for (let i = 0; i < 11; i++) {
    const ty = 136 - i * 8;
    rings.push(`M${r1(46.5 + i * 0.25)} ${ty}l${r1(8 - i * 0.2)} -2.4`);
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})${flip ? ' translate(-100 0)' : ''}`}>
      <path d="M45 140C47 112 49 80 48 50h7c2 30 2 62 0 90z" fill={TRUNK} />
      <path d={rings.join('')} stroke="#6e4527" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <g stroke={tint} strokeWidth="1.7" strokeLinecap="round" fill="none">
        {fronds.slice(0, 5).map(([a, l, dr]) => <path key={a} d={frondPath(51, 50, a, l, dr)} />)}
      </g>
      <g stroke={LEAF_DARK} strokeWidth="1.7" strokeLinecap="round" fill="none">
        {fronds.slice(5).map(([a, l, dr]) => <path key={a} d={frondPath(51, 50, a, l, dr)} />)}
      </g>
      {dates && (
        <g fill={ORANGE} stroke="#b8642f" strokeWidth=".6">
          <path d="M44 54q-4 10-10 18M58 54q4 10 9 17" stroke="#b8642f" strokeWidth="1.2" fill="none" />
          {[[33, 74], [36, 79], [31, 81], [35, 86], [66, 72], [70, 77], [65, 79], [68, 84]].map(([cx, cy]) => (
            <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx="2.4" ry="3.6" />
          ))}
        </g>
      )}
    </g>
  );
}

export function Pomegranate({ x = 0, y = 0, s = 1, open = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-5 -15l2 -6 3 4 3 -4 2 6z" fill={WINE_DEEP} />
      <circle r="16" fill={RED} />
      <ellipse cx="-6" cy="-6" rx="5" ry="3.4" fill="#fff" opacity=".22" transform="rotate(-35 -6 -6)" />
      {open && (
        <g>
          <ellipse cx="4" cy="4" rx="10" ry="9" fill="#f1cdb6" />
          {[[0, 0], [5, -1], [9, 3], [1, 6], [6, 6], [3, 10], [8, 9], [-2, 4]].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.8" fill="#b3263a" />
          ))}
        </g>
      )}
    </g>
  );
}

export function Leaf({ x, y, a = 0, s = 1, fill = LEAF }) {
  return <path d="M0 0C6-5 16-5 22 0C16 5 6 5 0 0Z" fill={fill} transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`} />;
}

/** Burgundy and pink palmette fan, drawn from its base point. */
export function Fan({ x = 0, y = 0, s = 1, from = -150, to = -30 }) {
  const petals = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = from + ((to - from) * i) / (n - 1);
    petals.push(
      <g key={i} transform={`rotate(${r1(a + 90)})`}>
        <path d="M0 0C-7-14-8-34-4-46C-2-50 2-50 4-46C8-34 7-14 0 0Z" fill={i % 2 ? PINK : WINE} />
        <path d="M0-6C-3-18-3-32 0-42C3-32 3-18 0-6Z" fill={i % 2 ? WINE : CREAM} opacity=".85" />
      </g>,
    );
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {petals}
      <circle r="7" fill={WINE_DEEP} />
    </g>
  );
}

/** Orange ginkgo-like fan flower on a stem. */
export function Ginkgo({ x = 0, y = 0, s = 1, a = 0 }) {
  const ribs = [];
  for (let i = -4; i <= 4; i++) ribs.push(`M0 0L${r1(Math.sin((i * 15 * Math.PI) / 180) * 24)} ${r1(-Math.cos((i * 15 * Math.PI) / 180) * 24)}`);
  return (
    <g transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
      <path d="M0 0C-14-10-26-20-24-28C-16-34-6-30 0-26C6-30 16-34 24-28C26-20 14-10 0 0Z" fill={ORANGE} />
      <path d={ribs.join('')} stroke="#c06f37" strokeWidth=".8" />
      <path d="M-22-27C-12-31-4-27 0-24C4-27 12-31 22-27" stroke="#f6c79a" strokeWidth="1.4" fill="none" />
    </g>
  );
}

/** Small burgundy star-diamond with four dots. */
export function Diamond({ x = 0, y = 0, s = 1, fill = WINE }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
      <path d="M0-8L8 0 0 8-8 0Z" />
      <path d="M0-3.2L3.2 0 0 3.2-3.2 0Z" fill={CREAM} />
      <circle cy="-11.5" r="1.4" />
      <circle cx="11.5" r="1.4" />
      <circle cy="11.5" r="1.4" />
      <circle cx="-11.5" r="1.4" />
    </g>
  );
}

/** Kilim-style band of stepped burgundy diamonds. */
function Band({ x, y, w, h = 22 }) {
  const cells = [];
  const step = 18;
  const count = Math.floor(w / step);
  const pad = (w - count * step) / 2;
  for (let i = 0; i < count; i++) {
    const cx = r1(x + pad + step * i + step / 2);
    const cy = y + h / 2;
    cells.push(
      <g key={i}>
        <path d={`M${cx} ${cy - 8}L${cx + 8} ${cy}L${cx} ${cy + 8}L${cx - 8} ${cy}Z`} fill="none" stroke={WINE} strokeWidth="2.4" />
        <rect x={cx - 1.8} y={cy - 1.8} width="3.6" height="3.6" fill={WINE} transform={`rotate(45 ${cx} ${cy})`} />
      </g>,
    );
  }
  return (
    <g>
      {cells}
      <path d={`M${x} ${y + h + 2}H${x + w}`} stroke={WINE} strokeWidth="1" />
    </g>
  );
}

/** The inner card's decoration, 400 x 540. Text is laid over it separately. */
export function CardFrame({ id = 'card-art' }) {
  return (
    <svg id={id} className="gf-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 540" aria-hidden="true">
      <rect width="400" height="540" fill={CREAM} />
      <rect x="12" y="12" width="376" height="516" fill="none" stroke={WINE} strokeWidth="1.4" />
      <rect x="16.5" y="16.5" width="367" height="507" fill="none" stroke={WINE} strokeWidth=".5" opacity=".6" />
      <Band x={18} y={18} w={364} />
      <Palm x={8} y={30} s={0.82} dates />
      <Leaf x={30} y={128} a={-30} s={0.8} />
      <Palm x={292} y={30} s={0.82} flip tint="#9aa35a" />
      <Pomegranate x={350} y={112} s={0.78} />
      <Leaf x={322} y={104} a={200} s={0.7} fill={LEAF_DARK} />
      <Fan x={24} y={522} s={0.95} from={-110} to={10} />
      <Leaf x={70} y={514} a={-150} s={0.9} />
      <Leaf x={48} y={492} a={-110} s={0.8} fill={LEAF_DARK} />
      <path d="M362 522C350 500 340 476 336 452" stroke={LEAF_DARK} strokeWidth="2" fill="none" />
      <path d="M352 500C342 486 332 478 320 474" stroke={LEAF_DARK} strokeWidth="1.6" fill="none" />
      <Ginkgo x={336} y={452} s={1.05} a={-12} />
      <Ginkgo x={320} y={474} s={0.8} a={-48} />
      <Leaf x={360} y={500} a={-70} s={0.9} />
      <Diamond x={200} y={62} s={0.9} />
      <Diamond x={200} y={500} s={0.9} />
    </svg>
  );
}

/** Oval seal: palm tree over two pomegranates. */
export function SealArt() {
  return (
    <svg className="gf-sealart" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 154" aria-hidden="true">
      <ellipse cx="60" cy="77" rx="57" ry="74" fill={CREAM} stroke={WINE} strokeWidth="2.4" />
      <ellipse cx="60" cy="77" rx="51" ry="68" fill="none" stroke={WINE} strokeWidth=".9" />
      <Palm x={25} y={14} s={0.7} />
      <Leaf x={36} y={112} a={200} s={0.8} />
      <Leaf x={84} y={112} a={-20} s={0.8} />
      <Pomegranate x={50} y={112} s={0.62} />
      <Pomegranate x={70} y={114} s={0.58} open />
      <circle cx="33" cy="88" r="3.5" fill={PINK} />
      <circle cx="87" cy="88" r="3.5" fill={PINK} />
      <Diamond x={60} y={138} s={0.55} />
    </svg>
  );
}

/** Column of small diamonds for the envelope's sides. */
export function DiamondColumn() {
  return (
    <svg className="gf-dcol" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {Array.from({ length: 13 }, (_, i) => (i % 2 ? <circle key={i} cx="10" cy={15 + i * 30} r="1.6" fill={WINE} /> : <Diamond key={i} x={10} y={15 + i * 30} s={0.6} />))}
    </svg>
  );
}
