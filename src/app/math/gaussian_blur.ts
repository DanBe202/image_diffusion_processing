export interface ImageBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  channels: number;
}

function getGaussianKernel1D(ksize: number, sigma: number): number[] {
  if (sigma <= 0) {
    sigma = 0.3 * ((ksize - 1) * 0.5 - 1) + 0.8;
  }

  const kernel = new Array(ksize);
  let sum = 0;
  const center = (ksize - 1) / 2;

  for (let i = 0; i < ksize; i++) {
    const x = i - center;

    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }

  for (let i = 0; i < ksize; i++) {
    kernel[i] /= sum;
  }

  return kernel;
}

function convolve1D(
  src: Float32Array,
  width: number,
  height: number,
  kernel: number[],
  isHorizontal: boolean
): Float32Array<ArrayBuffer> {
  const dst = new Float32Array(src.length);
  const kHalf = Math.floor(kernel.length / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {

      for (let c = 0; c < 4; c++) {
        let val = 0;
        const pixelIndex = (y * width + x) * 4 + c;

        for (let k = 0; k < kernel.length; k++) {
          const offset = k - kHalf;

          let nx = x;
          let ny = y;

          if (isHorizontal) nx += offset;
          else              ny += offset;

          nx = Math.min(Math.max(nx, 0), width - 1);
          ny = Math.min(Math.max(ny, 0), height - 1);

          const neighborIndex = (ny * width + nx) * 4 + c;
          val += src[neighborIndex] * kernel[k];
        }

        dst[pixelIndex] = val;
      }
    }
  }
  return dst;
}

export function gaussianBlur(
  src: ImageBuffer,
  ksizeX: number,
  ksizeY: number,
  sigmaX: number,
  sigmaY: number = 0
): ImageBuffer {

  if (ksizeX % 2 === 0 || ksizeY % 2 === 0) {
    throw new Error("Kernel size must be odd (e.g., 3, 5, 7)");
  }
  if (sigmaY === 0) sigmaY = sigmaX;

  const kernelX = getGaussianKernel1D(ksizeX, sigmaX);
  const kernelY = getGaussianKernel1D(ksizeY, sigmaY);

  let intermediateData = new Float32Array(src.data);

  intermediateData = convolve1D(intermediateData, src.width, src.height, kernelX, true);

  intermediateData = convolve1D(intermediateData, src.width, src.height, kernelY, false);

  return {
    width: src.width,
    height: src.height,
    channels: src.channels,
    data: new Uint8ClampedArray(intermediateData)
  };
}
