// VERSION 6.0.0
/** 
 * IPvGO Strategy Bot - Optimized for 5x5 Combat
 * Enhanced tactical AI with aggressive capture and defense priorities
 * @param {NS} ns 
 */
export async function main(ns) {
  ns.disableLog("ALL");

  // Check if script is already running
  const runningProcesses = ns.ps("home").filter(p =>
    p.filename === "go/go-claude.js" && p.pid !== ns.pid
  );

  if (runningProcesses.length > 0) {
    ns.tprint("❌ ERROR: go-claude.js is already running on home server!");
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

  let totalWins = 0;
  let totalLosses = 0;
  const startTime = Date.now();

  ns.print(`Starting High-Speed IPvGO against ${opponent}...`);

  while (true) {
    ns.print("--- New game started ---");
    ns.go.resetBoardState(opponent, 5);
    let gameOver = false;

    // Simple center opening
    let result = await ns.go.makeMove(2, 2);
    if (result?.type === "gameOver") gameOver = true;

    while (!gameOver) {
      const validMoves = ns.go.analysis.getValidMoves();
      const board = ns.go.getBoardState();

      let x_move = undefined;
      let y_move = undefined;

      // 1. ATARI CAPTURE - ABSOLUTE PRIORITY - NO FILTERS!
      ns.print(`[DEBUG] Scanning for enemy atari...`);
      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          if (board[x][y] === 'O') {
            const libs = getLiberties(board, x, y, new Set()); // Fresh visited set!
            ns.print(`[DEBUG] Enemy stone at [${x},${y}] has ${libs.size} liberties`);
            if (libs.size === 1) {
              const [lx, ly] = Array.from(libs)[0].split(',').map(Number);
              if (validMoves[lx][ly]) {
                ns.print(`[ATARI CAPTURE] Enemy in atari - capturing at [${lx}, ${ly}]!`);
                x_move = lx; y_move = ly;
                break;
              }
            }
          }
        }
        if (x_move !== undefined) break;
      }

      // 2. SELF-DEFENSE
      if (x_move === undefined) {
        for (let x = 0; x < 5; x++) {
          for (let y = 0; y < 5; y++) {
            if (board[x][y] === 'X') {
              const libs = getLiberties(board, x, y, new Set()); // Fresh visited set!
              if (libs.size === 1) {
                const [lx, ly] = Array.from(libs)[0].split(',').map(Number);
                if (validMoves[lx][ly] && !wouldBeSuicide(board, lx, ly)) {
                  ns.print(`[DEFENSE] Saving group at [${lx}, ${ly}]`);
                  x_move = lx; y_move = ly;
                  break;
                }
              }
            }
          }
          if (x_move !== undefined) break;
        }
      }





      // 4. STRATEGIC EXPANSION (V6.0 Influence-based)
      if (x_move === undefined) {
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
          x_move = potentialMoves[0].x;
          y_move = potentialMoves[0].y;
          ns.print(`[STRATEGIC] Best move at [${x_move}, ${y_move}] (score: ${potentialMoves[0].score.toFixed(1)})`);
        }
      }

      // Execute move
      let result;
      if (x_move === undefined) {
        result = await ns.go.passTurn();
      } else {
        result = await ns.go.makeMove(x_move, y_move);
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