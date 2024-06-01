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
  audioBufferSubject = new BehaviorSubject<Float32Array[]>([]);

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
      this.audioBufferSubject.next(data);
    });

    this.connection.on('aiAgentTest', (reply) => {
      console.log('aiAgentTest: ', reply);
    });

    this.connection.on('messageReceived', (received) => {
      console.log('messageReceived: ', received);
    });

    this.connection.on('status', (reply) => {
      console.log('Connection Status: ', reply);
    });
  }

  private send(data: any): void {
    if (this.connection.state !== HubConnectionState.Connected) {
      return;
    }

    this.connection
      .invoke('BroadcastStream', data)
      .catch((err) => console.log('Error while sending data: ', err));
  }

  stream(buffer: Float32Array) {
    this.send(buffer);
  }

  sendAudioChunk(audioChunk: Blob): void {
    this.send(audioChunk);
  }
}
