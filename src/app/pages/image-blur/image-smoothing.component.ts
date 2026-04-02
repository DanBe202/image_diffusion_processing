import {ChangeDetectionStrategy, Component, computed, signal, viewChild} from '@angular/core';
import {gaussianBlurDiffusion, ImageBuffer} from '../../math/gaussian_blur';
import {fileToImageBuffer} from '../../core/image/image_upload';
import {CanvasComponent} from './components/canvas/canvas.component';
import {ImageControlsComponent} from './components/image-controls/image-controls.component';

@Component({
  selector: 'app-image-blur',
  standalone: true,
  imports: [
    CanvasComponent,
    ImageControlsComponent
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
  protected fileName = signal<string>('No file selected');

  private originalBuffer: ImageBuffer | null = null;

  private originalCanvas = viewChild.required<CanvasComponent>('originalCanvas');
  private outputCanvas = viewChild.required<CanvasComponent>('outputCanvas');

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.isProcessing.set(true);

    try {
      const file = input.files[0];
      this.fileName.set(file.name);

      this.originalCanvas().clear();
      this.outputCanvas().clear();

      const { buffer, imgData } = await fileToImageBuffer(file);
      this.originalBuffer = buffer;

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
    if (!this.originalBuffer) return;
    this.isProcessing.set(true);
    this.outputCanvas().clear();

    const sigma = this.predictedSigma();
    const safeSigma = sigma < 0.1 ? 0.1 : sigma;

    setTimeout(async () => {
      try {
        const blurred = gaussianBlurDiffusion(this.originalBuffer!, safeSigma);

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
}
