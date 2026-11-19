class_name Assets
## Model loading helpers: cached scenes, size normalisation, mesh extraction.

static var _scenes := {}
static var _norm := {}
static var _meshes := {}

static func scene(path: String) -> PackedScene:
	if not _scenes.has(path):
		_scenes[path] = load(path)
	return _scenes[path]

static func rel_xform(n: Node, root: Node) -> Transform3D:
	var t := Transform3D.IDENTITY
	var c := n
	while c != null and c != root:
		if c is Node3D:
			t = (c as Node3D).transform * t
		c = c.get_parent()
	return t

static func aabb_of(root: Node3D) -> AABB:
	var out := AABB()
	var first := true
	for m in root.find_children("*", "MeshInstance3D", true, false):
		var mi := m as MeshInstance3D
		if not mi.visible or mi.mesh == null:
			continue
		var a: AABB = rel_xform(mi, root) * mi.get_aabb()
		if first:
			out = a
			first = false
		else:
			out = out.merge(a)
	return out

## Instance a model normalised so its largest horizontal extent is `size`,
## centred on X/Z with its base at y=0. Returns a wrapper Node3D.
static func model(path: String, size: float, by_height := false) -> Node3D:
	var inst: Node3D = scene(path).instantiate()
	if not _norm.has(path):
		var a := aabb_of(inst)
		_norm[path] = a
	var a: AABB = _norm[path]
	var ext: float = a.size.y if by_height else maxf(a.size.x, a.size.z)
	var k := size / maxf(ext, 0.00001)
	var wrap := Node3D.new()
	wrap.name = path.get_file().get_basename()
	wrap.add_child(inst)
	inst.scale = Vector3.ONE * k
	var c := a.get_center()
	inst.position = Vector3(-c.x * k, -a.position.y * k, -c.z * k)
	return wrap

## Single merged mesh (all surfaces of all MeshInstances baked with transforms)
## normalised like model(). Used for MultiMesh scenery and pooled effects.
static func mesh(path: String, size: float, by_height := false, node_name := "") -> Mesh:
	var key := "%s|%s|%s|%s" % [path, size, by_height, node_name]
	if _meshes.has(key):
		return _meshes[key]
	var inst: Node3D = scene(path).instantiate()
	var root: Node3D = inst
	if node_name != "":
		var f := inst.find_child(node_name, true, false)
		if f != null:
			root = f
	var st_list := []
	var a := AABB()
	var first := true
	for m in ([root] if root is MeshInstance3D else []) + root.find_children("*", "MeshInstance3D", true, false):
		var mi := m as MeshInstance3D
		if mi.mesh == null:
			continue
		var xf := rel_xform(mi, inst)
		st_list.append([mi, xf])
		var aa: AABB = xf * mi.get_aabb()
		if first:
			a = aa
			first = false
		else:
			a = a.merge(aa)
	var ext: float = a.size.y if by_height else maxf(a.size.x, a.size.z)
	var k := size / maxf(ext, 0.00001)
	var c := a.get_center()
	var norm := Transform3D(Basis.IDENTITY.scaled(Vector3.ONE * k), Vector3(-c.x * k, -a.position.y * k, -c.z * k))
	var out := ArrayMesh.new()
	# group surfaces by material so a merged mesh keeps one surface per material
	var by_mat := {}
	for pair in st_list:
		var mi: MeshInstance3D = pair[0]
		var xf: Transform3D = norm * pair[1]
		for s in mi.mesh.get_surface_count():
			var mat: Material = mi.get_active_material(s)
			var mk = mat if mat != null else "none"
			if not by_mat.has(mk):
				var st := SurfaceTool.new()
				st.begin(Mesh.PRIMITIVE_TRIANGLES)
				by_mat[mk] = st
			(by_mat[mk] as SurfaceTool).append_from(mi.mesh, s, xf)
	for mk in by_mat:
		var st: SurfaceTool = by_mat[mk]
		if mk is Material:
			st.set_material(mk)
		st.commit(out)
	inst.free()
	_meshes[key] = out
	return out

## Duplicate every material under `root` so it can be tinted independently.
static func unique_materials(root: Node) -> Array:
	var mats := []
	for m in root.find_children("*", "MeshInstance3D", true, false):
		var mi := m as MeshInstance3D
		for s in mi.mesh.get_surface_count():
			var mat := mi.get_active_material(s)
			if mat == null:
				continue
			var d: Material = mat.duplicate()
			mi.set_surface_override_material(s, d)
			mats.append(d)
	return mats

static func set_shadow(root: Node, on: bool) -> void:
	for m in root.find_children("*", "MeshInstance3D", true, false):
		(m as GeometryInstance3D).cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if on else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
