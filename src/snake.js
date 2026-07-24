const GRID = 20;
const STORAGE_KEY = "sayuri-snake-best";
const SPEEDS = [
  { label: "悠閒", interval: 180 },
  { label: "標準", interval: 135 },
  { label: "迅捷", interval: 95 },
];

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function renderSnake(root) {
  root.innerHTML = `
    <section class="game-shell snake-shell">
      <div class="game-toolbar">
        <a class="back-link" href="#/">← 返回遊戲廳</a>
      </div>
      <div class="game-panel snake-panel">
        <div class="game-character-banner snake-character-banner">
          <div class="game-character-art portrait-1" role="img" aria-label="西爾維斯・諾克斯，永夜古堡的吸血鬼伯爵"></div>
          <div>
            <span>永夜古堡的吸血鬼伯爵</span>
            <strong>西爾維斯・諾克斯</strong>
            <q>別害怕，黑夜只是在邀請你共舞。</q>
          </div>
        </div>

        <div class="game-title-row snake-title-row">
          <div>
            <span class="chapter-label">CHAPTER IV ✦ 月蝕之蛇</span>
            <h1>貪吃蛇</h1>
            <p>循著翡翠月光前行，收集散落在古堡裡的血月寶石。</p>
          </div>
          <div class="scoreboard snake-scoreboard" aria-label="遊戲資訊">
            <div class="score-box"><span>分數</span><strong id="snake-score">0</strong></div>
            <div class="score-box"><span>長度</span><strong id="snake-length">3</strong></div>
            <div class="score-box"><span>最高</span><strong id="snake-best">0</strong></div>
          </div>
        </div>

        <div class="snake-game-layout">
          <div class="snake-board-frame">
            <canvas id="snake-board" width="600" height="600" aria-label="20×20 貪吃蛇遊戲區"></canvas>
            <div class="snake-overlay" id="snake-overlay">
              <strong>月夜邀請</strong>
              <span>按下開始，跟隨西爾維斯穿越古堡</span>
            </div>
          </div>

          <aside class="snake-side">
            <div class="snake-relic" aria-hidden="true">
              <span>☾</span>
              <strong>血月寶石</strong>
              <small>每顆 10 分</small>
            </div>
            <button class="control-button primary" id="snake-start" type="button">開始遊戲</button>
            <button class="control-button" id="snake-pause" type="button" disabled>暫停</button>
            <button class="control-button" id="snake-speed" type="button">速度：標準</button>
            <p class="snake-status" id="snake-status" aria-live="polite">等待月蝕升起</p>
          </aside>
        </div>

        <div class="snake-mobile-controls" aria-label="觸控方向鍵">
          <button type="button" data-direction="up" aria-label="向上">↑</button>
          <button type="button" data-direction="left" aria-label="向左">←</button>
          <button type="button" data-direction="down" aria-label="向下">↓</button>
          <button type="button" data-direction="right" aria-label="向右">→</button>
        </div>
      </div>

      <aside class="rules">
        <h2>如何玩</h2>
        <p>使用方向鍵、WASD 或畫面按鈕移動。吃下血月寶石會增加長度與 10 分。</p>
        <p>不要撞上古堡邊界或自己的蛇身。空白鍵或 P 可以暫停；遊戲開始前可切換速度。</p>
      </aside>
    </section>
  `;

  const canvas = root.querySelector("#snake-board");
  const context = canvas.getContext("2d");
  const overlay = root.querySelector("#snake-overlay");
  const scoreElement = root.querySelector("#snake-score");
  const lengthElement = root.querySelector("#snake-length");
  const bestElement = root.querySelector("#snake-best");
  const statusElement = root.querySelector("#snake-status");
  const startButton = root.querySelector("#snake-start");
  const pauseButton = root.querySelector("#snake-pause");
  const speedButton = root.querySelector("#snake-speed");

  let snake = [];
  let food = { x: 14, y: 10 };
  let direction = DIRECTIONS.right;
  let pendingDirection = DIRECTIONS.right;
  let score = 0;
  let best = Number(localStorage.getItem(STORAGE_KEY)) || 0;
  let speedIndex = 1;
  let playing = false;
  let paused = false;
  let loopId = null;

  bestElement.textContent = best;

  function resetSnake() {
    snake = [
      { x: 9, y: 10 },
      { x: 8, y: 10 },
      { x: 7, y: 10 },
    ];
    direction = DIRECTIONS.right;
    pendingDirection = DIRECTIONS.right;
    score = 0;
    placeFood();
    updateStats();
    draw();
  }

  function placeFood() {
    const empty = [];
    for (let y = 0; y < GRID; y += 1) {
      for (let x = 0; x < GRID; x += 1) {
        if (!snake.some((part) => part.x === x && part.y === y)) empty.push({ x, y });
      }
    }
    food = empty[Math.floor(Math.random() * empty.length)] || { x: 0, y: 0 };
  }

  function updateStats() {
    scoreElement.textContent = score;
    lengthElement.textContent = snake.length;
    if (score > best) {
      best = score;
      bestElement.textContent = best;
      localStorage.setItem(STORAGE_KEY, String(best));
    }
  }

  function setDirection(name) {
    if (!playing || paused) return;
    const next = DIRECTIONS[name];
    if (!next) return;
    if (next.x + direction.x === 0 && next.y + direction.y === 0) return;
    pendingDirection = next;
  }

  function tick() {
    direction = pendingDirection;
    const head = {
      x: snake[0].x + direction.x,
      y: snake[0].y + direction.y,
    };
    const hitWall = head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID;
    const hitBody = snake.some((part, index) => index > 0 && part.x === head.x && part.y === head.y);
    if (hitWall || hitBody) {
      endGame();
      return;
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      statusElement.textContent = "血月寶石已收入囊中";
      placeFood();
      updateStats();
    } else {
      snake.pop();
    }
    draw();
  }

  function startLoop() {
    window.clearInterval(loopId);
    loopId = window.setInterval(tick, SPEEDS[speedIndex].interval);
  }

  function startGame() {
    window.clearInterval(loopId);
    resetSnake();
    playing = true;
    paused = false;
    overlay.classList.add("is-hidden");
    pauseButton.disabled = false;
    pauseButton.textContent = "暫停";
    speedButton.disabled = true;
    startButton.textContent = "重新開始";
    statusElement.textContent = "月夜巡遊中";
    startLoop();
  }

  function togglePause() {
    if (!playing) return;
    paused = !paused;
    if (paused) {
      window.clearInterval(loopId);
      pauseButton.textContent = "繼續";
      statusElement.textContent = "月光暫歇";
      overlay.innerHTML = "<strong>暫停中</strong><span>按空白鍵、P 或繼續返回古堡</span>";
      overlay.classList.remove("is-hidden");
    } else {
      pauseButton.textContent = "暫停";
      statusElement.textContent = "月夜巡遊中";
      overlay.classList.add("is-hidden");
      startLoop();
    }
  }

  function endGame() {
    playing = false;
    window.clearInterval(loopId);
    pauseButton.disabled = true;
    speedButton.disabled = false;
    statusElement.textContent = "夜行告一段落";
    overlay.innerHTML = `<strong>巡遊結束</strong><span>本次獲得 ${score} 分，按重新開始再試一次</span>`;
    overlay.classList.remove("is-hidden");
    updateStats();
  }

  function drawGem(size) {
    const centerX = (food.x + 0.5) * size;
    const centerY = (food.y + 0.5) * size;
    context.save();
    context.shadowColor = "#ff4d81";
    context.shadowBlur = size * 0.65;
    context.fillStyle = "#ff668f";
    context.beginPath();
    context.moveTo(centerX, centerY - size * 0.32);
    context.lineTo(centerX + size * 0.3, centerY);
    context.lineTo(centerX, centerY + size * 0.34);
    context.lineTo(centerX - size * 0.3, centerY);
    context.closePath();
    context.fill();
    context.restore();
  }

  function draw() {
    const size = canvas.width / GRID;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = context.createRadialGradient(300, 300, 20, 300, 300, 420);
    gradient.addColorStop(0, "rgba(9, 35, 33, .94)");
    gradient.addColorStop(1, "rgba(3, 7, 14, .98)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "rgba(101, 223, 183, .07)";
    context.lineWidth = 1;
    for (let index = 1; index < GRID; index += 1) {
      context.beginPath();
      context.moveTo(index * size, 0);
      context.lineTo(index * size, canvas.height);
      context.stroke();
      context.beginPath();
      context.moveTo(0, index * size);
      context.lineTo(canvas.width, index * size);
      context.stroke();
    }

    drawGem(size);
    snake.forEach((part, index) => {
      const inset = index === 0 ? 2 : 3;
      context.save();
      context.shadowColor = index === 0 ? "#b6ffe9" : "#3de0aa";
      context.shadowBlur = index === 0 ? 16 : 7;
      context.fillStyle = index === 0 ? "#bcffe9" : `hsl(${158 - Math.min(index, 18)}, 67%, ${58 - Math.min(index, 22)}%)`;
      context.beginPath();
      context.roundRect(
        part.x * size + inset,
        part.y * size + inset,
        size - inset * 2,
        size - inset * 2,
        size * 0.28,
      );
      context.fill();
      if (index === 0) {
        context.fillStyle = "#25102e";
        const eyeY = (part.y + 0.36) * size;
        const eyeOffset = size * 0.18;
        context.beginPath();
        context.arc((part.x + 0.5) * size - eyeOffset, eyeY, size * 0.055, 0, Math.PI * 2);
        context.arc((part.x + 0.5) * size + eyeOffset, eyeY, size * 0.055, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    });
  }

  function cycleSpeed() {
    if (playing) return;
    speedIndex = (speedIndex + 1) % SPEEDS.length;
    speedButton.textContent = `速度：${SPEEDS[speedIndex].label}`;
    statusElement.textContent = `${SPEEDS[speedIndex].label}步調已選定`;
  }

  function onKeydown(event) {
    if (!root.isConnected) {
      window.removeEventListener("keydown", onKeydown);
      return;
    }
    const keyDirections = {
      ArrowUp: "up",
      w: "up",
      W: "up",
      ArrowDown: "down",
      s: "down",
      S: "down",
      ArrowLeft: "left",
      a: "left",
      A: "left",
      ArrowRight: "right",
      d: "right",
      D: "right",
    };
    if (keyDirections[event.key]) {
      event.preventDefault();
      setDirection(keyDirections[event.key]);
    } else if (event.key === " " || event.key.toLowerCase() === "p") {
      event.preventDefault();
      togglePause();
    }
  }

  root.querySelector(".snake-mobile-controls").addEventListener("click", (event) => {
    const button = event.target.closest("[data-direction]");
    if (button) setDirection(button.dataset.direction);
  });
  startButton.addEventListener("click", startGame);
  pauseButton.addEventListener("click", togglePause);
  speedButton.addEventListener("click", cycleSpeed);
  window.addEventListener("keydown", onKeydown);

  resetSnake();
}
