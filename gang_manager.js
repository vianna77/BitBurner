/**
 * Hacking Gang Manager (v27 - Cleaned Log, Focus on Respect/Money).
 * Prioritizes Wanted Level reduction, then Hacking training (up to 150), 
 * then Cyberterrorism (for Respect), then Money Laundering (for Money).
 * * * @param {NS} ns
 */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.openTail();

  // ===========================================
  // CRUCIAL: CHECK IF GANG IS INITIALIZED
  // ===========================================
  if (!ns.gang.inGang()) {
    // Keeping ns.tprint here as a FATAL ERROR since the Tail might not be open/visible.
    ns.tprint("FATAL ERROR: You must start a Gang before running this script.");
    return;
  }

  // --- USER CONFIGURATIONS ---
  const TRAINING_TASK_NAME = "Train Hacking";
  const WANTED_DECREASE_TASK_NAME = "Ethical Hacking";
  const MONEY_TASK_NAME = "Money Laundering";

  const RESPECT_TASK_NAME = "Cyberterrorism";

  // HACK SKILL LIMIT before moving to Respect/Money tasks
  const HACK_THRESHOLD = 150;

  // RESPECT LIMIT to prioritize Cyberterrorism over Money Laundering
  const RESPECT_THRESHOLD = 100000;

  // ASCENSION MULTIPLIER LIMIT (Efficient value is 1.7x+)
  const ASCENSION_THRESHOLD = 1.7;

  // Wanted Level limits
  const WANTED_THRESHOLD = 1.05;

  const HACKING_AUGMENTS = [
    "BitWire",
    "DataJack",
  ];

  const HACKING_EQUIPMENT = [
    "NUKE Rootkit",
    "Soulstealer Rootkit"
  ];

  // =======================================
  // --- AUXILIARY FUNCTIONS ---
  // =======================================

  /** Checks and recruits new members. */
  const recruitMember = () => {
    if (ns.gang.canRecruitMember()) {
      const name = `Hacker-${ns.gang.getMemberNames().length + 1}`;
      if (ns.gang.recruitMember(name)) {
        ns.print(`✅ Member Recruited: ${name}`);
      }
    }
  };

  /** Purchases equipment and augments for a member. */
  const buyGear = (memberName) => {
    const money = ns.getServerMoneyAvailable("home");

    for (const augment of HACKING_AUGMENTS) {
      const cost = ns.gang.getEquipmentCost(augment);
      if (!ns.gang.getMemberInformation(memberName).upgrades.includes(augment) && money > cost) {
        if (ns.gang.purchaseEquipment(memberName, augment)) {
          ns.print(`🛒 ${memberName}: Bought Augment ${augment}.`);
        }
      }
    }

    for (const item of HACKING_EQUIPMENT) {
      const cost = ns.gang.getEquipmentCost(item);
      if (!ns.gang.getMemberInformation(memberName).upgrades.includes(item) && money > cost) {
        if (ns.gang.purchaseEquipment(memberName, item)) {
          ns.print(`🛒 ${memberName}: Bought Equipment ${item}.`);
        }
      }
    }
  };

  /** Attempts to ascend the member if the multiplier is high enough. */
  const attemptAscension = (memberName, currentWantedLevel) => {
    if (currentWantedLevel > WANTED_THRESHOLD) {
      return;
    }

    const result = ns.gang.getAscensionResult(memberName);

    if (result) {
      // Diagnostic log
      ns.print(`[ASCENSION DIAGNOSIS] ${memberName} HACK Multiplier: ${result.hack.toFixed(3)}x`);
    }

    if (result && result.hack >= ASCENSION_THRESHOLD) {
      if (ns.gang.ascendMember(memberName)) {
        ns.print(`✨ ASCENSION: ${memberName} ascended! HACK Multiplier: ${result.hack.toFixed(2)}x`);
      }
    }
  };


  /** Sets the ideal task for a member based on priorities. */
  const setBestTask = (memberName, currentRespect, currentWantedLevel, gangInfo, memberNames) => {
    const memberInfo = ns.gang.getMemberInformation(memberName);

    // --- PRIORITY 1: WANTED LEVEL REDUCTION (ABSOLUTE) ---
    if (currentWantedLevel > WANTED_THRESHOLD) {

      if (memberInfo.task !== WANTED_DECREASE_TASK_NAME) {
        ns.gang.setMemberTask(memberName, WANTED_DECREASE_TASK_NAME);
        ns.print(`🛑 ${memberName}: High Wanted Level! Reset to Reduction (${WANTED_DECREASE_TASK_NAME}).`);
      }
      return;
    }

    // --- PRIORITY 2: HACKING TRAINING (Weak members, lower limit) ---
    if (memberInfo.hack < HACK_THRESHOLD) {
      if (memberInfo.task !== TRAINING_TASK_NAME) {
        ns.gang.setMemberTask(memberName, TRAINING_TASK_NAME);
        ns.print(`💪 ${memberName}: Low Hacking! Set to Training (${TRAINING_TASK_NAME}).`);
      }
      return;
    }

    // --- PRIORITY 3: RESPECT GAIN (CYBERTERRORISM) ---
    // If Respect is below the threshold (for recruiting/Augs)
    if (currentRespect < RESPECT_THRESHOLD) {
      if (memberInfo.task !== RESPECT_TASK_NAME) {
        ns.gang.setMemberTask(memberName, RESPECT_TASK_NAME);
        ns.print(`⭐ ${memberName}: Low Respect! Set to Respect (${RESPECT_TASK_NAME}).`);
      }
      return;
    }

    // --- PRIORITY 4: MONEY GAIN ---
    if (memberInfo.task !== MONEY_TASK_NAME) {
      ns.gang.setMemberTask(memberName, MONEY_TASK_NAME);
      ns.print(`💰 ${memberName}: Ready and Strong! Set to Money Gain (${MONEY_TASK_NAME}).`);
    }
  };

  // ============================================
  // MAIN GANG MAINTENANCE LOOP
  // ============================================

  while (true) {

    recruitMember();

    const gangInfo = ns.gang.getGangInformation();
    const memberNames = ns.gang.getMemberNames();
    const currentRespect = gangInfo.respect;
    const currentWantedLevel = gangInfo.wantedLevel;

    // Status line with Emojis
    ns.print(`[STATUS] 🌟:${ns.formatNumber(currentRespect)} | 💰:${ns.formatNumber(gangInfo.moneyGainRate)}/s | 🚨:${currentWantedLevel.toFixed(2)} | 🧑‍💻: ${memberNames.length}`);

    // --- 2. MEMBER MANAGEMENT ---
    for (const memberName of memberNames) {
      attemptAscension(memberName, currentWantedLevel);
      buyGear(memberName);
      setBestTask(memberName, currentRespect, currentWantedLevel, gangInfo, memberNames);
    }

    await ns.sleep(20000);
  }
}
