import { Injectable } from '@angular/core';

interface InputBufferMsg {
  isSilent: boolean;
  inputBuffer: Float32Array;
  inputBufferNumbers: number[];
}

@Injectable({
  providedIn: 'root',
})
export class AudioProcessingService {
  audioContext!: AudioContext;
  audioBuffer: Float32Array[] = [];
  audioWorkletScriptPath = 'assets/audioWorklet.js';

  constructor() {}

  async start(
    streamHandler: (inputBuffer: Float32Array, silence: boolean) => void
  ): Promise<AudioContext> {
    this.audioContext = new AudioContext();
    await this.audioContext.audioWorklet.addModule(this.audioWorkletScriptPath);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioSource = this.audioContext.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(this.audioContext, 'audio-processor');

    node.port.onmessage = (event) => {
      const data = <InputBufferMsg>event.data;
      streamHandler(data.inputBuffer, data.isSilent);

      // this.audioBuffer.push(inputBuffer); // for testing only
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

  playBuffer(audioBuffer = this.audioBuffer) {
    if (!this.audioContext) return;
    const buffer = this.createAudioBuffer(audioBuffer);
    const mediaStream = this.audioBufferToMediaStream(buffer);
    const audioElement = new Audio();
    audioElement.srcObject = mediaStream;
    audioElement.play();
  }

  private createAudioBuffer(inputBuffer: Float32Array[]): AudioBuffer {
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

  base64ToBlob(base64: string, mime: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mime });
  }

  playBlob(base64: string) {
    if (!base64) return;
    const blob = this.base64ToBlob(base64, 'audio/mpeg');
    const audio = new Audio();
    audio.src = URL.createObjectURL(blob);
    audio.play();
  }
}
