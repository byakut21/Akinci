extends SceneTree
func _init():
	var w = Node3D.new(); root.add_child(w)
	var names = ["TownCenter_FirstAge_Level1","TownCenter_FirstAge_Level3","TownCenter_SecondAge_Level3","Barracks_SecondAge_Level2","Archery_SecondAge_Level2","WatchTower_SecondAge_Level2","Houses_FirstAge_1_Level1","Houses_SecondAge_2_Level2","Farm_FirstAge_Level2_Wheat","Mine","Storage_SecondAge_Level2","Market_SecondAge_Level2","Temple_SecondAge_Level2","Windmill_SecondAge","Port_SecondAge_Level2","Wonder_SecondAge_Level3"]
	for i in names.size():
		var s = Assets.model("res://assets/rts/%s.glb" % names[i], 6.0); w.add_child(s)
		s.position = Vector3((i % 4) * 8.0 - 12, 0, (i / 4) * 8.0 - 12)
		var a = Assets._norm["res://assets/rts/%s.glb" % names[i]]; print(names[i], " ", a.size)
	var g = MeshInstance3D.new(); var pm = PlaneMesh.new(); pm.size = Vector2(80,80); g.mesh = pm; var gm = StandardMaterial3D.new(); gm.albedo_color = Color(0.36,0.5,0.22); g.material_override = gm; w.add_child(g)
	var cam = Camera3D.new(); cam.fov = 40; w.add_child(cam); cam.look_at_from_position(Vector3(0, 30, 30), Vector3(0,0,-1))
	var l = DirectionalLight3D.new(); w.add_child(l); l.rotation_degrees = Vector3(-50, -35, 0); l.shadow_enabled = true; l.light_energy = 1.4; l.light_color = Color(1,0.92,0.8)
	var we = WorldEnvironment.new(); var e = Environment.new(); e.background_mode = Environment.BG_SKY; e.sky = Sky.new(); e.sky.sky_material = ProceduralSkyMaterial.new(); e.ambient_light_source = Environment.AMBIENT_SOURCE_SKY; e.tonemap_mode = Environment.TONE_MAPPER_AGX; e.glow_enabled = true; we.environment = e; w.add_child(we)
	for i in 8: await process_frame
	root.get_texture().get_image().save_png("/tmp/lineup.png"); quit()
