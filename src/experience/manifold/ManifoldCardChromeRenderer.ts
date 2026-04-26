import type { MutableScreenQuad } from './ManifoldTypes';
import { IS_SAFARI, SAFARI_VERSION } from '../../utils/browserDetection';

export interface CardChromeInstance {
  accentRgb: [number, number, number];
  depth: number;
  emphasis: number;
  opacity: number;
  quad: MutableScreenQuad;
}

const VERTEX_STRIDE_FLOATS = 9;
const VERTICES_PER_QUAD = 6;
const FLOATS_PER_QUAD = VERTICES_PER_QUAD * VERTEX_STRIDE_FLOATS;

export class ManifoldCardChromeRenderer {
  private static readonly PREWARM_INSTANCE: CardChromeInstance = {
    accentRgb: [0.82, 0.9, 1],
    depth: 0,
    emphasis: 0,
    opacity: 0,
    quad: [
      [0, 0],
      [24, 0],
      [24, 24],
      [0, 24]
    ]
  };

  private readonly gl: WebGL2RenderingContext | null;
  private readonly program: WebGLProgram | null;
  private readonly vertexArray: WebGLVertexArrayObject | null;
  private readonly vertexBuffer: WebGLBuffer | null;
  private readonly positionLocation: number;
  private readonly uvLocation: number;
  private readonly opacityLocation: number;
  private readonly accentLocation: number;
  private readonly emphasisLocation: number;
  private readonly resolutionLocation: WebGLUniformLocation | null;
  private instanceCapacity: number;
  private instanceData: Float32Array;
  private sortedInstances: CardChromeInstance[];
  private bufferCapacityBytes = 0;
  private canvasWidth = 0;
  private canvasHeight = 0;
  private dpr = 1;
  private prewarmed = false;
  private disabled = false;
  private lastWillChange = '';
  private attributesConfigured = false;
  private lastResolutionWidth = -1;
  private lastResolutionHeight = -1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    initialInstanceCapacity = 24
  ) {
    this.instanceCapacity = Math.max(1, initialInstanceCapacity);
    this.instanceData = new Float32Array(this.instanceCapacity * FLOATS_PER_QUAD);
    this.sortedInstances = new Array<CardChromeInstance>(this.instanceCapacity);
    this.gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      desynchronized: !IS_SAFARI || SAFARI_VERSION >= 17,
      powerPreference: 'high-performance',
      premultipliedAlpha: true,
      stencil: false
    });

    if (!this.gl) {
      this.program = null;
      this.vertexArray = null;
      this.vertexBuffer = null;
      this.positionLocation = -1;
      this.uvLocation = -1;
      this.opacityLocation = -1;
      this.accentLocation = -1;
      this.emphasisLocation = -1;
      this.resolutionLocation = null;
      return;
    }

    const vertexShader = compileShader(
      this.gl,
      this.gl.VERTEX_SHADER,
      `#version 300 es
      precision highp float;

      in vec2 a_position;
      in vec2 a_uv;
      in float a_opacity;
      in vec3 a_accent;
      in float a_emphasis;

      uniform vec2 u_resolution;

      out vec2 v_uv;
      out float v_opacity;
      out vec3 v_accent;
      out float v_emphasis;

      void main() {
        vec2 clip = vec2(
          (a_position.x / u_resolution.x) * 2.0 - 1.0,
          1.0 - (a_position.y / u_resolution.y) * 2.0
        );
        gl_Position = vec4(clip, 0.0, 1.0);
        v_uv = a_uv;
        v_opacity = a_opacity;
        v_accent = a_accent;
        v_emphasis = a_emphasis;
      }`
    );

    const fragmentShader = compileShader(
      this.gl,
      this.gl.FRAGMENT_SHADER,
      `#version 300 es
      precision highp float;

      in vec2 v_uv;
      in float v_opacity;
      in vec3 v_accent;
      in float v_emphasis;

      out vec4 out_color;

      float roundedBoxSdf(vec2 p, vec2 halfSize, float radius) {
        vec2 q = abs(p) - halfSize + vec2(radius);
        return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - radius;
      }

      void main() {
        vec2 p = v_uv - vec2(0.5);
        float radius = 0.095;
        float sdf = roundedBoxSdf(p, vec2(0.5), radius);

        float ring = 1.0 - smoothstep(0.0035, 0.009, abs(sdf));
        float outerGlow = 1.0 - smoothstep(0.0, 0.045 + v_emphasis * 0.012, max(sdf, 0.0));

        vec3 accent = clamp(v_accent, 0.0, 1.0);
        vec3 ringColor = mix(vec3(0.88, 0.93, 1.0), accent, 0.72);
        vec3 glowColor = mix(vec3(0.02, 0.05, 0.11), accent, 0.78);
        vec3 color =
          glowColor * outerGlow * (0.02 + v_emphasis * 0.008) +
          ringColor * ring * (0.095 + v_emphasis * 0.028);

        float alpha = clamp(
          outerGlow * (0.02 + v_emphasis * 0.008) +
          ring * (0.125 + v_emphasis * 0.022),
          0.0,
          1.0
        ) * v_opacity;

        out_color = vec4(color, alpha);
      }`
    );

    this.program = linkProgram(this.gl, vertexShader, fragmentShader);
    this.vertexArray = this.gl.createVertexArray();
    this.vertexBuffer = this.gl.createBuffer();
    this.positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.uvLocation = this.gl.getAttribLocation(this.program, 'a_uv');
    this.opacityLocation = this.gl.getAttribLocation(this.program, 'a_opacity');
    this.accentLocation = this.gl.getAttribLocation(this.program, 'a_accent');
    this.emphasisLocation = this.gl.getAttribLocation(this.program, 'a_emphasis');
    this.resolutionLocation = this.gl.getUniformLocation(this.program, 'u_resolution');

    this.configureVertexAttributes();
  }

  isSupported(): boolean {
    return Boolean(this.gl && this.program && this.vertexBuffer && !this.disabled);
  }

  disable(): void {
    this.disabled = true;
    this.prewarmed = false;
  }

  resize(width: number, height: number): void {
    if (!this.gl || this.disabled) {
      return;
    }

    const nextDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const nextWidth = Math.max(1, Math.round(width * nextDpr));
    const nextHeight = Math.max(1, Math.round(height * nextDpr));

    if (
      nextWidth === this.canvasWidth &&
      nextHeight === this.canvasHeight &&
      nextDpr === this.dpr
    ) {
      return;
    }

    this.canvasWidth = nextWidth;
    this.canvasHeight = nextHeight;
    this.dpr = nextDpr;
    this.canvas.width = nextWidth;
    this.canvas.height = nextHeight;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  clear(): void {
    if (!this.gl || this.disabled) {
      return;
    }

    this.gl.viewport(0, 0, this.canvasWidth, this.canvasHeight);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  prewarm(width: number, height: number): void {
    if (!this.gl || !this.program || !this.vertexBuffer || this.prewarmed || this.disabled) {
      return;
    }

    this.resize(width, height);
    this.ensureCapacity(1);

    const warmupFloats = writePackedInstance(
      this.instanceData,
      0,
      ManifoldCardChromeRenderer.PREWARM_INSTANCE,
      this.dpr
    );

    this.gl.viewport(0, 0, this.canvasWidth, this.canvasHeight);
    this.gl.useProgram(this.program);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.ensureBufferCapacity();
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.instanceData, 0, warmupFloats);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.disable(this.gl.DEPTH_TEST);
    this.gl.disable(this.gl.CULL_FACE);
    this.bindVertexAttributes();
    this.syncResolutionUniform();

    this.gl.drawArrays(this.gl.TRIANGLES, 0, VERTICES_PER_QUAD);
    this.gl.flush();
    this.clear();
    this.prewarmed = true;
  }

  render(
    instances: readonly CardChromeInstance[],
    instanceCount: number,
    width: number,
    height: number
  ): void {
    if (!this.gl || !this.program || !this.vertexBuffer || this.disabled) {
      return;
    }

    this.resize(width, height);
    this.gl.viewport(0, 0, this.canvasWidth, this.canvasHeight);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    if (instanceCount === 0) {
      if (this.lastWillChange !== 'auto') {
        this.canvas.style.willChange = 'auto';
        this.lastWillChange = 'auto';
      }
      return;
    }

    if (this.lastWillChange !== 'transform') {
      this.canvas.style.willChange = 'transform';
      this.lastWillChange = 'transform';
    }

    this.ensureCapacity(instanceCount);
    sortInstancesByDepth(instances, instanceCount, this.sortedInstances);

    let cursor = 0;
    for (let index = 0; index < instanceCount; index += 1) {
      cursor = writePackedInstance(
        this.instanceData,
        cursor,
        this.sortedInstances[index]!,
        this.dpr
      );
    }

    this.gl.useProgram(this.program);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.ensureBufferCapacity();
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.instanceData, 0, cursor);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.disable(this.gl.DEPTH_TEST);
    this.gl.disable(this.gl.CULL_FACE);
    this.bindVertexAttributes();
    this.syncResolutionUniform();

    this.gl.drawArrays(this.gl.TRIANGLES, 0, instanceCount * VERTICES_PER_QUAD);
  }

  destroy(): void {
    if (!this.gl || !this.program || !this.vertexBuffer) {
      return;
    }

    if (this.vertexArray) {
      this.gl.deleteVertexArray(this.vertexArray);
    }
    this.gl.deleteBuffer(this.vertexBuffer);
    this.gl.deleteProgram(this.program);
  }

  private ensureCapacity(required: number): void {
    if (required <= this.instanceCapacity) {
      return;
    }

    let nextCapacity = this.instanceCapacity;
    while (nextCapacity < required) {
      nextCapacity *= 2;
    }

    this.instanceCapacity = nextCapacity;
    this.instanceData = new Float32Array(this.instanceCapacity * FLOATS_PER_QUAD);
    this.sortedInstances = new Array<CardChromeInstance>(this.instanceCapacity);
    this.bufferCapacityBytes = 0;
  }

  private ensureBufferCapacity(): void {
    if (!this.gl) {
      return;
    }

    const requiredBytes = this.instanceData.byteLength;
    if (requiredBytes === this.bufferCapacityBytes) {
      return;
    }

    this.gl.bufferData(this.gl.ARRAY_BUFFER, requiredBytes, this.gl.DYNAMIC_DRAW);
    this.bufferCapacityBytes = requiredBytes;
  }

  private configureVertexAttributes(): void {
    if (!this.gl || !this.vertexBuffer || this.attributesConfigured) {
      return;
    }

    const stride = VERTEX_STRIDE_FLOATS * Float32Array.BYTES_PER_ELEMENT;

    if (this.vertexArray) {
      this.gl.bindVertexArray(this.vertexArray);
    }
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);

    this.gl.enableVertexAttribArray(this.positionLocation);
    this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, stride, 0);

    this.gl.enableVertexAttribArray(this.uvLocation);
    this.gl.vertexAttribPointer(this.uvLocation, 2, this.gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

    this.gl.enableVertexAttribArray(this.opacityLocation);
    this.gl.vertexAttribPointer(this.opacityLocation, 1, this.gl.FLOAT, false, stride, 4 * Float32Array.BYTES_PER_ELEMENT);

    this.gl.enableVertexAttribArray(this.accentLocation);
    this.gl.vertexAttribPointer(this.accentLocation, 3, this.gl.FLOAT, false, stride, 5 * Float32Array.BYTES_PER_ELEMENT);

    this.gl.enableVertexAttribArray(this.emphasisLocation);
    this.gl.vertexAttribPointer(this.emphasisLocation, 1, this.gl.FLOAT, false, stride, 8 * Float32Array.BYTES_PER_ELEMENT);

    if (this.vertexArray) {
      this.gl.bindVertexArray(null);
    }

    this.attributesConfigured = true;
  }

  private bindVertexAttributes(): void {
    if (!this.gl) {
      return;
    }

    if (this.vertexArray) {
      this.gl.bindVertexArray(this.vertexArray);
      return;
    }

    this.configureVertexAttributes();
  }

  private syncResolutionUniform(): void {
    if (
      !this.gl ||
      !this.resolutionLocation ||
      (
        this.canvasWidth === this.lastResolutionWidth &&
        this.canvasHeight === this.lastResolutionHeight
      )
    ) {
      return;
    }

    this.gl.uniform2f(this.resolutionLocation, this.canvasWidth, this.canvasHeight);
    this.lastResolutionWidth = this.canvasWidth;
    this.lastResolutionHeight = this.canvasHeight;
  }
}

