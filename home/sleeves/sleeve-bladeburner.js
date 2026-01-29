// VERSION: 2.2.1
// Sleeve Bladeburner Controller - Strict Rules Implementation

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");

  const DISPATCHER_SCRIPT = "/sleeves/sleeve-task-dispatcher.js";

  // Configuração dos Sleeves e Contratos (Regras 1, 2, 3)
  const CONTRACT_RULES = [
    { id: 0, name: "Tracking" },
    { id: 1, name: "Bounty Hunter" },
    { id: 2, name: "Retirement" }
  ];

  // Estado inicial
  let currentState = "START"; // Estados possíveis: START, NORMAL, SAFETY, INFILTRATE

  ns.print("🤖 Sleeve Bladeburner Controller v2.2.1 Iniciado");

  while (true) {
    const bb = ns.bladeburner;

    // ============================================================
    // 1. ANÁLISE DE DADOS (OBSERVATION)
    // ============================================================
    let minChance = 1.0;
    let anyContractEmpty = false;
    let allContractsFull = true; // >= 100
    let minContractCount = Infinity;

    for (const rule of CONTRACT_RULES) {
      // Verificar chance de sucesso (Regra 6)
      const [low, high] = bb.getActionEstimatedSuccessChance("Contract", rule.name);
      if (low < minChance) minChance = low;

      // Verificar quantidade restante (Regra 5)
      const count = bb.getActionCountRemaining("Contract", rule.name);
      if (count < 1) anyContractEmpty = true;
      if (count < 100) allContractsFull = false;
      if (count < minContractCount) minContractCount = count;
    }

    // ============================================================
    // 2. LÓGICA DE TRANSIÇÃO (TRANSITION)
    // ============================================================
    let nextState = currentState;

    if (currentState === "START") {
      nextState = "NORMAL";
    }

    // REGRA 6: SEGURANÇA (Prioridade Máxima)
    // Se a chance cair < 100%, ativa SAFETY imediatamente.
    if (minChance < 1.0) {
      if (currentState !== "SAFETY") {
        nextState = "SAFETY";
      }
    }
    // Se já está em SAFETY, só sai quando TODOS voltarem a 100%.
    else if (currentState === "SAFETY") {
      if (minChance >= 1.0) {
        nextState = "NORMAL";
      }
    }
    // REGRA 5: REABASTECIMENTO (Prioridade Secundária)
    // Só considera se não estivermos em SAFETY (ou precisando ir para lá).
    else {
      // Se qualquer contrato acabar, vai para INFILTRATE
      if (currentState !== "INFILTRATE" && anyContractEmpty) {
        nextState = "INFILTRATE";
      }
      // Se já está em INFILTRATE, só sai quando TODOS tiverem >= 100
      else if (currentState === "INFILTRATE") {
        if (allContractsFull) {
          nextState = "NORMAL";
        }
      }
    }

    // ============================================================
    // 3. EXECUÇÃO DE MUDANÇA DE ESTADO (ACTION ON CHANGE)
    // ============================================================
    if (nextState !== currentState) {
      ns.print(`🔄 Estado alterado: ${currentState} -> ${nextState}`);

      if (nextState === "SAFETY") {
        ns.print(`⚠️ Chance baixa detectada (${(minChance * 100).toFixed(1)}%). Executando Field Analysis.`);
        // Regra 6: Executa dispatcher para Field Analysis
        ns.run(DISPATCHER_SCRIPT, 1, "Bladeburner", "General", "Field Analysis");
      }
      else if (nextState === "INFILTRATE") {
        ns.print(`📉 Contratos esgotados. Executando Infiltrate Synthoids.`);
        // Regra 5: Executa dispatcher para Infiltrate Synthoids
        ns.run(DISPATCHER_SCRIPT, 1, "Bladeburner", "Infiltrate Synthoids");
      }
      else if (nextState === "NORMAL") {
        ns.print(`✅ Operação normal retomada.`);
      }

      currentState = nextState;
      // Pequena pausa para garantir que o dispatcher inicie e aplique as tarefas
      await ns.sleep(500);
    }

    // ============================================================
    // 4. MANUTENÇÃO DO ESTADO (STATE MAINTENANCE)
    // ============================================================
    if (currentState === "NORMAL") {
      const numSleeves = ns.sleeve.getNumSleeves();

      for (let i = 0; i < numSleeves; i++) {
        // Regra 1: Sleeve 0 -> Tracking
        if (i === 0) {
          ns.sleeve.setToBladeburnerAction(i, "Take on contracts", "Tracking");
        }
        // Regra 2: Sleeve 1 -> Bounty Hunter
        else if (i === 1) {
          ns.sleeve.setToBladeburnerAction(i, "Take on contracts", "Bounty Hunter");
        }
        // Regra 3: Sleeve 2 -> Retirement
        else if (i === 2) {
          ns.sleeve.setToBladeburnerAction(i, "Take on contracts", "Retirement");
        }
        // Regra 4: Sleeve 3 e 4 (e demais) -> Field Analysis
        else {
          ns.sleeve.setToBladeburnerAction(i, "Field Analysis");
        }
      }
    } else {
      // Em SAFETY ou INFILTRATE, apenas monitoramos e logamos periodicamente
      // O dispatcher já definiu as tarefas na transição de estado.
      if (currentState === "SAFETY") {
        ns.print(`🛡️ SAFETY: Recuperando chances... (Min: ${(minChance * 100).toFixed(1)}%)`);
      } else if (currentState === "INFILTRATE") {
        ns.print(`🕵️ INFILTRATE: Farmando contratos... (Min: ${minContractCount}/100)`);
      }
    }

    await ns.sleep(2000);
  }
}
