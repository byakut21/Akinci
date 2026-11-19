shader_type spatial;
render_mode diffuse_burley;
uniform sampler2D rock_alb : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D rock_nrm : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D grass_alb : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform float scale = 0.22;
uniform float moss = 0.6;
uniform float snow = 0.0;
varying vec3 wp; varying vec3 wn;
void vertex() { wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz; wn = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz); }
void fragment() {
	vec3 w = pow(abs(wn), vec3(4.0)); w /= (w.x + w.y + w.z);
	vec3 c = texture(rock_alb, wp.zy * scale).rgb * w.x + texture(rock_alb, wp.xz * scale).rgb * w.y + texture(rock_alb, wp.xy * scale).rgb * w.z;
	vec3 nm = texture(rock_nrm, wp.zy * scale).rgb * w.x + texture(rock_nrm, wp.xz * scale).rgb * w.y + texture(rock_nrm, wp.xy * scale).rgb * w.z;
	float top = smoothstep(0.55, 0.9, wn.y + (c.r - 0.5) * 0.6);
	vec3 g = texture(grass_alb, wp.xz * 0.3).rgb * vec3(0.7, 0.95, 0.55);
	c = mix(c * vec3(0.92, 0.9, 0.86), g, top * moss);
	c = mix(c, vec3(0.94, 0.96, 1.0), top * snow);
	ALBEDO = c; NORMAL_MAP = nm; NORMAL_MAP_DEPTH = 1.2; ROUGHNESS = 0.9;
}
