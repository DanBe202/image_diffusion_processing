import {ChangeDetectionStrategy, Component, signal, computed, ViewChild, viewChild} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { gaussianBlur, ImageBuffer } from '../../math/gaussian_blur';
import {CanvasComponent} from './components/canvas/canvas';

class ImageCanvasComponent {
}

@Component({
  selector: 'app-image-blur',
  standalone: true,
  imports: [
    FormsModule,
    CanvasComponent
  ],
  templateUrl: './image-smoothing.component.html',
  styleUrl: './image-smoothing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageSmoothingComponent {
  protected readonly isProcessing = signal(false);
  protected readonly diffusionD = signal(1.0);
  protected readonly timeStep = signal(5.0);

  protected readonly predictedSigma = computed(() => {
    const val = Math.sqrt(2 * this.diffusionD() * this.timeStep());
    return parseFloat(val.toFixed(2));
  });

  private originalBuffer: ImageBuffer | null = null;

  private originalCanvas = viewChild.required<ImageCanvasComponent>('originalCanvas');
  private outputCanvas = viewChild.required<ImageCanvasComponent>('outputCanvas');

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.isProcessing.set(true);

    try {
      const file = input.files[0];
      const img = await this.loadImage(file);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const ctx = tempCanvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, img.width, img.height);

      this.originalBuffer = {
        width: imgData.width,
        height: imgData.height,
        data: imgData.data,
        channels: 4
      };

      await this.originalCanvas.putImageData(imgData, 0, 0);
      this.isProcessing.set(false);
    } catch (err) {
      console.error(err);
      this.isProcessing.set(false);
    }
  }

  onRunDiffusion() {
    if (!this.originalBuffer) return;
    this.isProcessing.set(true);

    const sigma = this.predictedSigma();
    const safeSigma = sigma < 0.1 ? 0.1 : sigma;

    let k = Math.ceil(6 * safeSigma);
    if (k % 2 === 0) k++;

    setTimeout(async () => {
      const blurred = gaussianBlur(this.originalBuffer!, k, k, safeSigma, safeSigma);

      const finalImageData = new ImageData(
        blurred.data as any,
        blurred.width,
        blurred.height
      );

      await this.outputCanvas.putImageData(finalImageData, 0, 0);

      this.isProcessing.set(false);
    }, 50);
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
}
