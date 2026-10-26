#version 300 es
// horizon sky.frag: everything behind the land, per pixel: the dark plum
// sky, the glow on the horizon and its haze dome, the white-hot core, and
// the four tilted slabs with their pink specks (in the haze, the far ones
// more). The land is drawn over it (land.frag), its far end fading into
// the very same haze (the function below is the same in both).
// One set of shaders: cyberdeck_terminal src/wallpaper/horizon/shaders/*, and later fluid_motion's own copy, byte for byte.
precision highp float;

uniform vec2 uTarget;      // the target (px)
uniform float uDensity;    // px per CSS px (zoomed)
uniform vec2 uSun;         // the glow's centre (px, from the top)
uniform float uGlowR;      // the glow's radius (px)
uniform vec2 uDome;        // the haze dome's radii (px)
uniform float uCoreR;      // the core's radius (px)
uniform float uPulse;      // the glow's breath now (a multiplier, ~1)
uniform float uTime;       // the clock (s, wrapped)
uniform vec3 uSkyTop;
uniform vec3 uSkyLow;
uniform vec3 uGlow;
uniform vec3 uCore;
uniform vec3 uSlab;
uniform vec3 uSpark;
uniform vec4 uSlabs[4];    // each slab: centre (px), half its width and length (px)
uniform float uTilt[4];    // each slab's lean (radians, + tips the top right)
uniform float uFog[4];     // how much of the haze covers each slab
uniform float uSparkle[4]; // each slab's specks' strength
uniform float uCell;       // a speck's size (px)
uniform float uRate;       // how often a speck changes (a second)

out vec4 fragColor;

// The sky and its glow at p (px from the top): the same in land.frag.
vec3 haze(vec2 p) {
    float t = clamp(p.y / uTarget.y, 0.0, 1.0);
    vec3 c = mix(uSkyTop, uSkyLow, t * t);
    vec2 d = (p - uSun) / uDome;
    vec2 g = (p - uSun) / uGlowR;
    return c + uGlow * (0.42 * exp(-dot(d, d) * 2.2) + 0.85 * exp(-dot(g, g) * 2.4)) * uPulse;
}

// A hash of a cell: 0 ≤ n < 1.
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    vec2 p = vec2(gl_FragCoord.x, uTarget.y - gl_FragCoord.y);
    vec3 sky = haze(p);
    vec3 c = sky;
    for (int i = 0; i < 4; i++) {
        // Into the slab's own frame: across, and along (negative at its top).
        vec2 q = p - uSlabs[i].xy;
        float cs = cos(uTilt[i]);
        float sn = sin(uTilt[i]);
        vec2 l = vec2(cs * q.x + sn * q.y, -sn * q.x + cs * q.y);
        vec2 e = abs(l) - uSlabs[i].zw;
        float inside = 1.0 - smoothstep(-0.6, 0.6, max(e.x, e.y));
        if (inside <= 0.0) continue;
        // Its face: dark, a little lit toward its top. Its lower end dissolves into the haze (the reference's).
        float top = clamp(0.5 - 0.5 * l.y / uSlabs[i].w, 0.0, 1.0);
        inside *= smoothstep(0.0, 0.3, top);
        vec3 face = uSlab * (0.55 + 0.45 * top);
        // Specks: cells lit at random, most toward the top, each twinkling at its own moments.
        vec2 cell = floor(l / uCell);
        float h = hash(cell + float(i) * 17.0);
        float tw = hash(cell + floor(uTime * uRate + h * 7.0));
        float density = mix(0.06, 0.55, top * top) * uSparkle[i];
        float speck = step(1.0 - density, h) * (0.35 + 0.65 * tw);
        vec3 slab = face + uSpark * speck * (0.4 + 0.9 * top * top);
        c = mix(c, mix(slab, sky, uFog[i]), inside);
    }
    // The white-hot core, with a little bloom.
    float r = length(p - uSun);
    c += uCore * (1.0 - smoothstep(uCoreR * 0.2, uCoreR * 1.3, r)) + uCore * 0.45 * exp(-r / (uCoreR * 2.2)) * uPulse;
    // Darker toward the top corners (the reference's falloff).
    vec2 v = (p / uTarget - vec2(0.5, 0.6)) * vec2(1.0, 1.3);
    c *= 1.0 - 0.3 * smoothstep(0.35, 0.9, length(v));
    fragColor = vec4(c, 1.0);
}
