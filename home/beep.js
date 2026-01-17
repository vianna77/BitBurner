/**
 * @param {NS} ns - The Netscript API object.
 * Script purpose: Plays a beep sound and prints a user-provided text to the terminal.
 * @param {string} [text] - The text to print. Defaults to "No text provided" if no argument is passed.
 * Usage example: run beep.js "Hello World"
 */
// VERSION 1.0.0
export async function main(ns) {
  const text = ns.args[0] || "No text provided";

  ns.tprint(text);

  const playBeep = (frequency = 440, duration = 200) => {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();

    setTimeout(() => {
      oscillator.stop();
      context.close();
    }, duration);
  };

  playBeep(660, 250);
}
