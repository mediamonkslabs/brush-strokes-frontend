// NN iChannel0
// Drawing iChannel1

const inputShader =
  ' \
  void mainImage( out vec4 c, vec2 p ) { \
    vec4 fragColor; \
    vec2 fc = p.xy / iResolution.xy; \
    fc.y = 1.-fc.y;\
    \
    float color = texture2D(iChannel0, fc).r; \
    float mask = texture2D(iChannel1, fc).a;  \
    c = vec4(max(0.,1.-color), 0, mask * color, 1.); \
}';

export default inputShader;
