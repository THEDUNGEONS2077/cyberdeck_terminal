#version 300 es
// neural-net link.vert (web): one quad per link, as fluid_motion's
// neural_link.vert draws it, but with each link's ends sent per instance
// (a desktop screen can hold more nodes than that shader's uniform array).
// Opacity by length (longer is fainter) times the link's own weight;
// links wholly off one side of the screen are dropped. Its fragment
// shader, link.frag, is fluid_motion's neural_link.frag byte for byte.
layout(location = 0) in vec4 aEnds;   // node a (x, y), node b (x, y): CSS px
layout(location = 1) in float aWeight; // the link's own brightness

uniform vec2 uTargetPx;   // the canvas (device px)
uniform float uDensity;   // device px per CSS px
uniform float uMaxLink;   // the longest link (CSS px)
uniform float uWidth;     // the stroke's width (CSS px)
uniform float uStrength;  // the pass's opacity (the glow pass is faint)
#include neural_shade

out float vAcross;        // device px from the centre line
flat out vec3 vColor;
flat out float vAlpha;
flat out float vHalf;     // half the stroke's width (device px)

void main() {
    vec2 a = aEnds.xy;
    vec2 b = aEnds.zw;
    // Wholly off the screen: no quad at all (outside the clip volume).
    if ((a.x < 0.0 && b.x < 0.0) || (a.x > uScreen.x && b.x > uScreen.x) || (a.y < 0.0 && b.y < 0.0) || (a.y > uScreen.y && b.y > uScreen.y)) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vAcross = 0.0; vColor = vec3(0.0); vAlpha = 0.0; vHalf = 0.0;
        return;
    }
    float len = length(b - a);
    float share = min(1.0, len / uMaxLink);
    vAlpha = uStrength * min(1.0, mix(0.6, 0.16, share) * aWeight);
    vColor = shade((a + b) * 0.5);
    // The quad: the segment, widened by half the stroke plus a pixel for the smooth edge.
    vec2 along = len > 0.0 ? (b - a) / len : vec2(1.0, 0.0);
    vec2 across = vec2(-along.y, along.x);
    vHalf = uWidth * 0.5 * uDensity;
    float reach = vHalf + 1.0;
    float side = float(gl_VertexID & 1) * 2.0 - 1.0;
    vec2 end = (gl_VertexID >> 1) == 0 ? a : b;
    vec2 pos = end * uDensity + across * side * reach;
    vAcross = side * reach;
    gl_Position = vec4(pos.x / uTargetPx.x * 2.0 - 1.0, 1.0 - pos.y / uTargetPx.y * 2.0, 0.0, 1.0);
}
