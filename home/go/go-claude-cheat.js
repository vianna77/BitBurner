// VERSION 1.0.0
/**
 * IPvGO Cheat Bot - Uses illicit moves strategically
 * Requires BitNode 14.2 to use cheat API
 * 
 * Cheat Moves Available:
 * - playTwoMoves: Place two routers at once
 * - removeRouter: Remove an existing router
 * - destroyNode: Destroy an empty node (creates dead space)
 * - repairOfflineNode: Repair an offline node
 * 
 * Warning: Failed cheats skip your turn and have ~10% chance of ejection after first attempt
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

  function getLiberties(board, x, y, visited = new Set()) {
    const key = `${x},${y}`;
    if (visited.has(key)) {
      return new Set();
    }
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
          for (const lib of groupLibs) {
            liberties.add(lib);
          }
        }
      }
    }
    return liberties;
  }

  function findBestTwoMoves(board, validMoves) {
    const moves = [];
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        if (validMoves[x][y]) {
          let score = 0;
          if (x === 2 && y === 2) {
            score = 100;
          } else if ((x === 1 || x === 3) && (y === 1 || y === 3)) {
            score = 60;
          } else {
            score = 30;
          }
          moves.push({ x, y, score });
        }
      }
    }
    moves.sort((a, b) => b.score - a.score);
    return moves.slice(0, 2);
  }

  function findEnemyToRemove(board) {
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        if (board[x][y] === 'O') {
          const libs = getLiberties(board, x, y, new Set());
          if (libs.size <= 2) {
            return { x, y, libs: libs.size };
          }
        }
      }
    }
    return null;
  }

  let totalWins = 0;
  let totalLosses = 0;
  const startTime = Date.now();

  ns.print(`🔪 Starting IPvGO Cheat Bot against ${opponent}...`);

  while (true) {
    ns.print("--- New game started ---");
    ns.go.resetBoardState(opponent, 5);
    let gameOver = false;
    let moveCount = 0;

    let result = await ns.go.makeMove(2, 2);
    if (result?.type === "gameOver") {
      gameOver = true;
    }
    moveCount++;

    while (!gameOver) {
      const board = ns.go.getBoardState();
      const validMoves = ns.go.analysis.getValidMoves();
      const cheatCount = ns.go.cheat.getCheatCount();
      const cheatChance = ns.go.cheat.getCheatSuccessChance();

      let usedCheat = false;

      // Strategy: Use cheats when success chance is high (>70%)
      if (cheatChance > 0.7) {
        // Cheat 1: Remove dangerous enemy router
        if (cheatCount === 0 && moveCount > 3) {
          const target = findEnemyToRemove(board);
          if (target && target.libs <= 2) {
            ns.print(`🔪 [CHEAT] Removing enemy router at [${target.x}, ${target.y}] (${target.libs} libs, ${(cheatChance * 100).toFixed(0)}% chance)`);
            result = await ns.go.cheat.removeRouter(target.x, target.y);
            usedCheat = true;
          }
        }

        // Cheat 2: Play two moves for aggressive expansion
        if (!usedCheat && cheatCount === 1 && moveCount > 5) {
          const bestMoves = findBestTwoMoves(board, validMoves);
          if (bestMoves.length === 2) {
            ns.print(`🔪 [CHEAT] Playing two moves: [${bestMoves[0].x},${bestMoves[0].y}] + [${bestMoves[1].x},${bestMoves[1].y}] (${(cheatChance * 100).toFixed(0)}% chance)`);
            result = await ns.go.cheat.playTwoMoves(
              bestMoves[0].x, bestMoves[0].y,
              bestMoves[1].x, bestMoves[1].y
            );
            usedCheat = true;
          }
        }
      }

      // Normal move if no cheat used
      if (!usedCheat) {
        let x_move = undefined;
        let y_move = undefined;

        // Capture enemy in atari
        for (let x = 0; x < 5; x++) {
          for (let y = 0; y < 5; y++) {
            if (board[x][y] === 'O') {
              const libs = getLiberties(board, x, y, new Set());
              if (libs.size === 1) {
                const [lx, ly] = Array.from(libs)[0].split(',').map(Number);
                if (validMoves[lx][ly]) {
                  x_move = lx;
                  y_move = ly;
                  break;
                }
              }
            }
          }
          if (x_move !== undefined) {
            break;
          }
        }

        // Defend own stones
        if (x_move === undefined) {
          for (let x = 0; x < 5; x++) {
            for (let y = 0; y < 5; y++) {
              if (board[x][y] === 'X') {
                const libs = getLiberties(board, x, y, new Set());
                if (libs.size === 1) {
                  const [lx, ly] = Array.from(libs)[0].split(',').map(Number);
                  if (validMoves[lx][ly]) {
                    x_move = lx;
                    y_move = ly;
                    break;
                  }
                }
              }
            }
            if (x_move !== undefined) {
              break;
            }
          }
        }

        // Strategic move
        if (x_move === undefined) {
          let bestScore = -1;
          for (let x = 0; x < 5; x++) {
            for (let y = 0; y < 5; y++) {
              if (validMoves[x][y]) {
                let score = 0;
                if (x === 2 && y === 2) {
                  score = 100;
                } else if ((x === 1 || x === 3) && (y === 1 || y === 3)) {
                  score = 60;
                } else {
                  score = 30;
                }
                if (score > bestScore) {
                  bestScore = score;
                  x_move = x;
                  y_move = y;
                }
              }
            }
          }
        }

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
        const gameState = ns.go.getGameState();
        if (gameState.blackScore > gameState.whiteScore) {
          result = await ns.go.passTurn();
          if (result?.type === "gameOver") {
            gameOver = true;
          }
        }
      }
    }

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

    if (totalMatches % 10 === 0) {
      if (blackScore > whiteScore) {
        ns.toast(`🔪 WIN - Match #${totalMatches} (${totalWins}W / ${totalLosses}L) ⏳ ${avgDuration}s/avg ⚖️ ${wlRatio} W/L`, "success", 7000);
      } else {
        ns.toast(`💀 LOSS - Match #${totalMatches} (${totalWins}W / ${totalLosses}L) ⏳ ${avgDuration}s/avg ⚖️ ${wlRatio} W/L`, "error", 7000);
      }
    }

    await ns.sleep(50);
  }
}
