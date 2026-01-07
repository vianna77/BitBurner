/**
 * VERSION: 1.0.0
 * PROGRAM PURCHASER
 *
 * DESCRIPTION:
 * Purchases a specified program using Singularity API and reports result via port.
 *
 * PORT USAGE:
 * - Port 1: Writes "SUCCESS" or "FAILED" based on purchase result
 *
 * USAGE:
 * run buy-program.js [programName]
 */

/** @param {NS} ns */
export async function main(ns) {
  const [program] = ns.args;
  const success = ns.singularity.purchaseProgram(program);
  ns.writePort(1, success ? "SUCCESS" : "FAILED");
}
