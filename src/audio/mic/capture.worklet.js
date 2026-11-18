/* AudioWorklet: forwards mono input in 512-sample blocks with the audio-clock time of the block's end. */
class CagedCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(512);
    this.n = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.n++] = ch[i];
        if (this.n === 512) {
          const t = currentTime + (i + 1) / sampleRate;
          this.port.postMessage({ samples: this.buf, t }, [this.buf.buffer]);
          this.buf = new Float32Array(512);
          this.n = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('caged-capture', CagedCapture);
