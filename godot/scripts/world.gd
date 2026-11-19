class_name World
extends Node3D
## Landscape: textured height-mapped terrain, inland sea, sky, vegetation, ships.

var sun: DirectionalLight3D
var env: Environment
var ships := []
var _rng := RandomNumberGenerator.new()

const NAT := "res://assets/nature/%s.glb"

func build() -> void:
	Geo.init()
	_rng.seed = 77
	_build_env()
	_build_terrain()
	_build_water()
	_build_scenery()
	_build_ships()

# ------------------------------------------------------------------ sky, light
func _build_env() -> void:
	var we := WorldEnvironment.new()
	env = Environment.new()
	var sky := Sky.new()
	var sm := ProceduralSkyMaterial.new()
	sm.sky_top_color = Color(0.32, 0.52, 0.78)
	sm.sky_horizon_color = Color(0.72, 0.8, 0.88)
	sm.ground_horizon_color = Color(0.62, 0.68, 0.72)
	sm.ground_bottom_color = Color(0.3, 0.32, 0.3)
	sm.sun_angle_max = 20.0
	sm.sun_curve = 0.12
	sky.sky_material = sm
	env.sky = sky
	env.background_mode = Environment.BG_SKY
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_sky_contribution = 1.0
	env.ambient_light_energy = 0.85
	env.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = 0.92
	env.tonemap_white = 6.0
	env.glow_enabled = true
	env.glow_intensity = 0.35
	env.glow_bloom = 0.04
	env.glow_hdr_threshold = 1.1
	env.fog_enabled = true
	env.fog_mode = Environment.FOG_MODE_DEPTH
	env.fog_light_color = Color(0.7, 0.78, 0.86)
	env.fog_depth_begin = 70.0
	env.fog_depth_end = 220.0
	env.fog_depth_curve = 1.4
	env.fog_density = 1.0
	env.fog_aerial_perspective = 0.4
	env.adjustment_enabled = true
	env.adjustment_saturation = 1.08
	env.adjustment_contrast = 1.06
	we.environment = env
	add_child(we)

	sun = DirectionalLight3D.new()
	sun.light_color = Color(1.0, 0.9, 0.76)
	sun.light_energy = 1.55
	sun.shadow_enabled = true
	sun.shadow_bias = 0.04
	sun.shadow_normal_bias = 1.2
	sun.shadow_blur = 1.2
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS
	sun.directional_shadow_split_1 = 0.25
	sun.directional_shadow_max_distance = 140.0
	sun.directional_shadow_blend_splits = true
	sun.rotation_degrees = Vector3(-46, -58, 0)
	add_child(sun)

# ------------------------------------------------------------------ terrain
func _tex(path: String) -> Texture2D:
	return load(path)

func _noise_tex(freq: float, size := 256, normal := false, seed := 1) -> NoiseTexture2D:
	var n := FastNoiseLite.new()
	n.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	n.frequency = freq
	n.fractal_octaves = 4
	n.seed = seed
	var t := NoiseTexture2D.new()
	t.width = size
	t.height = size
	t.seamless = true
	t.noise = n
	t.generate_mipmaps = true
	if normal:
		t.as_normal_map = true
		t.bump_strength = 6.0
	return t

