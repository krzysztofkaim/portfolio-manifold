class ResizeObserverMock implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function createCanvasContext(): CanvasRenderingContext2D {
  return {
    arc() {},
    beginPath() {},
    clearRect() {},
    fill() {},
    fillRect() {},
    measureText(text: string) {
      return {
        actualBoundingBoxAscent: 10,
        actualBoundingBoxDescent: 4,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: text.length * 8,
        fontBoundingBoxAscent: 10,
        fontBoundingBoxDescent: 4,
        width: text.length * 8
      } as TextMetrics;
    },
    setTransform() {},
    font: '16px sans-serif',
    fillStyle: ''
  } as unknown as CanvasRenderingContext2D;
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  value: ResizeObserverMock
});

Object.defineProperty(globalThis, 'matchMedia', {
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    }
  })
});

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value(contextId: string) {
    if (contextId === '2d') {
      return createCanvasContext();
    }

    return null;
  }
});

Object.defineProperty(window, 'devicePixelRatio', {
  configurable: true,
  value: 1
});
