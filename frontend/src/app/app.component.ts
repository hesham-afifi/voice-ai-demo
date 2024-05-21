import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SignalRService } from './services/signal-r.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, AfterViewInit {
  audioContext!: AudioContext;
  audioBuffer: Float32Array[] = [];
  audioWorkletScriptPath = 'assets/js/audioWorklet.js';

  audioElement = viewChild<ElementRef<HTMLAudioElement>>('audioCanvas');
  audioCanvas = viewChild<ElementRef<HTMLCanvasElement>>('audioCanvas');
  canvasContext!: CanvasRenderingContext2D;

  signalRService = inject(SignalRService);

  constructor() {}

  ngOnInit(): void {
    this.signalRService.start();
  }

  ngAfterViewInit() {
    this.canvasContext = this.audioCanvas()?.nativeElement.getContext('2d')!;
  }

  async start() {
    this.audioContext = new AudioContext();

    await this.audioContext.audioWorklet.addModule(this.audioWorkletScriptPath);
    // Script loaded, proceed with creating the AudioWorkletNode
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    const audioSource = this.audioContext.createMediaStreamSource(stream);

    const node = new AudioWorkletNode(this.audioContext, 'audio-processor');

    // Listen for messages from the audio worklet
    node.port.onmessage = (event) => {
      const inputBuffer = event.data;
      this.signalRService.send(inputBuffer);

      this.audioBuffer.push(inputBuffer);
      this.drawWaveform(inputBuffer);
    };

    audioSource.connect(node);

    this.getAudioBuffer();

    this.audioContext.onstatechange = () => {
      console.log(this.audioContext.state);
    };
  }

  getAudioBuffer() {
    this.signalRService.audioBuffer$.subscribe(async (buffer) => {
      const audioBuffer = await this.createAudioBuffer(buffer);
      const mediaStream = this.audioBufferToMediaStream(audioBuffer);

      // Dynamically create an audio element
      const audioElement = document.createElement('audio');

      // Set the media stream as the source for the audio element
      audioElement.srcObject = mediaStream;
      audioElement.play();
    });
  }

  suspend() {
    this.audioContext.suspend();
  }

  resume() {
    this.audioBuffer.length = 0;
    this.audioContext.resume();
  }

  close() {
    this.audioContext.close();
  }

  drawWaveform(inputBuffer: Float32Array) {
    const canvas = this.audioCanvas()?.nativeElement;
    const canvasContext = this.canvasContext;
    const width = canvas?.width ?? 800;
    const height = canvas?.height ?? 200;

    canvasContext.clearRect(0, 0, width, height);

    const bufferLength = inputBuffer.length;
    const dataArray = inputBuffer;

    const sliceWidth = width / bufferLength;
    let x = 0;

    canvasContext.beginPath();
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] * 0.5 + 0.5; // normalize data
      const y = v * height;

      if (i === 0) {
        canvasContext.moveTo(x, y);
      } else {
        canvasContext.lineTo(x, y);
      }

      x += sliceWidth;
    }
    canvasContext.lineTo(width, height / 2);
    canvasContext.stroke();
  }

  async play() {
    const audioBuffer = await this.createAudioBuffer(this.audioBuffer);
    const mediaStream = this.audioBufferToMediaStream(audioBuffer);

    // Dynamically create an audio element
    const audioElement = document.createElement('audio');

    // Set the media stream as the source for the audio element
    audioElement.srcObject = mediaStream;
    audioElement.play();
  }

  async createAudioBuffer(inputBuffer: Float32Array[]): Promise<AudioBuffer> {
    const numberOfChannels = 1;
    const length = inputBuffer.reduce((acc, buffer) => acc + buffer.length, 0);
    const sampleRate = this.audioContext.sampleRate;
    const audioBuffer = this.audioContext.createBuffer(
      numberOfChannels,
      length,
      sampleRate
    );

    let offset = 0;
    for (const b of inputBuffer) {
      audioBuffer.copyToChannel(b, 0, offset);
      offset += b.length;
    }

    return audioBuffer;
  }

  audioBufferToMediaStream(audioBuffer: AudioBuffer): MediaStream {
    const audioContext = new AudioContext();
    const outputNode = audioContext.createMediaStreamDestination();
    const bufferSource = audioContext.createBufferSource();

    bufferSource.buffer = audioBuffer;
    bufferSource.connect(outputNode);
    bufferSource.start();

    return outputNode.stream;
  }
}
