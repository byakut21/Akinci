extends SceneTree
func dump(n, d=0):
	var s = "  ".repeat(d) + n.name + " <" + n.get_class() + ">"
	if n is MeshInstance3D:
		var mats = []
		for i in n.mesh.get_surface_count(): 
			var m = n.mesh.surface_get_material(i); mats.append(m.resource_name if m else "-")
		s += " mats=" + str(mats) + " aabb=" + str(n.get_aabb().size)
	if n is AnimationPlayer: s += " anims=" + str(n.get_animation_list().size()) + " " + str(n.get_animation_list().slice(0,6))
	if n is Skeleton3D: s += " bones=" + str(n.get_bone_count())
	print(s)
	if d < 4:
		for c in n.get_children(): dump(c, d+1)
func _init():
	for p in OS.get_cmdline_user_args():
		print("=== ", p); var sc = load(p).instantiate(); dump(sc)
	quit()
