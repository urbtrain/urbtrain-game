import { Sprite, SpriteManager, TransformNode, Vector3 } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core";
import { CONFIG } from "../game/GameConfig";

export type RunnerState = "idle" | "run" | "jump" | "slide" | "hit";

export class Runner {
  public readonly root = new TransformNode("runner");
  public state: RunnerState = "idle";
  public lane = 1;
  public verticalVelocity = 0;
  public slideTime = 0;
  private readonly sprite: Sprite;
  private elapsed = 0;

  public constructor(scene: Scene) {
    const manager = new SpriteManager("runner-sprite-manager", "/urbtrain-game/sprites/urbtrain-runner-voxel-mobile.png", 1, { width: 512, height: 768 }, scene);
    this.sprite = new Sprite("runner-sprite", manager);
    this.root.position = new Vector3(CONFIG.lanes[1], 0, 0);
    this.syncSprite();
  }

  public reset(): void {
    this.root.position.set(CONFIG.lanes[1], 0, 0);
    this.lane = 1;
    this.verticalVelocity = 0;
    this.slideTime = 0;
    this.state = "run";
    this.sprite.angle = 0;
    this.syncSprite();
  }

  public move(delta: number): void { this.lane = Math.max(0, Math.min(2, this.lane + delta)); }

  public jump(): void {
    if (this.root.position.y < 0.02 && this.slideTime <= 0) { this.verticalVelocity = CONFIG.jumpVelocity; this.state = "jump"; }
  }

  public slide(): void {
    if (this.root.position.y < 0.02 && this.slideTime <= 0) { this.slideTime = CONFIG.slideDuration; this.state = "slide"; }
  }

  public update(dt: number): void {
    this.elapsed += dt;
    this.root.position.x += (CONFIG.lanes[this.lane] - this.root.position.x) * Math.min(1, dt * 13);
    if (this.root.position.y > 0 || this.verticalVelocity > 0) {
      this.verticalVelocity -= CONFIG.gravity * dt;
      this.root.position.y = Math.max(0, this.root.position.y + this.verticalVelocity * dt);
      if (this.root.position.y === 0) { this.verticalVelocity = 0; this.state = "run"; }
    }
    if (this.slideTime > 0) { this.slideTime -= dt; if (this.slideTime <= 0) this.state = "run"; }
    this.syncSprite();
  }

  public isJumping(): boolean { return this.root.position.y > 0.75; }
  public isSliding(): boolean { return this.slideTime > 0.08; }

  private syncSprite(): void {
    const sliding = this.isSliding();
    const runningBob = this.state === "run" ? Math.abs(Math.sin(this.elapsed * 13)) * 0.09 : 0;
    this.sprite.width = sliding ? 3.7 : 3.05;
    this.sprite.height = sliding ? 2.85 : 4.58;
    this.sprite.position.set(this.root.position.x, this.root.position.y + (sliding ? 1.35 : 2.22) + runningBob, this.root.position.z);
    this.sprite.angle = this.state === "run" ? Math.sin(this.elapsed * 13) * 0.01 : 0;
  }
}
