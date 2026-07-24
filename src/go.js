const SIZE = 9;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const KOMI = 6.5;

function createBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function boardHash(board) {
  return board.flat().join("");
}

function neighbors(row, column) {
  return [
    [row - 1, column],
    [row + 1, column],
    [row, column - 1],
    [row, column + 1],
  ].filter(([nextRow, nextColumn]) => nextRow >= 0 && nextRow < SIZE && nextColumn >= 0 && nextColumn < SIZE);
}

function groupAt(board, row, column) {
  const color = board[row][column];
  const stones = [];
  const liberties = new Set();
  const seen = new Set([`${row},${column}`]);
  const queue = [[row, column]];
  while (queue.length) {
    const [currentRow, currentColumn] = queue.shift();
    stones.push([currentRow, currentColumn]);
    neighbors(currentRow, currentColumn).forEach(([nextRow, nextColumn]) => {
      const value = board[nextRow][nextColumn];
      if (value === EMPTY) liberties.add(`${nextRow},${nextColumn}`);
      if (value === color && !seen.has(`${nextRow},${nextColumn}`)) {
        seen.add(`${nextRow},${nextColumn}`);
        queue.push([nextRow, nextColumn]);
      }
    });
  }
  return { stones, liberties };
}

function tryMove(board, row, column, color, forbiddenHash = "") {
  if (board[row][column] !== EMPTY) return { legal: false, reason: "這個交叉點已經有棋子" };
  const next = cloneBoard(board);
  next[row][column] = color;
  const opponent = color === BLACK ? WHITE : BLACK;
  let captured = 0;
  neighbors(row, column).forEach(([nextRow, nextColumn]) => {
    if (next[nextRow][nextColumn] !== opponent) return;
    const group = groupAt(next, nextRow, nextColumn);
    if (group.liberties.size === 0) {
      group.stones.forEach(([stoneRow, stoneColumn]) => {
        next[stoneRow][stoneColumn] = EMPTY;
        captured += 1;
      });
    }
  });
  if (groupAt(next, row, column).liberties.size === 0) {
    return { legal: false, reason: "這一步會讓自己的棋子沒有氣" };
  }
  if (boardHash(next) === forbiddenHash) {
    return { legal: false, reason: "劫爭不能立即回到上一個局面" };
  }
  return { legal: true, board: next, captured };
}

function scoreBoard(board) {
  let black = 0;
  let white = KOMI;
  const seen = new Set();
  for (let row = 0; row < SIZE; row += 1) {
    for (let column = 0; column < SIZE; column += 1) {
      if (board[row][column] === BLACK) black += 1;
      if (board[row][column] === WHITE) white += 1;
      if (board[row][column] !== EMPTY || seen.has(`${row},${column}`)) continue;
      const region = [];
      const borders = new Set();
      const queue = [[row, column]];
      seen.add(`${row},${column}`);
      while (queue.length) {
        const [currentRow, currentColumn] = queue.shift();
        region.push([currentRow, currentColumn]);
        neighbors(currentRow, currentColumn).forEach(([nextRow, nextColumn]) => {
          const value = board[nextRow][nextColumn];
          if (value === EMPTY && !seen.has(`${nextRow},${nextColumn}`)) {
            seen.add(`${nextRow},${nextColumn}`);
            queue.push([nextRow, nextColumn]);
          } else if (value !== EMPTY) {
            borders.add(value);
          }
        });
      }
      if (borders.size === 1 && borders.has(BLACK)) black += region.length;
      if (borders.size === 1 && borders.has(WHITE)) white += region.length;
    }
  }
  return { black, white };
}

