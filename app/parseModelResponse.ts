/**
 * Keep valid JSON byte-for-byte on the standard path. On failure, accept context-delimited
 * smart strings, preserving balanced smart quotations inside those strings.
 * ASCII-delimited strings and JSON escapes are copied unchanged. Malformed or
 * unmatched quotes are rejected rather than guessing at missing delimiters.
 */
export function parseModelResponse(text: string, onRecovered?: (text:string)=>void): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    const recovered=recoverResponseSyntax(text);
    const value=JSON.parse(recovered);
    onRecovered?.(recovered);
    return value;
  }
}

/** Normalize only response framing and syntax outside quoted text. */
export function recoverResponseSyntax(input:string):string {
    let text=input.replace(/^\uFEFF/, '');
    const fence=text.trim().match(/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i);
    if(fence && !fence[1].includes('```')) text=fence[1];
    // copy artefacts of some chat pages: a "\" at the end of a line after a structural character
    // and space entities (&#x20;, &nbsp;) at the start of a line; only the framing is touched
    text=text
      .replace(/([{\[,\]}"])[ \t]*\\[ \t]*(\r?\n)/g, "$1$2")
      .replace(/^([ \t]*)((?:&#x20;|&#32;|&nbsp;|&#160;|&#xA0;)+)/gim, (_m, lead: string, ents: string) => lead + " ".repeat((ents.match(/&/g) || []).length));
    let mode: "outside" | "ascii" | "smart" = "outside";
    // typographic quotations inside a token: „…“ and „…” (Russian and Polish, opened low), “…” (opened high)
    const inner: string[] = [];
    let recovered = "";
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (mode !== "outside" && char === "\\") {
        recovered += char + (text[++i] ?? "");
        continue;
      }
      if (mode === "outside") {
        if (/[^\S\r\n\t ]/u.test(char)) { recovered += " "; continue; }
        if (char === '"') mode = "ascii";
        if (char === "“" || char === "”") {
          mode = "smart";
          recovered += '"';
          continue;
        }
      } else if (mode === "ascii") {
        if (char === '"') mode = "outside";
      } else if (char === "“" || char === "”" || char === "„") {
        // Either smart glyph may close a JSON token, but only at a JSON
        // boundary. Typographic quotations inside the token remain text.
        const following=text.slice(i+1).match(/^\s*(.)/)?.[1];
        const boundary=following===undefined||':,}]'.includes(following);
        if (char === "„") inner.push("„");
        else if (inner.at(-1) === "„") inner.pop();
        else if (!inner.length && boundary) { mode="outside";recovered+='"';continue; }
        else if (char === "“") inner.push("“");
        else if (inner.length) inner.pop();
      }
      recovered += char;
    }
    if (mode !== "outside" || inner.length) throw new SyntaxError("Unclosed quotation");
    return recovered;
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
