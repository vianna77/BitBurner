/** * MONEY MANAGER - v1.0.0
 * DESCRIPTION:
 * Monitors and displays real-time performance statistics for all income sources.
 * Tracks hack earnings from servers and stock trading profits with detailed analytics.
 * FIX: Added debug logging to troubleshoot stock trading data reception.
 * 
 * PORT USAGE:
 * - Port 1: Reads JSON {source: string, amount: number} from hack scripts and stock trader
 * 
 * FEATURES:
 * - Real-time income tracking per source
 * - Average earnings per hack and per second calculations
 * - Duplicate process prevention
 * - Sorted display by earnings per second
 * 
 * USAGE: run moneyManager.js
 */

/** @param {NS} ns */
export async function main(ns) {
  // --- CHECK FOR DUPLICATE PROCESS ---
  const currentScriptName = ns.getScriptName();
  const currentPid = ns.pid;
  const runningProcesses = ns.ps("home"); // Ou ns.getHostname() se rodar em outros servers

  const isDuplicate = runningProcesses.some(p =>
    p.filename === currentScriptName && p.pid !== currentPid
  );

  if (isDuplicate) {
    ns.toast(`Script ${currentScriptName} is already running! Terminating new instance.`, "error", 30000);
    return;
  }

  ns.disableLog("ALL");
  ns.ui.openTail();
  const bgBlueWhite = "\u001b[44;37m"; // Fundo Azul (44), Texto Branco (37)

  const serverStats = {}; // Stores { total: n, count: n, last: n, firstSeen: ms }
  const startTime = Date.now();

  while (true) {
    let portData = ns.readPort(1);

    while (portData !== "NULL PORT DATA") {
      const { source, amount } = portData;

      // Inicializa na primeira chamada do servidor específico
      if (!serverStats[source]) {
        serverStats[source] = {
          total: 0,
          count: 0,
          last: 0,
          firstSeen: Date.now()
        };
      }

      serverStats[source].total += amount;
      serverStats[source].count += 1;
      serverStats[source].last = amount;

      portData = ns.readPort(1);
    }

    // Exibe o log se houver qualquer dado registrado para atualizar AVG/SEC em tempo real
    if (Object.keys(serverStats).length > 0) {
      ns.clearLog();
      ns.print(`--- INDIVIDUAL SERVER PERFORMANCE ---`);
      ns.print(`Runtime: ${ns.tFormat(Date.now() - startTime)}`);
      ns.print(`------------------------------------------------------------------------------------------------------------`);
      ns.print(`${bgBlueWhite}${"SERVER".padEnd(40)} | ${"LAST".padEnd(10)} | ${"AVG/HACK".padEnd(10)} | ${"AVG/SEC".padEnd(10)} | ${"TOTAL".padEnd(12)} | COUNT`);
      ns.print(`------------------------------------------------------------------------------------------------------------`);

      const sortedEntries = Object.entries(serverStats).sort(([, a], [, b]) => {
        const now = Date.now();
        const avgSecA = a.total / ((now - a.firstSeen) / 1000 || 1);
        const avgSecB = b.total / ((now - b.firstSeen) / 1000 || 1);
        return avgSecA - avgSecB;
      });

      for (const [name, stats] of sortedEntries) {
        const now = Date.now();
        const avgPerHack = stats.total / stats.count;
        const elapsedServerSec = (now - stats.firstSeen) / 1000;
        const avgPerSec = stats.total / (elapsedServerSec || 1);

        ns.print(
          `${name.padEnd(40)} | ` +
          `${ns.formatNumber(stats.last).padEnd(10)} | ` +
          `${ns.formatNumber(avgPerHack).padEnd(10)} | ` +
          `${ns.formatNumber(avgPerSec).padEnd(10)} | ` +
          `$${ns.formatNumber(stats.total).padEnd(11)} | ${stats.count}`
        );
      }
    }
    await ns.sleep(1000);
  }
}