class_name Hud
extends CanvasLayer
## Touch HUD, menus, story cards, quest panel, minimap, joystick.

var game
var font_title: FontFile
var font_body: FontFile
var root: Control
var lbl_res := {}
var lbl_pop: Label
var lbl_lv: Label
var badge: PanelContainer
var status: Label
var status_box: PanelContainer
var quest_box: PanelContainer
var q_title: Label
var q_desc: Label
var q_bar: ProgressBar
var q_n: Label
var feed: VBoxContainer
var hint: Label
var mini: Control
var minimap_dirty := true
var joy_base: Control
var joy_knob: Control
var overlay: Control
var card: PanelContainer
var story_box: Control
var army_bar: Control
var b_target: Button
var b_attack: Button
var b_defend: Button
var b_follow: Button
var army_lbl: Label
var btn_music: Button
var btn_sfx: Button
var _joy_id := -1
var _joy_start := Vector2.ZERO
var _last_hud := ""
var _last_q := ""
var _mini_t := 0
var _emoji := RegEx.new()

const GOLD := Color("#ffd75e")
const PANEL := Color(0.07, 0.07, 0.09, 0.72)

func _ready() -> void:
	_emoji.compile("[\\x{2300}-\\x{23FF}\\x{2600}-\\x{27BF}\\x{1F000}-\\x{1FAFF}\\x{FE0F}]\\s?")
	font_title = _font("cinzel", "900")
	font_body = _font("nunito", "900")
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	var th := Theme.new()
	th.default_font = font_body
	th.default_font_size = 22
	root.theme = th
	var vig := ColorRect.new()
	vig.set_anchors_preset(Control.PRESET_FULL_RECT)
	vig.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var vm := ShaderMaterial.new()
	vm.shader = Shader.new()
	vm.shader.code = "shader_type canvas_item;\nvoid fragment(){ vec2 d = UV - 0.5; float v = smoothstep(0.32, 0.8, length(d * vec2(1.0, 0.75))); COLOR = vec4(0.02, 0.01, 0.0, v * 0.55); }"
	vig.material = vm
	root.add_child(vig)
	_build_top()
	_build_quest()
	_build_feed()
	_build_hint()
	_build_joystick()
	_build_army_bar()
	_build_overlay()

func _font(name: String, w: String) -> FontFile:
	var f: FontFile = load("res://assets/fonts/%s-latin-%s-normal.woff2" % [name, w])
	var ext: FontFile = load("res://assets/fonts/%s-latin-ext-%s-normal.woff2" % [name, w])
	f.fallbacks = [ext]
	return f

func clean(t: String) -> String:
	return _emoji.sub(t, "", true)

func _panel(c := PANEL, radius := 16, border := Color(0, 0, 0, 0), bw := 0) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = c
	sb.set_corner_radius_all(radius)
	sb.border_color = border
	sb.set_border_width_all(bw)
	sb.content_margin_left = 14
	sb.content_margin_right = 14
	sb.content_margin_top = 8
	sb.content_margin_bottom = 8
	sb.shadow_color = Color(0, 0, 0, 0.25)
	sb.shadow_size = 4
	return sb

func _label(t: String, size: int, c := Color.WHITE, f: Font = null) -> Label:
	var l := Label.new()
	l.text = t
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", c)
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.7))
	l.add_theme_constant_override("outline_size", 6)
	if f:
		l.add_theme_font_override("font", f)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l

