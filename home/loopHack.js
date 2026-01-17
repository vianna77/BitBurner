/** @param {NS} ns **/
export async function main(ns) {
  const target = ns.args[0] || "ecorp";
  while (true) {
    await ns.hack(target);
  }
}

/** @param {AutocompleteData} data - The autocomplete data. **/
export function autocomplete(data, args) {
  return data.servers; // Provides autocomplete suggestions for server names
}
