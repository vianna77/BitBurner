/**
 * VERSION: 1.0.0
 * BASIC HACK SCRIPT
 *
 * DESCRIPTION:
 * Performs hack operation on target server with optional timing delay.
 * Reports money gained via port communication.
 *
 * PORT USAGE:
 * - Port 1: Writes {source: hostname, amount: moneyGained} when hack succeeds
 *
 * USAGE:
 * run basic-hack.js [target] [startTime]
 * - target: Server hostname to hack
 * - startTime: Optional timestamp to delay execution until specific time
 */

/** @param {NS} ns **/
export async function main(ns) {
  const [target, start] = ns.args;
  const delay = start ? Math.max(0, start - Date.now()) : 0;
  await ns.sleep(delay);
  const moneyGained = await ns.hack(target);

  if (moneyGained > 0) {
    ns.writePort(1, {
      source: ns.getHostname(),
      amount: moneyGained
    });
  }
}
