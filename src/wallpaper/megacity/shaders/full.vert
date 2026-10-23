#version 300 es
// megacity full.vert: one triangle covering the whole target; the city is
// worked out per pixel from gl_FragCoord (city.frag). Shared with
// fluid_motion (assets/shaders/mc_full.vert): keep the two the same.
void main() {
    vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
    gl_Position = vec4(p, 0.0, 1.0);
}
