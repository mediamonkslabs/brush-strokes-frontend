#define SAMPLES 8
#define N(a) (a.yx*vec2(1,-1))
#define PI 3.14159265358979

uniform vec2 _StructureOffset;

vec2 getInput(vec2 pos) {
    return texture2D(iChannel2, pos/iResolution.xy).xy;
}

vec2 getGradient(vec2 pos,float delta) {
    vec2 d=vec2(delta,0);
    return vec2(
        dot((getInput(pos+d.xy)-getInput(pos-d.xy)).xy,vec2(.333)),
        dot((getInput(pos+d.yx)-getInput(pos-d.yx)).xy,vec2(.333))
    )/delta;
}

vec4 getNoise(vec2 pos) {
    return texture2D(iChannel1,pos * (1./256.));
}

float getDist(vec2 pos) {
    return smoothstep(.9,1.1,length(getInput(pos))*.9+getNoise(pos*.2).x);
}

float getBorder(vec2 p) {
    vec2 p0 = p, p1 = p;
    float border = 0., norm = 0.;

    for(int i=0;i<SAMPLES;i++) {
        vec2 gr0 = getGradient(p0,2.);
        vec2 gr1 = getGradient(p1,2.);

        float grl0 = clamp(10.*length(gr0),0.,1.);
        float grll = clamp(10.*length(gr1),0.,1.);

        p0 += 3.8 *normalize(N(gr0));
        p1 -= 3.8 *normalize(N(gr1));

        float fact = 1.-float(i)/float(SAMPLES);
        border += fact*mix(1.,getDist(p0)*2.,grl0);
        border += fact*mix(1.,getDist(p1)*2.,grll);

        norm += fact;
    }
    border /= norm*2.;

    return clamp(border+.1,0.,1.);
}

void mainImage( out vec4 c, vec2 p ) {
  vec2 fc = p.xy;
  vec2 vUV = p/iResolution.xy;

  float emb = getNoise(fc + .5 + _StructureOffset*256.).x - getNoise(fc - .5 + _StructureOffset*256.).x;

  vec4 fragColor = texture2D(iChannel0, vUV);
  fragColor.rgb = clamp(fragColor.rgb, vec3(0), vec3(1));
  fragColor.rgb = pow(fragColor.rgb, vec3(.5));

  vec3 r = (1.-fract(fragColor.rgb * vec3(1.,4.,4.) + .5));
  r = clamp(r*1.5-.4, vec3(0), vec3(1));
  r = pow(r, vec3(4.));

  fragColor.rgb += r.rgb * .2 * (1.-fragColor.rgb);

  vec3 col1 = vec3(240./255., 190./255., 220./255.);
  vec3 col2 = vec3(190./255., 190./255., 240./255.);
  vec3 col3 = vec3(170./255., 230./255., 170./255.);

  vec4 inp = texture2D(iChannel2, vUV);

  col1 = mix( col1, col1 * col1, .5*smoothstep(.1,.3, inp.y + inp.x));
  col2 = mix( col2, col2 * col2, .5*smoothstep(.1,.3, inp.y + inp.x));
  col3 = mix( col3, col3 * col3, smoothstep(.1,.3, inp.z));

  vec3 col = (1.-col1) * fragColor.r + (1.-col2) * fragColor.g  + (1.-col3) * fragColor.b;

  float b = 1.-getBorder(p);
  col *= 1. - .7 * pow(b, .5);
//  col *= 1. + pow(b, .5);

  vec3 structure = texture2D(iChannel3, fc / 512. + _StructureOffset).rgb;
  col *= .4+.6*smoothstep(.7, .975, structure.r);

  fragColor.rgb = 1.-col;

  fragColor.a = 1.;
  fragColor.rgb *= 0.95 + 0.1 * emb;

  c = fragColor;
}