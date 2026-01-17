/** @param {NS} ns **/
export async function main(ns) {
  const target = ns.args[0] || "ecorp";
  // No BN8, o grow serve apenas para subir o preço da ação.
  // Não precisa de checks complexos de dinheiro.
  while (true) {
    await ns.grow(target);
  }
}

/** @param {AutocompleteData} data - The autocomplete data. **/
export function autocomplete(data, args) {
  return data.servers; // Provides autocomplete suggestions for server names
}
