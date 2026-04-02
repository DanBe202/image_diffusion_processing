export interface ImageBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  channels: number;
}

export function gaussianBlurDiffusion(
  src: ImageBuffer,
  sigma: number
): ImageBuffer {
  if (sigma <= 0) return src;

  const t = (sigma * sigma) / 2.0;

  const maxDt = 0.25;
  const iterations = Math.ceil(t / maxDt);
  const dt = t / iterations;

  const width = src.width;
  const height = src.height;

  let currentBuffer = new Float32Array(src.data);
  let nextBuffer = new Float32Array(currentBuffer.length);

  for (let i = 0; i < currentBuffer.length; i += 4) {
    const alpha = currentBuffer[i + 3] / 255.0;
    currentBuffer[i] *= alpha;
    currentBuffer[i + 1] *= alpha;
    currentBuffer[i + 2] *= alpha;
  }

  for (let iter = 0; iter < iterations; iter++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;

        const xLeft = Math.max(x - 1, 0);
        const xRight = Math.min(x + 1, width - 1);
        const yUp = Math.max(y - 1, 0);
        const yDown = Math.min(y + 1, height - 1);

        const idxLeft = (y * width + xLeft) * 4;
        const idxRight = (y * width + xRight) * 4;
        const idxUp = (yUp * width + x) * 4;
        const idxDown = (yDown * width + x) * 4;

        for (let c = 0; c < 4; c++) {
          const center = currentBuffer[index + c];
          const left = currentBuffer[idxLeft + c];
          const right = currentBuffer[idxRight + c];
          const up = currentBuffer[idxUp + c];
          const down = currentBuffer[idxDown + c];

          const laplacian = left + right + up + down - 4 * center;

          nextBuffer[index + c] = center + dt * laplacian;
        }
      }
    }
    const temp = currentBuffer;
    currentBuffer = nextBuffer;
    nextBuffer = temp;
  }

  for (let i = 0; i < currentBuffer.length; i += 4) {
    const outAlpha = currentBuffer[i + 3];
    const unMultiply = outAlpha > 0 ? 255.0 / outAlpha : 0;
    currentBuffer[i] *= unMultiply;
    currentBuffer[i + 1] *= unMultiply;
    currentBuffer[i + 2] *= unMultiply;
  }

  return {
    width: src.width,
    height: src.height,
    channels: src.channels,
    data: new Uint8ClampedArray(currentBuffer)
  };
}
