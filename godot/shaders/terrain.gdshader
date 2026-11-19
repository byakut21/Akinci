shader_type spatial;
render_mode cull_back, diffuse_burley, specular_schlick_ggx;

// height field covers [G0, G0+GSPAN] px == world [-132, 132] units
uniform sampler2D heightmap : filter_linear, repeat_disable;
uniform sampler2D splat : filter_linear, repeat_disable;
uniform sampler2D grass_alb : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D grass_nrm : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D rock_alb : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D rock_nrm : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D cloud_noise : filter_linear_mipmap, repeat_enable;
uniform sampler2D macro_noise : filter_linear_mipmap, repeat_enable;
uniform float world_half = 132.0;
uniform float texel = 0.8;          // world units per heightmap texel
uniform float grass_scale = 0.16;   // repeats per world unit
uniform float rock_scale = 0.07;
uniform float cloud_shadow = 0.32;

varying vec3 wpos;
varying vec3 wnrm;

float H(vec2 uv) { return texture(heightmap, uv * (330.0 / 331.0) + 0.5 / 331.0).r; }

void vertex() {
	vec2 uv = (VERTEX.xz + world_half) / (2.0 * world_half);
	VERTEX.y = H(uv);
	float e = 1.0 / 331.0;
	float hl = H(uv - vec2(e, 0.0)), hr = H(uv + vec2(e, 0.0));
	float hd = H(uv - vec2(0.0, e)), hu = H(uv + vec2(0.0, e));
	NORMAL = normalize(vec3(hl - hr, 2.0 * texel, hd - hu));
	TANGENT = normalize(cross(NORMAL, vec3(0.0, 0.0, 1.0)));
	BINORMAL = normalize(cross(TANGENT, NORMAL));
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wnrm = NORMAL;
}

vec3 tri_rock(vec3 p, vec3 n, out vec4 nr) {
	vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z);
	vec3 c = texture(rock_alb, p.zy * rock_scale).rgb * w.x
		+ texture(rock_alb, p.xz * rock_scale).rgb * w.y
		+ texture(rock_alb, p.xy * rock_scale).rgb * w.z;
	nr = texture(rock_nrm, p.zy * rock_scale) * w.x + texture(rock_nrm, p.xz * rock_scale) * w.y + texture(rock_nrm, p.xy * rock_scale) * w.z;
	return c;
}

void fragment() {
	vec2 uv = (wpos.xz + world_half) / (2.0 * world_half);
	vec4 sp = texture(splat, uv);
	float h = wpos.y;
	vec3 n = normalize(wnrm);
	float slope = 1.0 - n.y;

	// macro variation breaks up tiling
	float m1 = texture(macro_noise, wpos.xz * 0.006).r;
	float m2 = texture(macro_noise, wpos.xz * 0.023 + 0.37).r;

	vec2 gu = wpos.xz * grass_scale;
	vec2 gu2 = wpos.xz * grass_scale * 0.37 + vec2(0.31, 0.77);
	vec4 g1 = texture(grass_alb, gu);
	vec4 g2 = texture(grass_alb, gu2);
	vec3 grass = mix(g1.rgb, g2.rgb, smoothstep(0.35, 0.65, m2));
	vec4 gn = mix(texture(grass_nrm, gu), texture(grass_nrm, gu2), smoothstep(0.35, 0.65, m2));
	// lush meadow vs drier field
	vec3 lush = grass * vec3(0.78, 1.02, 0.62);
	vec3 dry = grass * vec3(1.08, 1.0, 0.7);
	vec3 col = mix(lush, dry, sp.a * 0.7 + (m1 - 0.5) * 0.5);
	// forest floor between kingdoms
	col = mix(col, grass * vec3(0.5, 0.62, 0.38), sp.b * 0.85);

	// single planar rock sample drives dirt / sand / macro breakup; triplanar only on cliffs
	vec4 rflat = texture(rock_alb, wpos.xz * rock_scale);
	float rl = dot(rflat.rgb, vec3(0.333));
	vec3 dirt = mix(vec3(rl) * vec3(0.92, 0.72, 0.5), g1.rgb * vec3(0.9, 0.75, 0.55), 0.35);
	float dmask = smoothstep(0.15, 0.6, sp.r + (g1.a - 0.5) * 0.5);
	col = mix(col, dirt, dmask);
	vec3 sand = mix(vec3(0.86, 0.77, 0.58), vec3(rl) * vec3(1.15, 1.02, 0.8), 0.45);
	float smask = smoothstep(0.2, 0.7, sp.g + (rl - 0.5) * 0.3);
	col = mix(col, sand, smask);
	col = mix(col, col * vec3(0.55, 0.6, 0.58), smoothstep(0.0, -0.8, h));
	float rmask = clamp(smoothstep(0.18, 0.42, slope + (rl - 0.5) * 0.25) + smoothstep(9.0, 16.0, h + m2 * 4.0), 0.0, 1.0);
	vec4 rn = texture(rock_nrm, wpos.xz * rock_scale);
	if (rmask > 0.01) {
		vec3 rock = tri_rock(wpos, n, rn);
		col = mix(col, rock * vec3(0.95, 0.92, 0.88), rmask);
	}
	// snow caps on the rim mountains (flatter faces hold snow)
	float snow = smoothstep(28.0, 36.0, h + m1 * 6.0) * smoothstep(0.55, 0.25, slope);
	col = mix(col, vec3(0.93, 0.95, 0.98) * (0.85 + rl * 0.2), snow);

	// drifting cloud shadows
	vec2 cuv = wpos.xz * 0.012 + vec2(TIME * 0.006, TIME * 0.0025);
	float cl = smoothstep(0.48, 0.72, texture(cloud_noise, cuv).r);
	col *= 1.0 - cl * cloud_shadow;

	ALBEDO = col;
	vec4 nm = mix(gn, rn, max(rmask, dmask * 0.6));
	NORMAL_MAP = nm.rgb;
	NORMAL_MAP_DEPTH = mix(0.9, 1.4, rmask);
	ROUGHNESS = mix(0.95, 0.85, rmask) - snow * 0.3;
	SPECULAR = 0.25;
}
