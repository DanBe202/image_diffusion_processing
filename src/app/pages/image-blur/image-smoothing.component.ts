import {ChangeDetectionStrategy, Component, computed, signal, viewChild} from '@angular/core';
import {blurDiffusion, ImageBuffer} from '../../math/diffusion_algorithm';
import {fileToImageBuffer} from '../../core/image/image_upload';
import {CanvasComponent} from './components/canvas/canvas.component';
import {ImageControlsComponent} from './components/image-controls/image-controls.component';

export interface BenchmarkResult {
  sigma: number;
  yourTimeMs: number;
  refTimeMs: number;
  psnr: number;
  ssim: number;
  quality: 'Excellent' | 'Good' | 'Acceptable' | 'Poor';
}

@Component({
  selector: 'app-image-blur',
  standalone: true,
  imports: [CanvasComponent, ImageControlsComponent],
  templateUrl: './image-smoothing.component.html',
  styleUrl: './image-smoothing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageSmoothingComponent {
  protected readonly isProcessing = signal(false);
  protected readonly diffusionD = signal(1.0);
  protected readonly timeStep = signal(5.0);
  protected readonly benchmarkResults = signal<BenchmarkResult[]>([]);

  protected readonly predictedSigma = computed(() => {
    const val = Math.sqrt(2 * this.diffusionD() * this.timeStep());
    return parseFloat(val.toFixed(2));
  });

  protected fileName = signal<string>('No file selected');
  private originalBuffer: ImageBuffer | null = null;
  private originalImageData: ImageData | null = null;

  private originalCanvas = viewChild.required<CanvasComponent>('originalCanvas');
  private outputCanvas = viewChild.required<CanvasComponent>('outputCanvas');

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.isProcessing.set(true);
    this.benchmarkResults.set([]);

    try {
      const file = input.files[0];
      this.fileName.set(file.name);

      this.originalCanvas().clear();
      this.outputCanvas().clear();

      const { buffer, imgData } = await fileToImageBuffer(file);
      this.originalBuffer = buffer;
      this.originalImageData = imgData;

      this.outputCanvas().resizeCanvas(imgData.width, imgData.height);
      await this.originalCanvas().putImageData(imgData, 0, 0);
      this.isProcessing.set(false);
    } catch (err) {
      this.fileName.set('No file selected');
      console.error(err);
      this.isProcessing.set(false);
    }
  }

  onRunDiffusion() {
    if (!this.originalBuffer || !this.originalImageData) return;
    this.isProcessing.set(true);
    this.outputCanvas().clear();

    const sigma = this.predictedSigma();
    const safeSigma = sigma < 0.1 ? 0.1 : sigma;

    setTimeout(async () => {
      try {
        const t1 = performance.now();
        const blurred = blurDiffusion(this.originalBuffer!, safeSigma);
        const yourTimeMs = parseFloat((performance.now() - t1).toFixed(2));

        const t2 = performance.now();
        const refPixels = this.nativeCanvasBlur(this.originalImageData!, safeSigma);
        const refTimeMs = parseFloat((performance.now() - t2).toFixed(2));

        const yourPixels = new Uint8ClampedArray(blurred.data);
        const psnr = parseFloat(this.calcPSNR(yourPixels, refPixels).toFixed(2));
        const ssim = parseFloat(this.calcSSIM(yourPixels, refPixels, blurred.width, blurred.height).toFixed(4));

        this.benchmarkResults.set([{
          sigma: safeSigma,
          yourTimeMs,
          refTimeMs,
          psnr,
          ssim,
          quality: psnr > 40 ? 'Excellent' : psnr > 35 ? 'Good' : psnr > 25 ? 'Acceptable' : 'Poor',
        }]);

        const finalImageData = new ImageData(
          new Uint8ClampedArray(blurred.data),
          blurred.width,
          blurred.height
        );
        await this.outputCanvas().putImageData(finalImageData, 0, 0);

        this.isProcessing.set(false);
      } catch (err) {
        console.error(err);
        this.isProcessing.set(false);
      }
    }, 50);
  }

  private nativeCanvasBlur(imgData: ImageData, sigma: number): Uint8ClampedArray {
    const canvas = document.createElement('canvas');
    canvas.width = imgData.width;
    canvas.height = imgData.height;
    const ctx = canvas.getContext('2d')!;

    ctx.putImageData(imgData, 0, 0);

    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = imgData.width;
    blurCanvas.height = imgData.height;
    const blurCtx = blurCanvas.getContext('2d')!;
    blurCtx.filter = `blur(${sigma}px)`;
    blurCtx.drawImage(canvas, 0, 0);

    return blurCtx.getImageData(0, 0, imgData.width, imgData.height).data as Uint8ClampedArray;
  }

  private calcPSNR(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
    let mse = 0;
    for (let i = 0; i < a.length; i++) {
      if ((i + 1) % 4 === 0) continue;
      mse += (a[i] - b[i]) ** 2;
    }
    mse /= (a.length * 3) / 4;
    return mse === 0 ? Infinity : 10 * Math.log10(255 ** 2 / mse);
  }

  private calcSSIM(
    a: Uint8ClampedArray,
    b: Uint8ClampedArray,
    width: number,
    height: number
  ): number {
    const C1 = (0.01 * 255) ** 2;
    const C2 = (0.03 * 255) ** 2;
    const windowSize = 8;
    let ssimSum = 0;
    let count = 0;

    const toLuma = (pixels: Uint8ClampedArray) => {
      const luma = new Float32Array(width * height);
      for (let i = 0; i < luma.length; i++) {
        const idx = i * 4;
        luma[i] = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
      }
      return luma;
    };

    const lumaA = toLuma(a);
    const lumaB = toLuma(b);

    for (let y = 0; y < height - windowSize; y += windowSize) {
      for (let x = 0; x < width - windowSize; x += windowSize) {
        let sumA = 0, sumB = 0, sumA2 = 0, sumB2 = 0, sumAB = 0;
        const n = windowSize * windowSize;

        for (let wy = 0; wy < windowSize; wy++) {
          for (let wx = 0; wx < windowSize; wx++) {
            const idx = (y + wy) * width + (x + wx);
            const va = lumaA[idx];
            const vb = lumaB[idx];
            sumA += va; sumB += vb;
            sumA2 += va * va; sumB2 += vb * vb;
            sumAB += va * vb;
          }
        }

        const muA = sumA / n;
        const muB = sumB / n;
        const sigA2 = sumA2 / n - muA * muA;
        const sigB2 = sumB2 / n - muB * muB;
        const sigAB = sumAB / n - muA * muB;

        const num = (2 * muA * muB + C1) * (2 * sigAB + C2);
        const den = (muA ** 2 + muB ** 2 + C1) * (sigA2 + sigB2 + C2);
        ssimSum += num / den;
        count++;
      }
    }

    return count > 0 ? ssimSum / count : 1;
  }
}
