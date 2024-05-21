registerProcessor(
  "audio-processor",
  class extends AudioWorkletProcessor {
    constructor() {
      super();
    }

    process(inputs, outputs, parameters) {
      const inputBuffer = inputs[0][0];
      if (inputBuffer) {
        // console.log("From Worker: ...");
        // Send the input buffer to the main thread
        this.port.postMessage(inputBuffer);
      }

      return true;
    }
  }
);
