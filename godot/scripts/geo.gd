class_name Geo
## Map geometry shared by logic and rendering.
## Logic works in "px" (0..2000); 3D: X = (x-MC)*K, Z = (y-MC)*K.

const K := 0.1
const MW := 2000.0
const MC := 1000.0
const R_PLAY := 975.0
const KR := 650.0
const SEA_R := 300.0
const G0 := -320.0
const GSPAN := 2640.0
const GN := 330
const GC := GSPAN / GN

static var KPOS: Array = []
static var HG := PackedFloat32Array()
static var ready := false

static func init() -> void:
	if ready:
		return
	KPOS.clear()
	for i in 5:
		var a := i * TAU / 5.0
		KPOS.append(Vector2(MC + sin(a) * KR, MC + cos(a) * KR))
	var f := FileAccess.open("res://data/heights.bin", FileAccess.READ)
	HG = f.get_buffer(f.get_length()).to_float32_array()
	ready = true

static func x3(x: float) -> float:
	return (x - MC) * K

static func z3(y: float) -> float:
	return (y - MC) * K

static func p3(x: float, y: float, h := 0.0) -> Vector3:
	return Vector3((x - MC) * K, h, (y - MC) * K)

static func seg_dist(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
	var vx := bx - ax
	var vy := by - ay
	var t := clampf(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy), 0.0, 1.0)
	return Vector2(px - ax - vx * t, py - ay - vy * t).length()

static func gy(px: float, py: float) -> float:
	var fx := (px - G0) / GC
	var fy := (py - G0) / GC
	var i := clampi(int(floor(fx)), 0, GN - 1)
	var j := clampi(int(floor(fy)), 0, GN - 1)
	var tx := clampf(fx - i, 0.0, 1.0)
	var ty := clampf(fy - j, 0.0, 1.0)
	var W := GN + 1
	var a := HG[j * W + i]
	var b := HG[j * W + i + 1]
	var c := HG[(j + 1) * W + i]
	var d := HG[(j + 1) * W + i + 1]
	return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty

static func ground_y(px: float, py: float) -> float:
	return maxf(-0.05, gy(px, py))

static func blocked(px: float, py: float) -> bool:
	var dc := Vector2(px - MC, py - MC).length()
	return dc < SEA_R + 18.0 or gy(px, py) > 2.1

## Waypoint to go around the inland sea, or Vector2.INF when the path is clear.
static func steer(x: float, y: float, tx: float, ty: float) -> Vector2:
	var lim := SEA_R + 70.0
	var dcu := Vector2(x - MC, y - MC).length()
	if seg_dist(MC, MC, x, y, tx, ty) > lim or dcu < lim - 30.0:
		return Vector2.INF
	var au := atan2(y - MC, x - MC)
	var at := atan2(ty - MC, tx - MC)
	var d := wrapf(at - au, -PI, PI)
	var s := 1.0 if d >= 0.0 else -1.0
	var step := s * minf(absf(d), 0.45)
	var r := maxf(dcu, 440.0)
	return Vector2(MC + cos(au + step) * r, MC + sin(au + step) * r)

## Distances used for scenery placement.
static func fields(px: float, py: float) -> Vector3:
	var dc := Vector2(px - MC, py - MC).length()
	var near := 1e9
	var road := 1e9
	for k in KPOS:
		near = minf(near, Vector2(px - k.x, py - k.y).length())
		road = minf(road, seg_dist(px, py, k.x, k.y, MC, MC))
	road = minf(road, absf(dc - 470.0))
	return Vector3(dc, near, road)

static func smooth(a: float, b: float, x: float) -> float:
	var t := clampf((x - a) / (b - a), 0.0, 1.0)
	return t * t * (3.0 - 2.0 * t)
