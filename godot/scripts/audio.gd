class_name GameAudio
extends Node
## Pre-rendered original score (calm + war layers, crossfaded in sync) and SFX pool.

var music_on := true
var sfx_on := true
var intensity := 0.0
var _calm: AudioStreamPlayer
var _war: AudioStreamPlayer
var _pool: Array[AudioStreamPlayer] = []
var _streams := {}
var _last := {}
var _started := false
const NAMES := ["sword", "axe", "chop", "death", "arrow", "hurt", "coin", "res", "pay", "buy", "build", "horn", "alarm", "boom", "win", "lose", "conquer"]

func _ready() -> void:
	_calm = _music("res://assets/audio/music_calm.ogg")
	_war = _music("res://assets/audio/music_war.ogg")
	_war.volume_db = -60.0
	for n in NAMES:
		_streams[n] = load("res://assets/audio/sfx_%s.ogg" % n)
	for i in 14:
		var p := AudioStreamPlayer.new()
		p.bus = "Master"
		add_child(p)
		_pool.append(p)

func _music(path: String) -> AudioStreamPlayer:
	var s: AudioStreamOggVorbis = load(path)
	s.loop = true
	var p := AudioStreamPlayer.new()
	p.stream = s
	p.volume_db = -4.0
	add_child(p)
	return p

func start() -> void:
	if _started:
		return
	_started = true
	_calm.play()
	_war.play()

func set_music(on: bool) -> void:
	music_on = on

func set_sfx(on: bool) -> void:
	sfx_on = on

func _process(dt: float) -> void:
	if not _started:
		return
	var target_war := intensity if music_on else 0.0
	var cur := db_to_linear(_war.volume_db)
	var calm_t := (1.0 - target_war * 0.85) * (1.0 if music_on else 0.0)
	_war.volume_db = linear_to_db(maxf(0.0001, lerpf(cur, target_war * 0.7, minf(1.0, dt * 1.5))))
	_calm.volume_db = linear_to_db(maxf(0.0001, lerpf(db_to_linear(_calm.volume_db), calm_t * 0.63, minf(1.0, dt * 1.5))))
	# keep the two layers in step
	if absf(_war.get_playback_position() - _calm.get_playback_position()) > 0.08:
		_war.seek(_calm.get_playback_position())

func play(name: String, vol := 1.0) -> void:
	if not sfx_on or not _streams.has(name):
		return
	var t := Time.get_ticks_msec() / 1000.0
	var gap := 0.045 if name == "coin" else 0.06
	if _last.has(name) and t - _last[name] < gap:
		return
	_last[name] = t
	for p in _pool:
		if not p.playing:
			p.stream = _streams[name]
			p.volume_db = linear_to_db(clampf(vol, 0.01, 2.0)) - 2.0
			p.play()
			return
