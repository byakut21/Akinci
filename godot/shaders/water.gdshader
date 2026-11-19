shader_type spatial;
render_mode blend_mix, depth_draw_never, cull_disabled, diffuse_burley, specular_schlick_ggx;

uniform sampler2D depth_tex : hint_depth_texture, filter_linear;
uniform sampler2D n1 : hint_normal, filter_linear_mipmap, repeat_enable;
uniform sampler2D n2 : hint_normal, filter_linear_mipmap, repeat_enable;
uniform sampler2D foam_noise : filter_linear_mipmap, repeat_enable;
uniform vec3 deep : source_color = vec3(0.04, 0.22, 0.33);
uniform vec3 shallow : source_color = vec3(0.16, 0.52, 0.52);
uniform vec3 foam_col : source_color = vec3(0.95, 0.97, 1.0);
uniform float sea_r = 30.0;

varying vec3 wpos;

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float w = sin(wpos.x * 0.35 + TIME * 1.1) * 0.05 + sin(wpos.z * 0.42 - TIME * 0.9) * 0.05;
	VERTEX.y += w;
}

void fragment() {
	vec2 uv1 = wpos.xz * 0.045 + vec2(TIME * 0.012, TIME * 0.007);
	vec2 uv2 = wpos.xz * 0.11 + vec2(-TIME * 0.016, TIME * 0.011);
	vec3 nm = normalize(mix(texture(n1, uv1).rgb, texture(n2, uv2).rgb, 0.5));
	NORMAL_MAP = nm;
	NORMAL_MAP_DEPTH = 0.6;

	// water thickness from the depth buffer
	float d = texture(depth_tex, SCREEN_UV).r;
	vec4 ndc = vec4(SCREEN_UV * 2.0 - 1.0, d, 1.0);
	vec4 vp = INV_PROJECTION_MATRIX * ndc; vp.xyz /= vp.w;
	float thick = clamp(VERTEX.z - vp.z, 0.0, 50.0);

	float r = length(wpos.xz);
	float depth_k = smoothstep(0.0, 9.0, thick);
	vec3 col = mix(shallow, deep, depth_k);
	// shoreline foam: thin water + noise bands
	float fn = texture(foam_noise, wpos.xz * 0.18 + vec2(TIME * 0.02, 0.0)).r;
	float band = 0.5 + 0.5 * sin(thick * 9.0 - TIME * 2.2 + fn * 5.0);
	float foam = smoothstep(0.55, 0.0, thick) * (0.55 + 0.45 * band) * smoothstep(0.25, 0.55, fn + 0.2);
	foam = max(foam, smoothstep(0.12, 0.0, thick));
	col = mix(col, foam_col, clamp(foam, 0.0, 1.0) * 0.85);

	ALBEDO = col;
	ROUGHNESS = mix(0.06, 0.5, foam);
	METALLIC = 0.0;
	SPECULAR = 0.6;
	ALPHA = clamp(mix(0.55, 0.96, depth_k) + foam, 0.0, 1.0);
}
