export function QRPlaceholder({
  size = 176,
  dark = "#1C1B17",
  light = "#FFFFFF",
}: {
  size?: number;
  dark?: string;
  light?: string;
}) {
  const modules = 21;
  const cell = size / modules;
  const isFinderZone = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= modules - 7) || (r >= modules - 7 && c < 7);
  const finderFilled = (r: number, c: number) =>
    r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
  const cells: [number, number][] = [];
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      let filled: boolean;
      if (isFinderZone(r, c)) {
        const corner = r < 7 && c < 7 ? [r, c] : r < 7 ? [r, c - (modules - 7)] : [r - (modules - 7), c];
        filled = finderFilled(corner[0], corner[1]);
      } else {
        filled = (r * 13 + c * 7 + r * c) % 7 < 3;
      }
      if (filled) cells.push([r, c]);
    }
  }
  return (
    <div className="inline-block p-3" style={{ background: light, borderRadius: 8, border: `1px solid #E4DDC9` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill={light} />
        {cells.map(([r, c], i) => (
          <rect key={i} x={c * cell} y={r * cell} width={cell} height={cell} fill={dark} />
        ))}
      </svg>
    </div>
  );
}
