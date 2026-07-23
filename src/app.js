import { games } from "./games.js";
import { renderMinesweeper } from "./minesweeper.js";

const app = document.querySelector("#app");
document.querySelector("#current-year").textContent = new Date().getFullYear();

function gameCard(game) {
  const available = game.status === "available";
  const wrapper = available ? "a" : "article";
  const link = available ? ` href="#/games/${game.id}"` : "";

  return `
    <${wrapper} class="game-card ${available ? "" : "is-coming"}"${link}>
      <div class="card-top">
        <span class="game-icon" aria-hidden="true">${game.icon}</span>
        <span class="status">${available ? "可以玩了" : "準備中"}</span>
      </div>
      <h3>${game.title}</h3>
      <p>${game.description}</p>
      <div class="card-meta">
        <span class="meta-pill">${game.category}</span>
        <span class="meta-pill">${game.duration}</span>
      </div>
      ${available ? '<span class="play-link">開始遊戲 <span aria-hidden="true">→</span></span>' : ""}
    </${wrapper}>
  `;
}

function renderHome() {
  document.title = "Sayuri's Mini Games";
  app.innerHTML = `
    <section class="hero">
      <div>
        <p class="eyebrow"><span aria-hidden="true">✦</span> Tiny breaks, better days</p>
        <h1>忙裡偷閒，<br /><span>玩一局吧。</span></h1>
        <p class="hero-copy">
          為工作空檔準備的輕量小遊戲。不必登入、不必等待，
          選一款喜歡的，讓腦袋暫時換個頻道。
        </p>
      </div>
      <div class="hero-orbit" aria-hidden="true">
        <span class="orbit-icon">🎮</span>
        <span class="orbit-dot orbit-dot-one"></span>
        <span class="orbit-dot orbit-dot-two"></span>
      </div>
    </section>

    <section aria-labelledby="games-title">
      <div class="section-heading">
        <div>
          <h2 id="games-title">選一款遊戲</h2>
          <p>短短幾分鐘，也能玩得盡興。</p>
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
    document.title = "踩地雷｜Sayuri's Mini Games";
    renderMinesweeper(app);
    app.focus({ preventScroll: true });
    return;
  }

  renderHome();
}

window.addEventListener("hashchange", route);
route();
