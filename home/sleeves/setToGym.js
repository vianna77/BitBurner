/** @param {NS} ns */
export async function main(ns) {
  const i = ns.args[0];
  const gym = ns.args[1];
  const stat = ns.args[2];
  ns.sleeve.setToGymWorkout(i, gym, stat);
}
