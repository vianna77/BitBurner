/** @param {NS} ns */
export async function main(ns) {
  const [university, course, focus = true] = ns.args;
  ns.singularity.universityCourse(university, course, focus);
}