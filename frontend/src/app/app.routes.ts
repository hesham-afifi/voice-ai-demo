import { Routes } from '@angular/router';
import { AudioBufferComponent } from './components/audio-buffer/audio-buffer.component';
import { AudioStreamComponent } from './components/audio-stream/audio-stream.component';

export const routes: Routes = [
  {
    path: '',
    component: AudioBufferComponent,
  },
  {
    path: 'audio-stream',
    component: AudioStreamComponent,
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
