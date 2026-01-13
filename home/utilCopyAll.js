/**
 * File Distribution Script — V1.2.0
 * Purpose: Synchronizes valid files (scripts, txt, lit) from home to all personal and hacknet servers.
 * @param {NS} ns
 */
export function autocomplete(data, args) {
  return [];
}

/** @param {NS} ns **/
export async function main(ns) {
  // Define allowed extensions for scp
  const allowedExtensions = [".js", ".script", ".ns", ".txt", ".lit"];

  // Get all files and filter them by extension
  const allFiles = ns.ls("home");
  const files = allFiles.filter(file =>
    allowedExtensions.some(ext => file.endsWith(ext))
  );

  // Collect all personal and hacknet servers
  const allServers = ns.scan("home");
  const targetServers = allServers.filter(s => s.startsWith("p-") || s.startsWith("hacknet-server-"));

  if (targetServers.length === 0) {
    ns.tprint("🛑 No target servers found (none start with p- or hacknet-server-).");
    return;
  }

  if (files.length === 0) {
    ns.tprint("📂 No valid files found on home for copying.");
    return;
  }

  ns.tprint(`🛰️ Copying ${files.length} valid files to ${targetServers.length} servers...`);

  for (const server of targetServers) {
    ns.tprint(`--- Processing: ${server} ---`);
    for (const file of files) {
      if (file === ns.getScriptName()) continue;

      const ok = ns.scp(file, server, "home");
      if (ok) {
        ns.print(`[OK] 📄 ${file} -> ${server}`);
      } else {
        ns.tprint(`[ERROR] ❌ Failed to copy: ${file} to ${server}`);
      }
    }
  }

  ns.tprint("✅ Synchronization complete.");
}
