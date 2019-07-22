void mainImage( out vec4 c, vec2 p ) {
    vec4 fragColor;
    vec2 fc = p.xy / iResolution.xy;
    fc.y = 1.-fc.y;

    float color = texture2D(iChannel0, fc).r;
    float mask = 1. - texture2D(iChannel1, fc).r;
    c = vec4(max(0.,1.-color), 0, mask * color, 1.);
}