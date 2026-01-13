# Amazon Q Behavior Rules

## Code Modification Protocol

### CRITICAL RULE: Always Ask Before Modifying
- **NEVER modify code without explicit user approval**
- When user reports an error or issue, FIRST explain what the problem is and propose a solution
- WAIT for user confirmation before making any changes
- Only modify code after user explicitly says to proceed

### Response Protocol
1. **User asks a question** → Answer the question, do NOT modify code
2. **User reports an error** → Explain the problem and propose solution, do NOT modify code
3. **User requests a change** → Explain what will be changed and ask for confirmation
4. **User confirms** → THEN and ONLY THEN modify the code

### Examples

**WRONG Behavior:**
```
User: "I'm getting an error with stock symbols"
Q: *immediately modifies code*
```

**CORRECT Behavior:**
```
User: "I'm getting an error with stock symbols"
Q: "The error shows the symbol is corrupted with HTML entities. 
    I can fix this by adding sanitization on line 117.
    Should I proceed with this change?"
User: "Yes"
Q: *modifies code*
```

## Summary
- Explain first
- Ask permission
- Wait for confirmation
- Then modify
