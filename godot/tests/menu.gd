extends SceneTree
func _init():
	var main = load("res://scenes/main.tscn").instantiate(); root.add_child(main)
	for f in 14: await process_frame
	root.get_texture().get_image().save_png("/tmp/m0.png")
	main.start(1)
	for f in 8: await process_frame
	root.get_texture().get_image().save_png("/tmp/m1.png")
	var q = main.G.pk.quarry
	main.G.hero.x = q.x; main.G.hero.y = q.y + 30; main.zoom = 0.35
	main.hud.overlay.visible = false; main.G.paused = false; main.G.moved = true
	for f in 30: main.sync(0.1)
	for f in 8: await process_frame
	root.get_texture().get_image().save_png("/tmp/m2.png")
	quit()
