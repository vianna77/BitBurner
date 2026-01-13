/** @param {NS} ns **/
export async function main(ns) {
  const servers = ns.getPurchasedServers();

  for (const s of servers) {
    if (!s.startsWith("p-")) continue;

    const procs = ns.ps(s);
    if (procs.length > 0) continue;

    const target = s.slice(2);
    ns.exec("/smart/smartMomentumMaker.js", s, 1, target);
  }
}
