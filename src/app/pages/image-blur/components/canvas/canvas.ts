import {
  Component,
  ElementRef,
  AfterViewInit,
  input,
  viewChild,
  signal,
  computed,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-canvas',
  standalone: true,
  templateUrl: 'canvas.html',
  styleUrl: 'canvas.scss'
})
export class CanvasComponent implements AfterViewInit {
  public preferredWidth = input.required<number>();
  public height = input.required<number>();

  private canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvasEl');

  private readonly platformId = inject(PLATFORM_ID);
  private resizeObserver: ResizeObserver | null = null;
  private readonly _lineWidth: number = 2;

  public currentWidth = signal<number>(0);

  public ctx = computed(() => {
    const ctx = this.canvasRef().nativeElement.getContext('2d');
    if (!ctx) throw new Error('Error while obtaining canvas 2d context');
    return ctx;
  });

  public canvasResolution = signal({ width: 800, height: 600 });

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.currentWidth.set(this.preferredWidth());

    this.setupResizeObserver();

    this.setupContext();
    this.adjustResolution();
  }

  public state(process: (ctx: CanvasRenderingContext2D) => void): void {
    const context = this.ctx();
    context.save();
    process(context);
    context.restore();
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
    context.drawImage(bitmap, dx, dy, this.currentWidth(), this.height());
  }

  private resizeCanvas(width: number, height: number): void {
    this.canvasResolution.set({ width, height });
    const ctx = this.ctx();
    ctx.lineWidth = this._lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  private setupResizeObserver(): void {
    const hostElement = this.canvasRef().nativeElement.parentElement;

    if (!hostElement) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.handleResize(entry.contentRect.width);
      }
    });

    this.resizeObserver.observe(hostElement);
  }

  private handleResize(parentWidth: number): void {
    const newWidth = Math.min(parentWidth, this.preferredWidth());

    if (newWidth !== this.currentWidth()) {
      this.currentWidth.set(newWidth);
      this.adjustResolution();
    }
  }

  private adjustResolution(): void {
    const canvas = this.canvasRef().nativeElement;
    const width = this.currentWidth();
    const height = this.height();
    const scale = window.devicePixelRatio || 1;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    canvas.width = Math.floor(width * scale);
    canvas.height = Math.floor(height * scale);

    const context = this.ctx();
    context.scale(scale, scale);

    context.lineWidth = this._lineWidth;

  }

  private setupContext(): void {
    const context = this.ctx();
    context.lineWidth = this._lineWidth;
  }
}
