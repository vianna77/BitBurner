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
  // Debugging logs for parameter inspection
  ns.tprint(`DEBUG: Param 0: ${ns.args[0]}`);

  if (ns.args.length === 0) {
    {
      ns.tprint("!!! ERROR: No input data provided. !!!");
      return;
    }
  }

  let input = ns.args[0];

  try {
    // Handle input if passed as a stringified array or JSON string
    if (typeof input === "string" && (input.startsWith("[") || input.startsWith("\""))) {
      {
        const parsed = JSON.parse(input);
        input = Array.isArray(parsed) ? parsed[0] : parsed;
      }
    }

    const result = solveLZCompression(input);

    // Send result to communication port 111
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

/**
 * Solves LZ Compression using Dynamic Programming to find the minimum length.
 * @param {string} s The input string to compress.
 * @return {string} The compressed string.
 */
function solveLZCompression(s) {
  const n = s.length;
  // dp[i][state] stores the shortest compressed string for the first i characters
  // state 0: Next chunk must be Type 1 (Literal)
  // state 1: Next chunk must be Type 2 (Reference)
  const dp = Array.from({ length: n + 1 }, () => {
    return [null, null];
  });

  // Starting state: Type 1
  dp[0][0] = "";

  for (let i = 0; i <= n; i++) {
    {
      // We run multiple passes at the same index to allow state-switching (0 skip)
      for (let pass = 0; pass < 2; pass++) {
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
                  // Type 1: Literal (L characters)
                  for (let L = 1; L <= 9 && i + L <= n; L++) {
                    {
                      const nextStr = currentPath + L + s.substring(i, i + L);
                      updateDP(dp, i + L, 1, nextStr);
                    }
                  }
                  // Skip to Type 2
                  updateDP(dp, i, 1, currentPath + "0");
                }
              } else {
                {
                  // Type 2: Reference (L length, X distance)
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
                              updateDP(dp, i + L, 0, nextStr);
                            }
                          }
                        }
                      }
                    }
                  }
                  // Skip to Type 1
                  updateDP(dp, i, 0, currentPath + "0");
                }
              }
            }
          }
        }
      }
    }
  }

  let res0 = dp[n][0] || "";
  let res1 = dp[n][1] || "";

  // Helper to remove trailing "0" if the string ended with a state switch
  const cleanup = (str) => {
    {
      if (str.length > 0 && str.endsWith("0")) {
        {
          return str.slice(0, -1);
        }
      }
      return str;
    }
  };

  const final0 = cleanup(res0);
  const final1 = cleanup(res1);

  const candidates = [];
  if (final0 !== "") {
    {
      candidates.push(final0);
    }
  }
  if (final1 !== "") {
    {
      candidates.push(final1);
    }
  }

  if (candidates.length === 0) {
    {
      return "";
    }
  }

  // Return the shortest candidate
  return candidates.reduce((a, b) => {
    {
      return a.length <= b.length ? a : b;
    }
  });
}

/**
 * Updates the DP table only if the new path is shorter.
 */
function updateDP(dp, i, state, newStr) {
  if (dp[i][state] === null || newStr.length < dp[i][state].length) {
    {
      dp[i][state] = newStr;
    }
  }
}
