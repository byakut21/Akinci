shader_type spatial;
render_mode unshaded, blend_mix, depth_draw_never, cull_disabled;
varying vec4 col;
void vertex() { col = COLOR; }
void fragment() {
	float r = length(UV - 0.5) * 2.0;
	float ring = smoothstep(0.55, 0.62, r) * smoothstep(1.0, 0.92, r);
	float inner = smoothstep(0.62, 0.0, r) * 0.18;
	ALBEDO = col.rgb;
	ALPHA = (ring * 0.85 + inner) * col.a;
}
