// Decorative city skyline of office towers and apartment buildings, drawn as SVG.
const BUILDINGS = [
  { x: 0, w: 90, h: 210 }, { x: 80, w: 70, h: 320 }, { x: 140, w: 110, h: 250 },
  { x: 240, w: 60, h: 400, spire: true }, { x: 290, w: 120, h: 290 }, { x: 400, w: 80, h: 360 },
  { x: 470, w: 140, h: 220 }, { x: 600, w: 70, h: 450, spire: true }, { x: 660, w: 120, h: 300 },
  { x: 770, w: 90, h: 380 }, { x: 850, w: 150, h: 240 }, { x: 990, w: 80, h: 340 },
  { x: 1060, w: 110, h: 270 }, { x: 1160, w: 70, h: 420, spire: true }, { x: 1220, w: 130, h: 230 },
  { x: 1340, w: 100, h: 330 }, { x: 1430, w: 170, h: 260 },
]

function windows(b) {
  const out = []
  const top = 500 - b.h + 18
  for (let y = top; y < 480; y += 22) {
    for (let x = b.x + 12; x < b.x + b.w - 14; x += 18) {
      // Light up a deterministic scattering of windows.
      const lit = (x * 7 + y * 13) % 5 === 0
      out.push(<rect key={`${x}-${y}`} x={x} y={y} width="8" height="12" className={lit ? 'win lit' : 'win'} />)
    }
  }
  return out
}

export default function Skyline() {
  return (
    <div className="skyline" aria-hidden="true">
      <svg viewBox="0 0 1600 500" preserveAspectRatio="xMidYMax slice">
        <g className="back">
          {BUILDINGS.map((b, i) => (
            <rect key={i} x={b.x + 30} y={500 - b.h * 0.75} width={b.w} height={b.h} />
          ))}
        </g>
        <g className="front">
          {BUILDINGS.map((b, i) => (
            <g key={i}>
              <rect x={b.x} y={500 - b.h} width={b.w} height={b.h} />
              {b.spire && <rect x={b.x + b.w / 2 - 2} y={500 - b.h - 40} width="4" height="40" />}
              {windows(b)}
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}
