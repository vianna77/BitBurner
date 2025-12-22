/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.openTail();
  
  const serverStats = {}; // Stores { total: n, count: n, last: n, firstSeen: ms }
  const startTime = Date.now();

  while (true) {
    let portData = ns.readPort(1);
    let hasNewData = false;

    while (portData !== "NULL PORT DATA") {
      const { source, amount } = portData;
      
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
      hasNewData = true;

      portData = ns.readPort(1);
    }

    if (hasNewData) {
      ns.clearLog();
      ns.print(`--- INDIVIDUAL SERVER PERFORMANCE ---`);
      ns.print(`Runtime: ${ns.tFormat(Date.now() - startTime)}`);
      ns.print(`----------------------------------------------------------------------------------`);
      ns.print(`${"SERVER".padEnd(20)} | ${"LAST".padEnd(10)} | ${"AVG/HACK".padEnd(10)} | ${"AVG/SEC".padEnd(10)} | ${"TOTAL".padEnd(12)} | COUNT`);
      ns.print(`----------------------------------------------------------------------------------`);
      
      // Convert to array and sort by AVG/SEC ascending
      const sortedEntries = Object.entries(serverStats).sort(([, a], [, b]) => {
        const avgSecA = a.total / ((Date.now() - a.firstSeen) / 1000 || 1);
        const avgSecB = b.total / ((Date.now() - b.firstSeen) / 1000 || 1);
        return avgSecA - avgSecB; // Ascending order
      });

      for (const [name, stats] of sortedEntries) {
        const avgPerHack = stats.total / stats.count;
        const elapsedServerSec = (Date.now() - stats.firstSeen) / 1000;
        const avgPerSec = stats.total / (elapsedServerSec || 1);
        
        ns.print(
          `${name.padEnd(20)} | ` +
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
