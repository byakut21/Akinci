extends Node3D
## Akıncı: Krallıklar Çağı — Godot port of the v3.0 web game.
## Logic in px (0..2000); 3D via Geo.p3().

const PI2 := TAU

# ================================================================ ENTITIES
class Unit:
	var kind := "u"
	var k: Kingdom
	var role := ""
	var T: Dictionary
	var x := 0.0
	var y := 0.0
	var px := INF
	var py := INF
	var hp := 1.0
	var maxhp := 1.0
	var dmg := 0.0
	var range := 0.0
	var cd_max := 1.0
	var cd := 0.0
	var spd := 1.0
	var r := 8.0
	var state := ""
	var rot := 0.0
	var hit := 0.0
	var atk_t := 0.0
	var moving := false
	var dying := 0.0
	var pending_t := -1.0
	var pending_tgt = null
	var tgt = null
	var tgt_t := 0.0
	var vis := true
	var job := ""
	var vs := ""
	var spot := Vector2.INF
	var work_t := 0.0
	var carry := ""
	var farm: Bld = null
	var slot := Vector2.INF
	var slot0 := Vector2.INF
	var goal_k: Kingdom = null
	var removed := false
	var last_hit_by: Kingdom = null
	var id := 0
	var gy := 0.0
	# render
	var node: Node3D
	var body: Node3D
	var ap: AnimationPlayer
	var ap_low: AnimationPlayer
	var horse: Node3D
	var horse_ap: AnimationPlayer
	var cur_anim := ""
	var horse_anim := ""
	var bob := 0.0
	var aiming := false

class Bld:
	var kind := "b"
	var k: Kingdom
	var type := ""
	var x := 0.0
	var y := 0.0
	var r := 20.0
	var hp := 1.0
	var maxhp := 1.0
	var dmg := 0.0
	var range := 0.0
	var cd_max := 1.0
	var cd := 1.0
	var hit := 0.0
	var build_t := 0.0
	var walk := false
	var workers := 0
	var last_hit_by: Kingdom = null
	var node: Node3D
	var model: Node3D
	var banner: Node3D
	var scaf: Node3D
	var age_built := -1

class Kingdom:
	var i := 0
	var civ: Dictionary
	var civ_i := 0
	var is_player := false
	var alive := true
	var age := 0
	var age_t := 0.0
	var x := 0.0
	var y := 0.0
	var fx := 0.0
	var fy := 0.0
	var sx := 0.0
	var sy := 0.0
	var res := { "f": 200.0, "s": 150.0, "g": 50.0 }
	var units: Array = []
	var blds: Array = []
	var upg := 1.0
	var upg_lv := 0
	var ai_t := 1.0
	var attack_t := 0.0
	var waves := 0
	var mult := 1.0
	var power := 0.0
	var castle: Bld
	var mine: Bld
	var quarry: Bld
	var farm_slot := 1
	var house_slot := 0
	var tower_slot := 0
	var fallen_by: Kingdom = null
	var deco: Array = []
	var rally_n := 0
	var threat = null
	var threat_t := 0.0

class Pad:
	var id := ""
	var f := 0.0
	var s := 0.0
	var x := 0.0
	var y := 0.0
	var w := 64.0
	var h := 56.0
	var label := ""
	var icon := ""
	var unit := ""
	var job := ""
	var build := ""
	var needs := ""
	var cmd := ""
	var is_age := false
	var is_upg := false
	var cost := {}
	var paid := { "f": 0, "s": 0, "g": 0 }
	var done := false
	var bld: Bld = null
	var hold := 0.0
	var key := ""
	var node: Node3D
	var mat: ShaderMaterial
	var lbl: Label3D
	var sub: Label3D
	var icon_spr: Sprite3D
	var cost_lbls: Array = []
	var cost_icons: Array = []

class Pool:
	var mmi: MultiMeshInstance3D
	var mm: MultiMesh
	var n := 0
	var cap := 0
	var colors := true
	func _init(parent: Node, mesh: Mesh, mat: Material, cap_: int, shadow := false, use_colors := true) -> void:
		cap = cap_
		colors = use_colors
		mm = MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.use_colors = use_colors
		mm.mesh = mesh
		mm.instance_count = cap
		mm.visible_instance_count = 0
		mmi = MultiMeshInstance3D.new()
		mmi.multimesh = mm
		if mat != null:
			mmi.material_override = mat
		mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		mmi.custom_aabb = AABB(Vector3(-160, -30, -160), Vector3(320, 120, 320))
		parent.add_child(mmi)
	func begin() -> void:
		n = 0
	func add(xf: Transform3D, c := Color.WHITE) -> void:
		if n >= cap:
			return
		mm.set_instance_transform(n, xf)
		if colors:
			mm.set_instance_color(n, c)
		n += 1
	func end() -> void:
		mm.visible_instance_count = n

# ================================================================ STATE
var world: World
var cam: Camera3D
var audio: GameAudio
var hud: Hud
var G: Dictionary = {}
var running := false
var best := 1
var chosen_civ := 0
var cam_target := Vector3.ZERO
var cam_dist := 70.0
var CAMDIR := Vector3(0, 0.76, 0.65).normalized()
var CAMP := Vector2(1000, 1000)
var zoom := 1.0
var P := {}
var uid := 0
var rng := RandomNumberGenerator.new()
var lib_full: AnimationLibrary
var lib_upper: AnimationLibrary
var lib_lower: AnimationLibrary
var _mat_cache := {}
var joy := Vector2.ZERO
var keys := {}
var floats: Array = []
var _float_pool: Array[Label3D] = []
var hero_ring: MeshInstance3D

const LOWER_RE := "hips|leg|foot|toe|knee|heel|control|IK-|^root$"

func _ready() -> void:
	rng.seed = 7
	_load_save()
	world = World.new()
	add_child(world)
	world.build()
	cam = Camera3D.new()
	cam.fov = 38.0
	cam.near = 1.0
	cam.far = 400.0
	add_child(cam)
	cam.current = true
	audio = GameAudio.new()
	add_child(audio)
	var cf := ConfigFile.new()
	if cf.load("user://akinci.cfg") == OK:
		audio.music_on = bool(cf.get_value("g", "music", true))
		audio.sfx_on = bool(cf.get_value("g", "sfx", true))
	_build_anim_libs()
	_make_pools()
	hud = Hud.new()
	hud.game = self
	add_child(hud)
	get_viewport().size_changed.connect(_resize)
	_resize()
	new_game(best, chosen_civ)
	hud.show_menu()

func _resize() -> void:
	var vs := get_viewport().get_visible_rect().size
	var aspect := vs.x / maxf(vs.y, 1.0)
	var tn := tan(deg_to_rad(cam.fov / 2.0))
	cam_dist = maxf(30.0 / (2.0 * tn * aspect), 50.0)
	world.sun.directional_shadow_max_distance = cam_dist * 1.7
	world.env.fog_depth_begin = cam_dist * 1.25
	world.env.fog_depth_end = cam_dist * 3.0
	cam.far = cam_dist * 3.6

# ================================================================ SAVE
func _load_save() -> void:
	var cf := ConfigFile.new()
	if cf.load("user://akinci.cfg") == OK:
		best = maxi(1, int(cf.get_value("g", "best", 1)))
		chosen_civ = clampi(int(cf.get_value("g", "civ", 0)), 0, Data.CIVS.size() - 1)

func save_prefs() -> void:
	var cf := ConfigFile.new()
	cf.set_value("g", "best", best)
	cf.set_value("g", "civ", chosen_civ)
	cf.set_value("g", "music", audio.music_on)
	cf.set_value("g", "sfx", audio.sfx_on)
	cf.save("user://akinci.cfg")

# ================================================================ ANIMATION LIBRARIES
func _build_anim_libs() -> void:
	var kn: Node = Assets.scene("res://assets/chars/knight.glb").instantiate()
	var ap: AnimationPlayer = kn.find_children("*", "AnimationPlayer", true, false)[0]
	lib_full = ap.get_animation_library("").duplicate(true)
	kn.free()
	var re := RegEx.new()
	re.compile(LOWER_RE)
	lib_upper = AnimationLibrary.new()
	lib_lower = AnimationLibrary.new()
	for nm in lib_full.get_animation_list():
		var a: Animation = lib_full.get_animation(nm)
		if nm in ["Idle", "Running_A", "Walking_A", "Walking_B", "2H_Melee_Idle", "Sit_Chair_Pose", "1H_Ranged_Aiming"]:
			a.loop_mode = Animation.LOOP_LINEAR
		var up: Animation = a.duplicate(true)
		for t in range(up.get_track_count() - 1, -1, -1):
			var bone := String(up.track_get_path(t).get_concatenated_subnames())
			if re.search(bone) != null:
				up.remove_track(t)
		lib_upper.add_animation(nm, up)
		if nm == "Sit_Chair_Pose":
			var lo: Animation = a.duplicate(true)
			for t in range(lo.get_track_count() - 1, -1, -1):
				var bone := String(lo.track_get_path(t).get_concatenated_subnames())
				if re.search(bone) == null:
					lo.remove_track(t)
			lo.loop_mode = Animation.LOOP_LINEAR
			lib_lower.add_animation(nm, lo)

# ================================================================ POOLS
func _unshaded(c := Color.WHITE, alpha := false, no_depth := false, billboard := false) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.vertex_color_use_as_albedo = true
	m.albedo_color = c
	if alpha:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	if no_depth:
		m.no_depth_test = true
		m.render_priority = 10
	if billboard:
		m.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
		m.billboard_keep_scale = true
	return m

func _long_z(mesh: Mesh, size: float) -> Mesh:
	var a := mesh.get_aabb()
	var e := a.size
	var basis := Basis.IDENTITY
	if e.x >= e.y and e.x >= e.z:
		basis = Basis(Vector3.UP, PI / 2.0)
	elif e.y >= e.x and e.y >= e.z:
		basis = Basis(Vector3.RIGHT, PI / 2.0)
	var mx := maxf(e.x, maxf(e.y, e.z))
	var xf := Transform3D(basis.scaled(Vector3.ONE * (size / mx)), Vector3.ZERO) * Transform3D(Basis.IDENTITY, -a.get_center())
	var st := SurfaceTool.new()
	var out := ArrayMesh.new()
	for s in mesh.get_surface_count():
		st.clear()
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		st.append_from(mesh, s, xf)
		st.set_material(mesh.surface_get_material(s))
		st.commit(out)
	return out

func _make_pools() -> void:
	var coin_mesh := Assets.mesh("res://assets/chars/dungeon.glb", 0.8, false, "coin")
	var coin_mat := StandardMaterial3D.new()
	coin_mat.albedo_color = Color(1.0, 0.78, 0.25)
	coin_mat.metallic = 0.8
	coin_mat.roughness = 0.3
	coin_mat.emission_enabled = true
	coin_mat.emission = Color(0.35, 0.22, 0.0)
	var arrow_mesh := _long_z(Assets.mesh("res://assets/chars/adv_weapons.glb", 1.0, false, "arrow"), 1.5)
	var box := BoxMesh.new()
	box.size = Vector3.ONE * 0.42
	var carry_mat := StandardMaterial3D.new()
	carry_mat.vertex_color_use_as_albedo = true
	carry_mat.roughness = 0.7
	var spark := BoxMesh.new()
	spark.size = Vector3.ONE * 0.16
	var smoke := SphereMesh.new()
	smoke.radius = 0.6
	smoke.height = 1.2
	smoke.radial_segments = 8
	smoke.rings = 4
	var smoke_mat := StandardMaterial3D.new()
	smoke_mat.vertex_color_use_as_albedo = true
	smoke_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	smoke_mat.albedo_color = Color(0.92, 0.92, 0.92, 1)
	smoke_mat.roughness = 1.0
	var disc := PlaneMesh.new()
	disc.size = Vector2(1.9, 1.9)
	var disc_mat := ShaderMaterial.new()
	disc_mat.shader = load("res://shaders/ring.gdshader")
	var bar := QuadMesh.new()
	bar.size = Vector2(1, 0.22)
	P = {
		"coin": Pool.new(self, coin_mesh, coin_mat, 400, true, false),
		"carry": Pool.new(self, box, carry_mat, 260),
		"arrow": Pool.new(self, arrow_mesh, null, 300, false, false),
		"spark": Pool.new(self, spark, _unshaded(), 600),
		"smoke": Pool.new(self, smoke, smoke_mat, 360),
		"disc": Pool.new(self, disc, disc_mat, 400),
		"barBg": Pool.new(self, bar, _unshaded(Color(0, 0, 0, 0.55), true, true, true), 300),
		"barFg": Pool.new(self, bar, _unshaded(Color.WHITE, false, true, true), 300),
	}
	(P.barFg.mmi.material_override as StandardMaterial3D).render_priority = 11
	var rm := TorusMesh.new()
	rm.inner_radius = 1.7
	rm.outer_radius = 2.05
	rm.rings = 48
	rm.ring_segments = 4
	hero_ring = MeshInstance3D.new()
	hero_ring.mesh = rm
	hero_ring.scale = Vector3(1, 0.05, 1)
	var hm := _unshaded(Color(1.0, 0.89, 0.48, 0.8), true)
	hm.vertex_color_use_as_albedo = false
	hero_ring.material_override = hm
	hero_ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(hero_ring)