# ------------------------------------------------------------------ top bar
func _build_top() -> void:
	var top := MarginContainer.new()
	top.set_anchors_preset(Control.PRESET_TOP_WIDE)
	top.add_theme_constant_override("margin_left", 16)
	top.add_theme_constant_override("margin_right", 16)
	top.add_theme_constant_override("margin_top", 44)
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(top)
	var row := HBoxContainer.new()
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top.add_child(row)
	badge = PanelContainer.new()
	badge.add_theme_stylebox_override("panel", _panel(Color(0.55, 0.1, 0.13, 0.92), 14, Color(1, 0.84, 0.37, 0.8), 2))
	badge.mouse_filter = Control.MOUSE_FILTER_IGNORE
	badge.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	var bv := VBoxContainer.new()
	bv.add_theme_constant_override("separation", -4)
	bv.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bv.add_child(_label("AKINCI", 30, GOLD, font_title))
	lbl_lv = _label("", 17, Color(1, 1, 1, 0.92))
	bv.add_child(lbl_lv)
	badge.add_child(bv)
	row.add_child(badge)
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sp.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(sp)
	var right := VBoxContainer.new()
	right.alignment = BoxContainer.ALIGNMENT_BEGIN
	right.mouse_filter = Control.MOUSE_FILTER_IGNORE
	right.add_theme_constant_override("separation", 8)
	row.add_child(right)
	var chips := HBoxContainer.new()
	chips.alignment = BoxContainer.ALIGNMENT_END
	chips.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chips.add_theme_constant_override("separation", 6)
	right.add_child(chips)
	for r in ["f", "s", "g"]:
		var c := _chip(load("res://assets/icons/res_%s.png" % r))
		chips.add_child(c[0])
		lbl_res[r] = c[1]
	var row2 := HBoxContainer.new()
	row2.alignment = BoxContainer.ALIGNMENT_END
	row2.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row2.add_theme_constant_override("separation", 6)
	right.add_child(row2)
	var pc := _chip(load("res://assets/icons/res_p.png"))
	row2.add_child(pc[0])
	lbl_pop = pc[1]
	btn_music = _round_btn("♪")
	btn_music.pressed.connect(func():
		game.audio.start()
		game.audio.set_music(not game.audio.music_on)
		_sync_audio_btns()
		game.save_prefs())
	row2.add_child(btn_music)
	btn_sfx = _round_btn("🔊")
	btn_sfx.text = "SES"
	btn_sfx.add_theme_font_size_override("font_size", 14)
	btn_sfx.pressed.connect(func():
		game.audio.start()
		game.audio.set_sfx(not game.audio.sfx_on)
		_sync_audio_btns()
		game.save_prefs())
	row2.add_child(btn_sfx)
	mini = Control.new()
	mini.custom_minimum_size = Vector2(180, 180)
	mini.mouse_filter = Control.MOUSE_FILTER_IGNORE
	mini.draw.connect(_draw_mini)
	var mrow := HBoxContainer.new()
	mrow.alignment = BoxContainer.ALIGNMENT_END
	mrow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	mrow.add_child(mini)
	right.add_child(mrow)
	# status pill, centred
	status_box = PanelContainer.new()
	status_box.add_theme_stylebox_override("panel", _panel(Color(0.12, 0.42, 0.25, 0.88), 20))
	status_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	status = _label("", 20)
	status_box.add_child(status)
	status_box.set_anchors_preset(Control.PRESET_CENTER_TOP)
	status_box.position = Vector2(-100, 128)
	status_box.grow_horizontal = Control.GROW_DIRECTION_BOTH
	root.add_child(status_box)

func _chip(icon: Texture2D) -> Array:
	var p := PanelContainer.new()
	var sb := _panel(Color(0.06, 0.06, 0.08, 0.7), 20)
	sb.content_margin_left = 8
	sb.content_margin_right = 14
	sb.content_margin_top = 4
	sb.content_margin_bottom = 4
	p.add_theme_stylebox_override("panel", sb)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 6)
	h.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var tr := TextureRect.new()
	tr.texture = icon
	tr.custom_minimum_size = Vector2(30, 30)
	tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	tr.mouse_filter = Control.MOUSE_FILTER_IGNORE
	h.add_child(tr)
	var l := _label("0", 22)
	l.custom_minimum_size.x = 46
	h.add_child(l)
	p.add_child(h)
	return [p, l]

