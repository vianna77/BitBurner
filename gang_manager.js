/**
 * Hacking Gang Manager (v40.1 - Cycle End Time Logic + Ascension Diagnosis).
 * Uses a fixed 'cycleEndTime' timestamp to manage dynamic extensions safely (15-30 min cycle).
 * Includes detailed logging for Ascension checks after Wanted Level is restored.
 *
 * @param {NS} ns
 */
export function autocomplete(data, args) {
  return [];
}

/** @param {NS} ns */
export async function main(ns) {
  // --- Script Header / Purpose ---
  ns.tprint("==================================================================");
  ns.tprint("⚙️ GANG MANAGER: DYNAMIC PRODUCTION CYCLE (15-30 MIN) - V40.1");
  ns.tprint(" ");
  ns.tprint("Controle de Ciclo: 15 minutos base + 3 extensões de 5 minutos.");
  ns.tprint("Diagnóstico: Logs de ascensão adicionados na fase de produção.");
  ns.tprint("==================================================================");

  ns.disableLog("ALL");
  ns.ui.openTail();

  // ===========================================
  // CRUCIAL: CHECK IF GANG IS INITIALIZED
  // ===========================================
  if (!ns.gang.inGang()) {
    ns.tprint("FATAL ERROR: You must start a Gang before running this script.");
    return;
  }

  // --- USER CONFIGURATIONS ---
  const TRAINING_TASK_NAME = "Train Hacking";
  const WANTED_DECREASE_TASK_NAME = "Ethical Hacking";
  const MONEY_TASK_NAME = "Money Laundering";
  const RESPECT_TASK_NAME = "Cyberterrorism";

  const HACK_THRESHOLD = 150;
  const RESPECT_THRESHOLD = 100000;
  const ASCENSION_THRESHOLD = 1.7; // Multiplicador mínimo para tentar Ascensão

  // --- TIME-BASED CONTROL ---
  const INITIAL_CYCLE_TIME = 15 * 60 * 1000; // 15 minutes 
  const EXTENSION_TIME = 5 * 60 * 1000;       // 5 minutes 
  const MAX_EXTENSIONS = 3;                   // Max 3 extensions 

  const WANTED_LEVEL_BASELINE = 1.00;

  // --- GEAR CONFIG ---
  const HACKING_AUGMENTS = [
    "BitWire",
    "DataJack",
    "Neuralstimulator"
  ];

  const HACKING_EQUIPMENT = [
    "NUKE Rootkit",
    "Soulstealer Rootkit",
    "Hmap Node",
    "Demon Rootkit",
    "Jack the Ripper"
  ];

  // ============================================
  // --- STATE VARIABLES ---
  // ============================================
  // Timestamp when the current production phase *must* end.
  let cycleEndTime = Date.now() + INITIAL_CYCLE_TIME;
  let isReducingWanted = false;
  let extensionCount = 0;
  let lastMoneyGainRate = 0;

  // =======================================
  // --- AUXILIARY FUNCTIONS ---
  // =======================================

  /** Formats milliseconds to MM:SS. */
  const formatTimeRemaining = (ms) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

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
    // Ascension is blocked if WL is above the baseline
    if (currentWantedLevel > WANTED_LEVEL_BASELINE) {
      return;
    }

    const result = ns.gang.getAscensionResult(memberName);

    if (result) {
      // ADIÇÃO DE LOG DE DIAGNÓSTICO
      if (result.hack < ASCENSION_THRESHOLD) {
        ns.print(`[ASCENSION DIAGNOSIS] ${memberName} HACK Multiplier: ${result.hack.toFixed(3)}x (Next: ${ASCENSION_THRESHOLD}x)`);
      }
    }

    if (result && result.hack >= ASCENSION_THRESHOLD) {
      if (ns.gang.ascendMember(memberName)) {
        ns.print(`✨ ASCENSION: ${memberName} ascended! HACK Multiplier: ${result.hack.toFixed(2)}x`);
      }
    }
  };


  /** Sets the ideal task for a member based on priorities and current cycle state. */
  const setBestTask = (memberName, currentRespect, currentWantedLevel) => {
    const memberInfo = ns.gang.getMemberInformation(memberName);

    // --- PRIORITY 1: REDUCTION PHASE ---
    if (isReducingWanted) {
      if (currentWantedLevel > WANTED_LEVEL_BASELINE) {
        if (memberInfo.task !== WANTED_DECREASE_TASK_NAME) {
          ns.gang.setMemberTask(memberName, WANTED_DECREASE_TASK_NAME);
          ns.print(`🛑 ${memberName}: Forced Reduction. WL is high (${currentWantedLevel.toFixed(2)}).`);
        }
      }
      return;
    }

    // --- PRIORITY 2: HACKING TRAINING ---
    if (memberInfo.hack < HACK_THRESHOLD) {
      if (memberInfo.task !== TRAINING_TASK_NAME) {
        ns.gang.setMemberTask(memberName, TRAINING_TASK_NAME);
        ns.print(`💪 ${memberName}: Low Hacking! Set to Training (${TRAINING_TASK_NAME}).`);
      }
      return;
    }

    // --- PRIORITY 3: RESPECT GAIN ---
    if (currentRespect < RESPECT_THRESHOLD) {
      if (memberInfo.task !== RESPECT_TASK_NAME) {
        ns.gang.setMemberTask(memberName, RESPECT_TASK_NAME);
        ns.print(`⭐ ${memberName}: Production phase. Set to Respect (${RESPECT_TASK_NAME}).`);
      }
      return;
    }

    // --- PRIORITY 4: MONEY GAIN ---
    if (memberInfo.task !== MONEY_TASK_NAME) {
      ns.gang.setMemberTask(memberName, MONEY_TASK_NAME);
      ns.print(`💰 ${memberName}: Production phase. Set to Money Gain (${MONEY_TASK_NAME}).`);
    }
  };


  // ============================================
  // MAIN GANG MAINTENANCE LOOP
  // ============================================

  while (true) {

    // --- 1. GATHER INFO ---
    const gangInfo = ns.gang.getGangInformation();
    const memberNames = ns.gang.getMemberNames();
    const currentRespect = gangInfo.respect;
    const currentWantedLevel = gangInfo.wantedLevel;
    const currentMoneyGainRate = gangInfo.moneyGainRate;

    // Time calculations simplified using cycleEndTime
    const timeRemaining = cycleEndTime - Date.now();
    const isCycleExpired = timeRemaining <= 0;

    // ----------------------------------------------------
    // --- TIME/STATE BASED CYCLE CONTROL ---
    // ----------------------------------------------------

    if (isReducingWanted) {
      // REDUCTION PHASE: Exits reduction mode if WL has reached baseline.
      if (currentWantedLevel <= WANTED_LEVEL_BASELINE) {
        isReducingWanted = false;
        // Resets the timer for the NEW 15-minute cycle
        cycleEndTime = Date.now() + INITIAL_CYCLE_TIME;
        extensionCount = 0; // Reset extensions

        ns.print("✅ CYCLE END: Wanted Level restored to baseline (1.0). Starting Production phase.");

        // --- PRIORITY ACTION AFTER RESET ---
        // Executes Ascension/Gear ONLY on cycle restart for critical tasks.
        recruitMember();
        for (const memberName of memberNames) {
          attemptAscension(memberName, currentWantedLevel);
          buyGear(memberName);
        }
      }
    } else {
      // PRODUCTION PHASE: Extends or Enters reduction mode if time has run out.

      // --- DYNAMIC EXTENSION CHECK ---
      if (isCycleExpired) {

        const moneyRising = currentMoneyGainRate > lastMoneyGainRate;
        const extensionAvailable = extensionCount < MAX_EXTENSIONS;

        // --- EXTENSION DEBUG ---
        ns.print("--- EXTENSION DEBUG ---");
        ns.print(`💰 Money Gain Rate (Current vs. Last): ${ns.formatNumber(currentMoneyGainRate)} vs. ${ns.formatNumber(lastMoneyGainRate)} (Rising: ${moneyRising})`);
        ns.print(`⏱️ Extension Count (Current vs. Max): ${extensionCount}/${MAX_EXTENSIONS} (Available: ${extensionAvailable})`);
        ns.print(`Status: ${moneyRising && extensionAvailable ? "EXTENSION GRANTED" : "EXTENSION DENIED"}`);
        ns.print("-------------------------");
        // ----------------------------------------------------------

        // Check if money gain rate is INCREASING AND we haven't hit the max extensions
        if (moneyRising && extensionAvailable) {

          extensionCount++; // Use one extension

          // SOLUTION: Add time to the end time timestamp, making the cycle longer
          cycleEndTime += EXTENSION_TIME;

          // --- TOAST IMPLEMENTATION ---
          const currentTotalTime = INITIAL_CYCLE_TIME + (extensionCount * EXTENSION_TIME);
          const toastMessage = `📈 PRODUCTION EXTENDED: Cycle extended by 5 min. Total: ${ns.tFormat(currentTotalTime)}.`;
          const toastDuration = 60000; // 60 seconds
          ns.toast(toastMessage, "info", toastDuration);
          // --------------------------------------------------

          ns.print(`📈 EXTENSION GRANTED: Money gain is still rising! Cycle extended by 5 min (Extension: ${extensionCount}/${MAX_EXTENSIONS}).`);

        } else {
          // --- END CYCLE CHECK: Extension DENIED or NOT Available ---
          isReducingWanted = true;
          // Calculate the actual total time of the cycle that just ended
          const finalTotalTime = INITIAL_CYCLE_TIME + (extensionCount * EXTENSION_TIME);
          ns.print(`🛑 CYCLE START: Production time (${ns.tFormat(finalTotalTime)}) expired. Switching to Reduction phase.`);
        }
      }
    }

    // --- Update for next iteration ---
    lastMoneyGainRate = currentMoneyGainRate;

    // --- 2. COMPACT STATUS LOG ---
    let cycleStatus;
    const totalCurrentDuration = INITIAL_CYCLE_TIME + (extensionCount * EXTENSION_TIME);
    const totalCurrentDurationMinutes = Math.floor(totalCurrentDuration / (60 * 1000));

    if (isReducingWanted) {
      // 🛡️ R (Shield/Reduction)
      cycleStatus = `🛡️ R`;
    } else {
      // ⚙️ P (Gear/Production) with remaining time (MM:SS)
      cycleStatus = `⚙️ P (${totalCurrentDurationMinutes}m, +${extensionCount}) ⏱️ -${formatTimeRemaining(timeRemaining)}`;
    }

    // Status line with Emojis
    ns.print(`[STATUS] ${cycleStatus} | 🌟:${ns.formatNumber(currentRespect)} | 💰:${ns.formatNumber(currentMoneyGainRate)}/s | 🚨:${currentWantedLevel.toFixed(2)} | 🧑‍💻: ${memberNames.length}`);

    // --- 3. MEMBER MANAGEMENT (Ascension/Gear/Task) ---

    // Executes Ascension and Gear Purchase if WL is at baseline (on every tick in production phase)
    if (currentWantedLevel <= WANTED_LEVEL_BASELINE) {
      for (const memberName of memberNames) {
        attemptAscension(memberName, currentWantedLevel);
        buyGear(memberName);
      }
    }

    // Executes setBestTask for all members (main cycle logic)
    for (const memberName of memberNames) {
      setBestTask(memberName, currentRespect, currentWantedLevel);
    }

    await ns.sleep(10000);
  }
}
