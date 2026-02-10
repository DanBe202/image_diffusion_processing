import {gaussianBlur, ImageBuffer} from '../../math/gaussian_blur';

async function handleImageUpload(file: File): Promise<void> {
  const img = await loadImage(file);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, img.width, img.height);

  const srcBuffer: ImageBuffer = {
    width: imgData.width,
    height: imgData.height,
    data: imgData.data,
    channels: 4
  };

  console.time("Blur Process");

  const blurredBuffer = gaussianBlur(srcBuffer, 15, 15, 0, 0);

  console.timeEnd("Blur Process");

  const finalImageData = new ImageData(
    blurredBuffer.data as ImageDataArray,
    blurredBuffer.width,
    blurredBuffer.height
  );

  const outputCanvas = document.getElementById('outputCanvas') as HTMLCanvasElement;
  outputCanvas.width = blurredBuffer.width;
  outputCanvas.height = blurredBuffer.height;
  outputCanvas.getContext('2d')?.putImageData(finalImageData, 0, 0);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
