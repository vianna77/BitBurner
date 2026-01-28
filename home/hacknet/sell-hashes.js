// VERSION: 1.0.1
/**
 * Sell Hashes for Money
 * Prompts the user (or accepts arg) for a quantity and sells Hacknet hashes for money
 * that many times in a loop.
 *
 * @param {NS} ns
 */
export async function main(ns) {
  if (ns.hacknet.numNodes() === 0) {
    ns.tprint("❌ You do not have any Hacknet Servers.");
    return;
  }

  let sellCountInput = ns.args[0];

  if (sellCountInput === undefined) {
    sellCountInput = await ns.prompt("Enter the number of times to sell hashes:", {
      type: "text"
    });
  }

  if (!sellCountInput) {
    ns.tprint("🟡 Operation cancelled.");
    return;
  }

  const sellCount = parseInt(sellCountInput, 10);

  if (isNaN(sellCount) || sellCount <= 0) {
    ns.tprint("❌ Invalid number provided. Please enter a positive integer.");
    return;
  }

  let successCount = 0;
  for (let i = 0; i < sellCount; i++) {
    if (ns.hacknet.spendHashes("Sell for Money")) {
      successCount++;
    } else {
      ns.tprint(`🟡 Ran out of hashes after ${successCount} sales. Stopping.`);
      break;
    }
  }

  if (successCount > 0) {
    ns.tprint(`✅ Successfully sold hashes ${successCount} time(s).`);
    ns.toast(`💸 Sold hashes x${successCount}`, "success");
  } else {
    ns.tprint("🔶 No hashes were sold. You may not have enough for even one sale.");
  }
}
