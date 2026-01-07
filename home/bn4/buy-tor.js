/** @param {NS} ns */
export async function main(ns) {
  const success = ns.singularity.purchaseTor();
  ns.writePort(1, success ? "SUCCESS" : "FAILED");
}