# ================================================================ HELPERS
func k_local(k: Kingdom, f: float, s: float) -> Vector2:
	return Vector2(k.x + k.fx * f + k.sx * s, k.y + k.fy * f + k.sy * s)

func cost_of(k: Kingdom, base: Dictionary, kind: String) -> Dictionary:
	var c := {}
	var mod: Dictionary = k.civ.mod
	for r in base:
		var v: float = base[r]
		if kind == "bld" and r == "s" and mod.has("bldCost"):
			v *= mod.bldCost
		if kind == "horse" and mod.has("horseCost"):
			v *= mod.horseCost
		if kind == "foot" and mod.has("footCost"):
			v *= mod.footCost
		c[r] = int(round(v))
	return c

func can_afford(k: Kingdom, c: Dictionary) -> bool:
	return k.res.f >= c.get("f", 0) and k.res.s >= c.get("s", 0) and k.res.g >= c.get("g", 0)

func spend(k: Kingdom, c: Dictionary) -> void:
	for r in c:
		k.res[r] -= c[r]

func unit_cost(k: Kingdom, role: String) -> Dictionary:
	var T: Dictionary = Data.UT[role]
	var kind := "horse" if T.get("horse", false) else ("foot" if role == "piyade" or role == "baltaci" else "")
	return cost_of(k, T.cost, kind)

func alive(o) -> bool:
	return o != null and o.hp > 0.0 and (o.kind == "b" or o.dying <= 0.0)

func dist(a, b) -> float:
	return Vector2(a.x - b.x, a.y - b.y).length()

func near_cam(x: float, y: float) -> bool:
	return absf(x - CAMP.x) < 200.0 and y - CAMP.y > -420.0 and y - CAMP.y < 260.0

func pop_of(k: Kingdom) -> int:
	var n := 0
	for u in k.units:
		if u.hp > 0.0 and u.dying <= 0.0 and u.role != "hero":
			n += int(u.T.pop)
	return n

func pop_cap(k: Kingdom) -> int:
	var h := 0
	for b in k.blds:
		if b.type == "house" and b.build_t <= 0.0 and b.hp > 0.0:
			h += 1
	return mini(60, 8 + 6 * h)

func farm_cap(k: Kingdom) -> int:
	var n := 0
	for b in k.blds:
		if b.type == "farm" and b.hp > 0.0:
			n += 1
	return n * 3

func job_count(k: Kingdom, j: String) -> int:
	var n := 0
	for u in k.units:
		if u.role == "koylu" and u.hp > 0.0 and u.dying <= 0.0 and u.job == j:
			n += 1
	return n

func army_of(k: Kingdom) -> Array:
	var out := []
	for u in k.units:
		if u.role != "koylu" and u.role != "hero" and u.hp > 0.0 and u.dying <= 0.0:
			out.append(u)
	return out

func villagers(k: Kingdom) -> int:
	var n := 0
	for u in k.units:
		if u.role == "koylu" and alive(u):
			n += 1
	return n

func has_bld(k: Kingdom, t: String) -> bool:
	for b in k.blds:
		if b.type == t and b.hp > 0.0 and b.build_t <= 0.0:
			return true
	return false

func count_bld(k: Kingdom, t: String) -> int:
	var n := 0
	for b in k.blds:
		if b.type == t and b.hp > 0.0 and b.build_t <= 0.0:
			n += 1
	return n

func civ_color(k: Kingdom) -> Color:
	return k.civ.color

func sfx(name: String, vol := 1.0) -> void:
	audio.play(name, vol)

func msg(text: String, color := Color.WHITE) -> void:
	G.msgs.append({ "text": text, "color": color, "t": 0.0 })
	if G.msgs.size() > 4:
		G.msgs.pop_front()

func float_text(x: float, y: float, z: float, txt: String, c := Color.WHITE, size := 16.0) -> void:
	floats.append({ "x": x, "y": y, "z": z, "txt": txt, "c": c, "t": 0.0, "size": size })

# ================================================================ MATERIALS
func _tinted_mats(root: Node, key: String, tint: Color, amt: float) -> void:
	for m in root.find_children("*", "MeshInstance3D", true, false):
		var mi := m as MeshInstance3D
		for s in mi.mesh.get_surface_count():
			var src := mi.get_active_material(s)
			if src == null:
				continue
			var ck := "%s|%s|%d" % [key, src.get_instance_id(), int(amt * 100)]
			if not _mat_cache.has(ck):
				var d: Material = src.duplicate()
				if d is BaseMaterial3D:
					var bm := d as BaseMaterial3D
					bm.albedo_color = Color.WHITE.lerp(tint, amt)
					bm.roughness = maxf(bm.roughness, 0.7)
					bm.metallic = minf(bm.metallic, 0.2)
				_mat_cache[ck] = d
			mi.set_surface_override_material(s, _mat_cache[ck])

## Quaternius building materials: matte, and the "Main" accent in civ colour.
func _bld_mats(root: Node, civ_i: int) -> void:
	var col: Color = Data.CIVS[civ_i].color
	for m in root.find_children("*", "MeshInstance3D", true, false):
		var mi := m as MeshInstance3D
		for s in mi.mesh.get_surface_count():
			var src := mi.get_active_material(s)
			if src == null:
				continue
			var ck := "b|%d|%d" % [civ_i, src.get_instance_id()]
			if not _mat_cache.has(ck):
				var d: Material = src.duplicate()
				if d is BaseMaterial3D:
					var bm := d as BaseMaterial3D
					bm.roughness = 0.82
					bm.metallic = 0.0
					var nm := src.resource_name
					if nm == "Main" or nm.begins_with("Main") or nm == "Red":
						bm.albedo_color = col
					elif nm == "Gold":
						bm.metallic = 0.6
						bm.roughness = 0.35
				_mat_cache[ck] = d
			mi.set_surface_override_material(s, _mat_cache[ck])

# ================================================================ UNITS
func make_unit(k: Kingdom, role: String, x: float, y: float, state: String) -> Unit:
	var base: Dictionary = Data.UT[role]
	var T: Dictionary = base.duplicate()
	if role == k.civ.uniq and role != "hero" and k.age >= 2:
		var uq: Dictionary = Data.UNIQ[k.civ.id]
		for s in ["hp", "dmg", "range", "spd"]:
			if uq.has(s):
				T[s] = base[s] * uq[s]
		T["name"] = k.civ.uname
		T["uniq"] = true
	var up := 1.0 if role == "koylu" or role == "hero" else k.upg
	var u := Unit.new()
	u.k = k
	u.role = role
	u.T = T
	u.x = x
	u.y = y
	u.hp = T.hp * up
	u.maxhp = u.hp
	u.dmg = T.dmg * up
	u.range = T.range
	u.cd_max = T.cd
	u.cd = randf() * T.cd
	u.spd = T.spd * (0.93 + randf() * 0.14)
	u.r = T.r
	u.state = state
	u.rot = atan2(k.fx, k.fy)
	u.id = uid
	uid += 1
	_build_unit_node(u)
	k.units.append(u)
	G.units.append(u)
	return u

func _build_unit_node(u: Unit) -> void:
	var k := u.k
	var role := u.role
	var model: String = k.civ.hero if role == "hero" else u.T.model
	var file := "knight" if model in ["heroT", "heroK", "knight"] else model
	var h: float = u.T.h
	u.node = Node3D.new()
	add_child(u.node)
	var body := Assets.model("res://assets/chars/%s.glb" % file, h, true)
	u.body = body
	var inst: Node3D = body.get_child(0)
	for old in inst.find_children("*", "AnimationPlayer", true, false):
		old.queue_free()
	var hide := []
	if model == "heroT":
		hide = ["1H_Sword", "Round_Shield", "Knight_Helmet"]
	elif model == "heroK":
		hide = ["1H_Sword", "Round_Shield"]
	for n in hide:
		var f := inst.find_child(n, true, false)
		if f:
			f.queue_free()
	var skel: Skeleton3D = inst.find_children("*", "Skeleton3D", true, false)[0]
	if model == "villager":
		_attach(skel, "handslot.r", _weapon("axe_1handed", 0.75))
	if role == "hero":
		var bow := _build_bow()
		_attach(skel, "handslot.l", bow)
		if model == "heroT":
			var tb := _build_turban(Color("#2e2e2e") if k.civ.id == "arap" else Color("#b3262e"))
			_attach(skel, "head", tb, Vector3(0, 0.74, 0))
	_tinted_mats(inst, "%s|%d" % [file, k.civ_i], k.civ.color, 0.12 if role == "koylu" else 0.22)
	u.ap = AnimationPlayer.new()
	inst.add_child(u.ap)
	u.ap.root_node = NodePath("..")
	if u.T.get("horse", false):
		u.ap.add_animation_library("", lib_upper)
		u.ap_low = AnimationPlayer.new()
		inst.add_child(u.ap_low)
		u.ap_low.root_node = NodePath("..")
		u.ap_low.add_animation_library("", lib_lower)
		u.ap_low.play("Sit_Chair_Pose")
		var hs := 1.25 if role == "hero" else 1.05
		u.horse = _make_horse(k, hs)
		u.node.add_child(u.horse)
		u.horse.add_child(body)
		body.position = Vector3(0, 2.05, 0.15)
		body.scale = Vector3.ONE / hs
		u.horse_ap = u.horse.find_children("*", "AnimationPlayer", true, false)[0]
	else:
		u.ap.add_animation_library("", lib_full)
		u.node.add_child(body)
	u.node.position = Geo.p3(u.x, u.y, Geo.ground_y(u.x, u.y))
	play(u, idle_anim(u))

func _weapon(name: String, size: float) -> Node3D:
	var mi := MeshInstance3D.new()
	mi.mesh = Assets.mesh("res://assets/chars/adv_weapons.glb", size, true, name)
	var w := Node3D.new()
	w.add_child(mi)
	mi.position.y = -size * 0.3
	return w

func _attach(skel: Skeleton3D, bone: String, obj: Node3D, off := Vector3.ZERO) -> void:
	var ba := BoneAttachment3D.new()
	ba.bone_name = bone
	skel.add_child(ba)
	ba.add_child(obj)
	obj.position = off

func _build_bow() -> Node3D:
	var g := Node3D.new()
	var wood := StandardMaterial3D.new()
	wood.albedo_color = Color("#5a3416")
	var gold := StandardMaterial3D.new()
	gold.albedo_color = Color("#e3a62c")
	gold.metallic = 0.6
	gold.roughness = 0.35
	var arc := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.57
	tm.outer_radius = 0.67
	tm.rings = 24
	tm.ring_segments = 6
	arc.mesh = tm
	arc.material_override = wood
	arc.rotation_degrees = Vector3(90, 0, 0)
	arc.scale = Vector3(0.6, 1, 1)
	g.add_child(arc)
	g.rotation_degrees = Vector3(0, 90, 0)
	return g

func _build_turban(plume: Color) -> Node3D:
	var g := Node3D.new()
	var white := StandardMaterial3D.new()
	white.albedo_color = Color("#f7f3ea")
	white.roughness = 0.75
	var gold := StandardMaterial3D.new()
	gold.albedo_color = Color("#e3a62c")
	gold.metallic = 0.5
	gold.roughness = 0.35
	var pm := StandardMaterial3D.new()
	pm.albedo_color = plume
	var m := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.5
	sm.height = 0.72
	m.mesh = sm
	m.material_override = white
	g.add_child(m)
	var band := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.42
	tm.outer_radius = 0.56
	band.mesh = tm
	band.material_override = gold
	band.position.y = -0.1
	g.add_child(band)
	var pl := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.0
	cm.bottom_radius = 0.08
	cm.height = 0.6
	pl.mesh = cm
	pl.material_override = pm
	pl.position = Vector3(0, 0.45, 0.16)
	pl.rotation.x = -0.25
	g.add_child(pl)
	return g

