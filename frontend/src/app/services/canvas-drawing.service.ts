import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CanvasDrawingService {
  constructor() {}

  drawWaveform(inputBuffer: Float32Array, canvas: HTMLCanvasElement) {
    const canvasContext = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;

    canvasContext.clearRect(0, 0, width, height);
    canvasContext.strokeStyle = 'white';
    const bufferLength = inputBuffer.length;
    const sliceWidth = width / bufferLength;
    let x = 0;

    canvasContext.beginPath();
    for (let i = 0; i < bufferLength; i++) {
      const v = inputBuffer[i] * 0.5 + 0.5;
      const y = v * height;
      i === 0 ? canvasContext.moveTo(x, y) : canvasContext.lineTo(x, y);
      x += sliceWidth;
    }
    canvasContext.lineTo(width, height / 2);
    canvasContext.stroke();
  }
}