func _round_btn(t: String) -> Button:
	var b := Button.new()
	b.text = t
	b.custom_minimum_size = Vector2(46, 46)
	b.focus_mode = Control.FOCUS_NONE
	for st in ["normal", "hover", "pressed", "focus"]:
		var sb := _panel(Color(0.06, 0.06, 0.08, 0.7) if st != "pressed" else Color(0.3, 0.25, 0.1, 0.8), 23)
		sb.content_margin_left = 4
		sb.content_margin_right = 4
		b.add_theme_stylebox_override(st, sb)
	b.add_theme_font_size_override("font_size", 22)
	return b

func _sync_audio_btns() -> void:
	btn_music.modulate = Color(1, 1, 1, 1.0 if game.audio.music_on else 0.4)
	btn_sfx.modulate = Color(1, 1, 1, 1.0 if game.audio.sfx_on else 0.4)

# ------------------------------------------------------------------ quest / feed / hint
func _build_quest() -> void:
	quest_box = PanelContainer.new()
	quest_box.add_theme_stylebox_override("panel", _panel(Color(0.07, 0.06, 0.05, 0.78), 14, Color(1, 0.84, 0.37, 0.45), 2))
	quest_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	quest_box.position = Vector2(16, 186)
	quest_box.custom_minimum_size = Vector2(330, 0)
	var v := VBoxContainer.new()
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_theme_constant_override("separation", 2)
	var hrow := HBoxContainer.new()
	hrow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	q_title = _label("", 19, GOLD)
	q_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	q_n = _label("", 18)
	hrow.add_child(q_title)
	hrow.add_child(q_n)
	v.add_child(hrow)
	q_desc = _label("", 17, Color(1, 1, 1, 0.9))
	v.add_child(q_desc)
	q_bar = ProgressBar.new()
	q_bar.show_percentage = false
	q_bar.custom_minimum_size = Vector2(0, 6)
	q_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var bgs := StyleBoxFlat.new()
	bgs.bg_color = Color(1, 1, 1, 0.15)
	bgs.set_corner_radius_all(3)
	var fgs := StyleBoxFlat.new()
	fgs.bg_color = GOLD
	fgs.set_corner_radius_all(3)
	q_bar.add_theme_stylebox_override("background", bgs)
	q_bar.add_theme_stylebox_override("fill", fgs)
	v.add_child(q_bar)
	quest_box.add_child(v)
	root.add_child(quest_box)

func _build_feed() -> void:
	feed = VBoxContainer.new()
	feed.position = Vector2(18, 300)
	feed.mouse_filter = Control.MOUSE_FILTER_IGNORE
	feed.add_theme_constant_override("separation", 2)
	root.add_child(feed)

func _build_hint() -> void:
	hint = _label("", 24)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hint.add_theme_constant_override("outline_size", 10)
	hint.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	hint.offset_top = -150
	hint.offset_bottom = -60
	hint.offset_left = 30
	hint.offset_right = -30
	root.add_child(hint)

func _build_joystick() -> void:
	joy_base = Panel.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(1, 1, 1, 0.08)
	sb.border_color = Color(1, 1, 1, 0.45)
	sb.set_border_width_all(3)
	sb.set_corner_radius_all(70)
	joy_base.add_theme_stylebox_override("panel", sb)
	joy_base.size = Vector2(140, 140)
	joy_base.visible = false
	joy_base.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(joy_base)
	joy_knob = Panel.new()
	var kb := StyleBoxFlat.new()
	kb.bg_color = Color(1, 0.84, 0.37, 0.75)
	kb.set_corner_radius_all(30)
	joy_knob.add_theme_stylebox_override("panel", kb)
	joy_knob.size = Vector2(60, 60)
	joy_knob.mouse_filter = Control.MOUSE_FILTER_IGNORE
	joy_base.add_child(joy_knob)
	joy_knob.position = Vector2(40, 40)

