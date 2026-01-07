/** @param {NS} ns */
export async function main(ns) {
  const [crime, focus = true] = ns.args;
  ns.singularity.commitCrime(crime, focus);
}
