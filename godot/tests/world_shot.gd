extends SceneTree
func _init():
	var args = OS.get_cmdline_user_args()
	var w = World.new(); root.add_child(w)
	var t0 = Time.get_ticks_msec(); w.build(); print("build ms ", Time.get_ticks_msec() - t0)
	var cam = Camera3D.new(); cam.fov = 38; cam.far = 400; w.add_child(cam)
	var shots = [[Geo.KPOS[0].x, Geo.KPOS[0].y - 120, 1.0], [Geo.MC + 0, Geo.MC + 390, 1.0], [Geo.MC + 560, Geo.MC + 760, 1.6]]
	var i = 0
	for s in shots:
		var tgt = Geo.p3(s[0], s[1], Geo.ground_y(s[0], s[1]))
		var dir = Vector3(0, .76, .65).normalized()
		cam.look_at_from_position(tgt + dir * 58 * s[2], tgt)
		for f in 4: await process_frame
		root.get_texture().get_image().save_png("/tmp/w%d.png" % i); i += 1
	quit()
