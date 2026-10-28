#version 300 es
// neural-net spark.vert (web): the nodes and the signals, one glow sprite
// each, sent per instance (x, y, radius, opacity; CSS px), coloured along
// the diagonal: fluid_motion's neural_spark.vert with the sprites in a
// buffer instead of a uniform array. Its fragment shader, spark.frag, is
// fluid_motion's neural_spark.frag byte for byte.
layout(location = 0) in vec4 aSpark;

uniform vec2 uTargetPx;   // the canvas (device px)
uniform float uDensity;   // device px per CSS px
#include neural_shade

out vec2 vLocal;          // -1..1 across the sprite
flat out vec3 vColor;
flat out float vAlpha;

void main() {
    vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1)) * 2.0 - 1.0;
    vLocal = corner;
    vColor = shade(aSpark.xy);
    vAlpha = aSpark.w;
    vec2 pos = (aSpark.xy + corner * aSpark.z) * uDensity;
    gl_Position = vec4(pos.x / uTargetPx.x * 2.0 - 1.0, 1.0 - pos.y / uTargetPx.y * 2.0, 0.0, 1.0);
}
