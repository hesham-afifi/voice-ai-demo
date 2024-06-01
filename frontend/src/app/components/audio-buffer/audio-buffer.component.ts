import {
  Component,
  ElementRef,
  OnInit,
  inject,
  viewChild,
} from '@angular/core';
import {
  AudioProcessingService,
  CanvasDrawingService,
  SignalRService,
} from '../../services';

@Component({
  selector: 'app-audio-buffer',
  standalone: true,
  imports: [],
  templateUrl: './audio-buffer.component.html',
  styleUrl: './audio-buffer.component.css',
})
export class AudioBufferComponent implements OnInit {
  audioCanvas =
    viewChild.required<ElementRef<HTMLCanvasElement>>('audioCanvas');
  canvasContext!: CanvasRenderingContext2D;

  signalRService = inject(SignalRService);
  audioProcessingService = inject(AudioProcessingService);
  canvasDrawingService = inject(CanvasDrawingService);

  constructor() {}

  ngOnInit(): void {
    this.signalRService.start();
    this.signalRService.audioBuffer$.subscribe((audioBuffer) => {
      this.audioProcessingService.playBuffer(audioBuffer);
    });
  }

  async start() {
    const audioContext = await this.audioProcessingService.start(
      (inputBuffer) => {
        this.signalRService.stream(inputBuffer);
        this.canvasDrawingService.drawWaveform(
          inputBuffer,
          this.audioCanvas()?.nativeElement,
          3
        );
      }
    );
  }

  suspend() {
    this.audioProcessingService.suspend();
  }

  resume() {
    this.audioProcessingService.resume();
  }

  close() {
    this.audioProcessingService.close();
  }

  play() {
    this.audioProcessingService.playBuffer();
  }
}