// Reusable index buffer — avoids allocating per-frame.
const _sortIndexBuffer = new Int32Array(256);

function sortInstancesByDepth(
  instances: readonly CardChromeInstance[],
  instanceCount: number,
  target: CardChromeInstance[]
): void {
  // Fill index buffer (grow if needed — rare)
  let indices: Int32Array | number[] = _sortIndexBuffer;
  if (instanceCount > _sortIndexBuffer.length) {
    indices = new Array(instanceCount).fill(0).map((_, i) => i);
  } else {
    for (let i = 0; i < instanceCount; i += 1) _sortIndexBuffer[i] = i;
  }

  // Insertion sort on indices only — no object copies
  for (let i = 1; i < instanceCount; i += 1) {
    const idx = indices[i]!;
    const depth = instances[idx]!.depth;
    let j = i - 1;

    while (j >= 0 && instances[indices[j]!]!.depth > depth) {
      indices[j + 1] = indices[j]!;
      j -= 1;
    }

    indices[j + 1] = idx;
  }

  // Copy in sorted order into target (required by caller)
  for (let i = 0; i < instanceCount; i += 1) {
    target[i] = instances[indices[i]!]!;
  }
}

function writePackedInstance(
  target: Float32Array,
  offset: number,
  instance: CardChromeInstance,
  dpr: number
): number {
  const quad = instance.quad;
  const centerX = (quad[0][0] + quad[1][0] + quad[2][0] + quad[3][0]) * 0.25;
  const centerY = (quad[0][1] + quad[1][1] + quad[2][1] + quad[3][1]) * 0.25;
  const bboxWidth = Math.max(24, Math.abs(quad[1][0] - quad[0][0]) + Math.abs(quad[2][0] - quad[3][0])) * 0.5;
  const bboxHeight = Math.max(24, Math.abs(quad[3][1] - quad[0][1]) + Math.abs(quad[2][1] - quad[1][1])) * 0.5;
  const padPx = Math.max(4, Math.min(9, Math.max(bboxWidth, bboxHeight) * 0.018 + instance.emphasis * 1.1));
  const scale = 1 + padPx / Math.max(24, Math.max(bboxWidth, bboxHeight));
  const uvPad = (scale - 1) * 0.5;

  const [r, g, b] = instance.accentRgb;
  const opacity = instance.opacity;
  const emphasis = instance.emphasis;

  const x0 = (centerX + (quad[0][0] - centerX) * scale) * dpr;
  const y0 = (centerY + (quad[0][1] - centerY) * scale) * dpr;
  const x1 = (centerX + (quad[1][0] - centerX) * scale) * dpr;
  const y1 = (centerY + (quad[1][1] - centerY) * scale) * dpr;
  const x2 = (centerX + (quad[2][0] - centerX) * scale) * dpr;
  const y2 = (centerY + (quad[2][1] - centerY) * scale) * dpr;
  const x3 = (centerX + (quad[3][0] - centerX) * scale) * dpr;
  const y3 = (centerY + (quad[3][1] - centerY) * scale) * dpr;

  const u0 = -uvPad;
  const v0 = -uvPad;
  const u1 = 1 + uvPad;
  const v1 = -uvPad;
  const u2 = 1 + uvPad;
  const v2 = 1 + uvPad;
  const u3 = -uvPad;
  const v3 = 1 + uvPad;

  let cursor = offset;
  cursor = writeVertex(target, cursor, x0, y0, u0, v0, opacity, r, g, b, emphasis);
  cursor = writeVertex(target, cursor, x1, y1, u1, v1, opacity, r, g, b, emphasis);
  cursor = writeVertex(target, cursor, x2, y2, u2, v2, opacity, r, g, b, emphasis);
  cursor = writeVertex(target, cursor, x0, y0, u0, v0, opacity, r, g, b, emphasis);
  cursor = writeVertex(target, cursor, x2, y2, u2, v2, opacity, r, g, b, emphasis);
  cursor = writeVertex(target, cursor, x3, y3, u3, v3, opacity, r, g, b, emphasis);
  return cursor;
}

function writeVertex(
  target: Float32Array,
  offset: number,
  x: number,
  y: number,
  u: number,
  v: number,
  opacity: number,
  r: number,
  g: number,
  b: number,
  emphasis: number
): number {
  target[offset] = x;
  target[offset + 1] = y;
  target[offset + 2] = u;
  target[offset + 3] = v;
  target[offset + 4] = opacity;
  target[offset + 5] = r;
  target[offset + 6] = g;
  target[offset + 7] = b;
  target[offset + 8] = emphasis;
  return offset + VERTEX_STRIDE_FLOATS;
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new Error('WebGL shader allocation failed.');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) || 'Unknown shader compile error.';
    gl.deleteShader(shader);
    throw new Error(info);
  }

  return shader;
}

function linkProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram {
  const program = gl.createProgram();

  if (!program) {
    throw new Error('WebGL program allocation failed.');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) || 'Unknown program link error.';
    gl.deleteProgram(program);
    throw new Error(info);
  }

  return program;
}
