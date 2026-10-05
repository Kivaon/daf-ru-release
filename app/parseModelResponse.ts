/**
 * Keep valid JSON byte-for-byte on the standard path. On failure, accept paired
 * smart delimiters, preserving balanced smart quotations inside those strings.
 * ASCII-delimited strings and JSON escapes are copied unchanged. Malformed or
 * unmatched quotes are rejected rather than guessing at missing delimiters.
 */
export function parseModelResponse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    let mode: "outside" | "ascii" | "smart" = "outside";
    let depth = 0;
    let recovered = "";
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (mode !== "outside" && char === "\\") {
        recovered += char + (text[++i] ?? "");
        continue;
      }
      if (mode === "outside") {
        if (char === '"') mode = "ascii";
        if (char === "“") {
          mode = "smart";
          recovered += '"';
          continue;
        }
      } else if (mode === "ascii") {
        if (char === '"') mode = "outside";
      } else {
        if (char === "“") depth++;
        if (char === "”") {
          if (depth > 0) depth--;
          else {
            mode = "outside";
            recovered += '"';
            continue;
          }
        }
      }
      recovered += char;
    }
    if (mode !== "outside" || depth !== 0) throw error;
    return JSON.parse(recovered);
  }
}

/** Suggest only a closing suffix, never complete a string, literal or missing value.
 * This is opt-in: the normal parser continues to reject truncated responses.
 */
export function suggestClosingBrackets(text: string): {text:string;suffix:string}|null {
  try { parseModelResponse(text); return null; } catch { /* inspect invalid JSON */ }
  const trimmed=text.trimEnd();
  if(!trimmed.trimStart().startsWith('{') || !/[\]}\"]$/.test(trimmed))return null;
  const stack:string[]=[];
  let quoted=false,escaped=false;
  for(const char of trimmed){
    if(quoted){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char==='"')quoted=false;continue;}
    if(char==='"'){quoted=true;continue;}
    if(char==='{'||char==='[')stack.push(char==='{'?'}':']');
    else if(char==='}'||char===']'){if(stack.pop()!==char)return null;}
  }
  if(quoted||escaped||!stack.length)return null;
  const suffix=stack.reverse().join(''),candidate=text+suffix;
  try { JSON.parse(candidate);return {text:candidate,suffix}; } catch { return null; }
}