func _cmd_btn(t: String, col: Color, w := 110) -> Button:
	var b := Button.new()
	b.text = t
	b.focus_mode = Control.FOCUS_NONE
	b.custom_minimum_size = Vector2(w, 58)
	for st in ["normal", "hover", "pressed", "focus"]:
		var sb := _panel(col if st != "pressed" else col.darkened(0.3), 14, Color(1, 0.84, 0.37, 0.8), 2)
		sb.content_margin_left = 6
		sb.content_margin_right = 6
		b.add_theme_stylebox_override(st, sb)
	b.add_theme_font_size_override("font_size", 19)
	b.add_theme_color_override("font_color", Color.WHITE)
	b.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.7))
	b.add_theme_constant_override("outline_size", 5)
	return b

func _build_army_bar() -> void:
	var v := VBoxContainer.new()
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	v.add_theme_constant_override("separation", 4)
	army_lbl = _label("", 18, GOLD)
	army_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(army_lbl)
	var h := HBoxContainer.new()
	h.mouse_filter = Control.MOUSE_FILTER_IGNORE
	h.add_theme_constant_override("separation", 6)
	b_target = _cmd_btn("HEDEF", Color(0.2, 0.2, 0.24, 0.92), 150)
	b_attack = _cmd_btn("SALDIR", Color(0.62, 0.1, 0.12, 0.92))
	b_defend = _cmd_btn("SAVUN", Color(0.15, 0.32, 0.55, 0.92))
	b_follow = _cmd_btn("TAKİP", Color(0.55, 0.42, 0.1, 0.92))
	b_target.pressed.connect(func(): game.cmd_cycle_target())
	b_attack.pressed.connect(func(): game.cmd_attack())
	b_defend.pressed.connect(func(): game.cmd_defend())
	b_follow.pressed.connect(func(): game.cmd_follow())
	for b in [b_target, b_attack, b_defend, b_follow]:
		h.add_child(b)
	v.add_child(h)
	army_bar = v
	army_bar.visible = false
	root.add_child(army_bar)

func _update_army_bar() -> void:
	var G: Dictionary = game.G
	if G.is_empty() or not game.running or overlay.visible or G.hero_dead > 0.0 or G.pk.age < 1:
		army_bar.visible = false
		return
	army_bar.visible = true
	var n: int = game.army_of(G.pk).size()
	var mode: String = G.army_mode
	var names := { "charge": "SALDIRIDA", "rally": "SAVUNMADA", "follow": "TAKİPTE" }
	army_lbl.text = "Ordu: %d asker · %s" % [n, names.get(mode, "")]
	var t = G.target
	if t == null or not t.alive:
		b_target.text = "HEDEF SEÇ"
		b_target.modulate = Color.WHITE
	else:
		b_target.text = "HEDEF: " + t.civ.name.to_upper()
		b_target.modulate = Color.WHITE
		(b_target.get_theme_stylebox("normal") as StyleBoxFlat).border_color = t.civ.color
	for pair in [[b_attack, "charge"], [b_defend, "rally"], [b_follow, "follow"]]:
		var b: Button = pair[0]
		b.modulate = Color(1, 1, 1, 1) if mode == pair[1] else Color(1, 1, 1, 0.72)
		b.scale = Vector2.ONE * (1.06 if mode == pair[1] else 1.0)
	var hero = G.hero
	var p3 := Geo.p3(hero.x, hero.y, hero.gy + 7.5)
	if game.cam.is_position_behind(p3):
		return
	var sp: Vector2 = game.cam.unproject_position(p3)
	var vs := root.get_viewport_rect().size
	var cs := root.get_global_transform_with_canvas().affine_inverse()
	sp = cs * sp
	var sz := army_bar.get_combined_minimum_size()
	army_bar.size = sz
	army_bar.position = Vector2(clampf(sp.x - sz.x / 2.0, 8.0, root.size.x - sz.x - 8.0), clampf(sp.y - sz.y, 250.0, root.size.y - sz.y - 160.0))

