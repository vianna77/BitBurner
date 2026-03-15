// VERSION 7.0.0
/**
 * IPvGO Strategy Bot - Optimized for 5x5 Combat with Cheat Integration
 * Enhanced tactical AI with aggressive capture, defense, and cheat tactics
 * Requires BitNode 14.2 for cheat functionality
 * @param {NS} ns
 */
export async function main(ns) {
  ns.disableLog("ALL");

  // Check if script is already running
  const runningProcesses = ns.ps("home").filter(p =>
    p.filename === "go/go-claude-cheat.js" && p.pid !== ns.pid
  );

  if (runningProcesses.length > 0) {
    ns.tprint("❌ ERROR: go-claude-cheat.js is already running on home server!");
    ns.tprint(`   Existing PID: ${runningProcesses[0].pid}`);
    ns.tprint("   Please kill the existing instance before starting a new one.");
    return;
  }

  let opponent = ns.args[0];

  if (!opponent) {
    opponent = await ns.prompt("Choose the opponent:", {
      type: "select",
      choices: [
        "No AI", "Netburners", "Slum Snakes", "The Black Hand",
        "Tetrads", "Daedalus", "Illuminati", "????????????"
      ]
    });

    if (!opponent) {
      ns.tprint("❌ IPvGO Bot cancelled - No opponent selected. Script terminated.");
      return;
    }
  }

  // Enhanced Liberty Scanner - Optimized for 5x5
  function getLiberties(board, x, y, visited = new Set()) {
    const key = `${x},${y}`;
    if (visited.has(key)) return new Set();
    visited.add(key);

    const char = board[x][y];
    let liberties = new Set();
    const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5) {
        if (board[nx][ny] === '.') {
          liberties.add(`${nx},${ny}`);
        } else if (board[nx][ny] === char) {
          const groupLibs = getLiberties(board, nx, ny, visited);
          for (const lib of groupLibs) liberties.add(lib);
        }
      }
    }
    return liberties;
  }

  // Eye Detection - More restrictive (V6.0 improvement)
  function isEye(board, x, y, color) {
    const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    let friendlyCount = 0;
    let edgeCount = 0;

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= 5 || ny < 0 || ny >= 5) {
        edgeCount++;
      } else if (board[nx][ny] === color) {
        friendlyCount++;
      } else if (board[nx][ny] !== '.') {
        return false;
      }
    }

    return (friendlyCount + edgeCount) >= 4;
  }

  // Improved Suicide Detection (V6.0) - Captures are NOT suicide
  function wouldBeSuicide(board, x, y) {
    const testBoard = board.map(row => [...row]);
    testBoard[x][y] = 'X';

    // Check if the move itself has liberties
    const libs = getLiberties(testBoard, x, y);
    if (libs.size > 0) return false;

    // Check if the move captures any enemy group (NOT suicide)
    const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5 && board[nx][ny] === 'O') {
        const enemyLibs = getLiberties(testBoard, nx, ny);
        if (enemyLibs.size === 0) return false;
      }
    }

    return true;
  }

  // Advanced Influence Evaluation (V6.0)
  function evaluatePosition(board, x, y) {
    let score = 0;

    // Strategic positions on 5x5
    if (x === 2 && y === 2) score += 100; // Center
    else if ((x === 1 || x === 3) && (y === 1 || y === 3)) score += 60; // Stars

    // Influence mapping
    const reach = 2;
    for (let dx = -reach; dx <= reach; dx++) {
      for (let dy = -reach; dy <= reach; dy++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5) {
          const dist = Math.abs(dx) + Math.abs(dy);
          if (dist === 0) continue;

          if (board[nx][ny] === 'X') {
            score += (40 / dist); // Support
          } else if (board[nx][ny] === 'O') {
            score += (50 / dist); // Pressure
          } else {
            score += (10 / dist); // Territory
          }
        }
      }
    }

    return score;
  }

  // 1. ATARI CAPTURE - Find enemy stones in atari
  function findAtariCapture(board, validMoves) {
    ns.print(`[DEBUG] Scanning for enemy atari...`);
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        if (board[x][y] === 'O') {
          const libs = getLiberties(board, x, y, new Set());
          ns.print(`[DEBUG] Enemy stone at [${x},${y}] has ${libs.size} liberties`);
          if (libs.size === 1) {
            const [lx, ly] = Array.from(libs)[0].split(',').map(Number);
            if (validMoves[lx][ly]) {
              ns.print(`[ATARI CAPTURE] Enemy in atari - capturing at [${lx}, ${ly}]!`);
              return { x: lx, y: ly };
            }
          }
        }
      }
    }
    return undefined;
  }

  // 2. CHEAT TACTICS - Strategic cheat moves (PRIORITY: before self-defense)
  function findCheatMove(board, validMoves) {
    try {
      const cheatChance = ns.go.cheat.getCheatSuccessChance();
      ns.print(`[CHEAT] Success chance: ${(cheatChance * 100).toFixed(1)}%`);

      // Only use cheats if chance is reasonable (>70%)
      if (cheatChance < 0.7) {
        return undefined;
      }

      // Strategy 1: playTwoMoves - Double threat or capture+defend
      const topMoves = [];
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          if (board[x][y] === '.') {
            const score = evaluatePosition(board, x, y);
            topMoves.push({ x, y, score });
          }
        }
      }

      if (topMoves.length >= 2) {
        topMoves.sort((a, b) => b.score - a.score);
        const move1 = topMoves[0];
        const move2 = topMoves[1];

        // Use playTwoMoves if both moves are valuable
        if (move1.score > 80 && move2.score > 60) {
          ns.print(`[CHEAT] playTwoMoves at [${move1.x},${move1.y}] + [${move2.x},${move2.y}]`);
          return { type: 'playTwoMoves', x1: move1.x, y1: move1.y, x2: move2.x, y2: move2.y };
        }
      }

      // Strategy 2: removeRouter - Remove critical enemy stone (>80% chance)
      if (cheatChance > 0.8) {
        let bestTarget = null;
        let maxConnections = 0;

        for (let x = 0; x < 5; x++) {
          for (let y = 0; y < 5; y++) {
            if (board[x][y] === 'O') {
              const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
              let connections = 0;
              for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5 && board[nx][ny] === 'O') {
                  connections++;
                }
              }
              if (connections > maxConnections) {
                maxConnections = connections;
                bestTarget = { x, y };
              }
            }
          }
        }

        if (bestTarget && maxConnections >= 2) {
          ns.print(`[CHEAT] removeRouter at [${bestTarget.x},${bestTarget.y}] (${maxConnections} connections)`);
          return { type: 'removeRouter', x: bestTarget.x, y: bestTarget.y };
        }
      }
    } catch (error) {
      ns.print(`[CHEAT] Not available (requires BitNode 14.2)`);
    }

    return undefined;
  }

  // 3. SELF-DEFENSE - Save own groups in atari
  function findSelfDefense(board, validMoves) {
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        if (board[x][y] === 'X') {
          const libs = getLiberties(board, x, y, new Set());
          if (libs.size === 1) {
            const [lx, ly] = Array.from(libs)[0].split(',').map(Number);
            if (validMoves[lx][ly] && !wouldBeSuicide(board, lx, ly)) {
              ns.print(`[DEFENSE] Saving group at [${lx}, ${ly}]`);
              return { x: lx, y: ly };
            }
          }
        }
      }
    }
    return undefined;
  }

  // 4. STRATEGIC EXPANSION - Influence-based positioning
  function findStrategicExpansion(board, validMoves) {
    let potentialMoves = [];

    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        if (validMoves[x][y] && !isEye(board, x, y, 'X') && !wouldBeSuicide(board, x, y)) {
          const score = evaluatePosition(board, x, y);
          potentialMoves.push({ x, y, score });
        }
      }
    }

    if (potentialMoves.length > 0) {
      potentialMoves.sort((a, b) => b.score - a.score);
      const best = potentialMoves[0];
      ns.print(`[STRATEGIC] Best move at [${best.x}, ${best.y}] (score: ${best.score.toFixed(1)})`);
      return { x: best.x, y: best.y };
    }

    return undefined;
  }

  let totalWins = 0;
  let totalLosses = 0;
  const startTime = Date.now();

  ns.print(`Starting High-Speed IPvGO against ${opponent}...`);

  while (true) {
    ns.print("--- New game started ---");
    ns.go.resetBoardState(opponent, 5);
    let gameOver = false;

    // Simple center opening
    let result = null;
    try {
      result = await ns.go.makeMove(2, 2);
    }
    catch (error) {
      result = await ns.go.makeMove(1, 2);
    }

    if (result?.type === "gameOver") gameOver = true;

    while (!gameOver) {
      const validMoves = ns.go.analysis.getValidMoves();
      const board = ns.go.getBoardState();

      // Decision priority chain: ATARI > CHEAT > DEFENSE > STRATEGIC
      const move = findAtariCapture(board, validMoves) ||
        findCheatMove(board, validMoves) ||
        findSelfDefense(board, validMoves) ||
        findStrategicExpansion(board, validMoves);

      // Execute move
      let result;
      if (move?.type === 'playTwoMoves') {
        result = await ns.go.cheat.playTwoMoves(move.x1, move.y1, move.x2, move.y2);
      } else if (move?.type === 'removeRouter') {
        result = await ns.go.cheat.removeRouter(move.x, move.y);
      } else if (move) {
        result = await ns.go.makeMove(move.x, move.y);
      } else {
        result = await ns.go.passTurn();
      }

      if (result?.type === "gameOver") {
        gameOver = true;
      } else if (result?.type === "pass") {
        const gameState = ns.go.getGameState();
        const whiteScore = gameState.whiteScore;
        const blackScore = gameState.blackScore;

        if (blackScore > whiteScore) {
          ns.print(`[STRATEGY] Opponent passed. Black: ${blackScore} > White: ${whiteScore}. Passing to win.`);
          result = await ns.go.passTurn();
          if (result?.type === "gameOver") {
            gameOver = true;
          }
        } else {
          ns.print(`[STRATEGY] Opponent passed but Black: ${blackScore} <= White: ${whiteScore}. Continuing...`);
        }
      }
    }

    // Final result calculation
    const gameState = ns.go.getGameState();
    const blackScore = gameState.blackScore;
    const whiteScore = gameState.whiteScore;

    if (blackScore > whiteScore) {
      totalWins++;
    } else {
      totalLosses++;
    }

    const totalMatches = totalWins + totalLosses;
    const elapsedSec = (Date.now() - startTime) / 1000;
    const avgDuration = (elapsedSec / totalMatches).toFixed(2);
    const wlRatio = totalLosses === 0 ? totalWins.toFixed(2) : (totalWins / totalLosses).toFixed(2);

    // Show toast only every 10th match
    if (totalMatches % 10 === 0) {
      if (blackScore > whiteScore) {
        ns.toast(`🏆 WIN - Match #${totalMatches} (${totalWins}W / ${totalLosses}L) ⏳ ${avgDuration}s/avg ⚖️ ${wlRatio} W/L`, "success", 7000);
      } else {
        ns.toast(`💀 LOSS - Match #${totalMatches} (${totalWins}W / ${totalLosses}L) ⏳ ${avgDuration}s/avg ⚖️ ${wlRatio} W/L`, "error", 7000);
      }
    }

    await ns.sleep(50);
  }
}
