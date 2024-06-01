import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AudioProcessingService {
  audioContext!: AudioContext;
  audioBuffer: Float32Array[] = [];
  audioWorkletScriptPath = 'assets/js/audioWorklet.js';

  constructor() {}

  async start(
    streamHandler: (inputBuffer: Float32Array) => void
  ): Promise<AudioContext> {
    this.audioContext = new AudioContext();
    await this.audioContext.audioWorklet.addModule(this.audioWorkletScriptPath);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioSource = this.audioContext.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(this.audioContext, 'audio-processor');

    node.port.onmessage = (event) => {
      const inputBuffer = event.data;
      // this.audioBuffer.push(inputBuffer); // for testing only
      streamHandler(inputBuffer);
    };

    audioSource.connect(node);
    return this.audioContext;
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

  async playBuffer(audioBuffer = this.audioBuffer) {
    if (!this.audioContext) return;
    const buffer = await this.createAudioBuffer(audioBuffer);
    const mediaStream = this.audioBufferToMediaStream(buffer);
    const audioElement = new Audio();
    audioElement.srcObject = mediaStream;
    audioElement.play();
  }

  private async createAudioBuffer(
    inputBuffer: Float32Array[]
  ): Promise<AudioBuffer> {
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

  private audioBufferToMediaStream(audioBuffer: AudioBuffer): MediaStream {
    const audioContext = new AudioContext();
    const outputNode = audioContext.createMediaStreamDestination();
    const bufferSource = audioContext.createBufferSource();

    bufferSource.buffer = audioBuffer;
    bufferSource.connect(outputNode);
    bufferSource.start();

    return outputNode.stream;
  }
}