func _unhandled_input(e: InputEvent) -> void:
	if overlay.visible:
		return
	if e is InputEventScreenTouch:
		if e.pressed and _joy_id == -1:
			_joy_id = e.index
			_joy_start = e.position
			joy_base.visible = true
			joy_base.position = e.position - joy_base.size / 2.0
			joy_knob.position = Vector2(40, 40)
			game.audio.start()
		elif not e.pressed and e.index == _joy_id:
			_joy_id = -1
			joy_base.visible = false
			game.joy = Vector2.ZERO
	elif e is InputEventScreenDrag and e.index == _joy_id:
		var d: Vector2 = e.position - _joy_start
		var m := d.length()
		if m > 70.0:
			_joy_start = e.position - d / m * 70.0
			joy_base.position = _joy_start - joy_base.size / 2.0
			d = e.position - _joy_start
			m = d.length()
		var kk := 40.0 / m if m > 40.0 else 1.0
		joy_knob.position = Vector2(40, 40) + d * kk
		game.joy = d / m * minf(1.0, m / 42.0) if m > 4.0 else Vector2.ZERO

# ------------------------------------------------------------------ refresh
func refresh(force: bool) -> void:
	var G: Dictionary = game.G
	if G.is_empty():
		return
	var pk = G.pk
	var peace_left := maxi(0, int(ceil(G.peace - G.t)))
	var hn := hint_text()
	var key := "%d|%d|%d|%d|%d|%d|%s|%s|%s" % [pk.res.f, pk.res.s, pk.res.g, game.pop_of(pk), game.pop_cap(pk), peace_left, hn, G.msgs.size(), "".join(G.msgs.map(func(m): return m.text))]
	if key == _last_hud and not force:
		return
	_last_hud = key
	lbl_res.f.text = _fmt(pk.res.f)
	lbl_res.s.text = _fmt(pk.res.s)
	lbl_res.g.text = _fmt(pk.res.g)
	lbl_pop.text = "%d/%d" % [game.pop_of(pk), game.pop_cap(pk)]
	lbl_lv.text = "%s · Sefer %d" % [pk.civ.name, G.level]
	var bs := badge.get_theme_stylebox("panel") as StyleBoxFlat
	bs.bg_color = Color(pk.civ.color.darkened(0.25), 0.92)
	if peace_left > 0:
		status.text = "Barış  %d:%02d" % [peace_left / 60, peace_left % 60]
		(status_box.get_theme_stylebox("panel") as StyleBoxFlat).bg_color = Color(0.12, 0.42, 0.25, 0.88)
	else:
		var n := 0
		for k in G.ks:
			if k.alive:
				n += 1
		status.text = "İstila dönemi · %d krallık" % n
		(status_box.get_theme_stylebox("panel") as StyleBoxFlat).bg_color = Color(0.55, 0.1, 0.1, 0.9)
	status_box.position.x = (root.size.x - status_box.size.x) / 2.0
	hint.text = hn
	for c in feed.get_children():
		c.queue_free()
	for m in G.msgs:
		var l := _label(clean(m.text), 19, m.color)
		feed.add_child(l)
	feed.position.y = quest_box.position.y + quest_box.size.y + 10.0

func _fmt(n: float) -> String:
	return "%dk" % int(n / 1000.0) if n >= 10000.0 else str(int(n))

func hint_text() -> String:
	var G: Dictionary = game.G
	if G.hero_dead > 0.0:
		return "%s kalede iyileşiyor… %d" % [G.pk.civ.htitle, ceil(G.hero_dead)]
	if not G.moved:
		return "Ekranı sürükle, atlı %s yönet" % G.pk.civ.hacc
	var pk = G.pk
	if G.t < 50.0 and G.stats.built == 0:
		return "ÇİFTÇİ, ALTINCI, TAŞÇI alanlarından köylü al; EV ile nüfusu artır"
	if pk.age == 0 and G.t > 90.0 and pk.age_t <= 0.0:
		return "Kalenin arkasındaki ÇAĞ ATLA alanı seni Feodal Çağ'a taşır"
	if pk.age == 1 and not game.has_bld(pk, "barracks"):
		return "KIŞLA ve KULE kur, sınırlarını koru"
	if pk.age == 1 and game.army_of(pk).size() > 0 and G.t < 200.0:
		return "Ordunu üstündeki düğmelerle yönet: HEDEF seç, SALDIR, SAVUN ya da TAKİP"
	if G.t > G.peace and G.army_mode == "rally" and game.army_of(pk).size() >= 10:
		return "HEDEF seç ve SALDIR: ordun saf düzeninde yürür"
	return ""

