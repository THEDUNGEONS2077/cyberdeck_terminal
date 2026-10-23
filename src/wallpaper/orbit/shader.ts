/**
 * src/wallpaper/orbit/shader.ts: the ORBIT wallpaper's GLSL (WebGL 2): the
 * whole scene, worked out per pixel on the graphics card every frame.
 *
 * Layer: wallpaper (shader source only).
 *
 * Coordinates are CSS px from the top left (p); distances are turned into
 * reference px (÷ u_scale) so the tuning matches the reference at any size.
 * The parts, back to front:
 *   1. the sky: a thin haze along the planet's edge, deep blue above, space
 *      beyond; lit towards the sun, dark on the far side; a few stars;
 *   2. the planet: a dark surface, lit near the sun; clouds from fractal
 *      noise on a ground plane seen in perspective (far clouds squeezed
 *      towards the edge, near ones big), drifting as the planet turns; a
 *      haze over the surface near the edge (air seen edge-on);
 *   3. the sun: a white core, a soft glow, a shimmering starburst;
 *   4. a faint lens flare, and a touch of noise against colour banding.
 * Colours come from the wallpaper's palette (u_bg, u_cool, u_accent,
 * u_bright), mixed here; AZURE gives the reference's blues.
 */

/** The vertex shader: one triangle that covers the screen. */
export const VERTEX = /* glsl */ `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

/** The fragment shader: the scene. */
export const FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

uniform vec2 u_res;      // canvas size, device px
uniform float u_ratio;   // device px per CSS px
uniform float u_time;    // seconds
uniform float u_scale;   // CSS px per reference px
uniform vec2 u_center;   // the planet's centre, CSS px
uniform float u_radius;  // its radius, CSS px
uniform vec2 u_sun;      // the sun, CSS px
uniform float u_glow;    // the glow level (sun and air strength)
uniform float u_drift;   // cloud drift so far (ground units)
uniform vec3 u_bg, u_cool, u_accent, u_bright;

out vec4 outColor;

// Hash and value noise (cheap, smooth enough for clouds).
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
// Fractal noise; the finest octaves fade out where they'd shimmer (far away, near the edge).
float fbm(vec2 p, float detail) {
  float v = 0.0, a = 0.5;
  mat2 turn = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 6; i++) {
    float keep = clamp(detail - float(i), 0.0, 1.0);
    v += a * noise(p) * keep;
    p = turn * p * 2.03 + 17.1;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_ratio;
  float s = u_scale;
  // The palette's tones for this scene.
  vec3 space = mix(u_bg, u_cool, 0.07);
  vec3 skyDeep = mix(u_bg, u_cool, 0.62);
  vec3 haze = mix(u_cool, mix(u_accent, u_bright, 0.25), 0.72);
  vec3 sunLight = mix(u_accent, u_bright, 0.7);
  vec3 groundLit = mix(u_cool, u_bright, 0.2) * 0.52;
  vec3 groundDark = mix(u_bg, u_cool, 0.16);
  vec3 cloud = mix(u_bright, vec3(1.0), 0.15) * 0.84;

  vec2 toSun = p - u_sun;
  float sunD = length(toSun) / s;                 // reference px from the sun
  float r = length(p - u_center);
  float h = (r - u_radius) / s;                    // reference px above the edge (< 0: on the planet)
  float ang = atan(p.y - u_center.y, p.x - u_center.x);
  float sunAng = atan(u_sun.y - u_center.y, u_sun.x - u_center.x);
  float along = (ang - sunAng) * u_radius / s;     // reference px along the edge from under the sun (> 0: to the right)
  // Light from the sun along the edge: full beside it, fading away to the right (and a little to the left).
  float side = exp(-max(along, 0.0) / 700.0) * exp(-max(-along, 0.0) / 1200.0);

  vec3 col;
  if (h > 0.0) {
    // 1. The sky.
    vec3 sky = mix(skyDeep, space, smoothstep(0.0, 300.0 + 260.0 * side, h));
    sky = mix(haze, sky, smoothstep(0.0, 22.0 + 30.0 * side, h));
    // Lit towards the sun, darker beyond it.
    sky *= 0.35 + 0.75 * side;
    sky += sunLight * 0.35 * u_glow * exp(-sunD / 200.0) * smoothstep(-10.0, 60.0, h);
    col = sky;
    // A few stars where the sky is dark.
    vec2 cell = floor(p / 3.0);
    float star = step(0.9965, hash(cell));
    float twinkle = 0.55 + 0.45 * sin(u_time * (1.0 + 3.0 * hash(cell + 7.0)) + 6.28 * hash(cell + 3.0));
    col += vec3(0.75) * star * twinkle * smoothstep(240.0, 520.0, h) * (1.0 - side) * 0.6;
  } else {
    // 2. The planet: a ground plane seen in perspective, the horizon at the edge.
    //    X runs along the horizon, Z away from us (far near the edge).
    float depth = -h;                                  // reference px below the edge
    float z = 3200.0 / (depth + 18.0);
    vec2 ground = vec2(along * z * 0.0011 + u_drift, z);
    // Fewer octaves far away, so the far clouds don't shimmer.
    float detail = clamp(7.0 - log2(z * 0.35 + 1.0), 1.0, 5.0);
    // Clouds: wisps somewhat longer along the horizon, the noise warped so
    // nothing lines up, and a broad mask that makes cloudy and clear regions.
    vec2 q = ground * vec2(0.3, 0.6);
    // (The warp is broad: three octaves are plenty, and save work on every pixel.)
    float broad = min(detail, 3.0);
    q += vec2(fbm(q * 0.35, broad), fbm(q * 0.35 + 5.2, broad)) * 2.2;
    float c = fbm(q, detail);
    float patches = smoothstep(0.32, 0.62, fbm(ground * vec2(0.05, 0.11) + 9.0, 3.0));
    float cover = smoothstep(0.36, 0.7, c) * (0.35 + 0.65 * patches);
    float lit = side * (0.4 + 0.6 * exp(-depth / 420.0));
    vec3 ground3 = mix(groundDark, groundLit, lit);
    col = mix(ground3, cloud * (0.12 + 0.95 * lit), cover * (0.3 + 0.7 * lit));
    // Air seen edge-on: a bright haze over the surface near the edge, brightest by the sun.
    col = mix(col, haze * (0.5 + 0.9 * side), exp(-depth / 26.0) * (0.45 + 0.5 * side));
    col += sunLight * 0.45 * u_glow * exp(-sunD / 210.0);
    // Darker towards the bottom of the screen, as the reference.
    col *= mix(1.0, 0.62, smoothstep(220.0, 560.0, depth));
  }

  // The sun's glare spreading along the horizon (the air lit edge-on beside it).
  col += mix(sunLight, vec3(1.0), 0.4) * 0.75 * u_glow * exp(-abs(h) / 14.0) * exp(-abs(along) / 420.0);

  // 3. The sun: core, glow, and a starburst that shimmers slowly.
  float a = atan(toSun.y, toSun.x);
  float core = smoothstep(16.0, 4.0, sunD);
  float glow = exp(-sunD / 34.0) * 0.9 + exp(-sunD / 130.0) * 0.35;
  float rays = pow(max(0.0, cos(a * 5.0 + 0.08 * sin(u_time * 0.35))), 90.0) * exp(-sunD / 80.0)
             + pow(max(0.0, cos(a * 8.0 + 1.3 - 0.06 * sin(u_time * 0.27))), 160.0) * exp(-sunD / 55.0) * 0.8
             + pow(noise(vec2(a * 24.0, u_time * 0.25)), 6.0) * exp(-sunD / 50.0) * 0.8;
  col += (sunLight * glow + vec3(1.0) * core + mix(sunLight, vec3(1.0), 0.5) * rays * 0.8) * u_glow;

  // 4. A faint lens flare along the line from the sun through the centre of the screen.
  vec2 mid = u_res / u_ratio * 0.5;
  vec2 axis = mid - u_sun;
  float g1 = length(p - (u_sun - axis * 0.38)) / s;
  float g2 = length(p - (u_sun + axis * 1.45)) / s;
  col += u_accent * 0.06 * smoothstep(58.0, 46.0, g1) * u_glow;
  col += u_accent * 0.10 * smoothstep(9.0, 7.0, g2) * smoothstep(5.0, 7.0, g2) * u_glow;

  // Noise of under one step, against banding in the smooth gradients.
  col += (hash(p + fract(u_time)) - 0.5) / 255.0;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
