import { ArcRotateCamera, Color3, Engine, HemisphericLight, Scene, Vector3 } from "@babylonjs/core";
import { CONFIG, type PowerupKind } from "./GameConfig";
import type { GameState } from "./GameState";
import { PerformanceManager } from "./PerformanceManager";
import { InputManager, type InputAction } from "../input/InputManager";
import { Runner } from "../player/Runner";
import { TrackManager, type WorldObject } from "../world/TrackManager";
import { Storage } from "../utils/Storage";
import { UI } from "../ui/UI";

export class Game {
  private readonly engine: Engine; private readonly scene: Scene; private readonly camera: ArcRotateCamera; private readonly storage = new Storage(); private readonly runner: Runner; private readonly track: TrackManager; private readonly input: InputManager; private readonly performance: PerformanceManager; private readonly ui: UI;
  private state: GameState = "loading"; private score = 0; private distance = 0; private medals = 0; private speed: number = CONFIG.initialSpeed; private powerup: { kind: PowerupKind; time: number } | null = null;
  public constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false, adaptToDeviceRatio: true }); this.scene = new Scene(this.engine); this.scene.clearColor = Color3.FromHexString("#f4aa62").toColor4(1); this.scene.ambientColor = Color3.FromHexString("#ffffff");
    this.camera = new ArcRotateCamera("camera", Math.PI / 2, 1.12, 16, new Vector3(0, 1.8, 9), this.scene); this.camera.fov = 0.88; this.camera.inputs.clear();
    const hemi = new HemisphericLight("sky", new Vector3(0, 1, 0), this.scene); hemi.intensity = 1.15; hemi.diffuse = Color3.FromHexString("#ffe7bd"); hemi.groundColor = Color3.FromHexString("#1c2730");
    const sun = new HemisphericLight("warm", new Vector3(-0.8, 0.35, -0.5), this.scene); sun.intensity = 0.35; sun.diffuse = Color3.FromHexString("#ffc567");
    this.runner = new Runner(); this.track = new TrackManager(); this.performance = new PerformanceManager(this.engine, this.storage.get("quality"));
    this.ui = new UI(this.storage, { play: () => this.start(), again: () => this.start(), pause: () => this.pause(), resume: () => this.resume(), quit: () => this.menu(), share: () => this.share(), settings: () => undefined, quality: (quality) => this.performance.apply(quality) });
    this.input = new InputManager(canvas); this.input.on((action) => this.handleInput(action));
    window.addEventListener("resize", () => this.engine.resize()); document.addEventListener("visibilitychange", () => { if (document.hidden) this.pause(); });
    this.track.reset(); this.runner.reset(); this.engine.runRenderLoop(() => this.frame());
    window.setTimeout(() => { this.ui.loading(100); window.setTimeout(() => this.menu(), 420); }, 600);
  }
  private frame(): void { const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.05); if (this.state === "running") this.update(dt); this.scene.render(); }
  private update(dt: number): void {
    this.speed = Math.min(CONFIG.maxSpeed, CONFIG.initialSpeed + this.distance / 160); this.distance += this.speed * dt; this.score += this.speed * dt * 4 + this.medals * 0.002; this.track.update(dt, this.speed); this.runner.update(dt); this.camera.target.x += (this.runner.root.position.x * 0.16 - this.camera.target.x) * dt * 4; this.camera.target.y = 1.8 + Math.sin(this.distance * 0.15) * 0.035; this.camera.fov = 0.88 + Math.min(0.08, (this.speed - CONFIG.initialSpeed) * 0.004);
    if (this.powerup) { this.powerup.time -= dt; if (this.powerup.time <= 0) this.powerup = null; }
    this.track.forEachObject((object, position) => this.checkObject(object, position.z, position.x)); this.ui.update(this.score, this.distance, this.medals, Math.floor(this.distance / 350) + 1); this.ui.powerup(this.powerup?.kind ?? null, this.powerup?.time ?? 0); this.performance.update(dt);
  }
  private checkObject(object: WorldObject, z: number, x: number): void {
    const zDistance = Math.abs(z - this.runner.root.position.z); const laneDistance = Math.abs(x - this.runner.root.position.x); if (object.kind === "medal" || object.kind === "magnet" || object.kind === "shield") { const attracted = this.powerup?.kind === "magnet" && zDistance < 8 && laneDistance < 5; if (zDistance < 1.15 && laneDistance < 1.2 || attracted) { object.collected = true; object.mesh.setEnabled(false); if (object.kind === "medal") { this.medals += 1; this.score += 25; this.vibrate(12); } else { this.powerup = { kind: object.kind, time: CONFIG.powerupDuration }; this.vibrate(35); } } return; }
    if (zDistance > 1.05 || laneDistance > 1.15) return;
    const avoided = object.kind === "jump" ? this.runner.isJumping() : object.kind === "slide" ? this.runner.isSliding() : false;
    if (avoided) return;
    if (this.powerup?.kind === "shield") { this.powerup = null; object.collected = true; object.mesh.setEnabled(false); this.vibrate(50); return; }
    this.end();
  }
  private start(): void { this.score = 0; this.distance = 0; this.medals = 0; this.speed = CONFIG.initialSpeed; this.powerup = null; this.track.reset(); this.runner.reset(); this.state = "running"; this.storage.increase("games"); this.ui.show("none"); this.vibrate(18); }
  private end(): void { if (this.state !== "running") return; this.state = "gameover"; this.runner.state = "hit"; const best = Math.max(this.storage.get("best"), Math.floor(this.score)); if (best !== this.storage.get("best")) this.storage.set("best", best); this.storage.increase("totalMedals", this.medals); this.vibrate(150); this.ui.gameOver(this.score, this.distance, this.medals, best); }
  private pause(): void { if (this.state === "running") { this.state = "paused"; this.ui.show("pause"); } }
  private resume(): void { if (this.state === "paused") { this.state = "running"; this.ui.show("none"); } }
  private menu(): void { this.state = "menu"; this.powerup = null; this.ui.show("menu"); }
  private handleInput(action: InputAction): void { if (action === "pause") { this.state === "paused" ? this.resume() : this.pause(); return; } if (this.state === "menu" || this.state === "gameover") { if (action === "confirm") this.start(); return; } if (this.state !== "running") return; if (action === "left") this.runner.move(-1); if (action === "right") this.runner.move(1); if (action === "jump") this.runner.jump(); if (action === "slide") this.runner.slide(); }
  private async share(): Promise<void> { const text = `Corri ${Math.floor(this.distance).toLocaleString("pt-BR")} metros no URBTRAIN GAME. Consegue superar minha pontuação?`; try { if (navigator.share) await navigator.share({ title: "URBTRAIN GAME", text }); else await navigator.clipboard.writeText(text); } catch { /* A share sheet may be dismissed by the player. */ } }
  private vibrate(pattern: number): void { if (this.storage.get("vibration") && navigator.vibrate) navigator.vibrate(pattern); }
}