export function renderGo(root) {
  root.innerHTML = `
    <section class="game-shell go-shell">
      <div class="game-toolbar"><a class="back-link" href="#/">← 返回遊戲廳</a></div>
      <div class="game-panel go-panel">
        <div class="game-character-banner go-character-banner">
          <div class="game-character-art portrait-5" role="img" aria-label="沈月衡，隱居竹庭的弈棋公子"></div>
          <div>
            <span>隱居竹庭的弈棋公子</span>
            <strong>沈月衡</strong>
            <q>棋盤方寸之間，足以容下整片星空。</q>
          </div>
        </div>
        <div class="game-title-row">
          <div>
            <span class="chapter-label">CHAPTER VI ✦ 月下棋譜</span>
            <h1>9×9 圍棋 AI</h1>
            <p>你執黑先行，與月衡的白棋在竹庭中靜靜交鋒。</p>
          </div>
          <div class="scoreboard go-scoreboard">
            <div class="score-box"><span>黑提子</span><strong id="go-black-captures">0</strong></div>
            <div class="score-box"><span>白提子</span><strong id="go-white-captures">0</strong></div>
            <div class="score-box"><span>回合</span><strong id="go-turn">黑</strong></div>
          </div>
        </div>

        <div class="go-game-layout">
          <div class="go-board-wrap">
            <div class="go-board" id="go-board" role="grid" aria-label="9×9 圍棋棋盤"></div>
          </div>
          <aside class="go-side">
            <div class="go-player-card is-active" id="go-player-black"><span class="go-mini-stone black"></span><div><strong>你・黑棋</strong><small>先行</small></div></div>
            <div class="go-player-card" id="go-player-white"><span class="go-mini-stone white"></span><div><strong>月衡・白棋</strong><small>AI</small></div></div>
            <button class="control-button primary" id="go-new" type="button">重新對局</button>
            <button class="control-button" id="go-pass" type="button">停一手</button>
            <p class="go-status" id="go-status" aria-live="polite">請在交叉點落下黑棋</p>
          </aside>
        </div>
      </div>
      <aside class="rules">
        <h2>如何玩</h2>
        <p>雙方輪流在交叉點落子；包圍對方使其沒有「氣」即可提子。禁止自殺落子與立即還原劫爭局面。</p>
        <p>你執黑、AI 執白。雙方連續停一手後，依棋子與圍住的空點計算面積；白棋貼 6.5 目。</p>
      </aside>
    </section>
  `;

  const boardElement = root.querySelector("#go-board");
  const statusElement = root.querySelector("#go-status");
  const turnElement = root.querySelector("#go-turn");
  const blackCapturesElement = root.querySelector("#go-black-captures");
  const whiteCapturesElement = root.querySelector("#go-white-captures");
  const blackPlayer = root.querySelector("#go-player-black");
  const whitePlayer = root.querySelector("#go-player-white");
  const passButton = root.querySelector("#go-pass");
  let board = createBoard();
  let previousHash = "";
  let blackCaptures = 0;
  let whiteCaptures = 0;
  let consecutivePasses = 0;
  let aiThinking = false;
  let ended = false;
  let aiTimer = null;

  function draw() {
    boardElement.innerHTML = board
      .flatMap((row, rowIndex) =>
        row.map((value, columnIndex) => {
          const star = [2, 4, 6].includes(rowIndex) && [2, 4, 6].includes(columnIndex);
          const label = value === BLACK ? "黑棋" : value === WHITE ? "白棋" : `第 ${rowIndex + 1} 路，第 ${columnIndex + 1} 列`;
          return `<button class="go-point ${star ? "star-point" : ""}" type="button" role="gridcell" data-row="${rowIndex}" data-column="${columnIndex}" aria-label="${label}" ${value !== EMPTY || aiThinking || ended ? "disabled" : ""}>
            ${value === BLACK ? '<span class="go-stone black"></span>' : value === WHITE ? '<span class="go-stone white"></span>' : ""}
          </button>`;
        }),
      )
      .join("");
    blackCapturesElement.textContent = blackCaptures;
    whiteCapturesElement.textContent = whiteCaptures;
    turnElement.textContent = aiThinking ? "白" : "黑";
    blackPlayer.classList.toggle("is-active", !aiThinking && !ended);
    whitePlayer.classList.toggle("is-active", aiThinking && !ended);
    passButton.disabled = aiThinking || ended;
  }

  function applyMove(row, column, color) {
    const result = tryMove(board, row, column, color, previousHash);
    if (!result.legal) return result;
    previousHash = boardHash(board);
    board = result.board;
    if (color === BLACK) blackCaptures += result.captured;
    else whiteCaptures += result.captured;
    consecutivePasses = 0;
    return result;
  }

  function legalMoves(color) {
    const moves = [];
    for (let row = 0; row < SIZE; row += 1) {
      for (let column = 0; column < SIZE; column += 1) {
        const result = tryMove(board, row, column, color, previousHash);
        if (result.legal) moves.push({ row, column, ...result });
      }
    }
    return moves;
  }

  function chooseAiMove() {
    const moves = legalMoves(WHITE);
    if (!moves.length) return null;
    moves.forEach((move) => {
      const centerDistance = Math.abs(move.row - 4) + Math.abs(move.column - 4);
      const friendly = neighbors(move.row, move.column).filter(([row, column]) => board[row][column] === WHITE).length;
      const enemy = neighbors(move.row, move.column).filter(([row, column]) => board[row][column] === BLACK).length;
      const liberties = groupAt(move.board, move.row, move.column).liberties.size;
      move.score = move.captured * 60 + enemy * 5 + friendly * 2 + liberties * 2 - centerDistance * 0.7 + Math.random() * 5;
    });
    moves.sort((a, b) => b.score - a.score);
    return moves[0];
  }

  function finishGame() {
    ended = true;
    window.clearTimeout(aiTimer);
    const score = scoreBoard(board);
    const difference = Math.abs(score.black - score.white).toFixed(1);
    const winner = score.black > score.white ? "黑棋勝" : "白棋勝";
    statusElement.textContent = `終局：黑 ${score.black}，白 ${score.white}（含貼目），${winner} ${difference} 目`;
    draw();
  }

  function aiTurn() {
    aiThinking = true;
    statusElement.textContent = "月衡正在思考白棋……";
    draw();
    aiTimer = window.setTimeout(() => {
      if (!root.isConnected || ended) return;
      const move = chooseAiMove();
      if (move) {
        const result = applyMove(move.row, move.column, WHITE);
        statusElement.textContent = result.captured ? `月衡落下白棋，提走 ${result.captured} 顆黑棋` : "月衡已落下白棋，輪到你了";
      } else {
        consecutivePasses += 1;
        statusElement.textContent = "月衡選擇停一手";
      }
      aiThinking = false;
      if (consecutivePasses >= 2) finishGame();
      else draw();
    }, 480);
  }

  function playerMove(row, column) {
    if (aiThinking || ended) return;
    const result = applyMove(row, column, BLACK);
    if (!result.legal) {
      statusElement.textContent = result.reason;
      return;
    }
    statusElement.textContent = result.captured ? `你提走了 ${result.captured} 顆白棋` : "黑棋已落下";
    draw();
    aiTurn();
  }

  function pass() {
    if (aiThinking || ended) return;
    consecutivePasses += 1;
    previousHash = boardHash(board);
    if (consecutivePasses >= 2) {
      finishGame();
      return;
    }
    statusElement.textContent = "你選擇停一手";
    aiTurn();
  }

  function reset() {
    window.clearTimeout(aiTimer);
    board = createBoard();
    previousHash = "";
    blackCaptures = 0;
    whiteCaptures = 0;
    consecutivePasses = 0;
    aiThinking = false;
    ended = false;
    statusElement.textContent = "請在交叉點落下黑棋";
    draw();
  }

  boardElement.addEventListener("click", (event) => {
    const point = event.target.closest(".go-point");
    if (point) playerMove(Number(point.dataset.row), Number(point.dataset.column));
  });
  root.querySelector("#go-new").addEventListener("click", reset);
  passButton.addEventListener("click", pass);
  reset();
}
