/** * Gang Task Dispatcher - V1.1.0
 * Opens a popup to select a task and applies it to all members.
 * @param {NS} ns
 */
export async function main(ns) {
  // 1. Check if you are in a gang
  if (!ns.gang.inGang()) {
    ns.tprint("❌ Error: You are not in a gang.");
    return;
  }

  // 2. Retrieve all available tasks for your gang type
  const availableTasks = ns.gang.getTaskNames();

  // Add "Ascend All Members" as a special option
  availableTasks.push("🔄 Ascend All Members");

  // 3. Open the selection popup
  const selectedTask = await ns.prompt("Select the task for ALL members:", {
    type: "select",
    choices: availableTasks
  });

  // 4. Exit if the user closes the popup or selects nothing
  if (!selectedTask) {
    ns.tprint("🟡 Operation cancelled.");
    return;
  }

  // 5. Handle Ascend All Members action
  if (selectedTask === "🔄 Ascend All Members") {
    const members = ns.gang.getMemberNames();
    let ascendedCount = 0;

    for (const member of members) {
      const result = ns.gang.getAscensionResult(member);
      if (result && ns.gang.ascendMember(member)) {
        ascendedCount++;
        ns.print(`✨ ${member} ascended (H:${result.hack?.toFixed(2)})`);
      }
    }

    ns.tprint(`✅ Ascension complete! ${ascendedCount}/${members.length} members ascended.`);
    ns.toast(`${ascendedCount} members ascended`, "success");
    return;
  }

  // 6. Apply the task to all members
  const members = ns.gang.getMemberNames();
  let count = 0;

  for (const member of members) {
    if (ns.gang.setMemberTask(member, selectedTask)) {
      count++;
    }
  }

  // 7. Provide feedback in terminal and toast
  ns.tprint(`✅ Success! ${count} members are now performing: ${selectedTask}`);
  ns.toast(`${count} members assigned to ${selectedTask}`, "success");
}
