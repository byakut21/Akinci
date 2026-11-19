extends SceneTree
func _init():
	var g = load("res://scenes/main.tscn").instantiate(); root.add_child(g)
	await process_frame; await process_frame
	g.chosen_civ = 0; g.start(1); g.hud.overlay.visible = false; g.G.paused = false; g.running = false
	for i in 3600:
		g.update(0.1)
		if g.G.paused: g.G.paused = false; g.hud.overlay.visible = false
	g.hud.overlay.visible = false
	var best = null; var bn = 0
	for k in g.G.ks:
		var n = g.army_of(k).size()
		if n > bn and k.alive: bn = n; best = k
	var a = g.army_of(best)
	var cx = 0.0; var cy = 0.0
	for u in a: cx += u.x; cy += u.y
	cx /= a.size(); cy /= a.size()
	print("army ", bn, " roles ", a.map(func(u): return u.role))
	g.G.hero.x = cx; g.G.hero.y = cy + 25; g.zoom = 0.3
	for f in 20: 
		g.update(0.05); g.sync(0.05)
		await process_frame
	root.get_texture().get_image().save_png("/tmp/army.png")
	quit()
