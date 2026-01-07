/**
 * VERSION: 1.0.0
 * GYM WORKOUT SCRIPT
 *
 * DESCRIPTION:
 * Starts gym workout for specified stat using Singularity API.
 *
 * USAGE:
 * run gym-workout.js [gymName] [stat] [focus]
 * - gymName: Name of the gym to workout at
 * - stat: Stat to train (strength, defense, dexterity, agility)
 * - focus: Optional boolean for focus mode (default: true)
 */

/** @param {NS} ns */
export async function main(ns) {
  const [gym, stat, focus = true] = ns.args;
  ns.singularity.gymWorkout(gym, stat, focus);
}
