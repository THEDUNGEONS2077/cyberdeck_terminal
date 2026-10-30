#version 300 es
// kernel.frag: QUANTUM KERNEL's whole frame in one pass (1.0). Each depth's
// sheet (engine.ts paintDepth: its code drawn once by the canvas, colour,
// glow and blur baked in) is a premultiplied texture, a loop repeating down
// the screen (GL_REPEAT). Each is read at its own scroll and laid over the
// ones behind it, back to front, on the background: source-over, as the
// canvas used to copy them one after another. The line being run in the
// focus depth gets its sheet added again over itself (the canvas's
// 'lighter', clamped as the canvas clamps), fading in and out. The sheets
// are the same as before, so the picture is too; only the copying moved to
// the graphics card (in a browser without one it cost the most of any
// wallpaper: half a second of every second at 1920 × 1080).
precision highp float;

uniform sampler2D uDepth0;
uniform sampler2D uDepth1;
uniform sampler2D uDepth2;
uniform sampler2D uDepth3;
uniform sampler2D uDepth4;
uniform float uOffset[5];   // each depth's scroll (px of the target)
uniform float uLoopH[5];    // each depth's loop height (px of the target)
uniform vec2 uScreen;       // the target (px)
uniform vec3 uBack;         // the background (--bg: black in every palette)
uniform vec4 uRunRect;      // the line being run (px: left, top, right, bottom)
uniform float uRun;         // how strongly it's added again now (0: none)

in vec2 vPos;
out vec4 fragColor;

// Depth i's sheet here: its loop read at its scroll.
vec4 sheet(sampler2D t, int i) {
    return texture(t, vec2(vPos.x, (vPos.y * uScreen.y + uOffset[i]) / uLoopH[i]));
}

void main() {
    vec2 p = vPos * uScreen;
    vec3 c = uBack;
    vec4 s = sheet(uDepth0, 0);
    c = c * (1.0 - s.a) + s.rgb;
    s = sheet(uDepth1, 1);
    c = c * (1.0 - s.a) + s.rgb;
    s = sheet(uDepth2, 2);
    c = c * (1.0 - s.a) + s.rgb;
    // The focus depth, then the line being run added again over it.
    s = sheet(uDepth3, 3);
    c = c * (1.0 - s.a) + s.rgb;
    float inRun = step(uRunRect.x, p.x) * step(p.x, uRunRect.z) * step(uRunRect.y, p.y) * step(p.y, uRunRect.w);
    c = min(c + s.rgb * uRun * inRun, vec3(1.0));
    s = sheet(uDepth4, 4);
    c = c * (1.0 - s.a) + s.rgb;
    fragColor = vec4(min(c, vec3(1.0)), 1.0);
}