var _horse_cloth := {}
func _make_horse(k: Kingdom, hs: float) -> Node3D:
	var hw := Assets.model("res://assets/animals/Horse.glb", 2.55 * hs, true)
	var inst: Node3D = hw.get_child(0)
	var ap: AnimationPlayer = inst.find_children("*", "AnimationPlayer", true, false)[0]
	for a in ["AnimalArmature|Gallop", "AnimalArmature|Walk", "AnimalArmature|Idle"]:
		if ap.has_animation(a):
			ap.get_animation(a).loop_mode = Animation.LOOP_LINEAR
	ap.play("AnimalArmature|Idle")
	# saddle cloth in civ colour
	if not _horse_cloth.has(k.civ_i):
		var m := StandardMaterial3D.new()
		m.albedo_color = k.civ.color
		m.roughness = 0.8
		_horse_cloth[k.civ_i] = m
	var cl := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(1.05, 0.06, 1.1)
	cl.mesh = bm
	cl.material_override = _horse_cloth[k.civ_i]
	cl.position = Vector3(0, 1.62, 0.1)
	hw.add_child(cl)
	for sx in [-1.0, 1.0]:
		var side := MeshInstance3D.new()
		var sb := BoxMesh.new()
		sb.size = Vector3(0.05, 0.5, 1.1)
		side.mesh = sb
		side.material_override = _horse_cloth[k.civ_i]
		side.position = Vector3(sx * 0.52, 1.4, 0.1)
		hw.add_child(side)
	hw.scale = Vector3.ONE
	return hw

func idle_anim(u: Unit) -> String:
	if u.T.get("horse", false):
		return "Idle"
	return u.T.get("idle", "Idle")

func run_anim(u: Unit) -> String:
	if u.T.get("horse", false):
		return "Idle"
	return "Walking_B" if u.role == "koylu" and u.carry != "" else "Running_A"

func play(u: Unit, name: String, once := false, ts := 1.0, fade := 0.15) -> float:
	if not once and u.cur_anim == name:
		return 0.0
	if not u.ap.has_animation(name):
		return 0.0
	if once and u.cur_anim == name:
		u.ap.seek(0.0, true)
	u.ap.play(name, fade, ts)
	u.cur_anim = name
	return u.ap.get_animation(name).length / ts

# ================================================================ BUILDINGS
func add_bld(k: Kingdom, type: String, x: float, y: float, instant := true) -> Bld:
	var B: Dictionary = Data.BT[type]
	var o := Bld.new()
	o.k = k
	o.type = type
	o.x = x
	o.y = y
	o.r = B.r
	o.hp = B.hp
	o.maxhp = B.hp
	o.dmg = B.get("dmg", 0.0) * (k.civ.mod.towerDmg if type == "tower" and k.civ.mod.has("towerDmg") else 1.0)
	o.range = B.get("range", 0.0)
	o.cd_max = B.get("cd", 1.0)
	o.build_t = 0.0 if instant else 3.0
	o.walk = B.get("walk", false)
	o.node = Node3D.new()
	add_child(o.node)
	o.node.position = Geo.p3(x, y, Geo.ground_y(x, y))
	o.node.rotation.y = atan2(k.fx, k.fy)
	if not instant:
		var sc := Assets.model("res://assets/rts/Crate_Big_Stack2.glb", B.w * 0.55)
		o.node.add_child(sc)
		o.scaf = sc
	else:
		finish_bld(o)
	k.blds.append(o)
	G.blds.append(o)
	return o

func finish_bld(o: Bld) -> void:
	var B: Dictionary = Data.BT[o.type]
	var k := o.k
	if o.scaf:
		o.scaf.queue_free()
		o.scaf = null
	var age := clampi(k.age, 0, 2)
	if o.age_built == age and o.model != null:
		return
	o.age_built = age
	var m: Node3D
	match o.type:
		"quarry":
			m = Node3D.new()
			var a := Assets.model("res://assets/rts/Resource_Rock_3.glb", 5.2)
			a.position = Vector3(-0.4, 0, -0.8)
			m.add_child(a)
			var b := Assets.model("res://assets/rts/Resource_Rock_1.glb", 2.6)
			b.position = Vector3(1.8, 0, 1.4)
			m.add_child(b)
			var c := Assets.model("res://assets/rts/Resource_Rock_2.glb", 2.0)
			c.position = Vector3(-2.0, 0, 1.6)
			m.add_child(c)
			for mi in m.find_children("*", "MeshInstance3D", true, false):
				(mi as MeshInstance3D).material_override = world.rock_material()
		"mine":
			m = Node3D.new()
			var a := Assets.model("res://assets/rts/Mine.glb", B.w)
			m.add_child(a)
			var g := Assets.model("res://assets/rts/Resource_Gold_2.glb", 2.2)
			g.position = Vector3(2.4, 0, 2.2)
			m.add_child(g)
		_:
			var key: String = o.type
			if o.type == "house" and (int(o.x * 7 + o.y * 3) % 2 == 0):
				key = "house_b"
			var w: float = B.w
			if o.type == "castle":
				w = [8.0, 8.6, 11.5][age]
			m = Assets.model("res://assets/rts/%s.glb" % Data.BMODEL[key][age], w)
	_bld_mats(m, k.civ_i)
	if o.type == "mine":
		_rockify(m)
	if o.type == "farm":
		Assets.set_shadow(m, false)
	if o.model:
		o.model.queue_free()
	o.model = m
	o.node.add_child(m)
	if (o.type == "castle" or o.type == "tower") and o.banner == null:
		var f := _banner(k, 2.6 if o.type == "castle" else 1.6)
		f.position = Vector3(0, 0, B.w * 0.5 + (1.4 if o.type == "castle" else 0.6))
		o.node.add_child(f)
		o.banner = f

var _banner_mats := {}
func _banner(k: Kingdom, size: float) -> Node3D:
	var mi := MeshInstance3D.new()
	mi.mesh = Assets.mesh("res://assets/chars/dungeon.glb", size, true, "banner_white")
	if not _banner_mats.has(k.civ_i):
		var src := mi.mesh.surface_get_material(0)
		var m: StandardMaterial3D = src.duplicate() if src is StandardMaterial3D else StandardMaterial3D.new()
		m.albedo_color = k.civ.color.lightened(0.1)
		m.roughness = 0.8
		_banner_mats[k.civ_i] = m
	for s in mi.mesh.get_surface_count():
		mi.set_surface_override_material(s, _banner_mats[k.civ_i])
	var n := Node3D.new()
	n.add_child(mi)
	return n

func _rockify(m: Node3D) -> void:
	for mi in m.find_children("*", "MeshInstance3D", true, false):
		var x := mi as MeshInstance3D
		for s in x.mesh.get_surface_count():
			var src := x.mesh.surface_get_material(s)
			if src != null and src.resource_name == "Stone":
				x.set_surface_override_material(s, world.rock_material())

func _town_deco(k: Kingdom) -> void:
	# market, storage and temple appear as the kingdom grows
	var list := []
	if k.age >= 1:
		list.append(["Market_FirstAge_Level2" if k.age == 1 else "Market_SecondAge_Level2", Data.SLOTS.deco1[0], 5.2])
		list.append(["Storage_FirstAge_Level2" if k.age == 1 else "Storage_SecondAge_Level1", Data.SLOTS.deco1[1], 4.6])
	if k.age >= 2:
		list.append(["Temple_SecondAge_Level1", Data.SLOTS.deco2[0], 5.0])
		list.append(["Houses_SecondAge_2_Level2", Data.SLOTS.deco2[1], 5.0])
	for d in k.deco:
		if d.get_meta("kind", "") == "town":
			d.queue_free()
	k.deco = k.deco.filter(func(d): return is_instance_valid(d) and d.get_meta("kind", "") != "town")
	for it in list:
		var p := k_local(k, it[1].x, it[1].y)
		var m := Assets.model("res://assets/rts/%s.glb" % it[0], it[2])
		_bld_mats(m, k.civ_i)
		m.position = Geo.p3(p.x, p.y, Geo.ground_y(p.x, p.y))
		m.rotation.y = atan2(k.fx, k.fy)
		m.set_meta("kind", "town")
		add_child(m)
		k.deco.append(m)

# ================================================================ KINGDOMS
func make_kingdom(i: int, civ_idx: int, is_player: bool) -> Kingdom:
	var pos: Vector2 = Geo.KPOS[i]
	var k := Kingdom.new()
	k.i = i
	k.civ = Data.CIVS[civ_idx]
	k.civ_i = civ_idx
	k.is_player = is_player
	k.x = pos.x
	k.y = pos.y
	k.fx = (Geo.MC - pos.x) / Geo.KR
	k.fy = (Geo.MC - pos.y) / Geo.KR
	k.sx = -k.fy
	k.sy = k.fx
	k.res = { "f": 200.0, "s": 150.0, "g": 50.0 }
	k.ai_t = 1.0 + randf()
	if not is_player:
		k.mult = 0.85 + 0.15 * G.level
		k.res.f += 40.0 * (G.level - 1)
	var p := k_local(k, 0, 0)
	k.castle = add_bld(k, "castle", p.x, p.y)
	p = k_local(k, Data.SLOTS.mine.x, Data.SLOTS.mine.y)
	k.mine = add_bld(k, "mine", p.x, p.y)
	p = k_local(k, Data.SLOTS.quarry.x, Data.SLOTS.quarry.y)
	k.quarry = add_bld(k, "quarry", p.x, p.y)
	p = k_local(k, Data.SLOTS.farm[0].x, Data.SLOTS.farm[0].y)
	add_bld(k, "farm", p.x, p.y)
	k.farm_slot = 1
	p = k_local(k, Data.SLOTS.windmill.x, Data.SLOTS.windmill.y)
	var wm := Assets.model("res://assets/rts/Windmill_FirstAge.glb", 5.0)
	_bld_mats(wm, civ_idx)
	wm.position = Geo.p3(p.x, p.y, Geo.ground_y(p.x, p.y))
	wm.rotation.y = atan2(k.fx, k.fy) + PI
	add_child(wm)
	k.deco = [wm]
	for job in ["food", "food", "gold", "stone"]:
		var v := make_unit(k, "koylu", k.castle.x + (randf() - 0.5) * 40.0, k.castle.y + (randf() - 0.5) * 40.0, "work")
		v.job = job
		v.vs = "toNode"
	return k

func start_age(k: Kingdom) -> bool:
	if k.age + 1 >= Data.AGES.size() or k.age_t > 0.0:
		return false
	k.age_t = Data.AGES[k.age + 1].time
	if k.is_player:
		msg("⏳ " + Data.AGES[k.age + 1].name + " için hazırlık başladı", Color("#ffe27a"))
	return true

func finish_age(k: Kingdom) -> void:
	k.age += 1
	k.age_t = 0.0
	var A: Dictionary = Data.AGES[k.age]
	k.castle.maxhp = Data.BT.castle.hp + 600.0 * k.age
	k.castle.hp = minf(k.castle.maxhp, k.castle.hp + 600.0)
	for b in k.blds:
		if b.hp > 0.0 and b.build_t <= 0.0 and b.type != "quarry" and b.type != "mine":
			finish_bld(b)
	_town_deco(k)
	smoke(k.castle.x, k.castle.y, 2.0, 16, 2.2)
	burst("spark", k.castle.x, k.castle.y, 3.0, Color("#ffd75e"), 26, 90.0)
	if k.is_player:
		sfx("conquer")
		msg("👑 " + A.name + "'na geçtin!", Color("#ffd75e"))
		story("feodal" if k.age == 1 else "kale")
	else:
		msg(k.civ.name + " " + A.name + "'na geçti", Color("#cfd6dd"))

