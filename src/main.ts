import "./styles/main.css";
import { Game } from "./game/Game";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (!canvas) throw new Error("Canvas do jogo não encontrado.");
new Game(canvas);
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/urbtrain-game/sw.js").catch(() => undefined));
