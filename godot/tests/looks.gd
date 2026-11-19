extends SceneTree
func _init():
	var g = load("res://scenes/main.tscn").instantiate(); root.add_child(g)
	await process_frame; await process_frame
	g.start(1); g.hud.overlay.visible = false; g.G.paused = false; g.running = false
	var GameScript = load("res://scripts/game.gd")
	var roles = ["hero", "piyade", "baltaci", "okcu", "suvari", "atliokcu"]
	var bx = 1500.0; var by = 1500.0 + 520.0
	for ci in 6:
		var k = g.make_kingdom.bind(0, ci, false)
		var kd = GameScript.Kingdom.new()
		kd.civ = Data.CIVS[ci]; kd.civ_i = ci; kd.fx = 0; kd.fy = 1; kd.age = 2; kd.castle = g.G.pk.castle
		for ri in roles.size():
			var u = g.make_unit(kd, roles[ri], bx + (ri - 2.5) * 30.0, by + ci * 34.0, "rally")
			u.rot = 0.0
	g.zoom = float(OS.get_cmdline_user_args()[0])
	g.G.pk.x = bx; g.G.pk.y = by + 95; g.G.hero_dead = 100.0
	for f in 10: g.sync(0.05); await process_frame
	root.get_texture().get_image().save_png("/tmp/looks.png")
	quit()