# ================================================================ PADS
func pads_for(k: Kingdom) -> Array:
	var list := []
	var add := func(d: Dictionary) -> Pad:
		var p := Pad.new()
		for key in d:
			p.set(key, d[key])
		var q := k_local(k, p.f, p.s)
		p.x = q.x
		p.y = q.y
		list.append(p)
		return p
	var S: Dictionary = Data.SLOTS
	add.call({ "id": "v_gold", "f": S.mine.x, "s": S.mine.y + 60, "label": "ALTINCI", "icon": "koylu_g", "unit": "koylu", "job": "gold" })
	add.call({ "id": "v_stone", "f": S.quarry.x, "s": S.quarry.y - 60, "label": "TAŞÇI", "icon": "koylu_s", "unit": "koylu", "job": "stone" })
	add.call({ "id": "v_food", "f": -100, "s": 76, "label": "ÇİFTÇİ", "icon": "koylu_f", "unit": "koylu", "job": "food" })
	add.call({ "id": "age", "f": -100, "s": 0, "label": "ÇAĞ ATLA", "icon": "cag", "is_age": true, "w": 68 })
	add.call({ "id": "upg", "f": -100, "s": -76, "label": "TALİM", "icon": "upg", "is_upg": true })
	for i in S.farm.size():
		if i > 0:
			add.call({ "id": "farm%d" % i, "f": S.farm[i].x, "s": S.farm[i].y, "label": "TARLA", "icon": "tarla", "build": "farm", "w": 60 })
	for i in S.house.size():
		add.call({ "id": "house%d" % i, "f": S.house[i].x, "s": S.house[i].y, "label": "EV", "icon": "ev", "build": "house", "w": 50, "h": 48 })
	add.call({ "id": "barracks", "f": S.barracks.x, "s": S.barracks.y, "label": "KIŞLA", "icon": "kisla", "build": "barracks" })
	add.call({ "id": "archery", "f": S.archery.x, "s": S.archery.y, "label": "OKÇU MEYD.", "icon": "okcu", "build": "archery" })
	add.call({ "id": "stable", "f": S.stable.x, "s": S.stable.y, "label": "AHIR", "icon": "ahir", "build": "stable" })
	for i in S.tower.size():
		add.call({ "id": "tower%d" % i, "f": S.tower[i].x, "s": S.tower[i].y, "label": "KULE", "icon": "kule", "build": "tower" })
	var upos := func(sl: Vector2, i: int) -> Vector2:
		return Vector2(sl.x + (32 if i else -30), sl.y - signf(sl.y) * 62)
	var q: Vector2 = upos.call(S.barracks, 0)
	add.call({ "id": "u_piyade", "f": q.x, "s": q.y, "unit": "piyade", "icon": "piyade", "needs": "barracks" })
	q = upos.call(S.barracks, 1)
	add.call({ "id": "u_baltaci", "f": q.x, "s": q.y, "unit": "baltaci", "icon": "balta", "needs": "barracks" })
	q = upos.call(S.archery, 0)
	add.call({ "id": "u_okcu", "f": q.x + 30, "s": q.y, "unit": "okcu", "icon": "okcu", "needs": "archery" })
	q = upos.call(S.stable, 0)
	add.call({ "id": "u_suvari", "f": q.x, "s": q.y, "unit": "suvari", "icon": "suvari", "needs": "stable" })
	q = upos.call(S.stable, 1)
	add.call({ "id": "u_atliokcu", "f": q.x, "s": q.y, "unit": "atliokcu", "icon": "atliokcu", "needs": "stable" })
	add.call({ "id": "cmd_atk", "f": 300, "s": 0, "label": "HÜCUM!", "icon": "atk", "cmd": "charge", "w": 66, "h": 52 })
	add.call({ "id": "cmd_follow", "f": 300, "s": -78, "label": "SANCAĞA", "icon": "sancak", "cmd": "follow", "w": 62, "h": 52 })
	add.call({ "id": "cmd_def", "f": 300, "s": 78, "label": "SAVUN", "icon": "kalkan", "cmd": "rally", "w": 62, "h": 52 })
	for p in list:
		if p.unit != "":
			if p.label == "":
				p.label = k.civ.uname if p.unit == k.civ.uniq else Data.UT[p.unit].name.to_upper()
			p.cost = unit_cost(k, p.unit)
		elif p.build != "":
			p.cost = cost_of(k, Data.BT[p.build].cost, "bld")
		elif p.is_upg:
			p.cost = { "f": 60, "g": 60 }
		elif p.is_age:
			p.cost = Data.AGES[1].cost.duplicate()
		_make_pad_node(p, k)
	return list

var _pad_shader: Shader
var _font_bold: FontFile
func _font() -> Font:
	return hud.font_body

func _make_pad_node(p: Pad, k: Kingdom) -> void:
	if _pad_shader == null:
		_pad_shader = load("res://shaders/pad.gdshader")
	var n := Node3D.new()
	add_child(n)
	n.position = Geo.p3(p.x, p.y, Geo.ground_y(p.x, p.y) + 0.12)
	var base := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(p.w * Geo.K, p.h * Geo.K)
	base.mesh = pm
	p.mat = ShaderMaterial.new()
	p.mat.shader = _pad_shader
	p.mat.set_shader_parameter("aspect", p.w / p.h)
	p.mat.set_shader_parameter("dashed", p.build != "")
	p.mat.set_shader_parameter("bg", Color(0.45, 0.09, 0.11, 0.7) if p.cmd != "" else (Color(0.16, 0.12, 0.07, 0.62) if p.build != "" else Color(0.06, 0.09, 0.11, 0.62)))
	base.material_override = p.mat
	base.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	n.add_child(base)
	var ps := p.h * Geo.K
	p.icon_spr = Sprite3D.new()
	p.icon_spr.texture = load("res://assets/icons/%s_%s.png" % [p.icon, k.civ.id])
	p.icon_spr.pixel_size = ps * 0.42 / 192.0
	p.icon_spr.rotation_degrees.x = -90
	p.icon_spr.position = Vector3(0, 0.03, -ps * 0.2)
	p.icon_spr.shaded = false
	p.icon_spr.alpha_cut = SpriteBase3D.ALPHA_CUT_DISABLED
	p.icon_spr.render_priority = 2
	n.add_child(p.icon_spr)
	p.lbl = _label3d(ps * 0.13, Color.WHITE)
	p.lbl.position = Vector3(0, 0.05, ps * 0.13)
	n.add_child(p.lbl)
	p.sub = _label3d(ps * 0.1, Color.WHITE)
	p.sub.position = Vector3(0, 0.05, ps * 0.33)
	n.add_child(p.sub)
	for i in 3:
		var cl := _label3d(ps * 0.1, Color.WHITE)
		cl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		n.add_child(cl)
		p.cost_lbls.append(cl)
		var ci := Sprite3D.new()
		ci.pixel_size = ps * 0.12 / 96.0
		ci.rotation_degrees.x = -90
		ci.shaded = false
		ci.render_priority = 3
		ci.alpha_cut = SpriteBase3D.ALPHA_CUT_DISABLED
		n.add_child(ci)
		p.cost_icons.append(ci)
	p.node = n

func _label3d(world_h: float, c: Color) -> Label3D:
	var l := Label3D.new()
	l.font = _font()
	l.font_size = 64
	l.pixel_size = world_h / 64.0
	l.outline_size = 14
	l.outline_modulate = Color(0.08, 0.06, 0.05, 0.92)
	l.modulate = c
	l.rotation_degrees.x = -90
	l.shaded = false
	l.double_sided = false
	l.render_priority = 4
	l.outline_render_priority = 3
	return l

func pad_state(p: Pad, k: Kingdom) -> bool:
	if p.done:
		return false
	if p.needs != "" and not has_bld(k, p.needs):
		return false
	if p.build != "" and k.age < Data.NEED_AGE.get(p.build, 0):
		return false
	if p.is_upg and k.age < 2:
		return false
	if p.is_age and (k.age >= Data.AGES.size() - 1 or k.age_t > 0.0):
		return false
	if p.cmd != "" and k.age < 1:
		return false
	return true

func remaining(p: Pad) -> Dictionary:
	return { "f": p.cost.get("f", 0) - p.paid.f, "s": p.cost.get("s", 0) - p.paid.s, "g": p.cost.get("g", 0) - p.paid.g }

var _res_tex := {}
func _draw_pad(p: Pad, k: Kingdom) -> void:
	var act: bool = G.on_pad == p
	var rem := remaining(p)
	var block := ""
	if p.unit != "":
		if pop_of(k) + int(Data.UT[p.unit].pop) > pop_cap(k):
			block = "EV GEREK"
		if p.job == "food" and job_count(k, "food") >= farm_cap(k):
			block = "TARLA GEREK"
	var cmd_n := army_of(k).size() if p.cmd != "" else 0
	var key := "%s|%s|%s|%s|%s|%s|%d|%s|%s|%s|%s|%d" % [rem.f, rem.s, rem.g, act, block, cmd_n, int(p.hold * 20), k.res.f >= rem.f, k.res.s >= rem.s, k.res.g >= rem.g, G.army_mode, k.age]
	if key == p.key:
		return
	p.key = key
	var tot: float = p.cost.get("f", 0) + p.cost.get("s", 0) + p.cost.get("g", 0)
	var paid: float = p.paid.f + p.paid.s + p.paid.g
	p.mat.set_shader_parameter("fill", paid / tot if tot > 0.0 else 0.0)
	p.mat.set_shader_parameter("hold", p.hold / 0.5 if p.cmd != "" else 0.0)
	p.mat.set_shader_parameter("active", act)
	var sel: bool = p.cmd != "" and G.army_mode == p.cmd
	if p.cmd != "":
		p.mat.set_shader_parameter("bg", Color(0.67, 0.47, 0.08, 0.75) if sel else Color(0.47, 0.09, 0.12, 0.66))
	var lab := p.label
	if p.unit != "" and p.unit != "koylu":
		lab = k.civ.uname if p.unit == k.civ.uniq and k.age >= 2 else Data.UT[p.unit].name.to_upper()
	elif p.is_age:
		lab = Data.AGES[k.age + 1].short + " ÇAĞI"
	p.lbl.text = lab
	var ps := p.h * Geo.K
	p.lbl.pixel_size = ps * (0.13 if lab.length() <= 8 else 0.1) / 64.0
	p.lbl.modulate = Color("#ffd75e") if p.cmd != "" else Color.WHITE
	for i in 3:
		p.cost_lbls[i].visible = false
		p.cost_icons[i].visible = false
	p.sub.visible = false
	if p.cmd != "":
		p.sub.text = "%d asker" % cmd_n
		p.sub.visible = true
	elif block != "":
		p.sub.text = block
		p.sub.modulate = Color("#ff9a8a")
		p.sub.visible = true
	else:
		var items := []
		for r in ["f", "s", "g"]:
			if rem[r] > 0:
				items.append(r)
		var widths := []
		var total := 0.0
		for r in items:
			var w := (str(rem[r]).length() * 0.55 + 1.3) * ps * 0.1
			widths.append(w)
			total += w
		var xx := -total / 2.0
		for i in items.size():
			var r: String = items[i]
			if not _res_tex.has(r):
				_res_tex[r] = load("res://assets/icons/res_%s.png" % r)
			var ic: Sprite3D = p.cost_icons[i]
			ic.texture = _res_tex[r]
			ic.position = Vector3(xx + ps * 0.05, 0.05, ps * 0.34)
			ic.visible = true
			var cl: Label3D = p.cost_lbls[i]
			cl.text = str(rem[r])
			cl.modulate = Color("#fff2b8") if k.res[r] >= rem[r] else Color("#ffb0a0")
			cl.position = Vector3(xx + ps * 0.11, 0.05, ps * 0.34)
			cl.visible = true
			xx += widths[i]

# ================================================================ GAME SETUP
func clear_game() -> void:
	if G.is_empty():
		return
	for u in G.units:
		if is_instance_valid(u.node):
			u.node.queue_free()
	for b in G.blds:
		if is_instance_valid(b.node):
			b.node.queue_free()
	for k in G.ks:
		for d in k.deco:
			if is_instance_valid(d):
				d.queue_free()
	for p in G.pads:
		p.node.queue_free()
	floats.clear()

