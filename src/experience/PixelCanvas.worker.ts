interface GeneratePixelsMessage {
  colors: readonly string[];
  gap: number;
  height: number;
  id: number;
  preferSharedMemory: boolean;
  reducedMotion: boolean;
  width: number;
}

interface GeneratePixelsResponse {
  colorIndexes: ArrayBufferLike;
  counterSteps: ArrayBufferLike;
  delays: ArrayBufferLike;
  id: number;
  maxSizes: ArrayBufferLike;
  shared: boolean;
  sizeSteps: ArrayBufferLike;
  xs: ArrayBufferLike;
  ys: ArrayBufferLike;
}

self.onmessage = (event: MessageEvent<GeneratePixelsMessage>) => {
  const { colors, gap, height, id, preferSharedMemory, reducedMotion, width } = event.data;
  const columns = Math.ceil(width / gap);
  const rows = Math.ceil(height / gap);
  const total = columns * rows;
  const useSharedMemory = preferSharedMemory && supportsSharedMemory();
  const xs = createFloat32Array(total, useSharedMemory);
  const ys = createFloat32Array(total, useSharedMemory);
  const delays = createFloat32Array(total, useSharedMemory);
  const maxSizes = createFloat32Array(total, useSharedMemory);
  const sizeSteps = createFloat32Array(total, useSharedMemory);
  const counterSteps = createFloat32Array(total, useSharedMemory);
  const colorIndexes = createUint8Array(total, useSharedMemory);
  const maxIntegerSize = 2;
  let cursor = 0;

  for (let x = 0; x < width; x += gap) {
    for (let y = 0; y < height; y += gap) {
      xs[cursor] = x;
      ys[cursor] = y;
      delays[cursor] = reducedMotion ? 0 : distanceToCenter(x, y, width, height);
      maxSizes[cursor] = randomBetween(0.5, maxIntegerSize);
      sizeSteps[cursor] = Math.random() * 0.4;
      counterSteps[cursor] = Math.random() * 4 + (width + height) * 0.01;
      colorIndexes[cursor] = Math.floor(Math.random() * Math.max(colors.length, 1));
      cursor += 1;
    }
  }

  const response: GeneratePixelsResponse = {
    id,
    xs: xs.buffer,
    ys: ys.buffer,
    delays: delays.buffer,
    maxSizes: maxSizes.buffer,
    sizeSteps: sizeSteps.buffer,
    counterSteps: counterSteps.buffer,
    colorIndexes: colorIndexes.buffer,
    shared: useSharedMemory
  };

  if (useSharedMemory) {
    self.postMessage(response);
    return;
  }

  self.postMessage(response, {
    transfer: [
    response.xs as ArrayBuffer,
    response.ys as ArrayBuffer,
    response.delays as ArrayBuffer,
    response.maxSizes as ArrayBuffer,
    response.sizeSteps as ArrayBuffer,
    response.counterSteps as ArrayBuffer,
    response.colorIndexes as ArrayBuffer
    ]
  });
};

function distanceToCenter(x: number, y: number, width: number, height: number): number {
  const dx = x - width / 2;
  const dy = y - height / 2;
  return Math.sqrt(dx * dx + dy * dy);
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function createFloat32Array(length: number, shared: boolean): Float32Array {
  const bytes = length * Float32Array.BYTES_PER_ELEMENT;
  return new Float32Array(createBuffer(bytes, shared));
}

function createUint8Array(length: number, shared: boolean): Uint8Array {
  return new Uint8Array(createBuffer(length, shared));
}

function createBuffer(byteLength: number, shared: boolean): ArrayBufferLike {
  if (shared && typeof SharedArrayBuffer !== 'undefined') {
    return new SharedArrayBuffer(byteLength);
  }

  return new ArrayBuffer(byteLength);
}

function supportsSharedMemory(): boolean {
  return typeof SharedArrayBuffer !== 'undefined' && self.crossOriginIsolated === true;
}