func quest_ui(force: bool) -> void:
	var G: Dictionary = game.G
	if G.q >= Data.QUESTS.size():
		quest_box.visible = false
		return
	var Q: Dictionary = Data.QUESTS[G.q]
	var n := clampi(game.quest_n(Q.id, G.pk), 0, Q.of)
	var key := "%d:%d" % [G.q, n]
	if key == _last_q and not force:
		return
	_last_q = key
	quest_box.visible = true
	q_title.text = "%d/%d · %s" % [G.q + 1, Data.QUESTS.size(), Q.t]
	q_desc.text = Q.d
	q_n.text = "%d/%d" % [n, Q.of]
	q_bar.max_value = Q.of
	q_bar.value = n

func _process(_dt: float) -> void:
	_update_army_bar()
	_mini_t -= 1
	if minimap_dirty and _mini_t <= 0:
		_mini_t = 6
		minimap_dirty = false
		mini.queue_redraw()

func _draw_mini() -> void:
	var G: Dictionary = game.G
	if G.is_empty():
		return
	var S := mini.size.x
	var sc := S / Geo.MW
	mini.draw_circle(Vector2(S, S) / 2.0, Geo.R_PLAY * sc, Color(0.16, 0.24, 0.12, 0.8))
	mini.draw_arc(Vector2(S, S) / 2.0, Geo.R_PLAY * sc, 0, TAU, 48, Color(1, 1, 1, 0.5), 2.0)
	mini.draw_circle(Vector2(S, S) / 2.0, Geo.SEA_R * sc, Color(0.16, 0.43, 0.59, 0.95))
	for k in G.ks:
		var c: Color = k.civ.color
		var own = k
		if not k.alive and k.castle != null and k.castle.hp > 0.0:
			own = k.castle.k
		var oc: Color = own.civ.color
		mini.draw_circle(Vector2(k.x, k.y) * sc, 300.0 * sc, Color(oc.r, oc.g, oc.b, 0.33))
		if k.castle != null and k.castle.hp > 0.0:
			c = k.castle.k.civ.color
			mini.draw_rect(Rect2(Vector2(k.x, k.y) * sc - Vector2(5, 5), Vector2(10, 10)), c)
			mini.draw_rect(Rect2(Vector2(k.x, k.y) * sc - Vector2(5, 5), Vector2(10, 10)), Color.WHITE, false, 1.5)
	for u in G.units:
		if u.hp <= 0.0 or u.role == "koylu" or u.role == "hero":
			continue
		mini.draw_rect(Rect2(Vector2(u.x, u.y) * sc - Vector2(1.5, 1.5), Vector2(3, 3)), u.k.civ.color)
	var tg = G.get("target")
	if tg != null and tg.alive:
		mini.draw_arc(Vector2(tg.x, tg.y) * sc, 16.0, 0, TAU, 24, Color(1, 0.3, 0.2), 2.5)
	for c in G.carts:
		mini.draw_rect(Rect2(Vector2(c.x, c.y) * sc - Vector2(1, 1), Vector2(2, 2)), Color("#ffd24a"))
	if G.hero_dead <= 0.0:
		mini.draw_circle(Vector2(G.hero.x, G.hero.y) * sc, 5.0, Color.WHITE)
		mini.draw_arc(Vector2(G.hero.x, G.hero.y) * sc, 5.0, 0, TAU, 16, Color.BLACK, 1.5)

