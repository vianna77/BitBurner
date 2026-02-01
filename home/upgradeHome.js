// VERSION 1.0.0
/**
 * Interactive script to upgrade home server RAM and Cores.
 * Shows available upgrades with prices and lets you choose what to buy.
 * 
 * @param {NS} ns The Netscript API.
 */
export async function main(ns) {
  const homeServer = ns.getServer("home");
  const currentMoney = ns.getPlayer().money;

  // Get upgrade costs
  const ramCost = ns.singularity.getUpgradeHomeRamCost();
  const coresCost = ns.singularity.getUpgradeHomeCoresCost();

  // Build options list
  const options = [];
  
  if (ramCost > 0) {
    const canAfford = currentMoney >= ramCost ? "✅" : "❌";
    options.push(`${canAfford} Upgrade RAM: ${homeServer.maxRam}GB → ${homeServer.maxRam * 2}GB (${ns.formatNumber(ramCost)})`);
  }
  
  if (coresCost > 0) {
    const canAfford = currentMoney >= coresCost ? "✅" : "❌";
    options.push(`${canAfford} Upgrade Cores: ${homeServer.cpuCores} → ${homeServer.cpuCores + 1} (${ns.formatNumber(coresCost)})`);
  }

  if (options.length === 0) {
    await ns.prompt("🎉 All upgrades maxed out!\n\nNo more upgrades available.");
    return;
  }

  options.push("❌ Cancel");

  // Show prompt
  const choice = await ns.prompt(
    `💻 HOME SERVER UPGRADES\n\n` +
    `Current Money: ${ns.formatNumber(currentMoney)}\n` +
    `Current RAM: ${homeServer.maxRam}GB\n` +
    `Current Cores: ${homeServer.cpuCores}\n\n` +
    `Select upgrade:`,
    { type: "select", choices: options }
  );

  // Process choice
  if (choice.includes("Upgrade RAM")) {
    if (currentMoney < ramCost) {
      await ns.prompt(`❌ Not enough money!\n\nNeed: ${ns.formatNumber(ramCost)}\nHave: ${ns.formatNumber(currentMoney)}`);
      return;
    }
    
    if (ns.singularity.upgradeHomeRam()) {
      await ns.prompt(`✅ RAM upgraded successfully!\n\n${homeServer.maxRam}GB → ${homeServer.maxRam * 2}GB`);
    } else {
      await ns.prompt("❌ Failed to upgrade RAM!");
    }
  } else if (choice.includes("Upgrade Cores")) {
    if (currentMoney < coresCost) {
      await ns.prompt(`❌ Not enough money!\n\nNeed: ${ns.formatNumber(coresCost)}\nHave: ${ns.formatNumber(currentMoney)}`);
      return;
    }
    
    if (ns.singularity.upgradeHomeCores()) {
      await ns.prompt(`✅ Cores upgraded successfully!\n\n${homeServer.cpuCores} → ${homeServer.cpuCores + 1} cores`);
    } else {
      await ns.prompt("❌ Failed to upgrade Cores!");
    }
  }
}
