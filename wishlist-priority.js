// Include labels saved by earlier versions of the wishlist form.
const ranks = new Map([
  ["top wish", 0], ["must have", 0], ["high", 0],
  ["really want", 1],
  ["would love", 2], ["medium", 2],
  ["nice to have", 3], ["low", 3]
]);

export function priorityRank(value) {
  return ranks.get(String(value ?? "").trim().toLowerCase()) ?? 4;
}
