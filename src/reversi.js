const EMPTY = 0;
const BLACK = 1;
const WHITE = -1;
const SIZE = 8;

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

const POSITION_WEIGHTS = [
  120, -25, 18, 8, 8, 18, -25, 120,
  -25, -45, -5, -5, -5, -5, -45, -25,
  18, -5, 12, 3, 3, 12, -5, 18,
  8, -5, 3, 2, 2, 3, -5, 8,
  8, -5, 3, 2, 2, 3, -5, 8,
  18, -5, 12, 3, 3, 12, -5, 18,
  -25, -45, -5, -5, -5, -5, -45, -25,
  120, -25, 18, 8, 8, 18, -25, 120,
];

function initialBoard() {
  const board = Array(SIZE * SIZE).fill(EMPTY);
  board[3 * SIZE + 3] = WHITE;
  board[3 * SIZE + 4] = BLACK;
  board[4 * SIZE + 3] = BLACK;
  board[4 * SIZE + 4] = WHITE;
  return board;
}

function inside(row, column) {
  return row >= 0 && row < SIZE && column >= 0 && column < SIZE;
}

function flipsForMove(board, index, player) {
  if (board[index] !== EMPTY) return [];
  const row = Math.floor(index / SIZE);
  const column = index % SIZE;
  const flips = [];

  for (const [rowStep, columnStep] of DIRECTIONS) {
    const line = [];
    let nextRow = row + rowStep;
    let nextColumn = column + columnStep;

    while (inside(nextRow, nextColumn)) {
      const nextIndex = nextRow * SIZE + nextColumn;
      if (board[nextIndex] === -player) {
        line.push(nextIndex);
      } else {
        if (board[nextIndex] === player && line.length) flips.push(...line);
        break;
      }
      nextRow += rowStep;
      nextColumn += columnStep;
    }
  }
  return flips;
}

function legalMoves(board, player) {
  const moves = new Map();
  board.forEach((cell, index) => {
    if (cell !== EMPTY) return;
    const flips = flipsForMove(board, index, player);
    if (flips.length) moves.set(index, flips);
  });
  return moves;
}

function applyMove(board, index, player, flips) {
  const next = [...board];
  next[index] = player;
  flips.forEach((flipIndex) => {
    next[flipIndex] = player;
  });
  return next;
}

function evaluate(board) {
  let score = 0;
  let whiteCount = 0;
  let blackCount = 0;
  board.forEach((cell, index) => {
    if (cell === WHITE) {
      score += POSITION_WEIGHTS[index];
      whiteCount += 1;
    }
    if (cell === BLACK) {
      score -= POSITION_WEIGHTS[index];
      blackCount += 1;
    }
  });
  const mobility = legalMoves(board, WHITE).size - legalMoves(board, BLACK).size;
  return score + mobility * 6 + (whiteCount - blackCount) * 0.8;
}

function minimax(board, player, depth, alpha, beta, passed = false) {
  const moves = legalMoves(board, player);
  if (depth === 0) return { score: evaluate(board) };

  if (!moves.size) {
    if (passed || !legalMoves(board, -player).size) return { score: evaluate(board) };
    return minimax(board, -player, depth - 1, alpha, beta, true);
  }

  let bestMove = null;
  if (player === WHITE) {
    let bestScore = -Infinity;
    for (const [index, flips] of moves) {
      const result = minimax(applyMove(board, index, player, flips), BLACK, depth - 1, alpha, beta);
      if (result.score > bestScore) {
        bestScore = result.score;
        bestMove = index;
      }
      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) break;
    }
    return { score: bestScore, move: bestMove };
  }

  let bestScore = Infinity;
  for (const [index, flips] of moves) {
    const result = minimax(applyMove(board, index, player, flips), WHITE, depth - 1, alpha, beta);
    if (result.score < bestScore) {
      bestScore = result.score;
      bestMove = index;
    }
    beta = Math.min(beta, bestScore);
    if (beta <= alpha) break;
  }
  return { score: bestScore, move: bestMove };
}

