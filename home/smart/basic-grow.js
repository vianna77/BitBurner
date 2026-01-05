/** @param {NS} ns **/
export async function main(ns) {
  const [target, start] = ns.args;
  const delay = start ? Math.max(0, start - Date.now()) : 0;
  await ns.sleep(delay);
  await ns.grow(target);
}
