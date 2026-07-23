import { Color3, Mesh, MeshBuilder, ParticleSystem, StandardMaterial, Sprite, SpriteManager, Texture, TransformNode, Vector3 } from "@babylonjs/core";
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
  private readonly shieldMesh: Mesh;
  private readonly shadowMesh: Mesh;
  private readonly shadowMat: StandardMaterial;
  private readonly footParticles: ParticleSystem;
  private elapsed = 0;
  private tilt = 0;
  private squashImpact = 0;
  private prevY = 0;
  private shieldActive = false;

  public constructor(scene: Scene) {
    const manager = new SpriteManager("runner-sprite-manager", "/urbtrain-game/sprites/urbtrain-runner-voxel-mobile.png", 1, { width: 512, height: 768 }, scene);
    this.sprite = new Sprite("runner-sprite", manager);
    this.root.position = new Vector3(CONFIG.lanes[1], 0, 0);

    // Dynamic Ground Shadow Disc
    this.shadowMesh = MeshBuilder.CreateDisc("runner-shadow", { radius: 1.15, tessellation: 24 }, scene);
    this.shadowMesh.rotation.x = Math.PI / 2;
    this.shadowMesh.position.y = 0.02;

    this.shadowMat = new StandardMaterial("runner-shadow-mat", scene);
    this.shadowMat.diffuseColor = Color3.Black();
    this.shadowMat.emissiveColor = Color3.Black();
    this.shadowMat.alpha = 0.42;
    this.shadowMat.specularColor = Color3.Black();
    this.shadowMesh.material = this.shadowMat;

    // Shield 3D Bubble Effect
    this.shieldMesh = MeshBuilder.CreateSphere("shield-bubble", { diameter: 3.4, segments: 16 }, scene);
    this.shieldMesh.parent = this.root;
    this.shieldMesh.position = new Vector3(0, 1.8, 0);
    const shieldMat = new StandardMaterial("shield-mat", scene);
    shieldMat.diffuseColor = Color3.FromHexString("#62d6ff");
    shieldMat.emissiveColor = Color3.FromHexString("#62d6ff").scale(0.6);
    shieldMat.alpha = 0.35;
    shieldMat.specularColor = Color3.White();
    this.shieldMesh.material = shieldMat;
    this.shieldMesh.setEnabled(false);

    // Foot Dust Particle System
    this.footParticles = new ParticleSystem("footDust", 60, scene);
    this.footParticles.particleTexture = new Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADEDt6AFgAAAEdJREFUGFdjZEACjEAZlAYxGIA0gACImQERQBYD0cACDAwMDP8ZgAQyG0wABEEa0AWQxf8zMEC8gwkgyiBqgTpwGgC2F5tGAB3IDh7eS3WcAAAAAElFTkSuQmCC", scene);
    this.footParticles.emitter = this.shadowMesh;
    this.footParticles.minEmitBox = new Vector3(-0.4, 0.05, -0.2);
    this.footParticles.maxEmitBox = new Vector3(0.4, 0.1, 0.2);
    this.footParticles.color1 = new Color3(0.9, 0.7, 0.4).toColor4(0.5);
    this.footParticles.color2 = new Color3(1.0, 0.8, 0.5).toColor4(0.2);
    this.footParticles.minSize = 0.15;
    this.footParticles.maxSize = 0.35;
    this.footParticles.minLifeTime = 0.15;
    this.footParticles.maxLifeTime = 0.3;
    this.footParticles.emitRate = 30;
    this.footParticles.direction1 = new Vector3(-0.5, 0.5, -1);
    this.footParticles.direction2 = new Vector3(0.5, 1.0, -2);
    this.footParticles.minEmitPower = 0.8;
    this.footParticles.maxEmitPower = 1.6;
    this.footParticles.start();

    this.syncSprite();
  }

  public reset(): void {
    this.root.position.set(CONFIG.lanes[1], 0, 0);
    this.lane = 1;
    this.verticalVelocity = 0;
    this.slideTime = 0;
    this.state = "run";
    this.tilt = 0;
    this.squashImpact = 0;
    this.prevY = 0;
    this.setShield(false);
    this.syncSprite();
  }

  public setShield(active: boolean): void {
    this.shieldActive = active;
    this.shieldMesh.setEnabled(active);
  }

  public move(delta: number): void {
    const nextLane = Math.max(0, Math.min(2, this.lane + delta));
    if (nextLane !== this.lane) {
      this.tilt = delta * 0.18; // Tilt sprite during lane shift
      this.lane = nextLane;
    }
  }

  public getTilt(): number {
    return this.tilt;
  }

  public jump(): void {
    if (this.root.position.y < 0.02 && this.slideTime <= 0) {
      this.verticalVelocity = CONFIG.jumpVelocity;
      this.state = "jump";
    }
  }

  public slide(): void {
    if (this.root.position.y < 0.02 && this.slideTime <= 0) {
      this.slideTime = CONFIG.slideDuration;
      this.state = "slide";
    }
  }

  public update(dt: number): void {
    this.elapsed += dt;

    // Frame-rate independent exponential lerp for lane movement
    const targetX = CONFIG.lanes[this.lane];
    const diffX = targetX - this.root.position.x;
    this.root.position.x += diffX * (1 - Math.exp(-18 * dt));

    // Smoothly decay tilt angle and landing squash impact
    this.tilt *= Math.exp(-12 * dt);
    this.squashImpact *= Math.exp(-16 * dt);

    const isGrounded = this.root.position.y <= 0.001 && this.verticalVelocity <= 0;

    if (this.root.position.y > 0 || this.verticalVelocity > 0) {
      this.verticalVelocity -= CONFIG.gravity * dt;
      this.root.position.y = Math.max(0, this.root.position.y + this.verticalVelocity * dt);
      if (this.root.position.y === 0) {
        if (this.prevY > 0.4) {
          this.squashImpact = Math.min(0.35, this.prevY * 0.12); // Landing squash trigger
        }
        this.verticalVelocity = 0;
        this.state = "run";
      }
    }
    this.prevY = this.root.position.y;

    if (this.slideTime > 0) {
      this.slideTime -= dt;
      if (this.slideTime <= 0) this.state = "run";
    }

    if (this.shieldActive) {
      this.shieldMesh.rotation.y += dt * 2.5;
    }

    // Foot dust particle emission control
    if (isGrounded && (this.state === "run" || this.state === "slide")) {
      this.footParticles.emitRate = this.state === "slide" ? 70 : 35;
    } else {
      this.footParticles.emitRate = 0;
    }

    // Update dynamic ground shadow based on jump height
    const heightFactor = Math.max(0, 1 - this.root.position.y / 3.8);
    this.shadowMesh.position.x = this.root.position.x;
    this.shadowMesh.position.z = this.root.position.z;
    this.shadowMesh.scaling.set(0.4 + 0.6 * heightFactor, 0.4 + 0.6 * heightFactor, 1);
    this.shadowMat.alpha = 0.42 * heightFactor;

    this.syncSprite();
  }

  public isJumping(): boolean { return this.root.position.y > 0.75; }
  public isSliding(): boolean { return this.slideTime > 0.08; }

  private syncSprite(): void {
    const sliding = this.isSliding();
    const runningBob = this.state === "run" ? Math.abs(Math.sin(this.elapsed * 13)) * 0.09 : 0;

    // Base dimensions
    let baseW = sliding ? 3.7 : 3.05;
    let baseH = sliding ? 2.85 : 4.58;

    // Apply Squash & Stretch physics
    if (this.verticalVelocity > 0.5) {
      // Stretch on jump ascent
      const stretchRatio = Math.min(0.18, this.verticalVelocity * 0.012);
      baseH *= (1 + stretchRatio);
      baseW *= (1 - stretchRatio * 0.5);
    } else if (this.squashImpact > 0.01) {
      // Squash on landing impact
      baseH *= (1 - this.squashImpact);
      baseW *= (1 + this.squashImpact * 0.6);
    }

    this.sprite.width = baseW;
    this.sprite.height = baseH;
    this.sprite.position.set(this.root.position.x, this.root.position.y + (sliding ? 1.35 : 2.22) + runningBob, this.root.position.z);

    // Combine running oscillation with lane shift tilt
    const baseAngle = this.state === "run" ? Math.sin(this.elapsed * 13) * 0.01 : 0;
    this.sprite.angle = baseAngle - this.tilt;
  }
}



