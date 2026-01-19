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
    ns.tprint("!!! ERROR: No input data provided. !!!");
    return;
  }

  let input = ns.args[0];

  try {
    if (typeof input === "string" && (input.startsWith("[") || input.startsWith("\""))) {
      const parsed = JSON.parse(input);
      input = Array.isArray(parsed) ? parsed[0] : parsed;
    }

    const result = solveLZCompression(input);
    ns.writePort(111, result);
    ns.tprint(`Input:  ${input}`);
    ns.tprint(`Result: ${result}`);
  } catch (e) {
    ns.tprint("!!! ERROR: Failed to process input. !!!");
    ns.tprint(`!!! Exception: ${e.toString()}`);
  }
}

/** @param {string} s */
function solveLZCompression(s) {
  const n = s.length;
  // dp[i][state] stores the shortest encoded string to compress first i characters
  // state 0: Next chunk must be Type 1 (Literal)
  // state 1: Next chunk must be Type 2 (Reference)
  const dp = Array.from({ length: n + 1 }, () => {
    return [null, null];
  });

  dp[0][0] = "";

  for (let i = 0; i <= n; i++) {
    // Handle state transitions with length 0 (alternating types without consuming)
    for (let j = 0; j < 2; j++) {
      if (dp[i][0] !== null) {
        const nextStr = dp[i][0] + "0";
        if (dp[i][1] === null || nextStr.length < dp[i][1].length) {
          dp[i][1] = nextStr;
        }
      }
      if (dp[i][1] !== null) {
        const nextStr = dp[i][1] + "0";
        if (dp[i][0] === null || nextStr.length < dp[i][0].length) {
          dp[i][0] = nextStr;
        }
      }
    }

    // Type 1: Literal (State 0)
    if (dp[i][0] !== null) {
      for (let L = 1; L <= 9 && i + L <= n; L++) {
        const nextStr = dp[i][0] + L + s.substring(i, i + L);
        if (dp[i + L][1] === null || nextStr.length < dp[i + L][1].length) {
          dp[i + L][1] = nextStr;
        }
      }
    }

    // Type 2: Reference (State 1)
    if (dp[i][1] !== null) {
      for (let L = 1; L <= 9 && i + L <= n; L++) {
        for (let X = 1; X <= 9 && X <= i; X++) {
          let match = true;
          for (let k = 0; k < L; k++) {
            if (s[i + k] !== s[i + k - X]) {
              match = false;
              break;
            }
          }
          if (match) {
            const nextStr = dp[i][1] + L + X;
            if (dp[i + L][0] === null || nextStr.length < dp[i + L][0].length) {
              dp[i + L][0] = nextStr;
            }
          }
        }
      }
    }
  }

  let candidates = [];
  if (dp[n][0] !== null) {
    candidates.push(dp[n][0]);
  }
  if (dp[n][1] !== null) {
    candidates.push(dp[n][1]);
  }

  if (candidates.length === 0) {
    return "";
  }

  return candidates.reduce((a, b) => {
    return a.length <= b.length ? a : b;
  });
}