func _build_terrain() -> void:
	var img := Image.create_from_data(Geo.GN + 1, Geo.GN + 1, false, Image.FORMAT_RF, Geo.HG.to_byte_array())
	var htex := ImageTexture.create_from_image(img)
	var sp := Image.new()
	sp.load_png_from_buffer(FileAccess.get_file_as_bytes("res://data/splat.pngdata"))
	var stex := ImageTexture.create_from_image(sp)
	var mat := ShaderMaterial.new()
	mat.shader = load("res://shaders/terrain.gdshader")
	mat.set_shader_parameter("heightmap", htex)
	mat.set_shader_parameter("splat", stex)
	mat.set_shader_parameter("grass_alb", _tex("res://assets/tex/ground037_alb_ht.png"))
	mat.set_shader_parameter("grass_nrm", _tex("res://assets/tex/ground037_nrm_rgh.png"))
	mat.set_shader_parameter("rock_alb", _tex("res://assets/tex/rock023_alb_ht.png"))
	mat.set_shader_parameter("rock_nrm", _tex("res://assets/tex/rock023_nrm_rgh.png"))
	mat.set_shader_parameter("cloud_noise", _noise_tex(0.012, 256, false, 5))
	mat.set_shader_parameter("macro_noise", _noise_tex(0.02, 256, false, 9))
	var half := Geo.GSPAN * Geo.K * 0.5
	mat.set_shader_parameter("world_half", half)
	mat.set_shader_parameter("texel", Geo.GC * Geo.K)
	var pm := PlaneMesh.new()
	pm.size = Vector2(half * 2.0, half * 2.0)
	pm.subdivide_width = 299
	pm.subdivide_depth = 299
	var mi := MeshInstance3D.new()
	mi.mesh = pm
	mi.material_override = mat
	mi.extra_cull_margin = 60.0
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	add_child(mi)

# ------------------------------------------------------------------ water
func _build_water() -> void:
	var mat := ShaderMaterial.new()
	mat.shader = load("res://shaders/water.gdshader")
	mat.set_shader_parameter("n1", _noise_tex(0.03, 256, true, 21))
	mat.set_shader_parameter("n2", _noise_tex(0.06, 256, true, 22))
	mat.set_shader_parameter("foam_noise", _noise_tex(0.05, 256, false, 23))
	mat.set_shader_parameter("sea_r", Geo.SEA_R * Geo.K)
	var cm := CylinderMesh.new()
	cm.top_radius = (Geo.SEA_R + 80.0) * Geo.K
	cm.bottom_radius = cm.top_radius
	cm.height = 0.001
	cm.radial_segments = 96
	cm.rings = 1
	cm.cap_bottom = false
	var pm := PlaneMesh.new()
	pm.size = Vector2(1, 1) * (Geo.SEA_R + 80.0) * Geo.K * 2.0
	pm.subdivide_width = 60
	pm.subdivide_depth = 60
	var mi := MeshInstance3D.new()
	mi.mesh = pm
	mi.material_override = mat
	mi.position.y = -0.22
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)

# ------------------------------------------------------------------ vegetation & rocks
var _deco := {}

func _add(kind: String, px: float, py: float, sc: float, sink := 0.08) -> void:
	if not _deco.has(kind):
		_deco[kind] = []
	_deco[kind].append([Geo.x3(px), Geo.gy(px, py) - sink, Geo.z3(py), sc, _rng.randf() * TAU])

func _pick(a: Array) -> String:
	return a[_rng.randi() % a.size()]

