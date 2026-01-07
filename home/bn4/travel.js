/**
 * VERSION: 1.0.0
 * TRAVEL SCRIPT
 *
 * DESCRIPTION:
 * Travels to specified city using Singularity API and reports result via port.
 *
 * PORT USAGE:
 * - Port 1: Writes "SUCCESS" or "FAILED" based on travel result
 *
 * USAGE:
 * run travel.js [cityName]
 * - cityName: Name of the city to travel to
 */

/** @param {NS} ns */
export async function main(ns) {
  const [city] = ns.args;
  const success = ns.singularity.travelToCity(city);
  ns.writePort(1, success ? "SUCCESS" : "FAILED");
}
