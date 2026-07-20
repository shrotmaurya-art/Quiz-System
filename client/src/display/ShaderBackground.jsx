import { useRef, useEffect } from 'react';

const VS = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FS_SHADER_1 = `precision highp float;
varying vec2 v_texCoord;
uniform float u_time;
uniform vec2 u_resolution;

float random (vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = v_texCoord;
    vec2 center = vec2(0.5, 0.5);
    
    // Deep indigo base
    vec3 color_dark = vec3(0.039, 0.055, 0.161); // #0A0E29
    vec3 color_mid = vec3(0.102, 0.071, 0.271);  // #1A1245
    
    // Radial gradient background
    float d = distance(uv, center);
    vec3 color = mix(color_mid, color_dark, smoothstep(0.1, 0.9, d));
    
    // Golden spotlight glow
    float spotlight = 1.0 - smoothstep(0.0, 0.7, d);
    color += vec3(0.96, 0.77, 0.26) * spotlight * 0.2;
    
    // Sweeping light beams radiating from center
    vec2 rel = uv - center;
    float angle = atan(rel.y, rel.x);
    
    // Beam 1: Slow sweeping
    float beam1 = sin(angle * 6.0 + u_time * 0.4) * 0.5 + 0.5;
    beam1 *= pow(1.0 - d, 1.5);
    color += vec3(0.36, 0.31, 0.88) * beam1 * 0.15; // Purple-blue
    
    // Beam 2: Faster, thinner beams
    float beam2 = sin(angle * 12.0 - u_time * 0.6) * 0.5 + 0.5;
    beam2 *= pow(1.0 - d, 2.0);
    color += vec3(0.96, 0.77, 0.26) * beam2 * 0.1; // Gold
    
    // Drifting sparkles (upward motion)
    vec2 st = uv * 40.0;
    st.y -= u_time * 1.5; // Drift upward
    vec2 ipos = floor(st);
    if (random(ipos) > 0.97) {
        float spark = sin(u_time * 3.0 + random(ipos) * 6.28) * 0.5 + 0.5;
        color += vec3(0.96, 0.77, 0.26) * spark * 0.5;
    }
    
    gl_FragColor = vec4(color, 1.0);
}`;

const FS_SHADER_2 = `precision highp float;
varying vec2 v_texCoord;
uniform float u_time;
uniform vec2 u_resolution;

float random (vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = v_texCoord;
    vec2 center = vec2(0.5, 0.5);
    
    // Deep indigo base
    vec3 color_dark = vec3(0.039, 0.055, 0.161); // #0A0E29
    vec3 color_mid = vec3(0.102, 0.071, 0.271);  // #1A1245
    
    // Radial gradient background
    float d = distance(uv, center);
    vec3 color = mix(color_mid, color_dark, smoothstep(0.2, 0.8, d));
    
    // Golden spotlight glow
    float spotlight = 1.0 - smoothstep(0.0, 0.6, d);
    color += vec3(0.96, 0.77, 0.26) * spotlight * 0.15;
    
    // Light rays
    vec2 rel = uv - center;
    float angle = atan(rel.y, rel.x);
    float rays = sin(angle * 8.0 + u_time * 0.2) * 0.5 + 0.5;
    rays *= pow(1.0 - d, 2.0);
    color += vec3(0.36, 0.31, 0.88) * rays * 0.1; // Purple-blue rays
    
    // Subtle sparkles
    vec2 st = uv * 50.0;
    vec2 ipos = floor(st);
    if (random(ipos) > 0.98) {
        float spark = sin(u_time * 2.0 + random(ipos) * 6.28) * 0.5 + 0.5;
        color += vec3(0.96, 0.77, 0.26) * spark * 0.4;
    }
    
    gl_FragColor = vec4(color, 1.0);
}`;

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('Shader compilation error:', gl.getShaderInfoLog(s));
  }
  return s;
}

export default function ShaderBackground({ variant = 'shader_1' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function syncSize() {
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);
    syncSize();

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    const fsSource = variant === 'shader_2' ? FS_SHADER_2 : FS_SHADER_1;

    const prog = gl.createProgram();
    gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(prog);
    
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Shader link error:', gl.getProgramInfoLog(prog));
      ro.disconnect();
      return;
    }
    
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');

    let raf;
    function render(t) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    }
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (gl && prog) {
        gl.deleteProgram(prog);
      }
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ display: 'block' }}
    />
  );
}
