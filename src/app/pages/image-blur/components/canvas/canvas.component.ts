import {AfterViewInit, Component, computed, ElementRef, inject, PLATFORM_ID, signal, viewChild,} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';

@Component({
  selector: 'app-canvas',
  standalone: true,
  templateUrl: 'canvas.component.html',
  styleUrl: 'canvas.component.scss'
})
export class CanvasComponent implements AfterViewInit {
  private canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvasEl');

  private readonly platformId = inject(PLATFORM_ID);
  private readonly _lineWidth: number = 2;

  public ctx = computed(() => {
    const ctx = this.canvasRef().nativeElement.getContext('2d');
    if (!ctx) throw new Error('Error while obtaining canvas 2d context');
    return ctx;
  });

  public canvasResolution = signal({ width: 800, height: 600 });

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.setupContext();
  }

  public state(process: (ctx: CanvasRenderingContext2D) => void): void {
    const context = this.ctx();
    context.save();
    process(context);
    context.restore();
  }

  public clear(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const context = this.ctx();
    const canvas = this.canvasRef().nativeElement;
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  public async putImageData(imageData: ImageData, dx: number, dy: number): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const bitmap = await createImageBitmap(imageData);
    const context = this.ctx();

    if (this.canvasResolution().width !== imageData.width ||
        this.canvasResolution().height !== imageData.height) {
      this.resizeCanvas(imageData.width, imageData.height);
    }

    context.imageSmoothingEnabled = false;

    context.drawImage(bitmap, dx, dy, imageData.width, imageData.height);
  }

  public resizeCanvas(width: number, height: number): void {
    this.canvasResolution.set({ width, height });

    const canvas = this.canvasRef().nativeElement;
    canvas.width = width;
    canvas.height = height;

    const ctx = this.ctx();
    ctx.lineWidth = this._lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  private setupContext(): void {
    const context = this.ctx();
    context.lineWidth = this._lineWidth;
  }
}
