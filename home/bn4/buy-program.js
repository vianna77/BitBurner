/** @param {NS} ns */
export async function main(ns) {
  const [program] = ns.args;
  const success = ns.singularity.purchaseProgram(program);
  ns.writePort(1, success ? "SUCCESS" : "FAILED");
}