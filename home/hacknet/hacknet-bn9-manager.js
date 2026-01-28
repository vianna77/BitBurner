// VERSION: 3.1.1
/**
 * Hacknet automation script for BitNode 9 (Hacktocracy).
 * Uses official formula API for correct hash production and ROI.
 *
 * @param {NS} ns
 */
export async function main(ns) {
  const reserve = Number(ns.args[0]) || 100000;
  const interval = Number(ns.args[1]) || 1000;
  const maxNodes = Number(ns.args[2]) || 10;
  const PURCHASE_PORT = 3;

  ns.disableLog("ALL");

  ns.print("=======================================");
  ns.print("Hacknet BN9 Hash Controller v3.1.0");
  ns.print(`Reserve: ${ns.formatNumber(reserve)}`);
  ns.print(`Interval: ${interval} ms`);
  ns.print(`Max Servers: ${maxNodes}`);
  ns.print("=======================================");

  let lastLocalToast = 0;
  const TOAST_COOLDOWN = 300000;

  while (true) {
    await handleHashes(ns);

    const money = ns.getServerMoneyAvailable("home") - reserve;
    const nodeCount = ns.hacknet.numNodes();
    const canBuy = ns.peek(PURCHASE_PORT) !== "DISABLE";

    function getHashProd(level, ram, cores) {
      const ret = ns.formulas.hacknetServers.hashGainRate(
        level,
        0,
        ram,
        cores,
        ns.getBitNodeMultipliers().HacknetHashes
      );
      ns.print(`DEBUG getHashProd returns: ${ret}`);
      return ret;
    }


    if (canBuy && money > 0) {
      let bestUpgrade = { cost: Infinity, roi: -1, type: null, index: -1 };

      // New node ROI (correct)
      if (nodeCount < maxNodes) {
        const cost = ns.hacknet.getPurchaseNodeCost();
        const roi = getHashProd(1, 1, 1) / cost;
        bestUpgrade = { cost, roi, type: "NODE", index: -1 };
      }

      // Existing node upgrades
      for (let i = 0; i < nodeCount; i++) {
        const s = ns.hacknet.getNodeStats(i);
        const current = getHashProd(s.level, s.ram, s.cores);

        // Level
        const lCost = ns.hacknet.getLevelUpgradeCost(i, 1);
        const lGain =
          getHashProd(s.level + 1, s.ram, s.cores) - current;
        if (lGain / lCost > bestUpgrade.roi) {
          bestUpgrade = { cost: lCost, roi: lGain / lCost, type: "LVL", index: i };
        }

        // RAM
        const rCost = ns.hacknet.getRamUpgradeCost(i, 1);
        const rGain =
          getHashProd(s.level, s.ram * 2, s.cores) - current;
        if (rGain / rCost > bestUpgrade.roi) {
          bestUpgrade = { cost: rCost, roi: rGain / rCost, type: "RAM", index: i };
        }

        // Core
        const cCost = ns.hacknet.getCoreUpgradeCost(i, 1);
        const cGain =
          getHashProd(s.level, s.ram, s.cores + 1) - current;
        if (cGain / cCost > bestUpgrade.roi) {
          bestUpgrade = { cost: cCost, roi: cGain / cCost, type: "CORE", index: i };
        }
      }

      // Execute best ROI upgrade
      if (bestUpgrade.type && money >= bestUpgrade.cost) {
        switch (bestUpgrade.type) {
          case "NODE":
            ns.hacknet.purchaseNode();
            break;
          case "LVL":
            ns.hacknet.upgradeLevel(bestUpgrade.index, 1);
            break;
          case "RAM":
            ns.hacknet.upgradeRam(bestUpgrade.index, 1);
            break;
          case "CORE":
            ns.hacknet.upgradeCore(bestUpgrade.index, 1);
            break;
        }
        ns.print(
          `Upgraded ${bestUpgrade.type} [${bestUpgrade.index}] - Cost: ${ns.formatNumber(bestUpgrade.cost)}`
        );
      }

      // Cache logic unchanged (intentionally)
      for (let i = 0; i < nodeCount; i++) {
        if (ns.hacknet.getCacheUpgradeCost(i, 1) < money * 0.2) {
          ns.hacknet.upgradeCache(i, 1);
        }
      }
    }

    if (!canBuy && Date.now() - lastLocalToast > TOAST_COOLDOWN) {
      ns.toast(
        "Hacknet manager script: Global Purchases are DISABLED (Port 3)",
        "warning",
        150000
      );
      lastLocalToast = Date.now();
    }

    await ns.sleep(interval);
  }
}

/**
 * Sells hashes for money if the storage is almost full.
 * @param {NS} ns
 */
async function handleHashes(ns) {
  if (ns.hacknet.numNodes() === 0) return;

  while (ns.hacknet.numHashes() > ns.hacknet.hashCapacity() * 0.9) {
    if (ns.hacknet.spendHashes("Sell for Money")) {
      ns.print("Sold hashes to prevent overflow.");
      await ns.sleep(1);
    } else {
      break;
    }
  }
}
