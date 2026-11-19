shader_type spatial;
render_mode cull_disabled, diffuse_burley;
uniform vec3 base_col : source_color = vec3(0.16, 0.27, 0.07);
uniform vec3 tip_col : source_color = vec3(0.5, 0.62, 0.26);
uniform sampler2D macro : filter_linear_mipmap, repeat_enable;
varying float hgt; varying vec3 wp;
void vertex() {
	hgt = clamp(VERTEX.y, 0.0, 1.0);
	wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float sway = sin(TIME * 1.7 + wp.x * 0.35 + wp.z * 0.21) * 0.5 + sin(TIME * 2.9 + wp.x * 0.8) * 0.2;
	VERTEX.x += sway * hgt * hgt * 0.18;
	VERTEX.z += sway * hgt * hgt * 0.1;
}
void fragment() {
	float m = texture(macro, wp.xz * 0.02).r;
	vec3 tip = mix(tip_col, tip_col * vec3(1.15, 1.0, 0.75), m);
	ALBEDO = mix(base_col, tip, hgt);
	ROUGHNESS = 0.85; SPECULAR = 0.3;
	BACKLIGHT = vec3(0.25, 0.3, 0.1);
}
