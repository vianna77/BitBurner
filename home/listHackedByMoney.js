/**
 * SERVER MONITOR - v1.4.1
 * DESCRIPTION:
 * Real-time monitoring of hacked servers with money tracking and visual indicators.
 * Shows current vs max money with color-coded changes and active hacking status.
 *
 * FEATURES:
 * - Color-coded money changes (green=increase, red=decrease)
 * - Active hacking detection for local and purchased server scripts
 * - Alternating row colors for better readability
 * - Real-time updates with server state persistence
 *
 * USAGE: run listHackedByMoney.js
 */

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  // Check if script is already running
  const runningProcesses = ns.ps("home").filter(p =>
    p.filename === "listHackedByMoney.js" && p.pid !== ns.pid
  );

  if (runningProcesses.length > 0) {
    ns.tprint("❌ ERROR: listHackedByMoney.js is already running on home server!");
    ns.tprint(`   Existing PID: ${runningProcesses[0].pid}`);
    ns.tprint("   Please kill the existing instance before starting a new one.");
    return;
  }
  ns.ui.openTail();
  ns.ui.resizeTail(950, 600);

  const bgGreen = "\u001b[42;37m";
  const bgRed = "\u001b[41;37m";
  const bgCyan = "\u001b[47;1;34m";
  const bgBlue = "\u001b[44;37m";
  const reset = "\u001b[0m";

  const serverDatabase = {};
  const symbolCache = new Map();

  while (true) {
    ns.clearLog();
    const purchased = ns.getPurchasedServers();
    const servers = scanAll(ns);

    // Build hacknet server list using the API for robustness
    const hacknetServers = [];
    const numNodes = ns.hacknet.numNodes();
    for (let i = 0; i < numNodes; i++) {
      hacknetServers.push(`hacknet-server-${i}`);
    }

    // 1 — Collect and Filter
    let hacked = servers
      .filter(s => ns.hasRootAccess(s) && ns.getServerMaxMoney(s) > 0)
      .map(s => ({
        name: s,
        currentMoney: ns.getServerMoneyAvailable(s),
        maxMoney: ns.getServerMaxMoney(s)
      }));

    // 2 — Sorting by Max Money
    hacked.sort((a, b) => a.maxMoney - b.maxMoney);

    ns.print("--- SERVER MONITOR v1.4.1 (Single Object State) ---");
    ns.print("----------------------------------------------------------------------------------");

    let id = 1;
    for (const s of hacked) {
      if (s.name.startsWith("p-")) continue;

      // Initialize server in database if first time
      if (!serverDatabase[s.name]) {
        serverDatabase[s.name] = { lastMoney: s.currentMoney, color: "" };
      }

      // 3 — State update logic (Money and Color)
      const entry = serverDatabase[s.name];

      if (s.currentMoney > entry.lastMoney) {
        entry.color = bgGreen;
      } else if (s.currentMoney < entry.lastMoney) {
        entry.color = bgRed;
      }

      // Update reference value for next tick
      entry.lastMoney = s.currentMoney;

      // 4 — Active Hacking Verification
      let flag = "";

      // Local script check
      if (ns.isRunning("simpleHack.js", "home", s.name)) {
        flag += " ➡ [OK] simple local";
      }

      const scripts = ["smart/smartBatchWithFormula.js", "smart/smartBatchNoFormula.js", "smart/smartBatchWithFormulaQ.js"];

      // Purchased server check (Dual Target logic)
      const pServer = purchased.find(p => {
        const targets = p.replace(/^p-/, "").split("_");
        return targets.includes(s.name);
      });

      if (pServer) {
        flag += " ➡ [OK] ✔ p- server found";
        const isRunning = scripts.some(script => ns.isRunning(script, pServer, s.name));
        if (isRunning) {
          flag += " [OK] ✔ hacking!";
        }
      }

      // Hacknet check
      const isHnRunning = hacknetServers.some(hn =>
        scripts.some(script => ns.isRunning(script, hn, s.name))
      );

      if (isHnRunning) {
        flag += " [OK] ✔ hacknet hacking!";
      }

      // Get stock symbol if available
      let symbol = "";
      try {
        if (!symbolCache.has(s.name)) {
          const serverInfo = ns.getServer(s.name);
          const orgName = serverInfo.organizationName;
          const allSymbols = ns.stock.getSymbols();
          for (const sym of allSymbols) {
            if (ns.stock.getOrganization(sym) === orgName) {
              symbolCache.set(s.name, sym);
              break;
            }
          }
        }
        const stockSymbol = symbolCache.get(s.name);
        if (stockSymbol) {
          symbol = ` [${stockSymbol}]`;
        }
      } catch (e) {
        // TIX API not available or error occurred
      }

      // ID Background Color Logic: Odd = Cyan, Even = Blue
      const idBgColor = (id % 2 !== 0) ? bgCyan : bgBlue;
      const idStr = `${id}.`.padEnd(4);
      const serverName = `${s.name}${symbol}`.padEnd(27);
      const moneyStr = `$${ns.formatNumber(s.currentMoney)} / $${ns.formatNumber(s.maxMoney)}`.padEnd(25);

      // Print with alternating background for ID and entry color for the rest
      ns.print(`${idBgColor}${idStr}${reset} ${entry.color}${serverName}: ${moneyStr}${reset}${flag}`);
      id++;
    }

    await ns.sleep(1000);
  }
}

// helper: full-depth recursive scan
function scanAll(ns) {
  const visited = new Set(["home"]);
  const stack = ["home"];
  while (stack.length > 0) {
    const host = stack.pop();
    for (const next of ns.scan(host)) {
      if (!visited.has(next)) {
        visited.add(next);
        stack.push(next);
      }
    }
  }
  return [...visited];
}