# ------------------------------------------------------------------ overlays
func _build_overlay() -> void:
	overlay = ColorRect.new()
	(overlay as ColorRect).color = Color(0.03, 0.03, 0.05, 0.62)
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	root.add_child(overlay)
	var cc := CenterContainer.new()
	cc.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.add_child(cc)
	card = PanelContainer.new()
	var sb := _panel(Color(0.97, 0.94, 0.86, 0.97), 22, Color(0.6, 0.42, 0.12), 4)
	sb.content_margin_left = 30
	sb.content_margin_right = 30
	sb.content_margin_top = 26
	sb.content_margin_bottom = 26
	sb.shadow_size = 18
	sb.shadow_color = Color(0, 0, 0, 0.45)
	card.add_theme_stylebox_override("panel", sb)
	card.custom_minimum_size = Vector2(620, 0)
	cc.add_child(card)

func _clear_card() -> VBoxContainer:
	for c in card.get_children():
		c.queue_free()
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 14)
	card.add_child(v)
	overlay.visible = true
	return v

func _btn(t: String, primary := true) -> Button:
	var b := Button.new()
	b.text = t
	b.focus_mode = Control.FOCUS_NONE
	b.custom_minimum_size = Vector2(0, 72)
	var base := Color("#b5232a") if primary else Color("#3b4148")
	for st in ["normal", "hover", "pressed", "focus"]:
		var sb := _panel(base.lightened(0.1) if st == "hover" else (base.darkened(0.2) if st == "pressed" else base), 16, Color(1, 0.84, 0.37, 0.7) if primary else Color(0, 0, 0, 0), 2 if primary else 0)
		b.add_theme_stylebox_override(st, sb)
	b.add_theme_font_size_override("font_size", 28)
	b.add_theme_color_override("font_color", Color.WHITE)
	b.add_theme_color_override("font_hover_color", Color.WHITE)
	b.add_theme_color_override("font_pressed_color", Color.WHITE)
	return b

func _dark(t: String, size: int, f: Font = null, c := Color("#2a2219")) -> Label:
	var l := Label.new()
	l.text = t
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", c)
	if f:
		l.add_theme_font_override("font", f)
	return l

func show_menu() -> void:
	var v := _clear_card()
	var t := _dark("AKINCI", 76, font_title, Color("#8e1b20"))
	v.add_child(t)
	var st := _dark("KRALLIKLAR ÇAĞI", 26, font_title, Color("#6b4a14"))
	st.add_theme_constant_override("line_spacing", -6)
	v.add_child(st)
	v.add_child(_dark("Altı medeniyetten birini seç. Köyünü kur, ocaklarını yak, Köy Çağı'ndan Feodal ve Kale Çağı'na yüksel. Barış bitince güçlenen krallıklar birbirini istila eder. Son kalan cihana hükmeder.", 20, null, Color("#4a3c2c")))
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 10)
	grid.add_theme_constant_override("v_separation", 10)
	for i in Data.CIVS.size():
		var c: Dictionary = Data.CIVS[i]
		var b := Button.new()
		b.focus_mode = Control.FOCUS_NONE
		b.custom_minimum_size = Vector2(275, 104)
		var sel: bool = i == game.chosen_civ
		for s in ["normal", "hover", "pressed", "focus"]:
			var sb := _panel(Color(c.color, 0.95) if sel else Color(1, 1, 1, 0.65), 14, c.color.darkened(0.3), 4 if sel else 2)
			b.add_theme_stylebox_override(s, sb)
		var vb := VBoxContainer.new()
		vb.mouse_filter = Control.MOUSE_FILTER_IGNORE
		vb.set_anchors_preset(Control.PRESET_FULL_RECT)
		vb.offset_left = 12
		vb.offset_right = -12
		vb.offset_top = 8
		vb.add_theme_constant_override("separation", 0)
		var nm := _dark(c.full, 21, font_body, Color.WHITE if sel else c.color.darkened(0.35))
		nm.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		nm.mouse_filter = Control.MOUSE_FILTER_IGNORE
		vb.add_child(nm)
		var bn := _dark(c.bonus, 14, null, Color(1, 1, 1, 0.92) if sel else Color("#4a3c2c"))
		bn.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		bn.mouse_filter = Control.MOUSE_FILTER_IGNORE
		vb.add_child(bn)
		b.add_child(vb)
		b.pressed.connect(func():
			game.chosen_civ = i
			game.save_prefs()
			show_menu())
		grid.add_child(b)
	v.add_child(grid)
	var b1 := _btn("Sefere Başla · Sefer %d" % game.best)
	b1.pressed.connect(func():
		overlay.visible = false
		game.start(game.best))
	v.add_child(b1)
	if game.best > 1:
		var b2 := _btn("Kolaydan Başla (Sefer 1)", false)
		b2.pressed.connect(func():
			overlay.visible = false
			game.start(1))
		v.add_child(b2)
	_sync_audio_btns()

