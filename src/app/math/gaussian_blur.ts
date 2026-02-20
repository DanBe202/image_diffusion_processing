export interface ImageBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  channels: number;
}

function getGaussianKernel1D(kernelSize: number, sigma: number): number[] {
  if (sigma <= 0) {
    sigma = 0.3 * ((kernelSize - 1) * 0.5 - 1) + 0.8;
  }

  const kernel = new Array(kernelSize);
  let sum = 0;
  const center = (kernelSize - 1) / 2;

  for (let i = 0; i < kernelSize; i++) {
    const x = i - center;

    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }

  for (let i = 0; i < kernelSize; i++) {
    kernel[i] /= sum;
  }

  return kernel;
}

function convolve1D(
  src: Float32Array,
  dst: Float32Array,
  width: number,
  height: number,
  kernel: number[],
  isHorizontal: boolean
): Float32Array {
  const kernelHalf = Math.floor(kernel.length / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {

      let r = 0, g = 0, b = 0, a = 0;
      const pixelIndex = (y * width + x) * 4;

      for (let k = 0; k < kernel.length; k++) {
        const offset = k - kernelHalf;

        let nx = x;
        let ny = y;

        if (isHorizontal) nx += offset;
        else              ny += offset;

        nx = Math.min(Math.max(nx, 0), width - 1);
        ny = Math.min(Math.max(ny, 0), height - 1);

        const neighborIndex = (ny * width + nx) * 4;
        const weight = kernel[k];

        const alpha = src[neighborIndex + 3] / 255.0;

        r += src[neighborIndex] * alpha * weight;
        g += src[neighborIndex + 1] * alpha * weight;
        b += src[neighborIndex + 2] * alpha * weight;
        a += src[neighborIndex + 3] * weight;
      }

      const outAlpha = a;
      const unMultiply = outAlpha > 0 ? 255.0 / outAlpha : 0;

      dst[pixelIndex] = r * unMultiply;
      dst[pixelIndex + 1] = g * unMultiply;
      dst[pixelIndex + 2] = b * unMultiply;
      dst[pixelIndex + 3] = outAlpha;
    }
  }
  return dst;
}

export function gaussianBlur(
  src: ImageBuffer,
  kernelSizeX: number,
  kernelSizeY: number,
  sigmaX: number,
  sigmaY: number = 0
): ImageBuffer {

  if (kernelSizeX % 2 === 0 || kernelSizeY % 2 === 0) {
    throw new Error("Kernel size must be odd (e.g., 3, 5, 7)");
  }
  if (sigmaY === 0) sigmaY = sigmaX;

  const kernelX = getGaussianKernel1D(kernelSizeX, sigmaX);
  const kernelY = getGaussianKernel1D(kernelSizeY, sigmaY);

  const srcData = new Float32Array(src.data);
  const intermediateData = new Float32Array(srcData.length);

  convolve1D(srcData, intermediateData, src.width, src.height, kernelX, true);

  convolve1D(intermediateData, srcData, src.width, src.height, kernelY, false);

  return {
    width: src.width,
    height: src.height,
    channels: src.channels,
    data: new Uint8ClampedArray(srcData)
  };
}