func _build_scenery() -> void:
	var trees := ["CommonTree_1", "CommonTree_2", "CommonTree_3", "CommonTree_4", "CommonTree_5", "BirchTree_1", "BirchTree_2", "BirchTree_3"]
	var pines := ["PineTree_1", "PineTree_2", "PineTree_3", "PineTree_4", "PineTree_5"]
	var rocks := ["Rock_Moss_1", "Rock_Moss_2", "Rock_Moss_3", "Rock_Moss_4", "Rock_Moss_5", "Rock_Moss_6", "Rock_Moss_7"]
	var bare := ["Rock_1", "Rock_2", "Rock_3", "Rock_4", "Rock_5", "Rock_6", "Rock_7"]
	var snow := ["PineTree_Snow_1", "PineTree_Snow_2", "PineTree_Snow_3"]
	for i in 14000:
		var px := Geo.G0 + _rng.randf() * Geo.GSPAN
		var py := Geo.G0 + _rng.randf() * Geo.GSPAN
		var f := Geo.fields(px, py)
		var dc := f.x
		var near := f.y
		var road := f.z
		if dc > Geo.MW / 2.0 + 330.0 or dc < Geo.SEA_R + 60.0:
			continue
		var h := Geo.gy(px, py)
		var wedge := Geo.smooth(360, 560, near) * Geo.smooth(420, 640, dc)
		var rim := Geo.smooth(Geo.R_PLAY - 90, Geo.R_PLAY + 220, dc)
		if near < 340.0 or road < 42.0:
			continue
		var x := _rng.randf()
		if h > 22.0:
			if x < 0.03:
				_add(_pick(snow) if x < 0.022 else _pick(bare), px, py, 2.0 + _rng.randf() * 2.0)
			continue
		if h > 11.0:
			if x < 0.18:
				_add(_pick(pines) if x < 0.15 else _pick(bare), px, py, (3.2 + _rng.randf() * 2.4) if x < 0.15 else (1.6 + _rng.randf() * 1.6))
			continue
		if wedge > 0.3 or (rim > 0.05 and h < 11.0):
			if x < 0.6 * maxf(wedge, rim):
				_add(_pick(pines) if _rng.randf() < 0.35 else _pick(trees), px, py, 3.4 + _rng.randf() * 2.2)
			elif x < 0.66 * maxf(wedge, rim):
				_add(_pick(["Bush_1", "Bush_2", "BushBerries_1"]), px, py, 1.4 + _rng.randf())
			continue
		if x < 0.012:
			_add(_pick(trees), px, py, 3.2 + _rng.randf() * 1.6)
		elif x < 0.02:
			_add(_pick(rocks), px, py, 1.2 + _rng.randf() * 1.4)
		elif x < 0.03:
			_add(_pick(["Bush_1", "Bush_2"]), px, py, 1.2 + _rng.randf() * 0.6)
	# shoreline reeds / lilies
	for i in 60:
		var a := _rng.randf() * TAU
		var d := Geo.SEA_R - 5.0 + _rng.randf() * 40.0
		var px := Geo.MC + cos(a) * d
		var py := Geo.MC + sin(a) * d
		if d < Geo.SEA_R + 12.0:
			_add("Lilypad", px, py, 1.2 + _rng.randf(), -0.18 - Geo.gy(px, py))
		else:
			_add(_pick(["Plant_1", "Plant_2", "Plant_3"]), px, py, 1.0 + _rng.randf() * 0.6)
	# ground cover: grass tufts and flowers across the open plains
	for i in 16000:
		var px := Geo.G0 + _rng.randf() * Geo.GSPAN
		var py := Geo.G0 + _rng.randf() * Geo.GSPAN
		var f := Geo.fields(px, py)
		if f.x > Geo.R_PLAY + 40.0 or f.x < Geo.SEA_R + 70.0 or f.z < 30.0:
			continue
		if Geo.gy(px, py) > 9.0:
			continue
		var r := _rng.randf()
		var kind := "Grass" if r < 0.45 else ("Grass_2" if r < 0.8 else ("Grass_Short" if r < 0.93 else "Flowers"))
		_add(kind, px, py, 0.55 + _rng.randf() * 0.45, 0.02)
	for kind in _deco:
		_make_multimesh(kind, _deco[kind])
	_deco.clear()

const CHUNK := 40.0

