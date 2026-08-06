// Standard 75-ball bingo: columns B(1-15) I(16-30) N(31-45) G(46-60) O(61-75)
// 5x5 card, center is FREE (0 = free space, always considered "marked").

const COLUMN_RANGES = [
  [1, 15],   // B
  [16, 30],  // I
  [31, 45],  // N
  [46, 60],  // G
  [61, 75],  // O
];

function pickUnique(min, max, count) {
  const pool = [];
  for (let n = min; n <= max; n++) pool.push(n);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function generateCard() {
  // grid[row][col], col-major fill since bingo columns are B/I/N/G/O
  const columns = COLUMN_RANGES.map(([min, max]) => pickUnique(min, max, 5));
  const grid = [[], [], [], [], []];
  for (let col = 0; col < 5; col++) {
    for (let row = 0; row < 5; row++) {
      grid[row][col] = columns[col][row];
    }
  }
  grid[2][2] = 0; // free space (N column, middle row)
  return grid;
}

function generateCards(count) {
  const cards = [];
  for (let i = 0; i < count; i++) cards.push(generateCard());
  return cards;
}

function isMarked(value, calledSet) {
  return value === 0 || calledSet.has(value);
}

// Returns the name of the first matching win pattern, or null if none.
function checkWin(grid, calledNumbers) {
  const calledSet = new Set(calledNumbers);

  // Rows
  for (let r = 0; r < 5; r++) {
    if (grid[r].every((v) => isMarked(v, calledSet))) return 'row';
  }

  // Columns
  for (let c = 0; c < 5; c++) {
    let ok = true;
    for (let r = 0; r < 5; r++) if (!isMarked(grid[r][c], calledSet)) ok = false;
    if (ok) return 'column';
  }

  // Diagonals
  let diag1 = true, diag2 = true;
  for (let i = 0; i < 5; i++) {
    if (!isMarked(grid[i][i], calledSet)) diag1 = false;
    if (!isMarked(grid[i][4 - i], calledSet)) diag2 = false;
  }
  if (diag1 || diag2) return 'diagonal';

  // Four corners
  const corners = [grid[0][0], grid[0][4], grid[4][0], grid[4][4]];
  if (corners.every((v) => isMarked(v, calledSet))) return 'corners';

  // X shape (both diagonals)
  if (diag1 && diag2) return 'x_shape';

  // Full card (blackout)
  const full = grid.every((row) => row.every((v) => isMarked(v, calledSet)));
  if (full) return 'full_house';

  return null;
}

module.exports = { generateCard, generateCards, checkWin, isMarked };
