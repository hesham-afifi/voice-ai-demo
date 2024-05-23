import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { AudioProcessingService, SignalRService } from '../../services';

@Component({
  selector: 'app-audio-stream',
  standalone: true,
  imports: [],
  templateUrl: './audio-stream.component.html',
  styleUrl: './audio-stream.component.css',
})
export class AudioStreamComponent implements OnInit, OnDestroy {
  private intervalId!: any;
  private audioContext!: AudioContext;
  private mediaStream!: MediaStream;
  private mediaRecorder!: MediaRecorder;
  public audioChunks: Blob[] = [];
  private isSending = false;

  signalRService = inject(SignalRService);
  audioProcessingService = inject(AudioProcessingService);

  constructor() {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.stopSending();
  }

  async startSending(): Promise<void> {
    if (this.isSending) {
      return;
    }

    this.audioChunks = [];
    this.isSending = true;
    this.audioContext = new AudioContext();
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    const options = [
      { mimeType: 'audio/webm; codecs=opus' },
      { mimeType: 'audio/webm' },
      { mimeType: 'audio/ogg; codecs=opus' },
    ];

    for (const option of options) {
      try {
        this.mediaRecorder = new MediaRecorder(this.mediaStream, option);
        console.log('MediaRecorder initialized with options:', option);
        break;
      } catch (e) {
        console.error(
          'MediaRecorder initialization failed with options:',
          option,
          e
        );
      }
    }

    this.mediaRecorder.ondataavailable = (event) => {
      console.log('Recording data available', event.data);

      if (event.data.size > 0) {
        this.signalRService.sendAudioChunk(event.data);
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(1000); // Collect 1 second chunks of audio

    this.intervalId = setInterval(() => {
      if (this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.requestData();
      }
    }, 1000);
  }

  stopSending(): void {
    if (!this.isSending) {
      return;
    }

    this.isSending = false;
    clearInterval(this.intervalId);

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }

    if (this.audioContext) {
      this.audioContext.close();
    }
  }

  async playChunks(): Promise<void> {
    if (!this.audioChunks.length) {
      return;
    }

    const audioContext = new AudioContext();
    try {
      const audioBuffer = await this.combineChunks(
        audioContext,
        this.audioChunks
      );

      const bufferSource = audioContext.createBufferSource();
      bufferSource.buffer = audioBuffer;
      bufferSource.connect(audioContext.destination);
      bufferSource.start();
    } catch (error) {
      console.error('Error playing chunks:', error);
    }
  }

  private async combineChunks(
    audioContext: AudioContext,
    chunks: Blob[]
  ): Promise<AudioBuffer> {
    try {
      const arrayBuffers = await Promise.all(
        chunks.map((chunk) => chunk.arrayBuffer())
      );
      const audioBuffers = await Promise.all(
        arrayBuffers.map((arrayBuffer) =>
          this.decodeAudioData(audioContext, arrayBuffer)
        )
      );

      const numberOfChannels = audioBuffers[0].numberOfChannels;
      const sampleRate = audioBuffers[0].sampleRate;
      const length = audioBuffers.reduce(
        (acc, buffer) => acc + buffer.length,
        0
      );

      const audioBuffer = audioContext.createBuffer(
        numberOfChannels,
        length,
        sampleRate
      );

      let offset = 0;
      audioBuffers.forEach((buffer) => {
        for (let channel = 0; channel < numberOfChannels; channel++) {
          audioBuffer.copyToChannel(
            buffer.getChannelData(channel),
            channel,
            offset
          );
        }
        offset += buffer.length;
      });

      return audioBuffer;
    } catch (error) {
      console.error('Error combining chunks:', error);
      throw error;
    }
  }

  private decodeAudioData(
    audioContext: AudioContext,
    arrayBuffer: ArrayBuffer
  ): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      audioContext.decodeAudioData(arrayBuffer, resolve, reject);
    });
  }
}
