/**
 * Hacking Gang Manager (v35 - Time-Based Cycling, Gear/Shield Status - English).
 * Members cycle between 15 minutes of Respect/Money gain (aggressive) 
 * and a mandatory phase of Wanted Level reduction until WL reaches 1.0.
 * Status log uses ⚙️ (Gear) for Production and 🛡️ (Shield) for Reduction
 * for better visual consistency.
 *
 * @param {NS} ns
 */
export async function main(ns) {
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

  const ASCENSION_THRESHOLD = 1.7;

  // --- TIME-BASED CONTROL ---
  const PRODUCTION_CYCLE_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds

  const WANTED_LEVEL_BASELINE = 1.00;

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
  // Timestamp when the last production phase started
  let productionStartTime = Date.now();
  // Flag to indicate the current phase (false = Production/Gain, true = Reduction/Cleanup)
  let isReducingWanted = false;


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
      ns.print(`[ASCENSION DIAGNOSIS] ${memberName} HACK Multiplier: ${result.hack.toFixed(3)}x`);
    }

    if (result && result.hack >= ASCENSION_THRESHOLD) {
      if (ns.gang.ascendMember(memberName)) {
        ns.print(`✨ ASCENSION: ${memberName} ascended! HACK Multiplier: ${result.hack.toFixed(2)}x`);
      }
    }
  };


  /** Sets the ideal task for a member based on priorities and current cycle state. */
  const setBestTask = (memberName, currentRespect, currentWantedLevel, gangInfo, memberNames) => {
    const memberInfo = ns.gang.getMemberInformation(memberName);

    // --- PRIORITY 1: REDUCTION PHASE (Forced if isReducingWanted = true) ---
    if (isReducingWanted) {

      if (currentWantedLevel > WANTED_LEVEL_BASELINE) {
        if (memberInfo.task !== WANTED_DECREASE_TASK_NAME) {
          ns.gang.setMemberTask(memberName, WANTED_DECREASE_TASK_NAME);
          // Log change of task
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
    let currentWantedLevel = gangInfo.wantedLevel;

    // ----------------------------------------------------
    // --- TIME/STATE BASED CYCLE CONTROL ---
    // ----------------------------------------------------
    const timeElapsed = Date.now() - productionStartTime;

    if (isReducingWanted) {
      // REDUCTION PHASE: Exits reduction mode if WL has reached baseline.
      if (currentWantedLevel <= WANTED_LEVEL_BASELINE) {
        isReducingWanted = false;
        productionStartTime = Date.now(); // Resets the timer

        ns.print("✅ CYCLE END: Wanted Level restored to baseline (1.0). Starting Production phase.");

        // --- PRIORITY ACTION AFTER RESET ---
        recruitMember();
        for (const memberName of memberNames) {
          attemptAscension(memberName, currentWantedLevel);
          buyGear(memberName);
        }
      }
    } else {
      // PRODUCTION PHASE: Enters reduction mode if the time limit is reached.
      if (timeElapsed >= PRODUCTION_CYCLE_TIME) {
        isReducingWanted = true;
        ns.print(`🛑 CYCLE START: Production time (${ns.tFormat(PRODUCTION_CYCLE_TIME)}) expired. Switching to Reduction phase.`);
      }
    }

    // --- 2. COMPACT STATUS LOG ---
    let cycleStatus;
    if (isReducingWanted) {
      // 🛡️ R (Shield/Reduction)
      cycleStatus = `🛡️ R`;
    } else {
      // ⚙️ P (Gear/Production) with remaining time (MM:SS)
      const timeRemaining = PRODUCTION_CYCLE_TIME - timeElapsed;
      cycleStatus = `⚙️ P ⏱️ -${formatTimeRemaining(timeRemaining)}`;
    }

    // Status line with Emojis
    ns.print(`[STATUS] ${cycleStatus} | 🌟:${ns.formatNumber(currentRespect)} | 💰:${ns.formatNumber(gangInfo.moneyGainRate)}/s | 🚨:${currentWantedLevel.toFixed(2)} | 🧑‍💻: ${memberNames.length}`);

    // --- 3. MEMBER MANAGEMENT (Ascension/Gear during Production Phase) ---

    // Executes Ascension and Gear Purchase if WL is at baseline (to catch multipliers at any time)
    if (currentWantedLevel <= WANTED_LEVEL_BASELINE) {
      for (const memberName of memberNames) {
        // attemptAscension is safe as it checks currentWantedLevel > 1.0
        attemptAscension(memberName, currentWantedLevel);
        buyGear(memberName);
      }
    }

    // Executes setBestTask for all members (main cycle logic)
    for (const memberName of memberNames) {
      setBestTask(memberName, currentRespect, currentWantedLevel, gangInfo, memberNames);
    }

    await ns.sleep(5000);
  }
}
