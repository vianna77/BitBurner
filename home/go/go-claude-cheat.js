// VERSION 2.0.0
/**
 * IPvGO Cheat Bot - Advanced tactical AI with surgical cheat application
 * Requires BitNode 14.2 to use cheat API
 *
 * This bot combines the advanced standard play from `go-claude.js` with a
 * conservative, high-impact cheating strategy. Cheats are only used when
 * losing and the chance of success is very high, preventing costly failures.
 *
 * @param {NS} ns
 */
export async function main(ns) {
  ns.disableLog("ALL");

  const runningProcesses = ns.ps("home").filter(p =>
    p.filename === "go/go-claude-cheat.js" && p.pid !== ns.pid
  );

  if (runningProcesses.length > 0) {
    ns.tprint("❌ ERROR: go-claude-cheat.js is already running!");
    ns.tprint(`   Existing PID: ${runningProcesses[0].pid}`);
    return;
  }

  let opponent = ns.args[0];

  if (!opponent) {
    opponent = await ns.prompt("Choose opponent:", {
      type: "select",
      choices: [
        "No AI", "Netburners", "Slum Snakes", "The Black Hand",
        "Tetrads", "Daedalus", "Illuminati", "????????????"
      ]
    });

    if (!opponent) {
      ns.tprint("❌ Cancelled - No opponent selected.");
      return;
    }
  }

  // --- Core Bot Logic & Helper Functions ---

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

  function findAtariMove(board, validMoves, player) {
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        if (board[x][y] === player) {
          const libs = getLiberties(board, x, y, new Set());
          if (libs.size === 1) {
            const [lx, ly] = Array.from(libs)[0].split(',').map(Number);
            if (validMoves[lx][ly]) {
              return { x: lx, y: ly };
            }
          }
        }
      }
    }
    return undefined;
  }

  // --- Advanced Functions Transplanted from go-claude.js ---

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

  function wouldBeSuicide(board, x, y) {
    const testBoard = board.map(row => [...row]);
    testBoard[x][y] = 'X';

    const libs = getLiberties(testBoard, x, y);
    if (libs.size > 0) return false;

    const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5 && board[nx][ny] === 'O') {
        const enemyLibs = getLiberties(testBoard, nx, ny);
        if (enemyLibs.size === 0) return false;
      }
    }
    return true;
  }

  function evaluatePosition(board, x, y) {
    let score = 0;
    if (x === 2 && y === 2) score += 100;
    else if ((x === 1 || x === 3) && (y === 1 || y === 3)) score += 60;

    const reach = 2;
    for (let dx = -reach; dx <= reach; dx++) {
      for (let dy = -reach; dy <= reach; dy++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5) {
          const dist = Math.abs(dx) + Math.abs(dy);
          if (dist === 0) continue;

          if (board[nx][ny] === 'X') score += (40 / dist);
          else if (board[nx][ny] === 'O') score += (50 / dist);
          else score += (10 / dist);
        }
      }
    }
    return score;
  }

  function findBestMoves(board, validMoves, count = 1) {
    let potentialMoves = [];
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        if (validMoves[x][y] && !isEye(board, x, y, 'X') && !wouldBeSuicide(board, x, y)) {
          const score = evaluatePosition(board, x, y);
          potentialMoves.push({ x, y, score });
        }
      }
    }
    potentialMoves.sort((a, b) => b.score - a.score);
    return potentialMoves.slice(0, count);
  }

  // --- Cheat-Specific Helper Functions ---

  function findEnemyToRemove(board, maxLibs = 1) {
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        if (board[x][y] === 'O') {
          const libs = getLiberties(board, x, y, new Set());
          if (libs.size > 0 && libs.size <= maxLibs) {
            return { x, y, libs: libs.size };
          }
        }
      }
    }
    return null;
  }

  function findBestTwoMoves(board, validMoves) {
    const copyBoard = (b) => b.map(row => [...row]);
    const copyValidMoves = (m) => JSON.parse(JSON.stringify(m));

    // Strategy 1: Capture + Best Positional
    const captureMove = findAtariMove(board, validMoves, 'O');
    if (captureMove && !wouldBeSuicide(board, captureMove.x, captureMove.y)) {
      const tempValidMoves = copyValidMoves(validMoves);
      tempValidMoves[captureMove.x][captureMove.y] = false;
      const secondMoves = findBestMoves(board, tempValidMoves, 1);
      if (secondMoves.length > 0) {
        ns.print("🎯 Cheat Strategy 1: Immediate Capture + Positional");
        return [captureMove, secondMoves[0]];
      }
    }

    // Strategy 2: Atari Setup + Capture
    for (let x1 = 0; x1 < 5; x1++) {
      for (let y1 = 0; y1 < 5; y1++) {
        if (!validMoves[x1][y1] || wouldBeSuicide(board, x1, y1)) continue;

        const tempBoard = copyBoard(board);
        tempBoard[x1][y1] = 'X';
        const tempValidMoves = copyValidMoves(validMoves);
        tempValidMoves[x1][y1] = false;

        const setupCaptureMove = findAtariMove(tempBoard, tempValidMoves, 'O');
        if (setupCaptureMove && !wouldBeSuicide(tempBoard, setupCaptureMove.x, setupCaptureMove.y)) {
          ns.print("🎯 Cheat Strategy 2: Atari Setup + Capture");
          return [{ x: x1, y: y1 }, setupCaptureMove];
        }
      }
    }

    // Strategy 3: Best Positional + re-evaluate
    const firstMoves = findBestMoves(board, validMoves, 1);
    if (firstMoves.length > 0) {
      const firstMove = firstMoves[0];
      const tempBoard = copyBoard(board);
      tempBoard[firstMove.x][firstMove.y] = 'X';
      const tempValidMoves = copyValidMoves(validMoves);
      tempValidMoves[firstMove.x][firstMove.y] = false;

      const postPositionalCapture = findAtariMove(tempBoard, tempValidMoves, 'O');
      if (postPositionalCapture && !wouldBeSuicide(tempBoard, postPositionalCapture.x, postPositionalCapture.y)) {
        ns.print("🎯 Cheat Strategy 3a: Positional + Surprise Capture");
        return [firstMove, postPositionalCapture];
      }

      const secondMoves = findBestMoves(tempBoard, tempValidMoves, 1);
      if (secondMoves.length > 0) {
        ns.print("🎯 Cheat Strategy 3b: Double Positional");
        return [firstMove, secondMoves[0]];
      }
    }

    ns.print("🎯 Cheat Strategy F: Fallback (two best moves)");
    return findBestMoves(board, validMoves, 2);
  }


  // --- Main Game Loop ---

  let totalWins = 0;
  let totalLosses = 0;
  const startTime = Date.now();

  ns.print(`🔪 Starting Advanced Cheat Bot against ${opponent}...`);

  while (true) {
    ns.print("--- New game started ---");
    ns.go.resetBoardState(opponent, 5);
    let gameOver = false;
    let moveCount = 0;

    let result = await ns.go.makeMove(2, 2);
    if (result?.type === "gameOver") gameOver = true;
    moveCount++;

    while (!gameOver) {
      const board = ns.go.getBoardState();
      const validMoves = ns.go.analysis.getValidMoves();
      const cheatCount = ns.go.cheat.getCheatCount();
      const cheatChance = ns.go.cheat.getCheatSuccessChance();
      const gameState = ns.go.getGameState();
      const isLosing = gameState.blackScore < gameState.whiteScore;

      let usedCheat = false;

      // Revised Cheat Strategy: Use cheats only when losing & chance is high
      if (isLosing && cheatChance > 0.9 && moveCount > 3) {
        // Cheat 1: Use removeRouter for critical defense
        if (cheatCount === 0) {
          const target = findEnemyToRemove(board, 1); // Groups with exactly 1 liberty
          if (target) {
            ns.print(`🔪 [CRITICAL CHEAT] Removing enemy @ [${target.x}, ${target.y}] to save group! (${(cheatChance * 100).toFixed(0)}% chance)`);
            result = await ns.go.cheat.removeRouter(target.x, target.y);
            usedCheat = true;
          }
        }

        // Cheat 2: Play two moves for a comeback
        if (!usedCheat && cheatCount === 1 && moveCount > 5) {
          const bestMoves = findBestTwoMoves(board, validMoves);
          if (bestMoves.length === 2) {
            ns.print(`🔪 [COMEBACK CHEAT] Playing two moves: [${bestMoves[0].x},${bestMoves[0].y}] + [${bestMoves[1].x},${bestMoves[1].y}] (${(cheatChance * 100).toFixed(0)}% chance)`);
            result = await ns.go.cheat.playTwoMoves(
              bestMoves[0].x, bestMoves[0].y,
              bestMoves[1].x, bestMoves[1].y
            );
            usedCheat = true;
          }
        }
      }

      // Advanced Normal Move Logic
      if (!usedCheat) {
        let x_move, y_move;

        // 1. ATARI CAPTURE (Highest Priority)
        const captureMove = findAtariMove(board, validMoves, 'O');
        if (captureMove && !wouldBeSuicide(board, captureMove.x, captureMove.y)) {
          ns.print(`[ATARI CAPTURE] Capturing at [${captureMove.x}, ${captureMove.y}]!`);
          x_move = captureMove.x;
          y_move = captureMove.y;
        }

        // 2. SELF-DEFENSE (Save own groups)
        if (x_move === undefined) {
          const saveMove = findAtariMove(board, validMoves, 'X');
          if (saveMove && !wouldBeSuicide(board, saveMove.x, saveMove.y)) {
            ns.print(`[DEFENSE] Saving group at [${saveMove.x}, ${saveMove.y}]`);
            x_move = saveMove.x;
            y_move = saveMove.y;
          }
        }

        // 3. STRATEGIC EXPANSION (Influence-based)
        if (x_move === undefined) {
          const best = findBestMoves(board, validMoves, 1)[0];
          if (best) {
            x_move = best.x;
            y_move = best.y;
            ns.print(`[STRATEGIC] Best move at [${x_move}, ${y_move}] (score: ${best.score.toFixed(1)})`);
          }
        }

        // Execute move
        if (x_move === undefined) {
          result = await ns.go.passTurn();
        } else {
          result = await ns.go.makeMove(x_move, y_move);
        }
      }

      moveCount++;

      if (result?.type === "gameOver") {
        gameOver = true;
      } else if (result?.type === "pass") {
        const currentGameState = ns.go.getGameState();
        if (currentGameState.blackScore > currentGameState.whiteScore) {
          result = await ns.go.passTurn();
          if (result?.type === "gameOver") gameOver = true;
        }
      }
    }

    const finalGameState = ns.go.getGameState();
    const blackScore = finalGameState.blackScore;
    const whiteScore = finalGameState.whiteScore;

    if (blackScore > whiteScore) totalWins++;
    else totalLosses++;

    const totalMatches = totalWins + totalLosses;
    const elapsedSec = (Date.now() - startTime) / 1000;
    const avgDuration = (elapsedSec / totalMatches).toFixed(2);
    const wlRatio = totalLosses === 0 ? totalWins.toFixed(2) : (totalWins / totalLosses).toFixed(2);

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
