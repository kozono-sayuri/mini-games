const SUITS = [
  { symbol: "♠", color: "black" },
  { symbol: "♥", color: "red" },
  { symbol: "♦", color: "red" },
  { symbol: "♣", color: "black" },
];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const STORAGE_KEY = "sayuri-solitaire-best";

function makeDeck() {
  return SUITS.flatMap((suit, suitIndex) =>
    RANKS.map((rank, rankIndex) => ({
      id: `${suit.symbol}-${rank}`,
      suit: suit.symbol,
      color: suit.color,
      rank,
      value: rankIndex + 1,
      suitIndex,
      faceUp: false,
    })),
  );
}

function shuffle(cards) {
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[swap]] = [cards[swap], cards[index]];
  }
  return cards;
}

export function renderSolitaire(root) {
  root.innerHTML = `
    <section class="game-shell solitaire-shell">
      <div class="game-toolbar"><a class="back-link" href="#/">← 返回遊戲廳</a></div>
      <div class="game-panel solitaire-panel">
        <div class="game-character-banner solitaire-character-banner">
          <div class="game-character-art portrait-3" role="img" aria-label="路西安・德・凡爾賽，星輝宮廷的魔術王子"></div>
          <div>
            <span>星輝宮廷的魔術王子</span>
            <strong>路西安・德・凡爾賽</strong>
            <q>命運是一副牌，而優雅的人自己決定玩法。</q>
          </div>
        </div>
        <div class="game-title-row">
          <div>
            <span class="chapter-label">CHAPTER V ✦ 王子的魔術牌局</span>
            <h1>接龍</h1>
            <p>整理散落的星輝牌組，將四種花色依序送回王室收藏。</p>
          </div>
          <div class="scoreboard solitaire-scoreboard">
            <div class="score-box"><span>步數</span><strong id="solitaire-moves">0</strong></div>
            <div class="score-box"><span>時間</span><strong id="solitaire-time">0:00</strong></div>
            <div class="score-box"><span>最佳</span><strong id="solitaire-best">—</strong></div>
          </div>
        </div>

        <div class="solitaire-actions">
          <button class="control-button primary" id="solitaire-new" type="button">重新發牌</button>
          <button class="control-button" id="solitaire-hint" type="button">提示一步</button>
          <p id="solitaire-status" aria-live="polite">點牌堆翻牌，或選一張牌再選目的地</p>
        </div>

        <div class="solitaire-board" id="solitaire-board" aria-label="接龍牌桌">
          <div class="solitaire-top">
            <button class="card-slot stock-slot" data-zone="stock" aria-label="牌堆"></button>
            <div class="card-slot waste-slot" data-zone="waste" aria-label="翻牌區"></div>
            <div class="solitaire-spacer"></div>
            ${SUITS.map((suit, index) => `<div class="card-slot foundation-slot" data-zone="foundation" data-index="${index}" aria-label="${suit.symbol} 完成區"><span>${suit.symbol}</span></div>`).join("")}
          </div>
          <div class="tableau" id="solitaire-tableau">
            ${Array.from({ length: 7 }, (_, index) => `<div class="tableau-column" data-zone="tableau" data-index="${index}" aria-label="第 ${index + 1} 欄"></div>`).join("")}
          </div>
        </div>
      </div>
      <aside class="rules">
        <h2>如何玩</h2>
        <p>牌桌由大到小、紅黑交錯排列；空欄只能放 K。完成區依花色從 A 疊到 K。</p>
        <p>點一下選牌，再點目的地移動；雙擊明牌可自動送往完成區。牌堆用完後可重新翻回。</p>
      </aside>
    </section>
  `;

  const boardElement = root.querySelector("#solitaire-board");
  const statusElement = root.querySelector("#solitaire-status");
  const movesElement = root.querySelector("#solitaire-moves");
  const timeElement = root.querySelector("#solitaire-time");
  const bestElement = root.querySelector("#solitaire-best");
  let stock = [];
  let waste = [];
  let foundations = [[], [], [], []];
  let tableau = [[], [], [], [], [], [], []];
  let selected = null;
  let moves = 0;
  let seconds = 0;
  let timerId = null;
  let started = false;

  function formatTime(value) {
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
  }

  function startTimer() {
    if (started) return;
    started = true;
    timerId = window.setInterval(() => {
      seconds += 1;
      timeElement.textContent = formatTime(seconds);
    }, 1000);
  }

  function cardHtml(card, location, index, cardIndex = 0) {
    const positionStyle = location === "tableau" ? ` style="--card-position:${cardIndex}"` : "";
    if (!card.faceUp) {
      return `<button class="playing-card card-back" data-location="${location}" data-index="${index}" data-card-index="${cardIndex}" aria-label="背面朝上的牌"${positionStyle}><span>✦</span></button>`;
    }
    const isSelected =
      selected &&
      selected.location === location &&
      selected.index === Number(index) &&
      selected.cardIndex === Number(cardIndex);
    return `<button class="playing-card card-front ${card.color} ${isSelected ? "is-selected" : ""}" data-location="${location}" data-index="${index}" data-card-index="${cardIndex}" aria-label="${card.rank}${card.suit}"${positionStyle}>
      <span class="card-corner">${card.rank}<i>${card.suit}</i></span>
      <b>${card.suit}</b>
    </button>`;
  }

  function draw() {
    const stockSlot = root.querySelector(".stock-slot");
    stockSlot.innerHTML = stock.length ? '<span class="mini-card-back">✦</span>' : '<span class="recycle-mark">↻</span>';
    stockSlot.classList.toggle("is-empty", !stock.length);
    const wasteSlot = root.querySelector(".waste-slot");
    wasteSlot.innerHTML = waste.length ? cardHtml(waste.at(-1), "waste", 0) : "";

    foundations.forEach((pile, index) => {
      const slot = root.querySelector(`.foundation-slot[data-index="${index}"]`);
      slot.innerHTML = pile.length ? cardHtml(pile.at(-1), "foundation", index) : `<span>${SUITS[index].symbol}</span>`;
    });

    tableau.forEach((column, index) => {
      const element = root.querySelector(`.tableau-column[data-index="${index}"]`);
      element.innerHTML = column
        .map((card, cardIndex) => cardHtml(card, "tableau", index, cardIndex))
        .join("");
      element.style.setProperty("--cards", Math.max(1, column.length));
    });
    movesElement.textContent = moves;
  }

  function deal() {
    window.clearInterval(timerId);
    const deck = shuffle(makeDeck());
    tableau = Array.from({ length: 7 }, (_, column) => {
      const cards = deck.splice(0, column + 1);
      cards.at(-1).faceUp = true;
      return cards;
    });
    stock = deck.map((card) => ({ ...card, faceUp: false }));
    waste = [];
    foundations = [[], [], [], []];
    selected = null;
    moves = 0;
    seconds = 0;
    started = false;
    timeElement.textContent = "0:00";
    const best = Number(localStorage.getItem(STORAGE_KEY));
    bestElement.textContent = best ? formatTime(best) : "—";
    statusElement.textContent = "新牌局已準備好";
    draw();
  }

  function getSelectedCards() {
    if (!selected) return [];
    if (selected.location === "waste") return waste.length ? [waste.at(-1)] : [];
    if (selected.location === "foundation") return foundations[selected.index].length ? [foundations[selected.index].at(-1)] : [];
    if (selected.location === "tableau") return tableau[selected.index].slice(selected.cardIndex);
    return [];
  }

  function removeSelected() {
    if (selected.location === "waste") return [waste.pop()];
    if (selected.location === "foundation") return [foundations[selected.index].pop()];
    return tableau[selected.index].splice(selected.cardIndex);
  }

  function revealTop(columnIndex) {
    const top = tableau[columnIndex].at(-1);
    if (top && !top.faceUp) {
      top.faceUp = true;
      return true;
    }
    return false;
  }

  function canPlaceTableau(cards, column) {
    if (!cards.length || !cards[0].faceUp) return false;
    const target = tableau[column].at(-1);
    return target ? target.faceUp && target.color !== cards[0].color && target.value === cards[0].value + 1 : cards[0].value === 13;
  }

  function canPlaceFoundation(card, index) {
    if (!card || card.suitIndex !== index) return false;
    const target = foundations[index].at(-1);
    return target ? card.value === target.value + 1 : card.value === 1;
  }

  function completeMove(message) {
    if (selected?.location === "tableau") revealTop(selected.index);
    selected = null;
    moves += 1;
    startTimer();
    statusElement.textContent = message;
    draw();
    checkWin();
  }

  function moveToTableau(column) {
    const cards = getSelectedCards();
    if (!canPlaceTableau(cards, column)) return false;
    tableau[column].push(...removeSelected());
    completeMove("牌序已重新排列");
    return true;
  }

  function moveToFoundation(index) {
    const cards = getSelectedCards();
    if (cards.length !== 1 || !canPlaceFoundation(cards[0], index)) return false;
    foundations[index].push(removeSelected()[0]);
    completeMove("一張牌已收入王室收藏");
    return true;
  }

  function selectCard(location, index, cardIndex) {
    let card;
    if (location === "waste") card = waste.at(-1);
    if (location === "foundation") card = foundations[index].at(-1);
    if (location === "tableau") card = tableau[index][cardIndex];
    if (!card?.faceUp) return;
    selected = { location, index, cardIndex };
    statusElement.textContent = `已選擇 ${card.rank}${card.suit}，請選目的地`;
    draw();
  }

  function drawStock() {
    startTimer();
    selected = null;
    if (stock.length) {
      const card = stock.pop();
      card.faceUp = true;
      waste.push(card);
      moves += 1;
      statusElement.textContent = `翻出了 ${card.rank}${card.suit}`;
    } else if (waste.length) {
      stock = waste.reverse().map((card) => ({ ...card, faceUp: false }));
      waste = [];
      moves += 1;
      statusElement.textContent = "牌堆已重新整理";
    }
    draw();
  }

  function autoFoundation(location, index, cardIndex) {
    selectCard(location, index, cardIndex);
    const card = getSelectedCards();
    if (card.length === 1 && moveToFoundation(card[0].suitIndex)) return;
    selected = null;
    statusElement.textContent = "這張牌目前還不能送往完成區";
    draw();
  }

  function showHint() {
    if (waste.length) {
      const card = waste.at(-1);
      if (canPlaceFoundation(card, card.suitIndex)) {
        statusElement.textContent = `提示：將 ${card.rank}${card.suit} 放到完成區`;
        return;
      }
      const column = tableau.findIndex((_, index) => canPlaceTableau([card], index));
      if (column >= 0) {
        statusElement.textContent = `提示：將 ${card.rank}${card.suit} 移到第 ${column + 1} 欄`;
        return;
      }
    }
    for (let column = 0; column < tableau.length; column += 1) {
      const top = tableau[column].at(-1);
      if (top?.faceUp && canPlaceFoundation(top, top.suitIndex)) {
        statusElement.textContent = `提示：將 ${top.rank}${top.suit} 放到完成區`;
        return;
      }
    }
    statusElement.textContent = stock.length || waste.length ? "提示：再翻一張牌看看" : "目前沒有明顯步驟，試著重新排列牌桌";
  }

  function checkWin() {
    if (foundations.every((pile) => pile.length === 13)) {
      window.clearInterval(timerId);
      const best = Number(localStorage.getItem(STORAGE_KEY));
      if (!best || seconds < best) localStorage.setItem(STORAGE_KEY, String(seconds));
      statusElement.textContent = `魔術牌局完成！共 ${moves} 步，用時 ${formatTime(seconds)}`;
      bestElement.textContent = formatTime(!best || seconds < best ? seconds : best);
    }
  }

  boardElement.addEventListener("click", (event) => {
    const stockTarget = event.target.closest('[data-zone="stock"]');
    if (stockTarget) {
      drawStock();
      return;
    }
    const card = event.target.closest(".playing-card");
    const targetColumn = event.target.closest(".tableau-column");
    const targetFoundation = event.target.closest(".foundation-slot");
    if (selected && targetFoundation && moveToFoundation(Number(targetFoundation.dataset.index))) return;
    if (selected && targetColumn && moveToTableau(Number(targetColumn.dataset.index))) return;
    if (card) {
      selectCard(card.dataset.location, Number(card.dataset.index), Number(card.dataset.cardIndex));
    }
  });

  boardElement.addEventListener("dblclick", (event) => {
    const card = event.target.closest(".playing-card.card-front");
    if (card) autoFoundation(card.dataset.location, Number(card.dataset.index), Number(card.dataset.cardIndex));
  });
  root.querySelector("#solitaire-new").addEventListener("click", deal);
  root.querySelector("#solitaire-hint").addEventListener("click", showHint);
  deal();
}
