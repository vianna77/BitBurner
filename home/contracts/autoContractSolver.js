/**
 * CONTRACT AUTO-ATTEMPTER - v1.3.1
 * Porta de comunicação: 111
 * @param {NS} ns
 */
export async function main(ns) {
  const hostArg = ns.args[0];
  let targets = [];

  // Mapping of Contract Type to Solver Script
  const solverMapping = {
    "Algorithmic Stock Trader I": "/contracts/algorithmicStockTraderI.js",
    "Algorithmic Stock Trader II": "/contracts/algorithmicStockTraderII.js",
    "Algorithmic Stock Trader III": "/contracts/algorithmicStockTraderIII.js",
    "Algorithmic Stock Trader IV": "/contracts/algorithmicStockTraderIV.js",
    "Array Jumping Game": "/contracts/arrayJumpingGame.js",
    "Array Jumping Game II": "/contracts/arrayJumpingGameII.js",
    "Compression I: RLE Compression": "/contracts/compressionIRLECompression.js",
    "Compression II: LZ Decompression": "/contracts/compressionIILZDecompression.js",
    "Compression III: LZ Compression": "/contracts/compressionIIILZCompression.js",
    "Encryption I: Caesar Cipher": "/contracts/encryptionICaesarCipher.js",
    "Encryption II: Vigenère Cipher": "/contracts/encryptionIIVigenereCipher.js",
    "Find All Valid Math Expressions": "/contracts/findAllValidMathExpressions.js",
    "Find Largest Prime Factor": "/contracts/findLargestPrimeFactor.js",
    "Generate IP Addresses": "/contracts/generateIPAddresses.js",
    "HammingCodes: Integer to Encoded Binary": "/contracts/hammingCodesIntegerToEncodedBinary.js",
    "HammingCodes: Encoded Binary to Integer": "/contracts/hammingCodesEncodedBinaryToInteger.js",
    "Merge Overlapping Intervals": "/contracts/mergeOverlappingIntervals.js",
    "Minimum Path Sum in a Triangle": "/contracts/minimumPathSumInATriangle.js",
    "Proper 2-Coloring of a Graph": "/contracts/proper2ColoringOfAGraph.js",
    "Sanitize Parentheses in Expression": "/contracts/sanitizeParenthesesInExpression.js",
    "Shortest Path in a Grid": "/contracts/shortestPathInAGrid.js",
    "Square Root": "/contracts/squareRoot.js",
    "Spiralize Matrix": "/contracts/spiralizeMatrix.js",
    "Subarray with Maximum Sum": "/contracts/subarrayWithMaximumSum.js",
    "Total Ways to Sum": "/contracts/totalWaysToSumI.js",
    "Total Ways to Sum II": "/contracts/totalWaysToSumII.js",
    "Triangle Minimum Path Sum": "/contracts/modifiqueAqui",
    "Unique Paths in a Grid I": "/contracts/uniquePathsInAGridI.js",
    "Unique Paths in a Grid II": "/contracts/uniquePathsInAGridII.js"
  };

  if (!hostArg) {
    // Recursive scan to find all servers
    const visited = new Set();
    const stack = ["home"];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!visited.has(current)) {
        visited.add(current);
        targets.push(current);
        const neighbors = ns.scan(current);
        for (const neighbor of neighbors) {
          stack.push(neighbor);
        }
      }
    }
  } else {
    targets = [hostArg];
  }

  for (const host of targets) {
    const files = ns.ls(host, ".cct");

    if (files.length === 0) {
      if (hostArg) {
        ns.tprint(`📣 No contracts found on ${host}`);
      }
      continue;
    }

    for (const filename of files) {
      const type = ns.codingcontract.getContractType(filename, host);
      const solverScript = solverMapping[type];

      if (!solverScript || solverScript === "/contracts/modifiqueAqui") {
        ns.tprint(`📣 No solver configured for type: ${type} on ${host}`);
        continue;
      }

      if (!ns.fileExists(solverScript)) {
        ns.tprint(`📣 Solver script not found: ${solverScript}`);
        continue;
      }

      const data = ns.codingcontract.getData(filename, host);
      ns.tprint(`Attempting: ${type} on ${host} using ${solverScript}`);

      // Handle BigInt serialization issue by converting to string if necessary
      const payload = typeof data === "bigint" ? data.toString() : JSON.stringify(data);

      ns.clearPort(111);
      const pid = ns.run(solverScript, 1, payload);

      if (pid === 0) {
        ns.tprint(`❌ ERROR: Could not run solver script: ${solverScript}`);
        continue;
      }

      let answer = "NULL PORT DATA";
      let attempts = 0;

      while (answer === "NULL PORT DATA" && attempts < 100) {
        await ns.sleep(200);
        answer = ns.readPort(111);
        attempts++;
      }

      if (answer === "NULL PORT DATA") {
        ns.tprint(`❌ ERROR: Solver ${solverScript} timed out.`);
        continue;
      }

      const reward = ns.codingcontract.attempt(answer, filename, host);

      if (reward) {
        ns.tprint(`✅ SUCCESS! Reward: ${reward}`);
      } else {
        ns.tprint(`🛑 FAILED! The answer for ${filename} on ${host} was incorrect.`);
      }
    }
  }
}

/**
 * @param {import("..").AutocompleteData} data
 * @param {string[]} args
 */
export function autocomplete(data, args) {
  if (args.length === 1) {
    return [...data.servers];
  }
  return [];
}
