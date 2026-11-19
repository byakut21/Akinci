extends SceneTree
func pad(g, id):
	for p in g.G.pads:
		if p.id == id: return p
func stand(g, id, secs):
	var p = pad(g, id); g.G.hero.x = p.x; g.G.hero.y = p.y
	for i in int(secs * 20): 
		g.G.hero.x = p.x; g.G.hero.y = p.y; g.update(0.05)
		if g.G.paused: g.G.paused = false
func _init():
	var g = load("res://scenes/main.tscn").instantiate(); root.add_child(g)
	await process_frame; await process_frame
	g.chosen_civ = 5; g.start(1); g.hud.overlay.visible = false; g.G.paused = false; g.running = false
	var pk = g.G.pk
	print("start vill ", g.villagers(pk), " res ", pk.res)
	stand(g, "v_food", 3.0); print("after food pad vill ", g.villagers(pk), " res ", pk.res)
	stand(g, "house0", 2.0); print("house pad: blds ", pk.blds.size(), " cap ", g.pop_cap(pk))
	for i in 80: g.update(0.05)
	print("cap after build ", g.pop_cap(pk))
	pk.res.f += 2000; pk.res.s += 2000; pk.res.g += 2000
	stand(g, "age", 2.0); print("age_t ", pk.age_t)
	for i in 400: g.update(0.05); g.G.paused = false
	print("age ", pk.age, " quest ", g.G.q)
	stand(g, "barracks", 3.0); for i in 80: g.update(0.05)
	stand(g, "u_piyade", 6.0); print("army ", g.army_of(pk).size())
	stand(g, "cmd_follow", 1.0); print("mode ", g.G.army_mode, " states ", g.army_of(pk).map(func(u): return u.state))
	stand(g, "age", 2.0); for i in 600: g.update(0.05); g.G.paused = false
	print("age ", pk.age, " uniq name ", g.make_unit(pk, pk.civ.uniq, pk.x, pk.y, "rally").T.name)
	for f in 30: g.sync(0.05)
	g.G.hero.x = pk.castle.x; g.G.hero.y = pk.castle.y - 60; g.zoom = 0.75
	for f in 30: g.sync(0.1)
	for f in 10: await process_frame
	root.get_texture().get_image().save_png("/tmp/flow.png")
	print("msgs ", g.G.msgs.map(func(m): return m.text))
	quit()
