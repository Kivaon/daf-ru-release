const sheetNumber = (key: string) => parseInt(key) * 2 + (key.endsWith("b") ? 1 : 0);
export const sheetLabel = (key: string) => key.replace(/a$/, "а").replace(/b$/, "б");

// Where the beginning of a comment that is printed on this sheet but belongs to another one lies:
// "on the previous / next sheet" for the neighbours, "on sheet 46б" for any other.
export function beginningPlace(commentSheet: string, currentSheet: string) {
  const away = sheetNumber(commentSheet) - sheetNumber(currentSheet);
  if (away === -1) return "на предыдущем листе";
  if (away === 1) return "на следующем листе";
  return `на листе ${sheetLabel(commentSheet)}`;
}
