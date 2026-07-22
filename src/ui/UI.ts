import type { PowerupKind, Quality } from "../game/GameConfig";
import type { Storage } from "../utils/Storage";

type Events = { play: () => void; pause: () => void; resume: () => void; quit: () => void; again: () => void; share: () => void; settings: () => void; quality: (quality: Quality) => void };
const byId = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export class UI {
  private readonly screens = ["loading", "menu", "pause", "gameover", "how", "settings"].map(byId<HTMLElement>);
  private readonly hud = byId<HTMLElement>("hud");
  public constructor(private readonly storage: Storage, events: Events) {
    byId("play-button").onclick = events.play; byId("again-button").onclick = events.again; byId("pause-button").onclick = events.pause; byId("resume-button").onclick = events.resume; byId("quit-button").onclick = events.quit; byId("menu-button").onclick = events.quit; byId("share-button").onclick = events.share;
    byId("how-button").onclick = () => this.show("how"); byId("settings-button").onclick = () => { events.settings(); this.show("settings"); };
    document.querySelectorAll<HTMLButtonElement>("[data-close]").forEach((button) => { button.onclick = () => this.show("menu"); });
    const sound = byId<HTMLInputElement>("sound-toggle"); sound.checked = storage.get("sound"); sound.onchange = () => storage.set("sound", sound.checked);
    const vibration = byId<HTMLInputElement>("vibration-toggle"); vibration.checked = storage.get("vibration"); vibration.onchange = () => storage.set("vibration", vibration.checked);
    const quality = byId<HTMLSelectElement>("quality-select"); quality.value = storage.get("quality"); quality.onchange = () => { storage.set("quality", quality.value as Quality); events.quality(quality.value as Quality); };
    this.setBest(storage.get("best"));
  }
  public loading(percent: number): void { byId("loading-text").textContent = percent < 100 ? `Carregando ${percent}%` : "Pista pronta!"; const bar = document.querySelector<HTMLElement>(".loader i"); if (bar) bar.style.width = `${percent}%`; }
  public show(name: "loading" | "menu" | "pause" | "gameover" | "how" | "settings" | "none"): void { this.screens.forEach((screen) => screen.classList.toggle("visible", screen.id === name)); this.hud.classList.toggle("visible", name === "none"); if (name === "menu") this.setBest(this.storage.get("best")); }
  public update(score: number, distance: number, medals: number, level: number): void { byId("score").textContent = Math.floor(score).toLocaleString("pt-BR"); byId("distance").textContent = `${Math.floor(distance).toLocaleString("pt-BR")} m`; byId("medals").textContent = String(medals); byId("level").textContent = String(level); }
  public powerup(kind: PowerupKind | null, remaining = 0): void { const element = byId("powerup"); element.classList.toggle("visible", kind !== null); element.textContent = kind ? `${kind === "magnet" ? "ÍMÃ" : "ESCUDO"} ${Math.ceil(remaining)}s` : ""; }
  public gameOver(score: number, distance: number, medals: number, best: number): void { byId("final-score").textContent = Math.floor(score).toLocaleString("pt-BR"); byId("final-distance").textContent = `${Math.floor(distance)} m`; byId("final-medals").textContent = String(medals); byId("final-best").textContent = best.toLocaleString("pt-BR"); this.show("gameover"); }
  private setBest(value: number): void { byId("menu-best").textContent = value.toLocaleString("pt-BR"); }
}
