import { Injectable, signal } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { Environment } from '../../environments/environments';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SignalRService {
  connection!: HubConnection;
  audioBufferSubject = new BehaviorSubject<string>('');

  get audioBuffer$() {
    return this.audioBufferSubject.asObservable();
  }

  onmessage() {}

  constructor() {
    this.connection = new HubConnectionBuilder()
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .withUrl(Environment.SignalRURL, {
        withCredentials: false,
      })
      .build();
  }

  start() {
    this.connection
      .start()
      .then(() => console.log('Connection started'))
      .catch((err) => console.log('Error while starting connection: ', err));

    this.connection.on('send', (data) => {
      console.log('Received audioBuffer: ');
      this.audioBufferSubject.next(data);
    });

    this.connection.on('aiAgentTest', (reply) => {
      console.log('aiAgentTest: ', reply);
    });

    this.connection.on('messageReceived', (received) => {
      console.log('messageReceived: ', received);
    });

    this.connection.on('status', (reply) => {
      console.log('Status: ', reply);
    });
  }

  private send(data: any, silence = false): void {
    if (this.connection.state !== HubConnectionState.Connected) {
      return;
    }

    // console.log('Sending data: ', { silence, data });

    this.connection
      .send('BroadcastStream', { silence, data })
      .catch((err) => console.log('Error while sending data: ', err));
  }

  stream(buffer: Float32Array | number[], silence = false): void {
    this.send(buffer, silence);
  }

  sendAudioChunk(audioChunk: Blob): void {
    this.send(audioChunk);
  }
}
