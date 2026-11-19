shader_type spatial;
render_mode unshaded, blend_mix, depth_draw_never, cull_disabled;
uniform vec4 bg : source_color = vec4(0.06, 0.09, 0.11, 0.62);
uniform float aspect = 1.15;
uniform bool dashed = false;
uniform bool active = false;
uniform float fill = 0.0;
uniform float hold = 0.0;
float sdbox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void fragment() {
	vec2 p = (UV - 0.5) * vec2(aspect, 1.0);
	vec2 half_size = vec2(aspect, 1.0) * 0.5 - 0.03;
	float d = sdbox(p, half_size, 0.08);
	float inside = 1.0 - smoothstep(-0.004, 0.004, d);
	vec3 c = bg.rgb; float a = bg.a * inside;
	// payment fill rises from the bottom (UV.y = 1 is the bottom edge facing the camera)
	float f = step(1.0 - fill, UV.y) * inside;
	c = mix(c, vec3(1.0, 0.78, 0.2), f * 0.75); a = max(a, f * 0.7);
	float hf = step(UV.x, hold) * inside;
	c = mix(c, vec3(1.0, 0.84, 0.37), hf * 0.65); a = max(a, hf * 0.65);
	// border
	float bw = 0.035;
	float edge = smoothstep(bw, bw * 0.4, abs(d + bw * 0.6));
	vec3 bc = active ? vec3(1.0, 0.84, 0.37) : (dashed ? vec3(0.91, 0.85, 0.69) : vec3(1.0));
	if (dashed) {
		float per = (abs(p.x) > half_size.x - 0.1) ? p.y : p.x;
		edge *= step(0.45, fract(per * 7.0));
	} else {
		// corner brackets only
		vec2 q = abs(p) - (half_size - 0.18);
		edge *= step(0.0, q.x) * step(0.0, q.y) + step(0.0, q.x) * step(0.0, q.y) * 0.0;
		edge = max(edge, 0.0);
	}
	c = mix(c, bc, edge); a = max(a, edge);
	if (active) { c = mix(c, vec3(1.0, 0.85, 0.4), 0.12 * inside); }
	ALBEDO = c; ALPHA = a;
}
