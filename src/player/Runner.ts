import { Color3, Mesh, MeshBuilder, StandardMaterial, TransformNode, Vector3 } from "@babylonjs/core";
import { CONFIG } from "../game/GameConfig";

export type RunnerState = "idle" | "run" | "jump" | "slide" | "hit";

export class Runner {
  public readonly root = new TransformNode("runner");
  public state: RunnerState = "idle";
  public lane = 1;
  public verticalVelocity = 0;
  public slideTime = 0;
  private readonly torso: Mesh;
  private readonly leftArm: TransformNode;
  private readonly rightArm: TransformNode;
  private readonly leftLeg: TransformNode;
  private readonly rightLeg: TransformNode;
  private elapsed = 0;
  public constructor() {
    const skin = this.mat("skin", "#b97951"); const shirt = this.mat("shirt", CONFIG.colors.black); const yellow = this.mat("yellow", CONFIG.colors.yellow); const shoe = this.mat("shoe", CONFIG.colors.white); const dark = this.mat("dark", "#1a1210");
    this.root.position = new Vector3(0, 0, 0);
    this.torso = MeshBuilder.CreateBox("runner-torso", { width: 1.15, height: 1.55, depth: 0.55 }); this.torso.parent = this.root; this.torso.position.y = 2.2; this.torso.material = shirt;
    const stripe = MeshBuilder.CreateBox("runner-stripe", { width: 1.2, height: 0.17, depth: 0.58 }); stripe.parent = this.root; stripe.position.y = 2.45; stripe.material = yellow;
    const head = MeshBuilder.CreateSphere("runner-head", { diameter: 0.9, segments: 12 }); head.parent = this.root; head.position.y = 3.45; head.material = skin; this.addDirectionDetails(dark, yellow);
    this.leftArm = this.limb("left-arm", -0.8, 2.7, skin); this.rightArm = this.limb("right-arm", 0.8, 2.7, skin);
    this.leftLeg = this.limb("left-leg", -0.33, 1.25, shirt); this.rightLeg = this.limb("right-leg", 0.33, 1.25, shirt);
    for (const x of [-0.33, 0.33]) { const foot = MeshBuilder.CreateBox("runner-shoe", { width: 0.38, height: 0.22, depth: 0.72 }); foot.parent = this.root; foot.position = new Vector3(x, 0.2, 0.15); foot.material = shoe; }
  }
  public reset(): void { this.root.position.set(CONFIG.lanes[1], 0, 0); this.lane = 1; this.verticalVelocity = 0; this.slideTime = 0; this.state = "run"; }
  public move(delta: number): void { this.lane = Math.max(0, Math.min(2, this.lane + delta)); }
  public jump(): void { if (this.root.position.y < 0.02 && this.slideTime <= 0) { this.verticalVelocity = CONFIG.jumpVelocity; this.state = "jump"; } }
  public slide(): void { if (this.root.position.y < 0.02 && this.slideTime <= 0) { this.slideTime = CONFIG.slideDuration; this.state = "slide"; } }
  public update(dt: number): void {
    this.elapsed += dt; this.root.position.x += (CONFIG.lanes[this.lane] - this.root.position.x) * Math.min(1, dt * 13);
    if (this.root.position.y > 0 || this.verticalVelocity > 0) { this.verticalVelocity -= CONFIG.gravity * dt; this.root.position.y = Math.max(0, this.root.position.y + this.verticalVelocity * dt); if (this.root.position.y === 0) { this.verticalVelocity = 0; this.state = "run"; } }
    if (this.slideTime > 0) { this.slideTime -= dt; this.torso.scaling.y = 0.62; this.torso.position.y = 1.72; if (this.slideTime <= 0) { this.torso.scaling.y = 1; this.torso.position.y = 2.2; this.state = "run"; } }
    const swing = this.state === "run" ? Math.sin(this.elapsed * 14) * 0.75 : 0;
    this.leftArm.rotation.x = swing; this.rightArm.rotation.x = -swing; this.leftLeg.rotation.x = -swing; this.rightLeg.rotation.x = swing;
  }
  public isJumping(): boolean { return this.root.position.y > 0.75; }
  public isSliding(): boolean { return this.slideTime > 0.08; }
  private addDirectionDetails(dark: StandardMaterial, yellow: StandardMaterial): void {\n    // The runner faces positive Z (towards the horizon); the camera sees the yellow mark on their back.\n    for (const x of [-0.17, 0.17]) { const eye = MeshBuilder.CreateSphere("runner-eye", { diameter: 0.12, segments: 6 }); eye.parent = this.root; eye.position = new Vector3(x, 3.48, 0.43); eye.material = dark; }\n    for (const x of [-0.22, 0.22]) { const side = MeshBuilder.CreateBox("back-u", { width: 0.13, height: 0.43, depth: 0.04 }); side.parent = this.root; side.position = new Vector3(x, 2.18, -0.296); side.material = yellow; }\n    const base = MeshBuilder.CreateBox("back-u-base", { width: 0.55, height: 0.13, depth: 0.04 }); base.parent = this.root; base.position = new Vector3(0, 2.02, -0.296); base.material = yellow;\n  }\n  private limb(name: string, x: number, y: number, material: StandardMaterial): TransformNode { const node = new TransformNode(name); node.parent = this.root; node.position = new Vector3(x, y, 0); const mesh = MeshBuilder.CreateBox(`${name}-mesh`, { width: 0.3, height: 1.2, depth: 0.3 }); mesh.parent = node; mesh.position.y = -0.5; mesh.material = material; return node; }
  private mat(name: string, color: string): StandardMaterial { const material = new StandardMaterial(name); material.diffuseColor = Color3.FromHexString(color); material.specularColor = Color3.Black(); return material; }
}
