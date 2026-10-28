#version 300 es
// prism tube.frag: a neon line: a bright core and a soft glow (Gaussian,
// smooth at any angle), rounded off past its ends; now and then a pulse of
// light runs along it. Added to what's behind (the light of a tube).
precision highp float;

uniform vec3 uNeon;      // the neon's colour
uniform float uDensity;  // device px per CSS px
uniform float uCoreW;    // the core's width (CSS px)
uniform float uGlowW;    // the glow's reach (CSS px)
uniform float uGlowAmt;  // the glow's strength (GLOW level)
uniform float uTime;     // seconds
uniform float uSpeed;    // a pulse's speed (units a second)
uniform float uPulseLen; // a pulse's length (units)

in float vAcross;
in float vAlong;
flat in float vPhase;
flat in float vLength;
out vec4 fragColor;

void main() {
    float px = abs(vAcross) / uDensity;
    // Past an end: the distance from it counts too, so the line ends round.
    float over = max(0.0, max(-vAlong, vAlong - 1.0)) * vLength;
    float core = exp(-0.5 * pow(px / uCoreW, 2.0)) * (1.0 - smoothstep(0.0, 0.06, over));
    float glow = uGlowAmt * 0.55 * exp(-0.5 * pow(px / uGlowW, 2.0)) * exp(-over * over * 6.0);
    // A pulse runs the length and on through a gap four times as long, so it shows now and then.
    float cycle = vLength * 5.0;
    float head = mod(uTime * uSpeed + vPhase * cycle, cycle);
    float pulse = exp(-pow((vAlong * vLength - head) / uPulseLen, 2.0) * 2.0);
    float k = (core + glow) * (1.0 + 1.6 * pulse);
    fragColor = vec4(uNeon * k, 0.0);
}
