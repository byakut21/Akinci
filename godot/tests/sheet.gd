extends SceneTree
func _init():
	var args = OS.get_cmdline_user_args(); var out = args[0]; var names = args.slice(1)
	var w = Node3D.new(); root.add_child(w)
	var cols = 5
	for i in names.size():
		var p = names[i] if names[i].begins_with("res://") else "res://assets/rts/%s.glb" % names[i]
		var s = Assets.model(p, 6.0); w.add_child(s)
		s.position = Vector3((i % cols) * 9.0 - 18, 0, (i / cols) * 10.0 - 15)
		var lb = Label3D.new(); lb.text = p.get_file().get_basename().replace("_FirstAge","_1A").replace("_SecondAge","_2A"); lb.font_size = 64; lb.pixel_size = 0.012; lb.rotation_degrees = Vector3(-60,0,0); lb.position = s.position + Vector3(0, 0.2, 4.2); lb.outline_size = 12; w.add_child(lb)
	var g = MeshInstance3D.new(); var pm = PlaneMesh.new(); pm.size = Vector2(120,120); g.mesh = pm; var gm = StandardMaterial3D.new(); gm.albedo_color = Color(0.36,0.5,0.22); g.material_override = gm; w.add_child(g)
	var cam = Camera3D.new(); cam.fov = 42; w.add_child(cam); cam.look_at_from_position(Vector3(0, 40, 30), Vector3(0,0,1))
	var l = DirectionalLight3D.new(); w.add_child(l); l.rotation_degrees = Vector3(-50, -35, 0); l.shadow_enabled = true; l.light_energy = 1.3
	var we = WorldEnvironment.new(); var e = Environment.new(); e.background_mode = Environment.BG_COLOR; e.background_color = Color(0.6,0.7,0.8); e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR; e.ambient_light_color = Color(0.75,0.8,0.9); e.ambient_light_energy = 0.9; e.tonemap_mode = Environment.TONE_MAPPER_AGX; we.environment = e; w.add_child(we)
	for i in 6: await process_frame
	root.get_texture().get_image().save_png(out); quit()