export function renderReversi(root) {
  root.innerHTML = `
    <section class="game-shell reversi-shell">
      <div class="game-toolbar">
        <a class="back-link" href="#/">← 返回遊戲館</a>
      </div>
      <div class="game-panel reversi-panel">
        <div class="game-character-banner reversi-character-banner">
          <div class="game-character-art portrait-2" role="img" aria-label="諾瓦・布蘭雪"></div>
          <div>
            <span>黑白棋沙龍的首席策士</span>
            <strong>諾瓦・布蘭雪</strong>
            <q>勝負在落子以前，就已藏在你的眼神裡。</q>
          </div>
        </div>

        <div class="game-title-row">
          <div>
            <span class="chapter-label">CHAPTER III · 純白與漆黑的茶會</span>
            <h1>黑白棋 AI</h1>
            <p>你執黑先手。把諾瓦的白棋包圍起來，奪取更多棋盤領地。</p>
          </div>
          <div class="scoreboard" aria-label="黑白棋分數">
            <div class="score-box score-black"><span>你・黑棋</span><strong id="black-score">2</strong></div>
            <div class="score-box score-white"><span>諾瓦・白棋</span><strong id="white-score">2</strong></div>
          </div>
        </div>

        <div class="mine-controls">
          <button class="control-button primary" id="reversi-new-game" type="button">重新開始</button>
          <span class="turn-badge" id="turn-badge">你的回合</span>
        </div>

        <div class="reversi-board" id="reversi-board" role="grid" aria-label="8×8 黑白棋棋盤"></div>
        <p class="game-message" id="reversi-message" aria-live="polite">有光圈的位置可以落子</p>
      </div>

      <aside class="rules">
        <h2>怎麼玩</h2>
        點擊有光圈的格子落下黑棋。只要把對手棋子夾在你的兩顆棋子之間，
        中間的棋子就會翻成你的顏色。雙方都無法落子時，棋子較多者獲勝。
      </aside>
    </section>
  `;

  let board = initialBoard();
  let turn = BLACK;
  let thinking = false;
  let ended = false;
  let gameVersion = 0;

  const boardElement = root.querySelector("#reversi-board");
  const messageElement = root.querySelector("#reversi-message");
  const turnElement = root.querySelector("#turn-badge");
  const blackScoreElement = root.querySelector("#black-score");
  const whiteScoreElement = root.querySelector("#white-score");

  function scores() {
    return {
      black: board.filter((cell) => cell === BLACK).length,
      white: board.filter((cell) => cell === WHITE).length,
    };
  }

  function finishGame() {
    ended = true;
    thinking = false;
    const { black, white } = scores();
    turnElement.textContent = "對局結束";
    if (black > white) {
      messageElement.textContent = `你以 ${black}：${white} 戰勝諾瓦！`;
    } else if (white > black) {
      messageElement.textContent = `諾瓦以 ${white}：${black} 獲勝，再向她挑戰吧。`;
    } else {
      messageElement.textContent = `雙方 ${black}：${white}，這是一場優雅的和局。`;
    }
    draw();
  }

  function advanceTurn(nextTurn) {
    if (ended) return;
    const nextMoves = legalMoves(board, nextTurn);
    if (!nextMoves.size) {
      const otherMoves = legalMoves(board, -nextTurn);
      if (!otherMoves.size) {
        finishGame();
        return;
      }
      turn = -nextTurn;
      messageElement.textContent = nextTurn === BLACK
        ? "你沒有合法步，這回合由諾瓦繼續。"
        : "諾瓦沒有合法步，輪到你繼續。";
    } else {
      turn = nextTurn;
    }
    draw();
    if (turn === WHITE) scheduleAiMove();
  }

  function scheduleAiMove() {
    if (thinking || ended) return;
    thinking = true;
    turnElement.textContent = "諾瓦思考中…";
    messageElement.textContent = "她正端詳棋盤，尋找你的破綻。";
    const scheduledVersion = gameVersion;

    window.setTimeout(() => {
      if (scheduledVersion !== gameVersion || ended) return;
      const moves = legalMoves(board, WHITE);
      if (!moves.size) {
        thinking = false;
        advanceTurn(BLACK);
        return;
      }
      const depth = board.filter((cell) => cell === EMPTY).length < 14 ? 6 : 4;
      const choice = minimax(board, WHITE, depth, -Infinity, Infinity).move;
      const move = choice ?? moves.keys().next().value;
      board = applyMove(board, move, WHITE, moves.get(move));
      thinking = false;
      messageElement.textContent = "諾瓦已經落子，輪到你了。";
      advanceTurn(BLACK);
    }, 520);
  }

  function play(index) {
    if (ended || thinking || turn !== BLACK) return;
    const moves = legalMoves(board, BLACK);
    if (!moves.has(index)) return;
    board = applyMove(board, index, BLACK, moves.get(index));
    messageElement.textContent = "漂亮的一手。現在輪到諾瓦。";
    advanceTurn(WHITE);
  }

  function draw() {
    const moves = !ended && !thinking && turn === BLACK ? legalMoves(board, BLACK) : new Map();
    const { black, white } = scores();
    blackScoreElement.textContent = black;
    whiteScoreElement.textContent = white;
    if (!ended && !thinking) turnElement.textContent = turn === BLACK ? "你的回合" : "諾瓦的回合";

    boardElement.innerHTML = board.map((cell, index) => {
      const row = Math.floor(index / SIZE) + 1;
      const column = (index % SIZE) + 1;
      const legal = moves.has(index);
      const piece = cell === EMPTY
        ? ""
        : `<span class="reversi-piece ${cell === BLACK ? "black-piece" : "white-piece"}" aria-hidden="true"></span>`;
      const label = cell === BLACK
        ? `第 ${row} 列第 ${column} 欄，黑棋`
        : cell === WHITE
          ? `第 ${row} 列第 ${column} 欄，白棋`
          : legal
            ? `第 ${row} 列第 ${column} 欄，可以落子`
            : `第 ${row} 列第 ${column} 欄，空格`;
      return `<button
        class="reversi-cell ${legal ? "legal-move" : ""}"
        data-index="${index}"
        role="gridcell"
        aria-label="${label}"
        ${legal ? "" : "disabled"}
        type="button"
      >${piece}</button>`;
    }).join("");
  }

  function reset() {
    gameVersion += 1;
    board = initialBoard();
    turn = BLACK;
    thinking = false;
    ended = false;
    messageElement.textContent = "有光圈的位置可以落子";
    draw();
  }

  boardElement.addEventListener("click", (event) => {
    const cell = event.target.closest(".reversi-cell");
    if (cell) play(Number(cell.dataset.index));
  });

  root.querySelector("#reversi-new-game").addEventListener("click", reset);
  draw();
}