func _make_multimesh(kind: String, list: Array) -> void:
	var by_height := kind.begins_with("Grass") or kind == "Flowers"
	var base := 1.0
	var mesh := Assets.mesh(NAT % kind, base, true)
	var small := by_height or kind.begins_with("Plant") or kind == "Lilypad"
	var chunks := {}
	for it in list:
		var key := Vector2i(floor(it[0] / CHUNK), floor(it[2] / CHUNK))
		if not chunks.has(key):
			chunks[key] = []
		chunks[key].append(it)
	for key in chunks:
		var items: Array = chunks[key]
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = mesh
		mm.instance_count = items.size()
		for i in items.size():
			var it: Array = items[i]
			var s: float = it[3] * (0.9 + _rng.randf() * 0.25)
			var b := Basis(Vector3.UP, it[4]).scaled(Vector3(it[3], s, it[3]))
			mm.set_instance_transform(i, Transform3D(b, Vector3(it[0], it[1], it[2])))
		var mmi := MultiMeshInstance3D.new()
		mmi.multimesh = mm
		var ov := _override_for(kind)
		if ov != null:
			mmi.material_override = ov
		if small:
			mmi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			mmi.visibility_range_end = 75.0
			mmi.visibility_range_end_margin = 10.0
			mmi.visibility_range_fade_mode = GeometryInstance3D.VISIBILITY_RANGE_FADE_SELF
		else:
			mmi.visibility_range_end = 170.0
		add_child(mmi)

var _mat_cache := {}

func rock_material() -> Material:
	return _override_for("Rock_x")

func _override_for(kind: String) -> Material:
	var key := ""
	if kind.begins_with("Grass"):
		key = "grass"
	elif kind.begins_with("Rock_Moss"):
		key = "rock_moss"
	elif kind.begins_with("Rock_"):
		key = "rock"
	if key == "":
		return null
	if _mat_cache.has(key):
		return _mat_cache[key]
	var m := ShaderMaterial.new()
	if key == "grass":
		m.shader = load("res://shaders/grass.gdshader")
		m.set_shader_parameter("macro", _noise_tex(0.02, 128, false, 9))
	else:
		m.shader = load("res://shaders/rock.gdshader")
		m.set_shader_parameter("rock_alb", _tex("res://assets/tex/rock023_alb_ht.png"))
		m.set_shader_parameter("rock_nrm", _tex("res://assets/tex/rock023_nrm_rgh.png"))
		m.set_shader_parameter("grass_alb", _tex("res://assets/tex/ground037_alb_ht.png"))
		m.set_shader_parameter("moss", 0.75 if key == "rock_moss" else 0.15)
		m.set_shader_parameter("snow", 0.0)
	_mat_cache[key] = m
	return m

# ------------------------------------------------------------------ ships
func _build_ships() -> void:
	var sails := [Color(0.83, 0.22, 0.25), Color(0.6, 0.35, 0.84), Color(0.18, 0.48, 0.88), Color(0.13, 0.66, 0.35), Color(0.88, 0.54, 0.12), Color(0.95, 0.94, 0.9)]
	var kinds := ["Sail_ship", "Viking_boat", "BoatWSail", "Sail_ship", "Viking_boat", "Boat"]
	for i in 6:
		var big := i < 3
		var s := Assets.model("res://assets/ships/%s.glb" % kinds[i], 7.0 if big else 4.2)
		for mat in Assets.unique_materials(s):
			if mat is BaseMaterial3D and (mat.resource_name.contains("Fabric") or mat.resource_name.contains("White") or mat.resource_name.contains("Red")):
				(mat as BaseMaterial3D).albedo_color = sails[i]
		add_child(s)
		ships.append({ "o": s, "a": i * TAU / 6.0 + _rng.randf(), "rad": (15.0 if big else 22.0) + _rng.randf() * 4.0,
			"sp": (0.035 if big else 0.05) * (1.0 if _rng.randf() < 0.5 else -1.0), "ph": _rng.randf() * 6.0 })

func update(t: float, dt: float) -> void:
	for s in ships:
		s.a += s.sp * dt
		var o: Node3D = s.o
		o.position = Vector3(cos(s.a) * s.rad, -0.3 + sin(t * 1.3 + s.ph) * 0.06, sin(s.a) * s.rad)
		var heading: float = -s.a + (0.0 if s.sp > 0.0 else PI)
		o.rotation = Vector3(sin(t * 1.1 + s.ph) * 0.04, heading, sin(t * 0.9 + s.ph) * 0.035)
