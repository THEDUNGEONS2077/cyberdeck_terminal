#version 300 es
// prism tube.vert: a neon line, one instance each: its two ends placed by
// the camera, then widened across the screen by the glow's reach (px), so
// its width is the same at any distance. Passes px across the line and the
// place along it (0–1), for the core, the glow and the pulse.
layout(location = 0) in vec3 aA;
layout(location = 1) in vec3 aB;
layout(location = 2) in float aPhase;

uniform mat4 uViewProj;
uniform vec2 uTargetPx;  // the canvas (device px)
uniform float uReach;    // half the quad's width (device px)

out float vAcross;       // device px from the centre line
out float vAlong;        // 0 at a, 1 at b
flat out float vPhase;
flat out float vLength;  // units

void main() {
    vec4 ca = uViewProj * vec4(aA, 1.0);
    vec4 cb = uViewProj * vec4(aB, 1.0);
    vec2 sa = (ca.xy / ca.w * 0.5 + 0.5) * uTargetPx;
    vec2 sb = (cb.xy / cb.w * 0.5 + 0.5) * uTargetPx;
    vec2 dir = sb - sa;
    float len = length(dir);
    dir = len > 0.0 ? dir / len : vec2(1.0, 0.0);
    vec2 across = vec2(-dir.y, dir.x);
    float side = float(gl_VertexID & 1) * 2.0 - 1.0;
    bool atB = (gl_VertexID >> 1) == 1;
    // Past each end by the reach too, so the glow rounds off there.
    vec2 p = (atB ? sb + dir * uReach : sa - dir * uReach) + across * side * uReach;
    vec4 c = atB ? cb : ca;
    vAcross = side * uReach;
    vAlong = atB ? 1.0 + uReach / max(len, 1.0) : -uReach / max(len, 1.0);
    vPhase = aPhase;
    vLength = length(aB - aA);
    gl_Position = vec4((p / uTargetPx * 2.0 - 1.0) * c.w, c.z, c.w);
}
