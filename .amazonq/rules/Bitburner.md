# Bitburner Development Rules

## Project Context
All code development here is focused on the Bitburner game and its JavaScript-based development API.

## Code Development Rules

### 1. Scope Limitation
- **Do not modify unrelated code**: Never touch functions, logic, or optimizations that are not specifically requested
- **Maintain original formatting**: Do not alter indentation, spacing, or visual style of original code (unless specifically requested, like the 2-space indentation rule)

### 2. Code Preservation
- **Keep existing logs**: Logs already in the script must be maintained as-is, unless the request is specifically to improve bug identification
- **Always show complete script**: Never send only modified snippets; the result must be the entire code ready to copy

### 3. Code Style Standards
- **Use braces {} everywhere**: Expand all `if` and `else` statements using braces (no single-line commands without blocks)
- **Indentation**: Always use 2 spaces for indentation

### 4. Version Control
- **All scripts must be versioned**: Every script must have a VERSION comment at the beginning
- **Version format**: Use semantic versioning X.Y.Z in comments
- **Version increments**:
  - New feature: increment first number (X)
  - Major bug fix: increment middle number (Y)
  - Small adjustment: increment last number (Z)
- **Default version**: If no version exists, start with 1.0.0

### 5. API Compliance
- **Do not invent code**: Never create fictional methods or functions for the game
- **Use only official API**: The game follows a specific API - if unsure about methods, ask for the Bitburner API documentation
- **Ask for documentation**: When in doubt about available methods, request the API file instead of guessing
- **Official API Reference**: https://github.com/bitburner-official/bitburner-src/blob/stable/markdown/bitburner.ns.md

## Documentation Rules

### 6. Script Language Requirements
- **English only in scripts**: All text inside scripts (logs, messages, variables) must be in English
- **No Portuguese comments/logs**: Prohibited to include any explanations or logs in Portuguese within the code
- **Emojis welcome**: Emojis are encouraged in script logs to help with visualization

### 7. Response Language
- **Respond in user's language**: Always respond in the language used in the prompt (Portuguese in this case)
- **Code follows English rule**: Keep code under the English-only rules above

### 8. Emoji Usage Standards
- **❌ Error messages**: Use for critical errors, crashes, or blocking issues
- **✅ Success messages**: Use for successful operations, completions, or positive outcomes
- **🟡 Warnings & attention**: Use for warnings, degraded states, or "pay attention" messages
- **🔶 Failed operations**: Use for failed attempts that didn't crash - unsuccessful but recoverable
- **🏋️ Gym training**: Use for sleeve gym training activities
- **🔪 Crime activities**: Use for sleeve crime assignments
- **🤖 Sleeves**: Use for referencing sleeves or sleeve-related operations

### 9. Port Communication Documentation
- **Document port usage**: If the code uses writePort or readPort, add comments at the beginning of the file explaining:
  - Which port numbers are used
  - What values/formats are passed through each port
  - How the ports are used in the communication flow

### 10. External File Usage Documentation
- **Document exec dependencies**: If external files are used with exec(), add comments in the file header explaining:
  - Which external files are executed
  - The reason for using each external file
  - What functionality each external script provides