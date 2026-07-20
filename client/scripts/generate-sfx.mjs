import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outputDirectory = resolve('public/audio/quiz-sfx');

function writeWav(filename, notes, durationMs, volume = 0.18) {
  const sampleRate = 22050;
  const sampleCount = Math.floor((sampleRate * durationMs) / 1000);
  const buffer = Buffer.alloc(44 + sampleCount * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + sampleCount * 2, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(sampleCount * 2, 40);

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate;
    const envelope = Math.min(1, i / (sampleRate * 0.015))
      * Math.max(0, 1 - i / sampleCount) ** 1.8;
    const signal = notes.reduce((sum, note) => {
      const started = Math.max(0, t - note.start);
      return sum + Math.sin(2 * Math.PI * note.frequency * started) * (t >= note.start ? note.gain : 0);
    }, 0);
    buffer.writeInt16LE(Math.max(-1, Math.min(1, signal * envelope * volume)) * 32767, 44 + i * 2);
  }
  mkdirSync(dirname(resolve(outputDirectory, filename)), { recursive: true });
  writeFileSync(resolve(outputDirectory, filename), buffer);
}

writeWav('lock-in.wav', [{ frequency: 659.25, start: 0, gain: 0.65 }, { frequency: 880, start: 0.07, gain: 0.7 }], 180, 0.13);
writeWav('reveal.wav', [{ frequency: 261.63, start: 0, gain: 0.45 }, { frequency: 329.63, start: 0.18, gain: 0.5 }, { frequency: 392, start: 0.36, gain: 0.6 }], 600, 0.22);
writeWav('correct.wav', [{ frequency: 523.25, start: 0, gain: 0.45 }, { frequency: 659.25, start: 0.11, gain: 0.55 }, { frequency: 783.99, start: 0.22, gain: 0.62 }], 440, 0.2);
writeWav('wrong.wav', [{ frequency: 261.63, start: 0, gain: 0.55 }, { frequency: 196, start: 0.16, gain: 0.58 }], 460, 0.17);
writeWav('quiz-start.wav', [{ frequency: 392, start: 0, gain: 0.4 }, { frequency: 523.25, start: 0.12, gain: 0.5 }, { frequency: 659.25, start: 0.24, gain: 0.6 }, { frequency: 783.99, start: 0.36, gain: 0.62 }], 620, 0.2);
writeWav('quiz-end.wav', [{ frequency: 783.99, start: 0, gain: 0.5 }, { frequency: 659.25, start: 0.14, gain: 0.48 }, { frequency: 523.25, start: 0.28, gain: 0.52 }, { frequency: 783.99, start: 0.42, gain: 0.65 }], 720, 0.2);
