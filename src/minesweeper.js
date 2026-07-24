const SETTINGS = {
  beginner: { size: 9, mines: 10, label: "初級 9×9" },
  medium: { size: 12, mines: 20, label: "中級 12×12" },
};

export function renderMinesweeper(root) {
  root.innerHTML = `
    <section class="game-shell">
      <div class="game-toolbar">
        <a class="back-link" href="#/">← 返回遊戲館</a>
      </div>
      <div class="game-panel">
        <div class="game-character-banner">
          <div class="game-character-art portrait-0" role="img" aria-label="奧蕾莉亞・羅瑟"></div>
          <div>
            <span>薔薇王國近衛軍官</span>
            <strong>奧蕾莉亞・羅瑟</strong>
            <q>真正的勇氣，是在未知中仍優雅前行。</q>
          </div>
        </div>
        <div class="game-title-row">
          <div>
            <span class="chapter-label">CHAPTER I · 薔薇戰線的秘密</span>
            <h1>踩地雷</h1>
            <p>替奧蕾莉亞排除花園中的危險。第一步永遠安全。</p>
          </div>
          <div class="scoreboard" aria-label="遊戲資訊">
            <div class="score-box"><span>地雷</span><strong id="mine-count">10</strong></div>
            <div class="score-box"><span>時間</span><strong id="timer">0</strong></div>
          </div>
        </div>

        <div class="mine-controls">
          <button class="control-button primary" id="new-game" type="button">重新開始</button>
          <button class="control-button" id="difficulty" type="button">初級 9×9</button>
        </div>

        <div class="mine-board-wrap">
          <div class="mine-board" id="mine-board" role="grid" aria-label="踩地雷棋盤"></div>
        </div>
        <p class="game-message" id="game-message" aria-live="polite">點一下格子開始計時</p>
      </div>

      <aside class="rules">
        <h2>怎麼玩</h2>
        左鍵點開格子；右鍵或長按可以插旗。數字代表周圍八格的地雷數量。
        找出所有安全格即可獲勝。
      </aside>
    </section>
  `;

  let level = "beginner";
  let board = [];
  let started = false;
  let ended = false;
  let seconds = 0;
  let timerId = null;
  let longPressTimer = null;

  const boardElement = root.querySelector("#mine-board");
  const mineCountElement = root.querySelector("#mine-count");
  const timerElement = root.querySelector("#timer");
  const messageElement = root.querySelector("#game-message");
  const difficultyButton = root.querySelector("#difficulty");

  function createEmptyBoard(size) {
    return Array.from({ length: size * size }, (_, index) => ({
      index,
      mine: false,
      open: false,
      flagged: false,
      count: 0,
    }));
  }

  function neighbors(index, size) {
    const row = Math.floor(index / size);
    const column = index % size;
    const result = [];

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
        if (rowOffset === 0 && columnOffset === 0) continue;
        const nextRow = row + rowOffset;
        const nextColumn = column + columnOffset;
        if (nextRow >= 0 && nextRow < size && nextColumn >= 0 && nextColumn < size) {
          result.push(nextRow * size + nextColumn);
        }
      }
    }
    return result;
  }

  function placeMines(safeIndex) {
    const { size, mines } = SETTINGS[level];
    const forbidden = new Set([safeIndex, ...neighbors(safeIndex, size)]);
    const candidates = board
      .map((cell) => cell.index)
      .filter((index) => !forbidden.has(index));

    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[randomIndex]] = [candidates[randomIndex], candidates[i]];
    }

    candidates.slice(0, mines).forEach((index) => {
      board[index].mine = true;
    });

    board.forEach((cell) => {
      cell.count = neighbors(cell.index, size).filter((index) => board[index].mine).length;
    });
  }

  function startTimer() {
    timerId = window.setInterval(() => {
      seconds += 1;
      timerElement.textContent = seconds;
    }, 1000);
  }

  function stopTimer() {
    window.clearInterval(timerId);
    timerId = null;
  }

  function reveal(index) {
    const { size } = SETTINGS[level];
    const queue = [index];
    const visited = new Set();

    while (queue.length) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      const cell = board[current];
      if (cell.flagged || cell.open) continue;
      cell.open = true;

      if (cell.count === 0 && !cell.mine) {
        neighbors(current, size).forEach((neighbor) => queue.push(neighbor));
      }
    }
  }

  function checkWin() {
    const { mines } = SETTINGS[level];
    if (board.filter((cell) => cell.open).length === board.length - mines) {
      ended = true;
      stopTimer();
      board.forEach((cell) => {
        if (cell.mine) cell.flagged = true;
      });
      messageElement.textContent = `完成！你用了 ${seconds} 秒 ✦`;
      saveBestTime(seconds);
    }
  }

  function saveBestTime(value) {
    const key = `sayuri-minesweeper-best-${level}`;
    const current = Number(localStorage.getItem(key));
    if (!current || value < current) localStorage.setItem(key, String(value));
  }

  function openCell(index) {
    if (ended || board[index].flagged || board[index].open) return;
    if (!started) {
      placeMines(index);
      started = true;
      startTimer();
      messageElement.textContent = "避開地雷，繼續探索吧";
    }

    if (board[index].mine) {
      ended = true;
      board[index].open = true;
      stopTimer();
      board.forEach((cell) => {
        if (cell.mine) cell.open = true;
      });
      messageElement.textContent = "碰！踩到地雷了，再試一次吧。";
      draw();
      return;
    }

    reveal(index);
    checkWin();
    draw();
  }

  function toggleFlag(index) {
    if (ended || board[index].open) return;
    board[index].flagged = !board[index].flagged;
    draw();
  }

  function draw() {
    const { size, mines } = SETTINGS[level];
    boardElement.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    const flags = board.filter((cell) => cell.flagged).length;
    mineCountElement.textContent = Math.max(0, mines - flags);
    boardElement.innerHTML = board
      .map((cell) => {
        const text = cell.flagged
          ? "⚑"
          : cell.open && cell.mine
            ? "✹"
            : cell.open && cell.count
              ? cell.count
              : "";
        const classes = [
          "mine-cell",
          cell.open ? "is-open" : "",
          cell.open && cell.mine ? "is-mine" : "",
        ].join(" ");
        const label = cell.flagged
          ? "已插旗"
          : cell.open
            ? cell.mine
              ? "地雷"
              : cell.count
                ? `周圍有 ${cell.count} 顆地雷`
                : "安全空格"
            : "未開啟格子";
        return `<button
          class="${classes}"
          data-index="${cell.index}"
          data-count="${cell.count}"
          role="gridcell"
          aria-label="${label}"
          type="button"
        >${text}</button>`;
      })
      .join("");
  }

  function reset() {
    stopTimer();
    const { size, mines, label } = SETTINGS[level];
    board = createEmptyBoard(size);
    started = false;
    ended = false;
    seconds = 0;
    timerElement.textContent = "0";
    mineCountElement.textContent = mines;
    difficultyButton.textContent = label;
    messageElement.textContent = "點一下格子開始計時";
    draw();
  }

  boardElement.addEventListener("click", (event) => {
    const cell = event.target.closest(".mine-cell");
    if (cell) openCell(Number(cell.dataset.index));
  });

  boardElement.addEventListener("contextmenu", (event) => {
    const cell = event.target.closest(".mine-cell");
    if (!cell) return;
    event.preventDefault();
    toggleFlag(Number(cell.dataset.index));
  });

  boardElement.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    const cell = event.target.closest(".mine-cell");
    if (!cell) return;
    longPressTimer = window.setTimeout(() => {
      toggleFlag(Number(cell.dataset.index));
      longPressTimer = null;
    }, 550);
  });

  boardElement.addEventListener("pointerup", () => {
    window.clearTimeout(longPressTimer);
  });

  root.querySelector("#new-game").addEventListener("click", reset);
  difficultyButton.addEventListener("click", () => {
    level = level === "beginner" ? "medium" : "beginner";
    reset();
  });

  reset();
}
