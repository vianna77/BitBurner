/** @param {NS} ns */
export async function main(ns) {
  const [gym, stat, focus = true] = ns.args;
  ns.singularity.gymWorkout(gym, stat, focus);
}