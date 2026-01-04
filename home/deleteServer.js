/** @param {NS} ns **/
export async function main(ns) {
  if (ns.args.length === 0 || ns.args[0] === "-h") {
    ns.tprint("USAGE: deleteServer.js <servername1> <servername2> ... | ALL");
    ns.tprint("Use 'ALL' to delete all purchased servers.");
    return;
  }

  const purchased = ns.getPurchasedServers();

  // Check if user wants to delete ALL servers
  if (ns.args.length === 1 && String(ns.args[0]).toUpperCase() === "ALL") {
    if (purchased.length === 0) {
      ns.tprint("No purchased servers to delete.");
      return;
    }

    ns.tprint(`Deleting ALL ${purchased.length} purchased servers...`);
    
    for (const name of purchased) {
      ns.killall(name);
      
      if (ns.deleteServer(name)) {
        ns.tprint(`Server deleted: ${name}`);
      } else {
        ns.tprint(`ERROR: failed to delete ${name} (still running processes?).`);
      }
    }
    
    ns.tprint("All purchased servers deletion completed.");
    return;
  }

  // Original logic for specific servers
  for (const raw of ns.args) {
    const name = String(raw);

    if (!ns.serverExists(name)) {
      ns.tprint(`ERROR: server does not exist: ${name}`);
      continue;
    }

    if (!purchased.includes(name)) {
      ns.tprint(`ERROR: ${name} is NOT a purchased server.`);
      continue;
    }

    ns.killall(name);

    if (ns.deleteServer(name)) {
      ns.tprint(`Server deleted: ${name}`);
    } else {
      ns.tprint(`ERROR: failed to delete ${name} (still running processes?).`);
    }
  }
}

/** Autocomplete uses (data, args) **/
export function autocomplete(data, args) {
  return data.servers;
}
