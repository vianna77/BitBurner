/**
 * Compression III: LZ Compression
 *
 * Lempel-Ziv (LZ) compression is a data compression technique which encodes data using references
 * to earlier parts of the data. In this variant of LZ, data is encoded in two types of chunk.
 * Each chunk begins with a length L, encoded as a single ASCII digit from 1 to 9, followed by the chunk data,
 * which is either:
 *
 * 1. Exactly L characters, which are to be copied directly into the uncompressed data.
 * 2. A reference to an earlier part of the uncompressed data. To do this, the length is followed by a second
 * ASCII digit X: each of the L output characters is a copy of the character X places before it in the uncompressed data.
 *
 * For both chunk types, a length of 0 instead means the chunk ends immediately, and the next character is the start of a new chunk.
 * The two chunk types alternate, starting with type 1, and the final chunk may be of either type.
 *
 * @param {NS} ns
 */
export async function main(ns) {
  ns.tprint(`DEBUG: Param 0: ${ns.args[0]}`);

  if (ns.args.length === 0) {
    {
      ns.tprint("!!! ERROR: No input data provided. !!!");
      return;
    }
  }

  let input = ns.args[0];

  try {
    if (typeof input === "string" && (input.startsWith("[") || input.startsWith("\""))) {
      {
        const parsed = JSON.parse(input);
        input = Array.isArray(parsed) ? parsed[0] : parsed;
      }
    }

    const result = solveLZCompression(input);
    ns.writePort(111, result);
    ns.tprint(`Input:  ${input}`);
    ns.tprint(`Result: ${result}`);
  } catch (e) {
    {
      ns.tprint("!!! ERROR: Failed to process input. !!!");
      ns.tprint(`!!! Exception: ${e.toString()}`);
    }
  }
}

function solveLZCompression(s) {
  const n = s.length;
  // state 0: Literal, state 1: Reference
  const dp = Array.from({ length: n + 1 }, () => {
    return [null, null];
  });

  dp[0][0] = "";

  for (let i = 0; i <= n; i++) {
    {
      for (let state = 0; state < 2; state++) {
        {
          const currentPath = dp[i][state];
          if (currentPath === null) {
            {
              continue;
            }
          }

          if (state === 0) {
            {
              // Type 1: Literal
              for (let L = 1; L <= 9 && i + L <= n; L++) {
                {
                  const nextStr = currentPath + L + s.substring(i, i + L);
                  if (dp[i + L][1] === null || nextStr.length < dp[i + L][1].length) {
                    {
                      dp[i + L][1] = nextStr;
                    }
                  }
                }
              }
            }
          } else {
            {
              // Type 2: Reference
              for (let L = 1; L <= 9 && i + L <= n; L++) {
                {
                  for (let X = 1; X <= 9 && X <= i; X++) {
                    {
                      let match = true;
                      for (let k = 0; k < L; k++) {
                        {
                          if (s[i + k] !== s[i + k - X]) {
                            {
                              match = false;
                              break;
                            }
                          }
                        }
                      }
                      if (match) {
                        {
                          const nextStr = currentPath + L + X;
                          if (dp[i + L][0] === null || nextStr.length < dp[i + L][0].length) {
                            {
                              dp[i + L][0] = nextStr;
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          // Cross-state transition with '0'
          const nextState = 1 - state;
          const nextStrZero = currentPath + "0";
          if (dp[i][nextState] === null || nextStrZero.length < dp[i][nextState].length) {
            {
              dp[i][nextState] = nextStrZero;
            }
          }
        }
      }
    }
  }

  let candidates = [];
  if (dp[n][0] !== null) {
    {
      candidates.push(dp[n][0]);
    }
  }
  if (dp[n][1] !== null) {
    {
      candidates.push(dp[n][1]);
    }
  }

  return candidates.reduce((a, b) => {
    {
      return a.length <= b.length ? a : b;
    }
  });
}