func show_story(title: String, body: String) -> void:
	var v := _clear_card()
	v.add_child(_dark(title.to_upper(), 40, font_title, Color("#8e1b20")))
	var rt := RichTextLabel.new()
	rt.bbcode_enabled = true
	rt.fit_content = true
	rt.scroll_active = false
	rt.custom_minimum_size = Vector2(560, 0)
	rt.add_theme_font_size_override("normal_font_size", 23)
	rt.add_theme_font_size_override("bold_font_size", 23)
	rt.add_theme_font_override("normal_font", font_body)
	rt.add_theme_font_override("bold_font", font_body)
	rt.add_theme_color_override("default_color", Color("#3a2e22"))
	rt.text = "[center]" + body.replace("[b]", "[b][color=#8e1b20]").replace("[/b]", "[/color][/b]") + "[/center]"
	v.add_child(rt)
	var b := _btn("Devam")
	b.pressed.connect(func():
		overlay.visible = false
		game.story_done())
	v.add_child(b)

func show_pause() -> void:
	var v := _clear_card()
	v.add_child(_dark("DURAKLATILDI", 42, font_title, Color("#8e1b20")))
	var b := _btn("Devam Et")
	b.pressed.connect(func():
		overlay.visible = false
		game.G.paused = false)
	v.add_child(b)
	var b2 := _btn("Ana Menü", false)
	b2.pressed.connect(func():
		game.running = false
		show_menu())
	v.add_child(b2)

func show_end(win: bool) -> void:
	var v := _clear_card()
	var G: Dictionary = game.G
	if win:
		v.add_child(_dark("CİHAN HAKİMİ!", 50, font_title, Color("#8e1b20")))
		v.add_child(_dark(G.pk.civ.full.to_upper(), 24, font_title, Color("#6b4a14")))
		v.add_child(_dark("Dört krallık da senin bayrağın altında. Sıradaki sefer daha çetin: rakipler daha hızlı gelişip daha erken saldıracak.", 21, null, Color("#4a3c2c")))
		var b1 := _btn("Sefer %d →" % (G.level + 1))
		b1.pressed.connect(func():
			overlay.visible = false
			game.on_win_next())
		v.add_child(b1)
	else:
		v.add_child(_dark("KALEN DÜŞTÜ", 46, font_title, Color("#b5232a")))
		v.add_child(_dark(G.pk.civ.full.to_upper(), 24, font_title, Color("#6b4a14")))
		v.add_child(_dark("Barış döneminde ekonomiyi büyüt (köylü + ev), kuleleri ve okçuları erken kur, ordunu SANCAĞA ile yönet.", 21, null, Color("#4a3c2c")))
		var b1 := _btn("Tekrar Dene")
		b1.pressed.connect(func():
			overlay.visible = false
			game.start(G.level))
		v.add_child(b1)
	var b2 := _btn("Ana Menü", false)
	b2.pressed.connect(show_menu)
	v.add_child(b2)
