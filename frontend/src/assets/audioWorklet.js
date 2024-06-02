registerProcessor(
  "audio-processor",
  class extends AudioWorkletProcessor {
    constructor() {
      super();
      this.threshold = 0.03; // Adjust this threshold value for silence detection
      this.samplingRate = 44100; // The sampling rate of the audio context
      this.lowFrequency = 300; // Lower bound of the frequency range
      this.highFrequency = 3000; // Upper bound of the frequency range

      this.silenceDuration = 500; // Silence duration threshold in milliseconds
      this.silenceStartTime = null; // To track when silence starts
    }

    // Apply a band-pass filter to isolate specific frequencies
    applyBandPassFilter(buffer) {
      const nyquist = this.samplingRate / 2;
      const low = this.lowFrequency / nyquist;
      const high = this.highFrequency / nyquist;
      const b = [0.2929, 0.5858, 0.2929]; // Coefficients for the band-pass filter (example values)
      const a = [1.0, 0.0, 0.1716]; // Coefficients for the band-pass filter (example values)

      let output = new Float32Array(buffer.length);
      for (let i = 2; i < buffer.length; i++) {
        output[i] =
          b[0] * buffer[i] +
          b[1] * buffer[i - 1] +
          b[2] * buffer[i - 2] -
          a[1] * output[i - 1] -
          a[2] * output[i - 2];
      }
      return output;
    }

    isSilent(buffer) {
      const rms = Math.sqrt(
        buffer.reduce((sum, value) => sum + value * value, 0) / buffer.length
      );
      const isBelowThreshold = rms < this.threshold;
      const currentTime = this.currentTimeInMs(); // Get current time in milliseconds

      if (isBelowThreshold) {
        if (this.silenceStartTime === null) {
          this.silenceStartTime = currentTime;
        } else if (
          currentTime - this.silenceStartTime >=
          this.silenceDuration
        ) {
          return true; // Silence detected for the required duration
        }
      } else {
        this.silenceStartTime = null; // Reset silence start time if noise is detected
      }

      return false;
    }

    process(inputs, outputs, parameters) {
      const inputBuffer = inputs[0][0];
      if (inputBuffer) {
        this.port.postMessage({
          isSilent: this.isSilent(inputBuffer),
          inputBuffer: inputBuffer,
          // inputBufferNumbers: [...inputBuffer],
        });
      }

      return true;
    }

    currentTimeInMs() {
      return new Date().getTime();
    }
  }
);
