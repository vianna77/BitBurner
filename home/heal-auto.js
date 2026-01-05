/** @param {NS} ns */
export async function main(ns) {
  // VERSION 1.0.1
  
  ns.disableLog("ALL");
  
  const HEALTH_THRESHOLD = 0.95; // Heal when below 95% health
  const CHECK_INTERVAL = 5000; // Check every 5 seconds
  
  ns.print(`🏥 Auto-Heal Monitor Started - Threshold: ${(HEALTH_THRESHOLD * 100).toFixed(0)}%`);
  
  while (true) {
    const player = ns.getPlayer();
    const currentHealth = player.hp.current;
    const maxHealth = player.hp.max;
    const healthPercent = currentHealth / maxHealth;
    
    if (healthPercent < HEALTH_THRESHOLD) {
      // Check if player is in infiltration
      let workInfo = ns.singularity.getCurrentWork();
      
      if (workInfo !== null && workInfo.type === "INFILTRATION") {
        ns.print(`⚠️ Health low: ${(healthPercent * 100).toFixed(1)}% - Skipping hospital (infiltrating)`);
      } else {
        ns.print(`⚠️ Health low: ${(healthPercent * 100).toFixed(1)}% - Going to hospital`);
        ns.singularity.hospitalize();
        ns.print(`✅ Health restored to 100%`);
        ns.toast("🏥 Health regenerated to 100%!", "success", 3000);
      }
    }
    
    await ns.sleep(CHECK_INTERVAL);
  }
}