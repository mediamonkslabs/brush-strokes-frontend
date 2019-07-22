uniform float _FrameReset;

const float _InputStrength = 0.075;
const float _FadeOutStrength = 0.025;

float hash13(vec3 p3) {
    p3  = fract(p3 * .1031);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx+19.19);
    return fract((p3.xx+p3.yz)*p3.zy);
}

vec4 getInput(vec2 pos) {
    vec4 inp = texture2D(iChannel2, pos / iResolution);

    float s = inp.x;

    inp.r = max(s > 0. ? .01 : 0., s * 2. - 1.);
    inp.g = min(s * 2., 1.);
    inp.b = inp.b;

    inp.g = max(0., inp.g - inp.r);

    return inp;
}

vec4 sampleTex(vec2 pos) {
    vec4 src = texture2D(iChannel0, pos / iResolution);
    vec4 inp = getInput(pos);

//    if (_FrameReset > .5) src.rg = mix(src.rg, inp.rg * _InputStrength, .5);

    return mix(src, inp, inp * inp * _InputStrength);
}

void mainImage(out vec4 c, vec2 p) {
    vec4 fragColor;
    vec2 fc = p.xy;

    vec2 noise2 = texture2D(iChannel1, (floor(fc * 1.9) + 0.5) / 256.).xy;
    fc += (noise2 * 2.0 - 1.0) * 2.5;

    vec3 v0 = sampleTex(fc + vec2(-1, 0)).rgb;
    vec3 v1 = sampleTex(fc + vec2(1, 0)).rgb;
    vec3 v2 = sampleTex(fc + vec2(0, -1)).rgb;
    vec3 v3 = sampleTex(fc + vec2(0, 1)).rgb;

    vec3 avg = (v0 + v1 + v2 + v3) * 0.25;
    float wx = abs(v0.g - v1.g);
    float wy = abs(v2.g - v3.g);

    fragColor.rgb = wx > wy ? mix(avg, (v0 + v1) * .5, .75) : mix(avg, (v2 + v3) * .5, .75);
//    fragColor.rgb = mix(fragColor.rgb, (v3 * 8. + v2 * 6. + v0 + v1) / 16., .5);

    fragColor.rgb *= (1.-_FadeOutStrength);
    float h = hash13(vec3(p, iTime));
    fragColor.rgb = max(vec3(0.), fragColor.rgb - h*(1./256.));
    c = fragColor;
}