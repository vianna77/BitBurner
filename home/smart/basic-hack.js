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