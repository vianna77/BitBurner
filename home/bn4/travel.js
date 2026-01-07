/** @param {NS} ns */
export async function main(ns) {
  const [city] = ns.args;
  const success = ns.singularity.travelToCity(city);
  ns.writePort(1, success ? "SUCCESS" : "FAILED");
}