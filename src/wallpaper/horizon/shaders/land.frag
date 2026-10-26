#version 300 es
// horizon land.frag: the land's triangles, drawn as their edges only: thin
// teal lines with a soft glow over dark faces. How far a pixel is from the
// nearest edge comes from its corner weights (vBary) and how fast they
// change across the screen (fwidth), so every line is the same few px wide
// whatever its distance. The nearest are softer and wider (the reference's
// depth of field); the far land fades into the haze (the same as sky.frag's).
// One set of shaders: cyberdeck_terminal src/wallpaper/horizon/shaders/*, and later fluid_motion's own copy, byte for byte.
precision highp float;

uniform vec2 uTarget;
uniform float uDensity;   // px per CSS px (zoomed)
uniform vec2 uSun;
uniform float uGlowR;
uniform vec2 uDome;
uniform float uPulse;
uniform vec3 uSkyTop;
uniform vec3 uSkyLow;
uniform vec3 uGlow;
uniform vec3 uLine;
uniform vec3 uFace;
uniform float uLineW;     // an edge's width (CSS px)
uniform float uGlowW;     // its glow's width (CSS px)
uniform float uGlowA;     // its glow's strength
uniform float uSoftNear;  // within this distance (units) edges soften
uniform float uSoften;    // how much wider and softer the nearest are
uniform float uFogStart;  // the haze starts (units)
uniform float uFogEnd;    // the haze hides the land (units)

in vec3 vBary;
in vec3 vWorld;

out vec4 fragColor;

// The sky and its glow at p (px from the top): the same as in sky.frag.
vec3 haze(vec2 p) {
    float t = clamp(p.y / uTarget.y, 0.0, 1.0);
    vec3 c = mix(uSkyTop, uSkyLow, t * t);
    vec2 d = (p - uSun) / uDome;
    vec2 g = (p - uSun) / uGlowR;
    return c + uGlow * (0.42 * exp(-dot(d, d) * 2.2) + 0.85 * exp(-dot(g, g) * 2.4)) * uPulse;
}

void main() {
    // Px to the nearest edge.
    vec3 a = vBary / max(fwidth(vBary), vec3(1e-5));
    float d = min(min(a.x, a.y), a.z);
    // Near the camera: wider and softer, and a little dimmer (out of focus).
    float near = clamp((uSoftNear - vWorld.z) / uSoftNear, 0.0, 1.0);
    float soft = 1.0 + uSoften * near;
    float w = uLineW * uDensity * soft;
    float line = (1.0 - smoothstep(w - 0.6 * soft, w + 0.6 * soft, d)) / sqrt(soft);
    float glow = uGlowA * exp(-d / (uGlowW * uDensity * soft));
    // The faces: dark; flatter ones a touch lighter, so the hills read in depth.
    vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    vec3 face = uFace * (0.7 + 0.6 * abs(n.y));
    vec3 c = face + uLine * (line + glow);
    // Into the haze with distance.
    float fog = smoothstep(uFogStart, uFogEnd, vWorld.z);
    fog = sqrt(fog);
    vec2 p = vec2(gl_FragCoord.x, uTarget.y - gl_FragCoord.y);
    fragColor = vec4(mix(c, haze(p), fog), 1.0);
}
