const COLS = 10;
const ROWS = 20;
const EMPTY = 0;
const STORAGE_KEY = "sayuri-block-challenge-best";

const PIECES = {
  I: { color: "#63e6ff", cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  J: { color: "#6d83ff", cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { color: "#ffad55", cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
  O: { color: "#ffe56a", cells: [[1, 0], [2, 0], [1, 1], [2, 1]] },
  S: { color: "#77e98d", cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  T: { color: "#c989ff", cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  Z: { color: "#ff7085", cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
};

const SCORE_TABLE = [0, 100, 300, 500, 800];

function shuffledBag() {
  const bag = Object.keys(PIECES);
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [bag[index], bag[swap]] = [bag[swap], bag[index]];
  }
  return bag;
}

function rotate(cells) {
  return cells.map(([x, y]) => [3 - y, x]);
}

export function renderTetris(root) {
  root.innerHTML = `
    <section class="game-shell block-shell">
      <div class="game-toolbar">
        <a class="back-link" href="#/">← 返回遊戲廳</a>
      </div>
      <div class="game-panel block-panel">
        <div class="game-character-banner block-character-banner">
          <div class="game-character-art portrait-4" role="img" aria-label="薇奧拉・齒輪心，皇家機巧院的天才發明家"></div>
          <div>
            <span>皇家機巧院的天才發明家</span>
            <strong>薇奧拉・齒輪心</strong>
            <q>混亂只是尚未找到位置的秩序。</q>
          </div>
        </div>

        <div class="game-title-row block-title-row">
          <div>
            <span class="chapter-label">CHAPTER III ✦ 緋紅機巧工房</span>
            <h1>方塊挑戰</h1>
            <p>啟動魔晶機關，旋轉並排列降落的機巧模組。</p>
          </div>
          <div class="scoreboard block-scoreboard" aria-label="遊戲資訊">
            <div class="score-box"><span>分數</span><strong id="block-score">0</strong></div>
            <div class="score-box"><span>消行</span><strong id="block-lines">0</strong></div>
            <div class="score-box"><span>等級</span><strong id="block-level">1</strong></div>
            <div class="score-box"><span>最高</span><strong id="block-best">0</strong></div>
          </div>
        </div>

        <div class="block-game-layout">
          <div class="block-board-frame">
            <canvas id="block-board" width="300" height="600" aria-label="10×20 方塊挑戰遊戲區"></canvas>
            <div class="block-overlay" id="block-overlay">
              <strong>準備啟動</strong>
              <span>按下開始，替薇奧拉完成機巧序列</span>
            </div>
          </div>

          <aside class="block-side">
            <div class="next-piece">
              <span>下一個模組</span>
              <canvas id="block-next" width="120" height="120" aria-label="下一個方塊"></canvas>
            </div>
            <button class="control-button primary" id="block-start" type="button">開始遊戲</button>
            <button class="control-button" id="block-pause" type="button" disabled>暫停</button>
            <p class="block-status" id="block-status" aria-live="polite">等待機關啟動</p>
          </aside>
        </div>

        <div class="block-mobile-controls" aria-label="觸控操作">
          <button type="button" data-action="left" aria-label="向左">←</button>
          <button type="button" data-action="rotate" aria-label="旋轉">↻</button>
          <button type="button" data-action="right" aria-label="向右">→</button>
          <button type="button" data-action="down" aria-label="加速下降">↓</button>
          <button class="wide" type="button" data-action="drop">立即落下</button>
        </div>
      </div>

      <aside class="rules">
        <h2>如何玩</h2>
        <p>排列方塊填滿橫列即可消除。方向鍵移動；↑ 旋轉；↓ 加速；空白鍵立即落下；P 暫停。</p>
        <p>一次消除越多行，獲得的分數越高。每消除 10 行會提升等級並加快速度。</p>
      </aside>
    </section>
  `;

  const boardCanvas = root.querySelector("#block-board");
  const boardContext = boardCanvas.getContext("2d");
  const nextCanvas = root.querySelector("#block-next");
  const nextContext = nextCanvas.getContext("2d");
  const overlay = root.querySelector("#block-overlay");
  const scoreElement = root.querySelector("#block-score");
  const linesElement = root.querySelector("#block-lines");
  const levelElement = root.querySelector("#block-level");
  const bestElement = root.querySelector("#block-best");
  const statusElement = root.querySelector("#block-status");
  const startButton = root.querySelector("#block-start");
  const pauseButton = root.querySelector("#block-pause");

  let board;
  let active;
  let nextType;
  let bag;
  let score;
  let lines;
  let level;
  let best = Number(localStorage.getItem(STORAGE_KEY)) || 0;
  let playing = false;
  let paused = false;
  let animationId = null;
  let lastDrop = 0;

  bestElement.textContent = best.toLocaleString();

  function emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
  }

  function takeType() {
    if (!bag.length) bag = shuffledBag();
    return bag.pop();
  }

  function spawn() {
    const type = nextType || takeType();
    nextType = takeType();
    active = {
      type,
      color: PIECES[type].color,
      cells: PIECES[type].cells.map((cell) => [...cell]),
      x: 3,
      y: -1,
    };
    drawNext();
    if (collides(active.x, active.y, active.cells)) endGame();
  }

  function collides(x, y, cells) {
    return cells.some(([cellX, cellY]) => {
      const boardX = x + cellX;
      const boardY = y + cellY;
      return (
        boardX < 0 ||
        boardX >= COLS ||
        boardY >= ROWS ||
        (boardY >= 0 && board[boardY][boardX] !== EMPTY)
      );
    });
  }

  function ghostY() {
    let y = active.y;
    while (!collides(active.x, y + 1, active.cells)) y += 1;
    return y;
  }

  function lockPiece() {
    active.cells.forEach(([cellX, cellY]) => {
      const x = active.x + cellX;
      const y = active.y + cellY;
      if (y >= 0) board[y][x] = active.color;
    });

    let cleared = 0;
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (board[row].every((cell) => cell !== EMPTY)) {
        board.splice(row, 1);
        board.unshift(Array(COLS).fill(EMPTY));
        cleared += 1;
        row += 1;
      }
    }

    if (cleared) {
      lines += cleared;
      level = Math.floor(lines / 10) + 1;
      score += SCORE_TABLE[cleared] * level;
      statusElement.textContent = cleared === 4 ? "完美機巧！一次消除四行" : `消除了 ${cleared} 行`;
      updateStats();
    }
    spawn();
  }

  function move(dx, dy) {
    if (!playing || paused || !active) return false;
    if (!collides(active.x + dx, active.y + dy, active.cells)) {
      active.x += dx;
      active.y += dy;
      draw();
      return true;
    }
    if (dy > 0) {
      lockPiece();
      draw();
    }
    return false;
  }

  function rotatePiece() {
    if (!playing || paused || !active) return;
    const rotated = rotate(active.cells);
    for (const offset of [0, -1, 1, -2, 2]) {
      if (!collides(active.x + offset, active.y, rotated)) {
        active.cells = rotated;
        active.x += offset;
        draw();
        return;
      }
    }
  }

  function hardDrop() {
    if (!playing || paused || !active) return;
    const destination = ghostY();
    score += Math.max(0, destination - active.y) * 2;
    active.y = destination;
    lockPiece();
    updateStats();
    draw();
  }

  function softDrop() {
    if (move(0, 1)) {
      score += 1;
      updateStats();
    }
  }

  function updateStats() {
    scoreElement.textContent = score.toLocaleString();
    linesElement.textContent = lines;
    levelElement.textContent = level;
    if (score > best) {
      best = score;
      bestElement.textContent = best.toLocaleString();
      localStorage.setItem(STORAGE_KEY, String(best));
    }
  }

  function drawCell(context, x, y, color, size, alpha = 1) {
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    context.fillStyle = "rgba(255,255,255,.22)";
    context.fillRect(x * size + 3, y * size + 3, size - 6, 3);
    context.strokeStyle = "rgba(255,255,255,.28)";
    context.strokeRect(x * size + 1.5, y * size + 1.5, size - 3, size - 3);
    context.restore();
  }

  function draw() {
    const size = boardCanvas.width / COLS;
    boardContext.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
    boardContext.fillStyle = "rgba(8, 5, 18, .88)";
    boardContext.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
    boardContext.strokeStyle = "rgba(232, 197, 130, .08)";
    for (let x = 1; x < COLS; x += 1) {
      boardContext.beginPath();
      boardContext.moveTo(x * size, 0);
      boardContext.lineTo(x * size, boardCanvas.height);
      boardContext.stroke();
    }
    for (let y = 1; y < ROWS; y += 1) {
      boardContext.beginPath();
      boardContext.moveTo(0, y * size);
      boardContext.lineTo(boardCanvas.width, y * size);
      boardContext.stroke();
    }
    board.forEach((row, y) => row.forEach((color, x) => {
      if (color !== EMPTY) drawCell(boardContext, x, y, color, size);
    }));
    if (!active) return;
    const destination = ghostY();
    active.cells.forEach(([x, y]) => {
      if (destination + y >= 0) drawCell(boardContext, active.x + x, destination + y, active.color, size, 0.2);
    });
    active.cells.forEach(([x, y]) => {
      if (active.y + y >= 0) drawCell(boardContext, active.x + x, active.y + y, active.color, size);
    });
  }

  function drawNext() {
    nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    const piece = PIECES[nextType];
    if (!piece) return;
    const size = 24;
    piece.cells.forEach(([x, y]) => drawCell(nextContext, x + 0.5, y + 1, piece.color, size));
  }

  function loop(timestamp) {
    if (!playing) return;
    const interval = Math.max(100, 850 - (level - 1) * 70);
    if (!paused && timestamp - lastDrop >= interval) {
      move(0, 1);
      lastDrop = timestamp;
    }
    animationId = window.requestAnimationFrame(loop);
  }

  function startGame() {
    window.cancelAnimationFrame(animationId);
    board = emptyBoard();
    bag = shuffledBag();
    nextType = takeType();
    score = 0;
    lines = 0;
    level = 1;
    playing = true;
    paused = false;
    active = null;
    lastDrop = performance.now();
    overlay.classList.add("is-hidden");
    pauseButton.disabled = false;
    pauseButton.textContent = "暫停";
    startButton.textContent = "重新開始";
    statusElement.textContent = "機關運轉中";
    updateStats();
    spawn();
    draw();
    animationId = window.requestAnimationFrame(loop);
  }

  function togglePause() {
    if (!playing) return;
    paused = !paused;
    pauseButton.textContent = paused ? "繼續" : "暫停";
    statusElement.textContent = paused ? "機關暫停" : "機關運轉中";
    overlay.innerHTML = paused ? "<strong>暫停中</strong><span>按 P 或繼續按鈕返回工房</span>" : "";
    overlay.classList.toggle("is-hidden", !paused);
  }

  function endGame() {
    playing = false;
    window.cancelAnimationFrame(animationId);
    pauseButton.disabled = true;
    statusElement.textContent = "機巧塔已滿，調整設計再試一次";
    overlay.innerHTML = `<strong>挑戰結束</strong><span>本次獲得 ${score.toLocaleString()} 分</span>`;
    overlay.classList.remove("is-hidden");
    updateStats();
  }

  function act(action) {
    if (action === "left") move(-1, 0);
    if (action === "right") move(1, 0);
    if (action === "down") softDrop();
    if (action === "rotate") rotatePiece();
    if (action === "drop") hardDrop();
  }

  function onKeydown(event) {
    if (!root.isConnected) {
      window.removeEventListener("keydown", onKeydown);
      return;
    }
    const actions = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowDown: "down",
      ArrowUp: "rotate",
      " ": "drop",
    };
    if (actions[event.key]) {
      event.preventDefault();
      act(actions[event.key]);
    } else if (event.key.toLowerCase() === "p") {
      event.preventDefault();
      togglePause();
    }
  }

  root.querySelector(".block-mobile-controls").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (button) act(button.dataset.action);
  });
  startButton.addEventListener("click", startGame);
  pauseButton.addEventListener("click", togglePause);
  window.addEventListener("keydown", onKeydown);

  board = emptyBoard();
  draw();
}
