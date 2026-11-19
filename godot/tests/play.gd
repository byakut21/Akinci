extends SceneTree
# usage: -- <civ> <sim_seconds> <out_prefix> [hx hy zoom]...
func _init():
	var a = OS.get_cmdline_user_args()
	var main = load("res://scenes/main.tscn").instantiate(); root.add_child(main)
	await process_frame
	await process_frame
	var g = main
	g.chosen_civ = int(a[0])
	g.start(1)
	g.hud.overlay.visible = false
	g.G.paused = false
	g.G.moved = true
	g.running = false
	var secs = float(a[1]); var t0 = Time.get_ticks_msec()
	var n = int(secs * 10)
	for i in n:
		g.update(0.1)
		if g.G.paused: 
			g.G.paused = false; g.hud.overlay.visible = false
	print(g.prof); print("sim ms ", Time.get_ticks_msec() - t0, " units ", g.G.units.size(), " blds ", g.G.blds.size(), " ages ", g.G.ks.map(func(k): return k.age), " alive ", g.G.ks.map(func(k): return k.alive), " res ", g.G.pk.res)
	var shots = a.slice(3)
	var idx = 0
	var i = 0
	while i + 2 < shots.size() or i == 0:
		if shots.size() >= 3:
			g.G.hero.x = float(shots[i]); g.G.hero.y = float(shots[i+1]); g.zoom = float(shots[i+2])
		for f in 30: g.sync(0.1)
		for f in 12: await process_frame
		root.get_texture().get_image().save_png("%s%d.png" % [a[2], idx]); idx += 1
		i += 3
		if shots.size() < 3: break
	quit()
