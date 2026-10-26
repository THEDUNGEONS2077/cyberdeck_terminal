#version 300 es
// sunset ground.frag: everything below the horizon, per pixel, the only
// part redrawn each frame: the dark ground and its grid in perspective,
// gently waving, gliding toward you; pink and orange on the left, teal on
// the right; a pink haze at the horizon; the scanlines. No geometry: each
// pixel finds its spot on the ground, then how far it is from the nearest
// grid line (in px, from fwidth), so the lines are sharp at any size.
precision highp float;

uniform vec2 uTarget;   // the target (px)
uniform float uUnit;    // px per CSS px of the reference layout
uniform float uHorizon; // the horizon (px from the top)
uniform float uFocal;   // focal length (px per unit at distance 1)
uniform float uCamH;    // the camera's height (units)
uniform float uTravel;  // how far the grid has come (units, wrapped)
uniform float uLine;    // a line's width (CSS px)
uniform float uGlowW;   // its glow's width (CSS px)
uniform vec3 uWave;     // how much the lines bend (cells), waves across and along (radians a unit)
uniform float uDrift;   // how the across-waves shift with distance (radians a unit: whole cycles per wrap, so it's seamless)
uniform float uHazeH;   // the haze's reach below the horizon (px)
uniform vec3 uGround;
uniform vec3 uWarm;     // the lines on the left
uniform vec3 uCool;     // the lines on the right
uniform vec3 uHaze;
uniform float uScanEvery;
uniform float uScanDepth;

out vec4 fragColor;

void main() {
    vec2 p = vec2(gl_FragCoord.x, uTarget.y - gl_FragCoord.y);
    float dy = max(p.y - uHorizon, 0.5);
    // The spot on the ground this pixel sees: its distance, and how far across.
    float z = uFocal * uCamH / dy;
    float x = (p.x - uTarget.x * 0.5) * z / uFocal;
    float zt = z + uTravel;
    // Gently rolling ground: the rows rise and fall in slow waves across (the reference's hills); the long lines bend only a little.
    float u = x + 0.35 * uWave.x * sin(zt * uWave.z + x * 0.21);
    float w = zt + uWave.x * sin(x * uWave.y + zt * uDrift);
    // Px to the nearest line of each set.
    vec2 g = vec2(u, w);
    vec2 f = abs(fract(g) - 0.5);
    vec2 fw = max(fwidth(g), vec2(1e-4));
    vec2 dpx = (0.5 - f) / fw;
    float d = min(dpx.x, dpx.y);
    float lw = uLine * uUnit;
    float line = 1.0 - smoothstep(lw - 0.5, lw + 0.5, d);
    float glow = exp(-d / (uGlowW * uUnit)) * 0.3;
    // Far off the lines crowd together (a square under a few px): there they fade into the dark ground, as into the night, instead of
    // shimmering or piling up into a bright band (0.17.2, the user: the horizon read as a thick line of thin ones). A little of their
    // average light is kept, so the grid thins out rather than stops.
    float crowd = 1.0 - smoothstep(0.3, 1.0, max(fw.x, fw.y));
    float average = min(0.14, lw * (fw.x + fw.y)) * (1.0 - smoothstep(1.0, 3.0, fw.y));
    vec3 lc = mix(uWarm, uCool, smoothstep(0.25, 0.85, p.x / uTarget.x));
    vec3 c = uGround + lc * mix(average, line + glow, crowd);
    // The pink haze at the horizon: soft, the grid showing through, thicker in slow drifts across.
    float drift = 0.8 + 0.2 * sin(p.x / uTarget.x * 9.0 + uTravel * 0.05) * sin(p.x / uTarget.x * 4.0 - 1.3);
    c = mix(c, uHaze, exp(-(p.y - uHorizon) / uHazeH) * 0.6 * drift);
    // Scanlines.
    c *= 1.0 - uScanDepth * step(uScanEvery - 1.0, mod(p.y / uUnit, uScanEvery));
    fragColor = vec4(c, 1.0);
}
