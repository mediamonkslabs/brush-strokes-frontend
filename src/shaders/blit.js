// uTexture iChannel0
// _Noise iChannel1
// _Input iChannel2
// _Structure iChannel3

const blitShader =
  ' \
void mainImage( out vec4 c, vec2 p ) { \
  vec2 fc = p.xy; \
  vec2 vUV = p/iResolution.xy; \
 \
  vec2 d = 0.5 * texture2D(iChannel1, fc / 256.).xy; \
 \
  vec4 fragColor = texture2D(iChannel0, vUV); \
 \
  float emb = \
    texture2D(iChannel1,  (fc + vec2(0.5, -0.5)) / 256.).x - \
    texture2D(iChannel1,  (fc - vec2(0.5, -0.5)) / 256.).x; \
 \
  fragColor.rgb = clamp(fragColor.rgb, vec3(0), vec3(1)); \
  fragColor.rgb = pow(fragColor.rgb, vec3(.5)); \
 \
  vec3 r = (1.-fract(fragColor.rgb * vec3(1.,4.,4.) + .5)); \
  r = clamp(r*1.5-.4, vec3(0), vec3(1)); \
  r = pow(r, vec3(4.)); \
 \
  fragColor.rgb += r.rgb * .2 * (1.-fragColor.rgb); \
 \
  vec3 col1 = vec3(240./255., 190./255., 220./255.); \
  vec3 col2 = vec3(190./255., 190./255., 240./255.); \
  vec3 col3 = vec3(170./255., 230./255., 170./255.); \
 \
  vec4 inp = texture2D(iChannel2, vUV + (d-.25) * (16./iResolution)); \
 \
  col1 = mix( col1, col1 * col1, .5*smoothstep(.1,.3, inp.y + inp.x)); \
  col2 = mix( col2, col2 * col2, .5*smoothstep(.1,.3, inp.y + inp.x)); \
  col3 = mix( col3, col3 * col3, smoothstep(.1,.3, inp.z)); \
 \
  vec3 col = (1.-col1) * fragColor.r + (1.-col2) * fragColor.g  + (1.-col3) * fragColor.b; \
 \
  vec3 structure = texture2D(iChannel3, fc / 512.).rgb; \
  col *= .4+.6*smoothstep(.7, .975, structure.r); \
 \
  fragColor.rgb = 1.-col; \
 \
  fragColor.a = 1.; \
  fragColor.rgb *= 0.95 + 0.1 * d.x + 0.05 * emb; \
 \
  c = fragColor; \
} \
';

export default blitShader;
