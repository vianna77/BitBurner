/** @param {NS} ns */
export async function main(ns) {
  const [faction, workType, focus = true] = ns.args;
  ns.singularity.workForFaction(faction, workType, focus);
}