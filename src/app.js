import { games } from "./games.js";
import { renderMinesweeper } from "./minesweeper.js";
import { renderReversi } from "./reversi.js";

const app = document.querySelector("#app");
document.querySelector("#current-year").textContent = new Date().getFullYear();

function gameCard(game) {
  const available = game.status === "available";
  const wrapper = available ? "a" : "article";
  const link = available ? ` href="#/games/${game.id}"` : "";

  return `
    <${wrapper} id="game-${game.id}" class="game-card ${available ? "" : "is-coming"}"${link}>
      <div class="character-portrait portrait-${game.portrait}" role="img" aria-label="${game.character}，${game.role}"></div>
      <div class="card-gradient" aria-hidden="true"></div>
      <div class="card-content">
      <div class="card-top">
        <span class="character-role">${game.role}</span>
        <span class="status">${available ? "可以玩了" : "準備中"}</span>
      </div>
      <h3>${game.title}</h3>
      <p class="game-subtitle">${game.subtitle}</p>
      <p class="character-name">${game.character}</p>
      <p>${game.description}</p>
      <div class="card-meta">
        <span class="meta-pill">${game.category}</span>
        <span class="meta-pill">${game.duration}</span>
      </div>
      ${available ? '<span class="play-link">開始遊戲 <span aria-hidden="true">→</span></span>' : ""}
      </div>
    </${wrapper}>
  `;
}

function renderHome() {
  document.title = "Étoile Arcade｜Sayuri's Mini Games";
  app.innerHTML = `
    <section class="hero">
      <div>
        <p class="eyebrow"><span aria-hidden="true">✦</span> Bienvenue à l'Étoile Arcade</p>
        <h1>踏入星夜，<br /><span>與命運遊戲。</span></h1>
        <p class="hero-copy">
          當現實需要暫停，六位來自不同幻想國度的主人公正等待你的邀請。
          不必登入、不必等待，選擇一段物語，享受短暫而華麗的逃離。
        </p>
        <div class="hero-seal"><span>Original Character Arcade</span><b>EST. 2026</b></div>
      </div>
      <div class="hero-cosmos" aria-label="六位主人公的幻想星系">
        <span class="cosmic-star star-one" aria-hidden="true">✦</span>
        <span class="cosmic-star star-two" aria-hidden="true">·</span>
        <span class="cosmic-star star-three" aria-hidden="true">✧</span>
        <div class="cosmic-core" aria-label="Étoile Arcade 核心">
          <span>♛</span>
          <small>ÉTOILE</small>
        </div>
        <div class="cosmic-orbit orbit-one">
          <a class="cosmic-planet planet-a portrait-0" href="#/games/minesweeper" aria-label="前往奧蕾莉亞的踩地雷篇章"></a>
        </div>
        <div class="cosmic-orbit orbit-two">
          <span class="cosmic-planet planet-b portrait-1" title="西爾維斯・諾克斯"></span>
        </div>
        <div class="cosmic-orbit orbit-three">
          <span class="cosmic-planet planet-c portrait-2" title="諾瓦・布蘭雪"></span>
          <span class="cosmic-planet planet-d portrait-3" title="路西安・德・凡爾賽"></span>
        </div>
        <div class="cosmic-orbit orbit-four">
          <span class="cosmic-planet planet-e portrait-4" title="薇奧拉・齒輪心"></span>
          <span class="cosmic-planet planet-f portrait-5" title="沈月衡"></span>
        </div>
      </div>
    </section>

    <section aria-labelledby="games-title">
      <div class="section-heading">
        <div>
          <span class="section-kicker">CHOOSE YOUR STORY</span>
          <h2 id="games-title">今夜，要與誰相遇？</h2>
          <p>每一款遊戲，都是一位主人公的專屬物語。</p>
        </div>
      </div>
      <div class="game-grid">
        ${games.map(gameCard).join("")}
      </div>
    </section>
  `;
  app.focus({ preventScroll: true });
}

function route() {
  const path = window.location.hash.slice(1) || "/";

  if (path === "/games/minesweeper") {
    document.body.dataset.scene = "minesweeper";
    document.title = "踩地雷｜Sayuri's Mini Games";
    renderMinesweeper(app);
    app.focus({ preventScroll: true });
    return;
  }

  if (path === "/games/reversi") {
    document.body.dataset.scene = "reversi";
    document.title = "黑白棋 AI｜Sayuri's Mini Games";
    renderReversi(app);
    app.focus({ preventScroll: true });
    return;
  }

  delete document.body.dataset.scene;
  renderHome();
}

window.addEventListener("hashchange", route);
route();
