#version 300 es
// horizon land.vert: a point of the land seen by a pinhole camera gliding
// forward. Each strip of triangles is placed at its distance from the
// camera now: as the camera passes a strip it goes out of sight behind the
// near clip, then comes round again at the far end, deep in the haze, so
// the land never ends (land.ts). The horizon sits uHorizon px down; the
// camera is uCamH above the ground.
// One set of shaders: cyberdeck_terminal src/wallpaper/horizon/shaders/*, and later fluid_motion's own copy, byte for byte.
precision highp float;

layout(location = 0) in vec2 aPoint;  // across, height (units)
layout(location = 1) in vec4 aStrip;  // strip, row in it (0/1), depth offset (units), corner (0, 1, 2)

uniform vec2 uTarget;   // the target (px)
uniform float uFocal;   // focal length (px)
uniform float uHorizon; // the horizon (px from the top)
uniform float uCamH;    // the camera's height (units)
uniform float uCamZ;    // how far the camera has come (units, wrapped at uRows)
uniform float uRows;    // rows of land (units of depth before it repeats)
uniform float uNear;    // the near clip (units)
uniform float uFar;     // the far clip (units)

out vec3 vBary;
out vec3 vWorld;

void main() {
    // The strip's distance: from just behind the camera (-1, out of sight) to uRows - 1 away.
    float z = mod(aStrip.x - uCamZ + 1.0, uRows) - 1.0 + aStrip.y + aStrip.z;
    float x = aPoint.x;
    float y = aPoint.y;
    // Pinhole: on screen at (W/2 + f·x/z, horizon + f·(camH − y)/z), written with w = z so the GPU divides (and clips at the near plane).
    gl_Position = vec4(
        2.0 * uFocal * x / uTarget.x,
        (1.0 - 2.0 * uHorizon / uTarget.y) * z - 2.0 * uFocal * (uCamH - y) / uTarget.y,
        (z * (uFar + uNear) - 2.0 * uFar * uNear) / (uFar - uNear),
        z);
    int corner = int(aStrip.w + 0.5);
    vBary = vec3(corner == 0 ? 1.0 : 0.0, corner == 1 ? 1.0 : 0.0, corner == 2 ? 1.0 : 0.0);
    vWorld = vec3(x, y, z);
}