func new_game(level: int, civ_idx: int) -> void:
	clear_game()
	rng.seed = level * 977 + civ_idx * 31 + 13
	G = { "q": 0, "paused": false, "level": level, "t": 0.0, "units": [], "blds": [], "proj": [], "coins": [], "parts": [], "fly": [], "ks": [], "pads": [],
		"msgs": [], "pay_t": 0.0, "hero_dead": 0.0, "shake": 0.0, "over": "", "over_t": 0.0, "moved": false, "army_mode": "rally",
		"peace": maxf(240.0, 420.0 - 40.0 * (level - 1)), "alarm_t": 0.0, "stats": { "built": 0, "trained": 0 }, "collapse": [], "on_pad": null, "buy_cd": 0.0, "war_started": false }
	var rest := []
	for i in Data.CIVS.size():
		if i != civ_idx:
			rest.append(i)
	for i in range(rest.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var tmp = rest[i]
		rest[i] = rest[j]
		rest[j] = tmp
	var order := [civ_idx] + rest.slice(0, 4)
	for i in order.size():
		G.ks.append(make_kingdom(i, order[i], i == 0))
	G.pk = G.ks[0]
	var pk: Kingdom = G.pk
	G.hero = make_unit(pk, "hero", pk.castle.x + pk.fx * 120.0, pk.castle.y + pk.fy * 120.0, "hero")
	G.pads = pads_for(pk)
	cam_target = Geo.p3(G.hero.x, G.hero.y - 50.0, 0.0)
	msg("Barış dönemi: krallığını büyüt!", Color("#ffe27a"))
	hud.quest_ui(true)
	hud.refresh(true)

# ================================================================ STORY & QUESTS
func story(id: String) -> void:
	if G.is_empty():
		return
	var s := Data.story(id, G.pk.civ)
	if s.is_empty():
		return
	G.paused = true
	hud.show_story(s.t, s.b)

func story_done() -> void:
	G.paused = false
	audio.start()

func quest_n(id: String, k: Kingdom) -> int:
	match id:
		"vill": return villagers(k)
		"houses": return count_bld(k, "house")
		"farms": return count_bld(k, "farm") - 1
		"age1": return k.age
		"army5": return army_of(k).size() if has_bld(k, "barracks") else 0
		"tower": return count_bld(k, "tower")
		"age2": return 1 if k.age >= 2 else 0
		"horse3":
			var n := 0
			for u in army_of(k):
				if u.T.get("horse", false):
					n += 1
			return n
		"conq1":
			var n := 0
			for o in G.ks:
				if not o.alive and o.fallen_by == k:
					n += 1
			return n
		"conqall":
			var n := 0
			for o in G.ks:
				if not o.alive:
					n += 1
			return n
	return 0

func quest_tick() -> void:
	if G.q >= Data.QUESTS.size():
		return
	var Q: Dictionary = Data.QUESTS[G.q]
	var k: Kingdom = G.pk
	if quest_n(Q.id, k) >= Q.of:
		var parts := []
		for r in Q.rw:
			k.res[r] += Q.rw[r]
			parts.append("+%d %s" % [Q.rw[r], Data.RES_NAME[r]])
		msg("📜 Görev tamam: " + Q.t + ((" (" + " ".join(parts) + ")") if parts.size() else ""), Color("#ffe27a"))
		sfx("buy")
		G.q += 1
		hud.quest_ui(true)

# ================================================================ COMBAT
func enemies(a, b) -> bool:
	return a.k != b.k

func nearest_enemy(e, max_d: float, units_only := false, ox := INF, oy := INF, only_k: Kingdom = null):
	var best_o = null
	var bd := max_d
	var cx: float = e.x if ox == INF else ox
	var cy: float = e.y if oy == INF else oy
	var ek: Kingdom = e.k
	var hero_down: bool = G.hero_dead > 0.0
	for o: Unit in G.units:
		if o.k == ek or o.hp <= 0.0 or o.dying > 0.0 or not o.k.alive:
			continue
		if hero_down and o.role == "hero":
			continue
		var dx := o.x - cx
		var dy := o.y - cy
		var lim := bd + o.r
		if dx > lim or dx < -lim or dy > lim or dy < -lim:
			continue
		var d := sqrt(dx * dx + dy * dy) - o.r
		if d < bd:
			bd = d
			best_o = o
	if not units_only:
		for o: Bld in G.blds:
			if o.k == ek or o.hp <= 0.0 or not o.k.alive:
				continue
			if only_k != null and o.k != only_k:
				continue
			var dx := o.x - cx
			var dy := o.y - cy
			var lim := bd + o.r
			if dx > lim or dx < -lim or dy > lim or dy < -lim:
				continue
			var d := sqrt(dx * dx + dy * dy) - o.r
			if d < bd:
				bd = d
				best_o = o
	return best_o

func in_range(u: Unit, t) -> bool:
	return dist(u, t) - t.r - u.r <= u.range

func burst(pool: String, x: float, y: float, z: float, color: Color, n: int, spd := 60.0, up := 6.0) -> void:
	for i in n:
		var a := randf() * TAU
		var s := spd * (0.4 + randf())
		G.parts.append({ "pool": pool, "x": x, "y": y, "z": z, "vx": cos(a) * s, "vy": sin(a) * s, "vz": up * (0.5 + randf()), "life": 0.5 + randf() * 0.5, "t": 0.0, "col": color, "r": 0.7 + randf() * 0.7, "g": 1.0, "rot": randf() * 6.0, "gy": Geo.ground_y(x, y) })

func smoke(x: float, y: float, z: float, n: int, size := 1.0) -> void:
	for i in n:
		var a := randf() * TAU
		var s := 15.0 + randf() * 35.0
		G.parts.append({ "pool": "smoke", "x": x + cos(a) * 6.0, "y": y + sin(a) * 6.0, "z": z, "vx": cos(a) * s, "vy": sin(a) * s, "vz": 1.5 + randf() * 3.0, "life": 0.7 + randf() * 0.6, "t": 0.0, "col": Color.WHITE, "r": size * (0.7 + randf() * 0.7), "g": 0.0, "rot": 0.0, "gy": Geo.ground_y(x, y) })

func drop_coins(x: float, y: float, n: int) -> void:
	for i in n:
		var a := randf() * TAU
		var s := 25.0 + randf() * 60.0
		G.coins.append({ "x": x, "y": y, "z": 1.2, "vx": cos(a) * s, "vy": sin(a) * s, "vz": 7.0 + randf() * 6.0, "age": 0.0, "mag": false, "spin": randf() * 6.0, "v": 3 })

func shoot(src, tgt, dmg: float, z0: float) -> void:
	var d := Vector2(tgt.x - src.x, tgt.y - src.y).length()
	G.proj.append({ "x0": src.x, "y0": src.y, "z0": z0, "tgt": tgt, "tx": tgt.x, "ty": tgt.y, "t": 0.0, "T": maxf(0.2, d / 470.0), "dmg": dmg, "src": src, "h": d * Geo.K * 0.14 })
	if near_cam(src.x, src.y):
		sfx("arrow", 0.5)

func damage(t, dmg: float, src) -> void:
	if t.hp <= 0.0 or (t.kind == "u" and t.dying > 0.0):
		return
	t.hp -= dmg
	t.hit = 0.12
	if src != null and src.k != null:
		t.last_hit_by = src.k
	if t.k.is_player and src != null and src.k != null and G.alarm_t <= 0.0 and G.t > G.peace:
		G.alarm_t = 20.0
		msg("⚔ " + src.k.civ.name + " saldırıyor!", src.k.civ.color)
		sfx("alarm")
	if t.kind == "u" and t.role == "hero":
		sfx("hurt", 0.6)
	if t.hp <= 0.0:
		kill(t)

func kill(t) -> void:
	if t.kind == "u":
		if t.role == "hero":
			t.hp = 0.0
			G.hero_dead = 5.0
			float_text(t.x, t.y, 5.0, "Paşa yaralandı!", Color("#ffd75e"), 18.0)
			burst("spark", t.x, t.y, 2.0, Color("#ff5050"), 14, 60.0)
			return
		t.dying = 2.4
		t.hp = 0.0
		burst("spark", t.x, t.y, 1.5, t.k.civ.color, 7, 40.0)
		if near_cam(t.x, t.y):
			sfx("death", 0.5)
		if t.last_hit_by != null and t.last_hit_by.is_player and t.role != "koylu":
			drop_coins(t.x, t.y, 3 if t.T.get("horse", false) else 2)
	else:
		smoke(t.x, t.y, 2.0, 16, 2.4)
		burst("spark", t.x, t.y, 3.0, Color("#8a8f96"), 18, 90.0)
		if near_cam(t.x, t.y):
			sfx("boom")
			G.shake = maxf(G.shake, 0.4)
		t.node.visible = false
		if t.k.is_player:
			for p in G.pads:
				if p.bld == t:
					p.done = false
					p.paid = { "f": 0, "s": 0, "g": 0 }
					p.bld = null
		if t.type == "castle":
			conquer(t.k, t.last_hit_by)

func conquer(k: Kingdom, by: Kingdom) -> void:
	if not k.alive:
		return
	k.alive = false
	k.fallen_by = by
	var nm: String = by.civ.name if by else "düşman"
	msg("🏰 " + k.civ.full + " düştü! (" + nm + ")", by.civ.color if by else Color.WHITE)
	sfx("conquer")
	for u in k.units:
		if alive(u) and u.role != "hero":
			u.dying = 2.0 + randf()
			u.hp = 0.0
	var i := 0
	for b in k.blds:
		if b.hp > 0.0:
			G.collapse.append({ "b": b, "t": 0.3 + i * 0.18 })
			i += 1
	if by:
		by.res.g += 250.0
		by.res.f += 150.0
		by.res.s += 150.0
		if by.is_player:
			drop_coins(k.x, k.y, 40)
			msg("Ganimet: +250 altın +150 yiyecek +150 taş", Color("#ffe27a"))
	if k.is_player and G.over == "":
		G.over = "lose"
		G.over_t = 2.5
		sfx("lose")
	var alive_n := 0
	for o in G.ks:
		if o.alive:
			alive_n += 1
	if G.over == "" and alive_n == 1 and G.pk.alive:
		G.over = "win"
		G.over_t = 3.0
		sfx("win")

func attack(u: Unit, t) -> void:
	u.rot = atan2(t.x - u.x, t.y - u.y)
	var name: String = u.T.get("atk", "1H_Melee_Attack_Chop")
	var clen := 1.0
	if u.ap.has_animation(name):
		clen = u.ap.get_animation(name).length
	var ts := maxf(1.1, clen / (u.cd_max * 0.95))
	var dur := play(u, name, true, ts, 0.08)
	u.atk_t = minf(dur if dur > 0.0 else 0.6, u.cd_max * 0.95)
	u.pending_t = 0.3 if u.T.get("ranged", false) else 0.32
	u.pending_tgt = t

func resolve_hit(u: Unit, t) -> void:
	if not alive(u):
		return
	if u.T.get("ranged", false):
		if t.hp > 0.0 and (t.kind == "b" or t.dying <= 0.0):
			shoot(u, t, u.dmg, 2.8 if u.T.get("horse", false) else 1.7)
		return
	if t.hp <= 0.0 or (t.kind == "u" and t.dying > 0.0) or dist(u, t) - t.r - u.r > u.range + 10.0:
		return
	damage(t, u.dmg, u)
	if near_cam(u.x, u.y):
		sfx("chop" if u.role == "koylu" else u.T.get("snd", "sword"), 0.55)
	if u.vis:
		burst("spark", t.x + (u.x - t.x) * 0.35, t.y + (u.y - t.y) * 0.35, 1.6, Color("#fff3b0"), 3, 45.0)
	if u.T.has("cleave"):
		for o in G.units:
			if o != t and o.k != u.k and alive(o) and dist(o, t) < u.T.cleave:
				damage(o, u.dmg * 0.6, u)

func turn(u: Unit, a: float, dt: float) -> void:
	var d := wrapf(a - u.rot, -PI, PI)
	u.rot += d * minf(1.0, dt * 10.0)

func move_to(u: Unit, x: float, y: float, dt: float, stop := 0.0) -> bool:
	var w := Geo.steer(u.x, u.y, x, y)
	if w != Vector2.INF:
		x = w.x
		y = w.y
		stop = 0.0
	var dx := x - u.x
	var dy := y - u.y
	var d := maxf(Vector2(dx, dy).length(), 0.0001)
	if d <= stop + 0.8:
		return true
	var s := minf(d - stop, u.spd * dt)
	u.x += dx / d * s
	u.y += dy / d * s
	u.moving = true
	turn(u, atan2(dx, dy), dt)
	return d - s <= stop + 0.8

func clamp_map(o) -> void:
	var dx: float = o.x - Geo.MC
	var dy: float = o.y - Geo.MC
	var d := Vector2(dx, dy).length()
	var m: float = Geo.R_PLAY - o.r
	if d > m:
		o.x = Geo.MC + dx / d * m
		o.y = Geo.MC + dy / d * m

# ================================================================ UNIT AI
func villager_ai(u: Unit, dt: float) -> void:
	var k := u.k
	if u.tgt_t <= 0.0:
		u.tgt = nearest_enemy(u, 40.0, true) if k.threat != null else null
		u.tgt_t = 0.4
	u.tgt_t -= dt
	if u.tgt != null and alive(u.tgt) and dist(u, u.tgt) < 60.0:
		if in_range(u, u.tgt):
			if u.cd <= 0.0:
				attack(u, u.tgt)
				u.cd = u.cd_max
		else:
			move_to(u, u.tgt.x, u.tgt.y, dt)
		return
	if u.job == "food" and (u.farm == null or u.farm.hp <= 0.0):
		u.farm = null
		for b in k.blds:
			if b.type == "farm" and b.hp > 0.0 and b.workers < 3:
				u.farm = b
				break
		if u.farm:
			u.farm.workers += 1
		else:
			u.job = "gold"
			return
	var node: Bld = k.mine if u.job == "gold" else (k.quarry if u.job == "stone" else u.farm)
	if node == null or node.hp <= 0.0:
		if u.job != "food":
			u.job = "food"
		return
	if u.spot == Vector2.INF:
		if node.type == "farm":
			var a := randf() * TAU
			var r := randf() * 22.0
			u.spot = Vector2(node.x + cos(a) * r, node.y + sin(a) * r)
		else:
			var dx := k.castle.x - node.x
			var dy := k.castle.y - node.y
			var d := Vector2(dx, dy).length()
			u.spot = Vector2(node.x + dx / d * (node.r + 12.0) + (randf() - 0.5) * 30.0, node.y + dy / d * (node.r + 12.0) + (randf() - 0.5) * 30.0)
	if u.vs == "toNode":
		if move_to(u, u.spot.x, u.spot.y, dt, 3.0):
			u.vs = "work"
			u.work_t = 3.6
	elif u.vs == "work":
		u.work_t -= dt
		turn(u, atan2(node.x - u.x, node.y - u.y), dt)
		if u.cd <= 0.0:
			u.cd = 1.05
			if u.vis:
				play(u, "PickUp" if u.job == "food" else "1H_Melee_Attack_Chop", true, 1.2, 0.1)
				u.atk_t = 0.8
				if near_cam(u.x, u.y) and randf() < 0.4:
					sfx("chop", 0.25)
		if u.work_t <= 0.0:
			u.carry = u.job
			u.vs = "toDrop"
	elif u.vs == "toDrop":
		var c := k.castle
		var dx := u.x - c.x
		var dy := u.y - c.y
		var d := maxf(Vector2(dx, dy).length(), 1.0)
		if move_to(u, c.x + dx / d * (c.r + 4.0), c.y + dy / d * (c.r + 4.0), dt, 4.0) or d < c.r + 14.0:
			var r := "g" if u.job == "gold" else ("s" if u.job == "stone" else "f")
			var amt := 10.0 * k.mult
			if r == "f" and k.civ.mod.has("foodRate"):
				amt *= k.civ.mod.foodRate
			if r == "g" and k.civ.mod.has("goldRate"):
				amt *= k.civ.mod.goldRate
			k.res[r] += round(amt)
			u.carry = ""
			u.vs = "toNode"
			if k.is_player and u.vis:
				float_text(u.x, u.y, 3.0, "+%d" % round(amt), Color("#ffd24a") if r == "g" else (Color("#d6dbe0") if r == "s" else Color("#f2d36b")), 13.0)
				sfx("res", 0.4)

func soldier_ai(u: Unit, dt: float) -> void:
	var k := u.k
	u.tgt_t -= dt
	if u.tgt_t <= 0.0:
		u.tgt_t = 0.3 + randf() * 0.2
		u.tgt = null
		if u.state == "rally":
			var t = k.threat
			if t != null and alive(t):
				var n = nearest_enemy(u, 260.0)
				u.tgt = n if n != null else t
		elif u.state == "follow":
			var h: Unit = G.hero
			if G.hero_dead <= 0.0:
				u.tgt = nearest_enemy(u, 150.0, false, h.x, h.y)
		elif u.state == "charge" or u.state == "raid":
			if u.goal_k == null or not u.goal_k.alive:
				u.goal_k = pick_target(k, false)
			u.tgt = nearest_enemy(u, 190.0)
			if u.tgt == null and u.goal_k != null:
				u.tgt = nearest_enemy(u, 1e9, false, u.goal_k.castle.x, u.goal_k.castle.y, u.goal_k)
			if u.goal_k == null:
				u.state = "rally"
	var t = u.tgt
	if t != null and (t.hp <= 0.0 or (t.kind == "u" and t.dying > 0.0) or not t.k.alive):
		u.tgt = null
		u.tgt_t = 0.0
	if u.tgt != null:
		if in_range(u, u.tgt):
			turn(u, atan2(u.tgt.x - u.x, u.tgt.y - u.y), dt)
			if u.cd <= 0.0:
				attack(u, u.tgt)
				u.cd = u.cd_max
		else:
			move_to(u, u.tgt.x, u.tgt.y, dt)
		return
	var goal := Vector2.INF
	if u.state == "rally":
		goal = u.slot
	elif u.state == "follow" and G.hero_dead <= 0.0:
		goal = u.slot
	elif u.state == "follow":
		goal = u.slot0
	if goal != Vector2.INF:
		if Vector2(goal.x - u.x, goal.y - u.y).length() > 4.0:
			move_to(u, goal.x, goal.y, dt)
		else:
			turn(u, atan2(k.fx, k.fy), dt)

func pick_target(k: Kingdom, for_ai: bool) -> Kingdom:
	var others := []
	for o in G.ks:
		if o.alive and o != k:
			others.append(o)
	if others.is_empty():
		return null
	if not for_ai:
		var b: Kingdom = null
		var bd := 1e9
		for o in others:
			var d := Vector2(o.x - k.x, o.y - k.y).length()
			if d < bd:
				bd = d
				b = o
		return b
	var b: Kingdom = null
	var bs := 1e9
	for o in others:
		var d := Vector2(o.x - k.x, o.y - k.y).length()
		var bias := 0.0
		if o.is_player:
			bias = 260.0 if G.level == 1 else (60.0 if G.level == 2 else -150.0)
		var s: float = o.power + d * 1.2 + bias + randf() * 400.0
		if s < bs:
			bs = s
			b = o
	return b

# ================================================================ AI KINGDOM
func _ai_build(k: Kingdom, type: String, slot: Vector2) -> bool:
	var p := k_local(k, slot.x, slot.y)
	var c := cost_of(k, Data.BT[type].cost, "bld")
	if not can_afford(k, c):
		return false
	spend(k, c)
	add_bld(k, type, p.x, p.y, false)
	return true

func ai_tick(k: Kingdom) -> void:
	var pop := pop_of(k)
	var cap := pop_cap(k)
	var vill := villagers(k)
	var army := army_of(k)
	var tgt_vill := mini(18, 5 + int(G.t / 22.0))
	if cap - pop <= 2 and k.house_slot < Data.SLOTS.house.size():
		if _ai_build(k, "house", Data.SLOTS.house[k.house_slot]):
			k.house_slot += 1
			return
	if vill < tgt_vill and pop < cap and k.res.f >= 50.0:
		var f := job_count(k, "food")
		var gd := job_count(k, "gold")
		var st := job_count(k, "stone")
		var job := "food"
		if f >= farm_cap(k):
			if k.farm_slot < Data.SLOTS.farm.size() and k.res.s >= 30.0:
				if _ai_build(k, "farm", Data.SLOTS.farm[k.farm_slot]):
					k.farm_slot += 1
				return
			job = "gold" if gd <= st else "stone"
		elif f > (gd + st) * 0.9:
			job = "gold" if gd <= st else "stone"
		spend(k, { "f": 50 })
		var v := make_unit(k, "koylu", k.castle.x, k.castle.y, "work")
		v.job = job
		v.vs = "toNode"
		return
	if k.age_t <= 0.0 and k.age < 2:
		var nx: Dictionary = Data.AGES[k.age + 1]
		var rdy: bool = (vill >= 9 and G.t > 70.0) if k.age == 0 else (vill >= 13 and G.t > 200.0)
		if rdy:
			if can_afford(k, nx.cost):
				spend(k, nx.cost)
				start_age(k)
				return
			if k.age == 0 or k.res.f < nx.cost.f:
				return
	var has := func(t: String) -> bool:
		for b in k.blds:
			if b.type == t:
				return true
		return false
	if k.age < 1:
		pass
	elif vill >= 5 and not has.call("barracks"):
		if _ai_build(k, "barracks", Data.SLOTS.barracks):
			return
	elif vill >= 8 and not has.call("archery"):
		if _ai_build(k, "archery", Data.SLOTS.archery):
			return
	elif vill >= 9 and k.tower_slot < 1:
		if _ai_build(k, "tower", Data.SLOTS.tower[0]):
			k.tower_slot = 1
			return
	elif vill >= 11 and k.age >= 2 and not has.call("stable"):
		if _ai_build(k, "stable", Data.SLOTS.stable):
			return
	elif vill >= 13 and k.tower_slot < 2:
		if _ai_build(k, "tower", Data.SLOTS.tower[1]):
			k.tower_slot = 2
			return
	if k.age >= 2 and k.upg_lv < 4 and G.t > 240.0 + k.upg_lv * 120.0:
		var c := { "f": 60 + 40 * k.upg_lv, "g": 60 + 40 * k.upg_lv }
		if can_afford(k, c):
			spend(k, c)
			apply_upgrade(k)
			return
	if pop < cap:
		var opts := []
		if has_bld(k, "barracks"):
			opts.append_array(["piyade", "piyade", "baltaci"])
		if has_bld(k, "archery"):
			opts.append_array(["okcu", "okcu"])
		if has_bld(k, "stable"):
			opts.append_array(["suvari", "atliokcu"])
		if opts.has(k.civ.uniq):
			opts.append_array([k.civ.uniq, k.civ.uniq])
		if opts.size() and (vill >= 8 or army.size() < 3):
			var role: String = opts[randi() % opts.size()]
			var c := unit_cost(k, role)
			if can_afford(k, c) and pop + int(Data.UT[role].pop) <= cap:
				spend(k, c)
				train_at(k, role)

func train_at(k: Kingdom, role: String) -> Unit:
	var bt := "castle"
	if role == "okcu":
		bt = "archery"
	elif role == "suvari" or role == "atliokcu":
		bt = "stable"
	elif role != "koylu":
		bt = "barracks"
	var b: Bld = k.castle
	for x in k.blds:
		if x.type == bt and x.hp > 0.0:
			b = x
			break
	var st := "rally"
	if k.is_player and G.army_mode == "follow":
		st = "follow"
	var u := make_unit(k, role, b.x + k.fx * (b.r + 10.0), b.y + k.fy * (b.r + 10.0), st)
	burst("spark", u.x, u.y, 1.0, Color("#ffd75e"), 10, 50.0)
	return u

func apply_upgrade(k: Kingdom) -> void:
	k.upg *= 1.12
	k.upg_lv += 1
	for u in k.units:
		if u.role != "koylu" and u.role != "hero":
			u.hp *= 1.12
			u.maxhp *= 1.12
			u.dmg *= 1.12

func ai_war(k: Kingdom) -> void:
	if G.t < G.peace or k.is_player or k.age < 2:
		return
	var army := army_of(k).filter(func(u): return u.state == "rally")
	var need := mini(24, 9 + 2 * k.waves)
	if army.size() >= need:
		var target := pick_target(k, true)
		if target == null:
			return
		for u in army:
			u.state = "raid"
			u.goal_k = target
		k.waves += 1
		if target.is_player:
			msg("⚔ " + k.civ.full + " sana sefer başlattı! (%d asker)" % army.size(), k.civ.color)
			sfx("alarm")
		else:
			msg(k.civ.name + " → " + target.civ.name + " üzerine yürüyor", Color("#e6e6e6"))

# ================================================================ UPDATE
func _physics_process(dt: float) -> void:
	pass

func _process(delta: float) -> void:
	var dt := minf(0.05, delta)
	if G.is_empty():
		return
	if running:
		update(dt)
	sync(dt)

var prof := {}
func _pt(name: String, t0: int) -> int:
	var t := Time.get_ticks_usec()
	prof[name] = prof.get(name, 0) + (t - t0)
	return t

func update(dt: float) -> void:
	if G.paused:
		return
	var _t := Time.get_ticks_usec()
	G.t += dt
	G.alarm_t = maxf(0.0, G.alarm_t - dt)
	if G.t >= G.peace and not G.war_started:
		G.war_started = true
		msg("⚔ Barış bitti! İstila dönemi başladı.", Color("#ff8a6a"))
		sfx("alarm")
		story("war")
	for k in G.ks:
		if k.alive and k.age_t > 0.0:
			k.age_t -= dt * (1.0 if k.is_player else k.mult)
			if k.age_t <= 0.0:
				finish_age(k)
	var half_tick := int(G.t * 2.0) != int((G.t - dt) * 2.0)
	if half_tick:
		quest_tick()
		hud.quest_ui(false)
	var h: Unit = G.hero
	var pk: Kingdom = G.pk
	if G.hero_dead > 0.0:
		G.hero_dead -= dt
		if G.hero_dead <= 0.0 and pk.alive:
			h.hp = h.maxhp
			h.x = pk.castle.x + pk.fx * 80.0
			h.y = pk.castle.y + pk.fy * 80.0
	else:
		var inp := joy
		var kx := (1.0 if keys.has(KEY_D) or keys.has(KEY_RIGHT) else 0.0) - (1.0 if keys.has(KEY_A) or keys.has(KEY_LEFT) else 0.0)
		var ky := (1.0 if keys.has(KEY_S) or keys.has(KEY_DOWN) else 0.0) - (1.0 if keys.has(KEY_W) or keys.has(KEY_UP) else 0.0)
		if kx != 0.0 or ky != 0.0:
			inp = Vector2(kx, ky).normalized()
		h.moving = inp.length() > 0.05
		if h.moving:
			G.moved = true
			h.x += inp.x * h.spd * dt
			h.y += inp.y * h.spd * dt
			turn(h, atan2(inp.x, inp.y), dt * 1.4)
		h.hp = minf(h.maxhp, h.hp + (18.0 if Vector2(h.x - pk.x, h.y - pk.y).length() < 330.0 else 2.0) * dt)
		h.cd -= dt
		h.atk_t = maxf(0.0, h.atk_t - dt)
		if h.tgt_t <= 0.0:
			h.tgt = nearest_enemy(h, h.range)
			h.tgt_t = 0.2
		h.tgt_t -= dt
		h.aiming = h.tgt != null and alive(h.tgt)
		if h.aiming and h.cd <= 0.0 and dist(h, h.tgt) - h.tgt.r < h.range + 10.0:
			h.cd = h.cd_max
			h.atk_t = 0.35
			shoot(h, h.tgt, h.dmg, 3.6)
			play(h, "1H_Ranged_Shoot", true, 1.6, 0.08)
			if not h.moving:
				h.rot = atan2(h.tgt.x - h.x, h.tgt.y - h.y)
		clamp_map(h)
	for u in G.units:
		u.hit = maxf(0.0, u.hit - dt)
	# formation slots
	for k in G.ks:
		var ri := 0
		var fi := 0
		for u in k.units:
			if not alive(u) or u.role == "koylu" or u.role == "hero":
				continue
			if u.state == "rally":
				var row := ri / 8
				var col := ri % 8
				u.slot = k_local(k, Data.SLOTS.rally.x + 22.0 - row * 22.0, (col - 3.5) * 22.0 + (6.0 if row % 2 else 0.0))
				ri += 1
			elif u.state == "follow":
				var row := fi / 6
				var col := fi % 6
				var bx := sin(h.rot)
				var by := cos(h.rot)
				var back := 40.0 + row * 22.0
				var side := (col - 2.5) * 22.0
				u.slot = Vector2(h.x - bx * back + by * side, h.y - by * back - bx * side)
				u.slot0 = k_local(k, Data.SLOTS.rally.x, 0)
				fi += 1
		k.rally_n = ri
	for k: Kingdom in G.ks:
		k.threat_t -= dt
		if k.threat_t <= 0.0 and k.alive:
			k.threat_t = 0.25
			var t = nearest_enemy(k.castle, 360.0, false)
			k.threat = t
	for k in G.ks:
		if k.alive and not k.is_player:
			k.ai_t -= dt
			if k.ai_t <= 0.0:
				k.ai_t = 1.6 / k.mult
				ai_tick(k)
			k.attack_t -= dt
			if k.attack_t <= 0.0:
				k.attack_t = 8.0
				ai_war(k)
	if half_tick:
		for k in G.ks:
			var pw := 0.0
			for u in army_of(k):
				pw += u.hp * u.dmg / 100.0
			k.power = pw + (20.0 if k.castle.hp > 0.0 else 0.0)
	_t = _pt("pre", _t)
	for u: Unit in G.units:
		if u.hp <= 0.0 or u.dying > 0.0 or u.role == "hero":
			continue
		u.cd -= dt
		u.moving = false
		if u.pending_t >= 0.0:
			u.pending_t -= dt
			if u.pending_t < 0.0:
				var pt = u.pending_tgt
				u.pending_tgt = null
				resolve_hit(u, pt)
		if u.atk_t > 0.0:
			u.atk_t -= dt
			if u.role != "koylu" or u.tgt != null:
				continue
		if u.role == "koylu":
			villager_ai(u, dt)
		else:
			soldier_ai(u, dt)
	_t = _pt("units", _t)
	separation()
	_t = _pt("sep", _t)
	for b in G.blds:
		b.hit = maxf(0.0, b.hit - dt)
		if b.hp <= 0.0:
			continue
		if b.build_t > 0.0:
			b.build_t -= dt
			if b.build_t <= 0.0:
				b.build_t = 0.0
				finish_bld(b)
				smoke(b.x, b.y, 0.5, 10, 1.5)
				if near_cam(b.x, b.y):
					sfx("build", 0.6)
			continue
		if b.dmg > 0.0 and b.k.alive:
			b.cd -= dt
			if b.cd <= 0.0:
				var t = nearest_enemy(b, b.range, true)
				if t != null:
					shoot(b, t, b.dmg, 8.5 if b.type == "tower" else 12.0)
					b.cd = b.cd_max
	for c in G.collapse:
		c.t -= dt
		if c.t <= 0.0 and c.b.hp > 0.0:
			c.b.hp = 0.0
			smoke(c.b.x, c.b.y, 2.0, 10, 2.0)
			c.b.node.visible = false
	G.collapse = G.collapse.filter(func(c): return c.t > 0.0)
	for p in G.proj:
		p.t += dt
		var tg = p.tgt
		var tal: bool = tg.hp > 0.0 and (tg.kind == "b" or tg.dying <= 0.0)
		if tal:
			p.tx = tg.x
			p.ty = tg.y
		if p.t >= p.T:
			p.done = true
			if tal:
				damage(tg, p.dmg, p.src)
				if near_cam(p.tx, p.ty):
					burst("spark", p.tx, p.ty, 1.5, Color("#fff0c0"), 3, 30.0)
	G.proj = G.proj.filter(func(p): return not p.has("done"))
	for c in G.coins:
		c.age += dt
		c.spin += dt * 5.0
		if c.mag and G.hero_dead <= 0.0:
			var dx: float = h.x - c.x
			var dy: float = h.y - c.y
			var d := maxf(Vector2(dx, dy).length(), 1.0)
			var s := maxf(320.0, 640.0 - d) * dt
			c.x += dx / d * minf(d, s)
			c.y += dy / d * minf(d, s)
			c.z += (2.8 - c.z) * minf(1.0, dt * 10.0)
			if d < 15.0:
				c["done"] = true
				pk.res.g += c.v
				sfx("coin", 0.7)
		else:
			if c.z > 0.4 or c.vz > 0.0:
				c.vz -= 30.0 * dt
				c.z += c.vz * dt
				if c.z < 0.4:
					c.z = 0.4
					c.vz *= -0.35
					if absf(c.vz) < 2.0:
						c.vz = 0.0
				c.x += c.vx * dt
				c.y += c.vy * dt
				c.vx *= 0.97
				c.vy *= 0.97
			if G.hero_dead <= 0.0 and c.age > 0.3 and Vector2(h.x - c.x, h.y - c.y).length() < 85.0:
				c.mag = true
		if c.age > 60.0:
			c["done"] = true
	G.coins = G.coins.filter(func(c): return not c.has("done"))
	_t = _pt("blds_proj", _t)
	update_pads(dt)
	_t = _pt("pads", _t)
	for f in G.fly:
		f.t += dt * 4.0
	G.fly = G.fly.filter(func(f): return f.t < 1.0)
	for p in G.parts:
		p.t += dt
		p.x += p.vx * dt
		p.y += p.vy * dt
		p.z += p.vz * dt
		p.rot += dt * 8.0
		if p.g > 0.0:
			p.vz -= 26.0 * dt
			if p.z < 0.1:
				p.z = 0.1
				p.vz *= -0.3
				p.vx *= 0.6
				p.vy *= 0.6
		else:
			p.vx *= 0.95
			p.vy *= 0.95
	G.parts = G.parts.filter(func(p): return p.t < p.life)
	if G.parts.size() > 800:
		G.parts = G.parts.slice(G.parts.size() - 800)
	for m in G.msgs:
		m.t += dt
	G.msgs = G.msgs.filter(func(m): return m.t < 6.0)
	var any_removed := false
	for u in G.units:
		if u.dying > 0.0:
			u.dying -= dt
			if u.dying <= 0.0:
				u.dying = 0.0001
				u.removed = true
				any_removed = true
				u.node.queue_free()
				if u.farm:
					u.farm.workers -= 1
	if any_removed:
		G.units = G.units.filter(func(u): return not u.removed)
		for k in G.ks:
			k.units = k.units.filter(func(u): return not u.removed)
	var any_b := false
	for b in G.blds:
		if b.hp <= 0.0:
			any_b = true
			break
	if any_b:
		for b in G.blds:
			if b.hp <= 0.0 and is_instance_valid(b.node):
				b.node.queue_free()
		G.blds = G.blds.filter(func(b): return b.hp > 0.0)
		for k in G.ks:
			k.blds = k.blds.filter(func(b): return b.hp > 0.0)
	G.shake = maxf(0.0, G.shake - dt)
	var fighting := false
	for u in G.units:
		if u.k.is_player and u.atk_t > 0.0 and u.role != "koylu":
			fighting = true
			break
	audio.intensity = 1.0 if fighting or G.alarm_t > 12.0 else 0.0
	if G.over != "":
		G.over_t -= dt
		if G.over_t <= 0.0 and running:
			running = false
			hud.show_end(G.over == "win")
	_t = _pt("post", _t)
	hud.refresh(false)
	_t = _pt("hud", _t)

func separation() -> void:
	var us: Array = G.units
	var cell := 40.0
	var grid := {}
	for a: Unit in us:
		if a.hp <= 0.0 or a.dying > 0.0:
			continue
		if a.px != INF and Geo.blocked(a.x, a.y):
			if not Geo.blocked(a.px, a.y):
				a.x = a.px
			elif not Geo.blocked(a.x, a.py):
				a.y = a.py
			else:
				a.x = a.px
				a.y = a.py
		var key := int(a.x / cell) * 1000 + int(a.y / cell)
		var arr = grid.get(key)
		if arr == null:
			grid[key] = [a]
		else:
			arr.append(a)
	for a: Unit in us:
		if a.hp <= 0.0 or a.dying > 0.0:
			continue
		var cx := int(a.x / cell)
		var cy := int(a.y / cell)
		var a_hero := a.role == "hero"
		var a_vil := a.role == "koylu"
		for ox in 3:
			for oy in 3:
				var list = grid.get((cx + ox - 1) * 1000 + cy + oy - 1)
				if list == null:
					continue
				for b: Unit in list:
					if b.id <= a.id:
						continue
					var dx := b.x - a.x
					var dy := b.y - a.y
					var rr := a.r + b.r - 1.0
					if dx > rr or dx < -rr or dy > rr or dy < -rr:
						continue
					var d2 := dx * dx + dy * dy
					if d2 >= rr * rr:
						continue
					var b_hero := b.role == "hero"
					if (a_hero or b_hero) and a.k == b.k:
						continue
					if a_vil and b.role == "koylu":
						continue
					var d := maxf(sqrt(d2), 0.01)
					var o := (rr - d) / 2.0
					var nx := dx / d
					var ny := dy / d
					var wa := 0.0 if a_hero else 1.0
					var wb := 0.0 if b_hero else 1.0
					var kk := wa + wb
					if kk <= 0.0:
						kk = 1.0
					a.x -= nx * o * 2.0 * wa / kk
					a.y -= ny * o * 2.0 * wa / kk
					b.x += nx * o * 2.0 * wb / kk
					b.y += ny * o * 2.0 * wb / kk
	var bcell := 100.0
	var bgrid := {}
	for bl: Bld in G.blds:
		if bl.hp <= 0.0 or bl.walk:
			continue
		var key := int(bl.x / bcell) * 1000 + int(bl.y / bcell)
		var arr = bgrid.get(key)
		if arr == null:
			bgrid[key] = [bl]
		else:
			arr.append(bl)
	for a: Unit in us:
		if a.hp <= 0.0 or a.dying > 0.0:
			continue
		var cx := int(a.x / bcell)
		var cy := int(a.y / bcell)
		for ox in 3:
			for oy in 3:
				var list = bgrid.get((cx + ox - 1) * 1000 + cy + oy - 1)
				if list == null:
					continue
				for bl: Bld in list:
					var dx := a.x - bl.x
					var dy := a.y - bl.y
					var lim := bl.r + a.r
					if absf(dx) > lim or absf(dy) > lim:
						continue
					var rr := bl.r * 0.9 + a.r
					var d2 := dx * dx + dy * dy
					if d2 < rr * rr:
						var d := maxf(sqrt(d2), 0.01)
						a.x += dx / d * (rr - d)
						a.y += dy / d * (rr - d)
		clamp_map(a)
		if a.px != INF and Geo.blocked(a.x, a.y) and not Geo.blocked(a.px, a.py):
			a.x = a.px
			a.y = a.py
		a.px = a.x
		a.py = a.y

func update_pads(dt: float) -> void:
	var k: Kingdom = G.pk
	var h: Unit = G.hero
	var on: Pad = null
	if G.hero_dead <= 0.0 and k.alive:
		for p in G.pads:
			if not pad_state(p, k):
				continue
			if absf(h.x - p.x) < p.w / 2.0 and absf(h.y - p.y) < p.h / 2.0:
				on = p
	if G.on_pad != on and on != null and on.cmd != "":
		on.hold = 0.0
	G.on_pad = on
	if on == null:
		return
	if on.cmd != "":
		on.hold += dt
		if on.hold >= 0.5 and G.army_mode != on.cmd:
			G.army_mode = on.cmd
			var army := army_of(k)
			for u in army:
				u.state = on.cmd
				u.goal_k = null
				u.tgt = null
				u.tgt_t = 0.0
			sfx("horn")
			var t := "HÜCUM! (%d)" % army.size() if on.cmd == "charge" else ("Ordu sancağı takip ediyor" if on.cmd == "follow" else "Ordu kaleyi savunuyor")
			float_text(on.x, on.y, 4.0, t, Color("#ffd75e"), 20.0)
			if on.cmd == "charge":
				var tk := pick_target(k, false)
				if tk:
					msg("Ordu " + tk.civ.full + " üzerine yürüyor!", tk.civ.color)
		return
	if G.buy_cd > 0.0:
		G.buy_cd -= dt
		return
	if on.unit != "":
		if pop_of(k) + int(Data.UT[on.unit].pop) > pop_cap(k):
			return
		if on.job == "food" and job_count(k, "food") >= farm_cap(k):
			return
	G.pay_t -= dt
	while G.pay_t <= 0.0:
		var rem := remaining(on)
		var r := ""
		for rr in ["f", "s", "g"]:
			if rem[rr] > 0 and k.res[rr] >= 1.0:
				r = rr
				break
		if r == "":
			break
		var amt := mini(5, mini(rem[r], int(floor(k.res[r]))))
		if amt <= 0:
			break
		k.res[r] -= amt
		on.paid[r] += amt
		G.pay_t += 0.035
		G.fly.append({ "x0": h.x, "y0": h.y, "x1": on.x, "y1": on.y, "t": 0.0, "r": r })
		sfx("pay", 0.45)
	if G.pay_t < 0.0:
		G.pay_t = 0.0
	var rem2 := remaining(on)
	if rem2.f <= 0 and rem2.s <= 0 and rem2.g <= 0 and not on.cost.is_empty():
		on.paid = { "f": 0, "s": 0, "g": 0 }
		sfx("buy")
		G.buy_cd = 0.5
		if on.unit == "koylu":
			var v := make_unit(k, "koylu", k.castle.x, k.castle.y, "work")
			v.job = on.job
			v.vs = "toNode"
			float_text(on.x, on.y, 3.0, "+1 Köylü", Color.WHITE, 15.0)
		elif on.unit != "":
			train_at(k, on.unit)
			G.stats.trained += 1
			float_text(on.x, on.y, 3.0, "+1 " + on.label, Color.WHITE, 15.0)
		elif on.build != "":
			on.done = true
			on.bld = add_bld(k, on.build, on.x, on.y, false)
			if on.build == "farm":
				k.farm_slot += 1
			G.stats.built += 1
			smoke(on.x, on.y, 0.5, 8, 1.4)
			sfx("build")
			float_text(on.x, on.y, 5.0, Data.BT[on.build].name + " inşa ediliyor", Color("#ffd75e"), 16.0)
		elif on.is_age:
			start_age(k)
			if k.age + 2 < Data.AGES.size():
				on.cost = Data.AGES[k.age + 2].cost.duplicate()
		elif on.is_upg:
			apply_upgrade(k)
			h.dmg *= 1.08
			on.cost = { "f": 60 + 40 * k.upg_lv, "g": 60 + 40 * k.upg_lv }
			float_text(on.x, on.y, 3.0, "Ordu güçlendi! (%d)" % k.upg_lv, Color("#ffd75e"), 18.0)
			if k.upg_lv >= 5:
				on.done = true
		on.key = ""

# ================================================================ RENDER SYNC
const GOLD_C := Color("#ffd24a")
const STONE_C := Color("#a9afb5")
const FOOD_C := Color("#e8c35a")

func res_col(r: String) -> Color:
	return GOLD_C if r == "g" else (STONE_C if r == "s" else FOOD_C)

func add_bar(x: float, y: float, z: float, w: float, ratio: float, col: Color) -> void:
	var o := Geo.p3(x, y, z)
	P.barBg.add(Transform3D(Basis.IDENTITY.scaled(Vector3(w + 0.14, 1.4, 1)), o))
	var o2 := o - Vector3((1.0 - ratio) * w / 2.0, 0, 0)
	P.barFg.add(Transform3D(Basis.IDENTITY.scaled(Vector3(maxf(0.001, w * ratio), 1, 1)), o2 + Vector3(0, 0, 0.01)), col)

func sync(dt: float) -> void:
	for key in P:
		P[key].begin()
	var h: Unit = G.hero
	CAMP = Vector2(cam_target.x / Geo.K + Geo.MC, cam_target.z / Geo.K + Geo.MC)
	for u in G.units:
		var vis: bool
		if u.role == "hero":
			vis = G.hero_dead <= 0.0
		else:
			vis = absf(u.x - CAMP.x) < 190.0 and u.y - CAMP.y > -400.0 and u.y - CAMP.y < 240.0
		u.vis = vis
		if u.node.visible != vis:
			u.node.visible = vis
			u.ap.active = vis
			if u.ap_low:
				u.ap_low.active = vis
			if u.horse_ap:
				u.horse_ap.active = vis
		if not vis:
			continue
		u.gy = Geo.ground_y(u.x, u.y)
		var y: float = u.gy
		if u.dying > 0.0 and not u.T.get("horse", false) and u.dying < 0.8:
			y -= (0.8 - u.dying) * 1.6
		u.node.position = Vector3(Geo.x3(u.x), y, Geo.z3(u.y))
		u.node.rotation.y = u.rot
		if u.horse:
			var ha := "AnimalArmature|Death" if u.dying > 0.0 else ("AnimalArmature|Gallop" if u.moving else "AnimalArmature|Idle")
			if ha != u.horse_anim:
				u.horse_anim = ha
				u.horse_ap.play(ha, 0.2, 1.4 if u.role == "hero" else 1.0)
			u.bob += dt * (9.0 if u.moving else 2.0)
			u.body.position.y = 2.05 + (absf(sin(u.bob)) * 0.12 if u.moving else sin(u.bob) * 0.015)
		if u.dying > 0.0:
			if u.cur_anim != "Death_A":
				play(u, "Death_A", true, 1.0, 0.1)
		elif not (u.atk_t > 0.0):
			if u.moving:
				play(u, run_anim(u))
			else:
				play(u, "Idle" if u.role == "koylu" and u.vs == "work" else idle_anim(u))
		if alive(u):
			var cc: Color = u.k.civ.color
			var ds := 1.6 if u.T.get("horse", false) else 1.0
			P.disc.add(Transform3D(Basis.IDENTITY.scaled(Vector3(ds, 1, ds)), Vector3(Geo.x3(u.x), u.gy + 0.08, Geo.z3(u.y))), cc)
			if u.hp < u.maxhp:
				var bz: float = (6.4 if u.role == "hero" else 5.2) if u.T.get("horse", false) else u.T.h + 0.7
				add_bar(u.x, u.y, u.gy + bz, 2.4 if u.T.get("horse", false) else 1.6, u.hp / u.maxhp, cc)
			if u.carry != "":
				P.carry.add(Transform3D(Basis(Vector3.UP, u.rot), Vector3(Geo.x3(u.x), u.gy + 2.75, Geo.z3(u.y))), res_col("g" if u.carry == "gold" else ("s" if u.carry == "stone" else "f")))
	hero_ring.visible = G.hero_dead <= 0.0
	if hero_ring.visible:
		hero_ring.position = Vector3(Geo.x3(h.x), h.gy + 0.12, Geo.z3(h.y))
		(hero_ring.material_override as StandardMaterial3D).albedo_color.a = 0.5 + sin(G.t * 5.0) * 0.3
	for b in G.blds:
		if b.hp <= 0.0:
			continue
		var near: bool = absf(b.x - CAMP.x) < 240.0 and b.y - CAMP.y > -460.0 and b.y - CAMP.y < 300.0
		b.node.visible = near
		if not near:
			continue
		var cc: Color = b.k.civ.color
		var by: float = b.node.position.y
		if b.build_t > 0.0:
			add_bar(b.x, b.y, by + 5.0, 3.0, 1.0 - b.build_t / 3.0, GOLD_C)
		elif b.type == "castle" and b.k.age_t > 0.0:
			add_bar(b.x, b.y, by + 16.0, 5.0, 1.0 - b.k.age_t / Data.AGES[b.k.age + 1].time, GOLD_C)
		elif b.hp < b.maxhp:
			add_bar(b.x, b.y, by + (16.0 if b.type == "castle" else (10.0 if b.type == "tower" else 7.0)), 4.0, b.hp / b.maxhp, cc)
	for c in G.coins:
		P.coin.add(Transform3D(Basis(Vector3.UP, c.spin), Vector3(Geo.x3(c.x), c.z + Geo.ground_y(c.x, c.y), Geo.z3(c.y))))
	for f in G.fly:
		var x: float = f.x0 + (f.x1 - f.x0) * f.t
		var y: float = f.y0 + (f.y1 - f.y0) * f.t
		var z := Geo.ground_y(x, y) + 2.6 + sin(f.t * PI) * 3.0
		var xf := Transform3D(Basis(Vector3.UP, f.t * 10.0).scaled(Vector3.ONE * 0.8), Vector3(Geo.x3(x), z, Geo.z3(y)))
		if f.r == "g":
			P.coin.add(xf)
		else:
			P.carry.add(xf, res_col(f.r))
	for p in G.proj:
		if not near_cam(p.x0, p.y0) and not near_cam(p.tx, p.ty):
			continue
		var kk := minf(1.0, p.t / p.T)
		var a := _proj_pos(p, kk)
		var b := _proj_pos(p, minf(1.0, kk + 0.04))
		var dv := b - a
		if dv.length_squared() < 1e-8:
			dv = Vector3(0, 0, 1)
		P.arrow.add(Transform3D(Basis.looking_at(-dv.normalized(), Vector3.UP if absf(dv.normalized().y) < 0.99 else Vector3.RIGHT), a))
	for p in G.parts:
		var a: float = 1.0 - p.t / p.life
		var pos := Vector3(Geo.x3(p.x), p.z + p.gy, Geo.z3(p.y))
		if p.pool == "smoke":
			var s: float = p.r * (1.6 - a * 0.8) * minf(1.0, a * 3.0)
			P.smoke.add(Transform3D(Basis.IDENTITY.scaled(Vector3.ONE * s), pos), Color(0.92, 0.92, 0.92, 0.5 * a))
		else:
			var s: float = minf(1.0, a * 2.0) * p.r
			P.spark.add(Transform3D(Basis.from_euler(Vector3(p.rot, p.rot * 0.7, 0)).scaled(Vector3.ONE * s), pos), p.col)
	for key in P:
		P[key].end()
	var pk: Kingdom = G.pk
	for p in G.pads:
		var st := pad_state(p, pk) and pk.alive
		p.node.visible = st
		if not st or not near_cam(p.x, p.y):
			continue
		_draw_pad(p, pk)
		var s := 1.0 + sin(G.t * 10.0) * 0.03 if G.on_pad == p else 1.0
		p.node.scale = Vector3(s, 1, s)
	# camera
	var fx: float = pk.x if G.hero_dead > 0.0 else h.x
	var fy: float = pk.y if G.hero_dead > 0.0 else h.y
	var kk2 := minf(1.0, dt * 5.0)
	cam_target.x += (Geo.x3(fx) - cam_target.x) * kk2
	cam_target.z += (Geo.z3(fy) - 5.0 - cam_target.z) * kk2
	cam_target.y += (maxf(0.0, Geo.gy(fx, fy)) - cam_target.y) * kk2
	var cp := cam_target + CAMDIR * cam_dist * zoom
	if G.shake > 0.0:
		cp += Vector3((randf() - 0.5) * G.shake * 2.0, (randf() - 0.5) * G.shake * 2.0, 0)
	cam.look_at_from_position(cp, cam_target)
	world.update(Time.get_ticks_msec() / 1000.0, dt)
	_sync_floats(dt)
	hud.minimap_dirty = true

func _proj_pos(p: Dictionary, k: float) -> Vector3:
	var x: float = p.x0 + (p.tx - p.x0) * k
	var y: float = p.y0 + (p.ty - p.y0) * k
	return Vector3(Geo.x3(x), p.z0 * (1.0 - k) + 1.3 * k + p.h * 4.0 * k * (1.0 - k) + Geo.ground_y(x, y), Geo.z3(y))

func _sync_floats(dt: float) -> void:
	var i := 0
	for f in floats:
		f.t += dt
	floats = floats.filter(func(f): return f.t < 1.4)
	for f in floats:
		var l: Label3D
		if i < _float_pool.size():
			l = _float_pool[i]
		else:
			l = Label3D.new()
			l.font = _font()
			l.font_size = 48
			l.outline_size = 12
			l.outline_modulate = Color(0, 0, 0, 0.85)
			l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
			l.no_depth_test = true
			l.fixed_size = true
			l.render_priority = 20
			l.outline_render_priority = 19
			l.shaded = false
			add_child(l)
			_float_pool.append(l)
		l.visible = true
		l.text = f.txt
		l.pixel_size = f.size * 0.000085
		var a: float = minf(1.0, (1.4 - f.t) * 2.0)
		var c: Color = f.c
		l.modulate = Color(c.r, c.g, c.b, a)
		l.outline_modulate = Color(0, 0, 0, 0.85 * a)
		l.position = Vector3(Geo.x3(f.x), f.z + f.t * 3.0 + Geo.ground_y(f.x, f.y), Geo.z3(f.y))
		i += 1
	while i < _float_pool.size():
		_float_pool[i].visible = false
		i += 1

# ================================================================ INPUT / FLOW
func _unhandled_key_input(e: InputEvent) -> void:
	if e is InputEventKey:
		if e.pressed:
			keys[e.keycode] = true
		else:
			keys.erase(e.keycode)

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_GO_BACK_REQUEST:
		if hud and hud.overlay.visible:
			get_tree().quit()
		elif running and not G.is_empty():
			G.paused = true
			hud.show_pause()

func start(level: int) -> void:
	audio.start()
	new_game(level, chosen_civ)
	running = true
	story("intro")

func on_win_next() -> void:
	var nxt: int = G.level + 1
	if nxt > best:
		best = nxt
		save_prefs()
	start(nxt)
