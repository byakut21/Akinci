extends SceneTree
func _init():
	for p in ["res://assets/animals/Horse.glb", "res://assets/chars/knight.glb", "res://assets/chars/rogue.glb"]:
		var s = load(p).instantiate(); root.add_child(s)
		var sk: Skeleton3D = s.find_children("*", "Skeleton3D", true, false)[0]
		var names = []; for i in sk.get_bone_count(): names.append(sk.get_bone_name(i))
		print(p, " skel path=", s.get_path_to(sk), " ", names)
		var ap = s.find_children("*", "AnimationPlayer", true, false)
		if ap.size(): 
			var a: Animation = ap[0].get_animation(ap[0].get_animation_list()[0]); print(" root_node=", ap[0].root_node, " track0=", a.track_get_path(0), " len=", a.length)
		print(" aabb=", Assets.aabb_of(s))
	quit()
