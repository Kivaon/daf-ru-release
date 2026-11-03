// Pure helpers for ordering words read from the Vilna PDF text layer.

// pdf.js returns real-Hebrew items in logical (right-to-left) order, so the first
// token of such an item stands at its right edge. Glyph-coded items arrive in
// visual (left-to-right) order and keep their natural offsets.
export function tokenLeft(left:number,width:number,textLength:number,index:number,tokenLength:number,logicalRtl:boolean){
  return logicalRtl?left+width*(1-(index+tokenLength)/textLength):left+width*(index/textLength);
}

// Group words into visual rows by baseline (a bold lead-in word sits about a point
// off its line and must not fall into a neighbouring row), then read each row right
// to left. `line` becomes the row number so one row is drawn as one highlight.
