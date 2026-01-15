// VERSION: 1.1.1
//
// PURPOSE: Continuously hack or grow a target server
// PARAMETERS:
//   - target: Server hostname to hack/grow
//   - mode: "hack" or "grow"
// USAGE: run smart/continuous-action.js <target> <hack|grow>
// NOTE: Running with different arguments will kill previous instance and start new one

export function autocomplete(data, args) {
  if (args.length === 1) return data.servers;
  if (args.length === 2) return ["hack", "grow"];
  return [];
}

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  if (ns.args.length < 2) {
    ns.tprint("❌ USAGE: continuous-action.js <target> <hack|grow>");
    return;
  }

  const target = String(ns.args[0]);
  const mode = String(ns.args[1]).toLowerCase();
  const thisServer = ns.getHostname();

  if (mode !== "hack" && mode !== "grow") {
    ns.tprint("❌ ERROR: Mode must be 'hack' or 'grow'");
    return;
  }

  const HACK_PATH = "/smart/basic-hack.js";
  const GROW_PATH = "/smart/basic-grow.js";
  const scriptPath = mode === "hack" ? HACK_PATH : GROW_PATH;

  if (!ns.fileExists(scriptPath)) {
    ns.tprint(`❌ ERROR: Missing ${scriptPath}`);
    return;
  }

  // Kill any existing continuous-action.js instances with different arguments
  const existingInstances = ns.ps(thisServer).filter(p =>
    p.filename === 'smart/continuous-action.js' &&
    p.pid !== ns.pid
  );

  for (const proc of existingInstances) {
    ns.kill(proc.pid);
    ns.print(`☠️ Killed previous instance (PID: ${proc.pid})`);
  }

  // Kill any running hack/grow scripts
  const hackProcs = ns.ps(thisServer).filter(p => p.filename === HACK_PATH);
  const growProcs = ns.ps(thisServer).filter(p => p.filename === GROW_PATH);

  for (const proc of [...hackProcs, ...growProcs]) {
    ns.kill(proc.pid);
  }

  if (hackProcs.length + growProcs.length > 0) {
    ns.print(`☠️ Killed ${hackProcs.length + growProcs.length} hack/grow processes`);
  }

  const scriptRam = ns.getScriptRam(scriptPath);
  const thisScriptRam = ns.getScriptRam('smart/continuous-action.js');
  const emoji = mode === "hack" ? "📉" : "📈";

  ns.print(`${emoji} Starting continuous ${mode} on ${target}`);

  while (true) {
    const runningScripts = ns.ps(thisServer).filter(p => p.filename === scriptPath);

    if (runningScripts.length === 0) {
      const freeRam = ns.getServerMaxRam(thisServer) - ns.getServerUsedRam(thisServer) - thisScriptRam;
      const threads = Math.floor(freeRam / scriptRam);

      if (threads > 0) {
        ns.exec(scriptPath, thisServer, threads, target, Date.now());
        ns.print(`${emoji} Executed ${mode} with ${threads} threads`);
      }
    }

    await ns.sleep(5000);
  }
}
