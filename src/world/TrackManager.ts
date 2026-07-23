import { Color3, Mesh, MeshBuilder, ParticleSystem, StandardMaterial, Texture, TransformNode, Vector3 } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core";
import { CONFIG, type PowerupKind } from "../game/GameConfig";

export type ObstacleKind = "normal" | "jump" | "slide";
export type WorldObject = { mesh: Mesh; lane: number; kind: ObstacleKind | "medal" | PowerupKind; localZ: number; collected: boolean };
type Segment = { root: TransformNode; objects: WorldObject[]; index: number };

export class TrackManager {
  private readonly segments: Segment[] = [];
  private readonly mats = new Map<string, StandardMaterial>();
  private readonly pools = new Map<string, Mesh[]>();
  private coinFXSystem?: ParticleSystem;

  public constructor(scene?: Scene) {
    for (let index = 0; index < CONFIG.segmentCount; index += 1) this.segments.push(this.createSegment(index));

    if (scene) {
      this.coinFXSystem = new ParticleSystem("coinSparkles", 80, scene);
      this.coinFXSystem.particleTexture = new Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADEDt6AFgAAAEdJREFUGFdjZEACjEAZlAYxGIA0gACImQERQBYD0cACDAwMDP8ZgAQyG0wABEEa0AWQxf8zMEC8gwkgyiBqgTpwGgC2F5tGAB3IDh7eS3WcAAAAAElFTkSuQmCC", scene);
      this.coinFXSystem.emitter = new Vector3(0, 0, 0);
      this.coinFXSystem.color1 = new Color3(1.0, 0.84, 0.0).toColor4(1.0);
      this.coinFXSystem.color2 = new Color3(1.0, 0.5, 0.0).toColor4(0.8);
      this.coinFXSystem.minSize = 0.2;
      this.coinFXSystem.maxSize = 0.5;
      this.coinFXSystem.minLifeTime = 0.2;
      this.coinFXSystem.maxLifeTime = 0.4;
      this.coinFXSystem.emitRate = 0;
      this.coinFXSystem.direction1 = new Vector3(-1, 1, -1);
      this.coinFXSystem.direction2 = new Vector3(1, 2, 1);
      this.coinFXSystem.minEmitPower = 2.0;
      this.coinFXSystem.maxEmitPower = 4.5;
      this.coinFXSystem.start();
    }
  }

  public triggerCoinFX(position: Vector3): void {
    if (this.coinFXSystem) {
      this.coinFXSystem.emitter = position.clone();
      this.coinFXSystem.manualEmitCount = 18;
    }
  }

  public reset(): void {
    this.segments.forEach((segment, index) => {
      segment.root.position.z = index * CONFIG.segmentLength;
      this.populate(segment, index < 2);
    });
  }

  public update(dt: number, speed: number, runnerPosition?: Vector3, isMagnetActive?: boolean): void {
    for (const segment of this.segments) {
      segment.root.position.z -= speed * dt;
      if (segment.root.position.z < -CONFIG.segmentLength) {
        const furthest = Math.max(...this.segments.map((candidate) => candidate.root.position.z));
        segment.root.position.z = furthest + CONFIG.segmentLength;
        this.populate(segment, false);
      }

      // Rotate medals and powerups
      for (const object of segment.objects) {
        if (object.collected) continue;
        if (object.kind === "medal" || object.kind === "magnet" || object.kind === "shield") {
          object.mesh.rotation.y += dt * 3.2;

          // Magnet animated pull effect towards runner
          if (isMagnetActive && runnerPosition && object.kind === "medal") {
            const worldPos = object.mesh.getAbsolutePosition();
            const distZ = worldPos.z - runnerPosition.z;
            if (distZ > 0 && distZ < 10) {
              const pullSpeed = 24 * dt;
              object.mesh.position.x += (runnerPosition.x - object.mesh.position.x) * Math.min(1, pullSpeed);
              object.mesh.position.y += (1.4 - object.mesh.position.y) * Math.min(1, pullSpeed);
            }
          }
        }
      }
    }
  }

  public forEachObject(callback: (item: WorldObject, worldPosition: Vector3) => void): void {
    for (const segment of this.segments) {
      for (const object of segment.objects) {
        if (!object.collected) callback(object, object.mesh.getAbsolutePosition());
      }
    }
  }

  private createSegment(index: number): Segment {
    const root = new TransformNode(`segment-${index}`);

    // Light grey asphalt road (day look)
    const road = MeshBuilder.CreateBox("road", { width: 12.6, height: 0.15, depth: CONFIG.segmentLength });
    road.parent = root;
    road.material = this.mat("road", "#adb5b0");

    // White lane dividers (day road markings)
    for (const x of [-1.6, 1.6]) {
      for (let z = -14; z < 16; z += 4.3) {
        const line = MeshBuilder.CreateBox("lane-mark", { width: 0.14, height: 0.03, depth: 2.1 });
        line.parent = root;
        line.position = new Vector3(x, 0.11, z);
        line.material = this.mat("mark-white", "#f5f5f0");
      }
    }

    // Green grass strips on both sides
    for (const x of [-7.0, 7.0]) {
      const grass = MeshBuilder.CreateBox("grass", { width: 4.5, height: 0.12, depth: CONFIG.segmentLength });
      grass.parent = root;
      grass.position = new Vector3(x, 0.0, 0);
      grass.material = this.mat("grass", "#5aa83c");
    }

    // Sidewalk / curb (light concrete)
    for (const x of [-5.1, 5.1]) {
      const sidewalk = MeshBuilder.CreateBox("sidewalk", { width: 1.5, height: 0.22, depth: CONFIG.segmentLength });
      sidewalk.parent = root;
      sidewalk.position.x = x;
      sidewalk.position.y = 0.05;
      sidewalk.material = this.mat("sidewalk", "#d4c9a8");
    }

    // Wooden lamp posts with warm daylight globes
    for (let z = -12; z < 16; z += 8) {
      for (const side of [-1, 1]) {
        const pole = MeshBuilder.CreateCylinder("lamp", { height: 5.5, diameter: 0.15, tessellation: 8 });
        pole.parent = root;
        pole.position = new Vector3(side * 5.8, 2.8, z);
        pole.material = this.mat("wooden-pole", "#8b6343");

        // Simple dome lamp cap
        const cap = MeshBuilder.CreateSphere("lamp-cap", { diameter: 0.55, segments: 8 });
        cap.parent = root;
        cap.position = new Vector3(side * 5.8, 5.5, z);
        cap.material = this.mat("lamp-cap", "#e8e4d8");
      }
    }

    // Trees in the grass strip
    for (const zOff of [-10, -2, 6, 14]) {
      for (const sideX of [-7.8, 7.8]) {
        // Trunk
        const trunk = MeshBuilder.CreateCylinder(`tree-trunk-${sideX}-${zOff}`, { height: 2.2, diameter: 0.35, tessellation: 8 });
        trunk.parent = root;
        trunk.position = new Vector3(sideX, 1.1, zOff + (index % 3) * 1.5);
        trunk.material = this.mat("tree-trunk", "#7a5230");

        // Canopy (round foliage)
        const canopy = MeshBuilder.CreateSphere(`tree-canopy-${sideX}-${zOff}`, { diameter: 2.6, segments: 7 });
        canopy.parent = root;
        canopy.position = new Vector3(sideX, 3.3, zOff + (index % 3) * 1.5);
        canopy.material = this.mat(`tree-leaf-${(index + Math.abs(sideX | 0)) % 3}`, ["#3a8c2a", "#4aab34", "#2e7520"][(index + Math.abs(sideX | 0)) % 3]);
      }
    }

    for (const z of [-9, 7]) this.addBuilding(root, -10, z, index);
    for (const z of [-1, 14]) this.addBuilding(root, 10, z, index + 3);


    return { root, objects: [], index };
  }

  private populate(segment: Segment, introductory: boolean): void {
    // Return meshes to object pool instead of disposing
    for (const object of segment.objects) {
      object.mesh.setEnabled(false);
      object.mesh.parent = null;
      const poolKey = object.kind;
      let pool = this.pools.get(poolKey);
      if (!pool) { pool = []; this.pools.set(poolKey, pool); }
      pool.push(object.mesh);
    }
    segment.objects = [];

    const spacing = introductory ? 14 : 9 + Math.random() * 3;
    for (let localZ = 8; localZ < CONFIG.segmentLength - 2; localZ += spacing) {
      const obstacleChance = introductory ? (localZ > 16 ? 0.35 : 0) : 0.45;
      if (Math.random() < obstacleChance) {
        // Guaranteed at least 1 safe lane per obstacle row
        const safeLane = Math.floor(Math.random() * 3);
        const count = Math.random() < 0.5 ? 2 : 1;
        for (let lane = 0; lane < 3; lane += 1) {
          if (lane === safeLane || (count === 1 && Math.random() > 0.45)) continue;
          this.addObstacle(segment, lane, localZ);
        }
      }
      const medalLane = Math.floor(Math.random() * 3);
      this.addMedal(segment, medalLane, localZ + 3);

      if (!introductory && Math.random() < 0.09) {
        this.addPowerup(segment, Math.floor(Math.random() * 3), localZ + 1.4, Math.random() < 0.5 ? "magnet" : "shield");
      }
    }
  }

  private getPooledMesh(kind: string, createFn: () => Mesh): Mesh {
    const pool = this.pools.get(kind);
    if (pool && pool.length > 0) {
      const mesh = pool.pop()!;
      mesh.setEnabled(true);
      return mesh;
    }
    return createFn();
  }

  private addObstacle(segment: Segment, lane: number, localZ: number): void {
    const roll = Math.random();
    const kind: ObstacleKind = roll < 0.45 ? "normal" : roll < 0.72 ? "jump" : "slide";

    const mesh = this.getPooledMesh(kind, () => {
      if (kind === "jump") {
        const m = MeshBuilder.CreateBox("barrier", { width: 2.15, height: 0.75, depth: 0.38 });
        m.material = this.mat("yellow", CONFIG.colors.yellow);
        return m;
      } else if (kind === "slide") {
        const m = MeshBuilder.CreateBox("overhead-sign", { width: 2.25, height: 0.5, depth: 0.38 });
        m.material = this.mat("black", CONFIG.colors.black);
        const post = MeshBuilder.CreateCylinder("sign-post", { height: 2.25, diameter: 0.12, tessellation: 6 });
        post.parent = m;
        post.position = new Vector3(-0.92, -1.15, 0);
        post.material = this.mat("yellow", CONFIG.colors.yellow);
        return m;
      } else {
        const m = MeshBuilder.CreateCylinder("cone", { height: 1.25, diameterTop: 0.25, diameterBottom: 0.85, tessellation: 8 });
        m.material = this.mat("orange", "#f07b27");
        return m;
      }
    });

    mesh.parent = segment.root;
    mesh.position.x = CONFIG.lanes[lane];
    mesh.position.z = localZ;
    mesh.position.y = kind === "jump" ? 0.48 : kind === "slide" ? 2.35 : 0.66;
    segment.objects.push({ mesh, lane, kind, localZ, collected: false });
  }

  private addMedal(segment: Segment, lane: number, localZ: number): void {
    const mesh = this.getPooledMesh("medal", () => {
      const m = MeshBuilder.CreateTorus("medal", { diameter: 0.72, thickness: 0.18, tessellation: 10 });
      m.rotation.x = Math.PI / 2;
      m.material = this.mat("gold", CONFIG.colors.yellow, true);
      return m;
    });

    mesh.parent = segment.root;
    mesh.position = new Vector3(CONFIG.lanes[lane], 1.45, localZ);
    segment.objects.push({ mesh, lane, kind: "medal", localZ, collected: false });
  }

  private addPowerup(segment: Segment, lane: number, localZ: number, kind: PowerupKind): void {
    const mesh = this.getPooledMesh(kind, () => {
      const m = MeshBuilder.CreatePolyhedron(kind, { type: 1, size: 0.62 });
      m.material = this.mat(kind, kind === "shield" ? "#62d6ff" : CONFIG.colors.yellow, true);
      return m;
    });

    mesh.parent = segment.root;
    mesh.position = new Vector3(CONFIG.lanes[lane], 1.45, localZ);
    segment.objects.push({ mesh, lane, kind, localZ, collected: false });
  }

  private addBuilding(root: TransformNode, x: number, z: number, seed: number): void {
    const height = 5 + (seed % 4) * 2;
    const building = MeshBuilder.CreateBox("building", { width: 4.5, height, depth: 6 });
    building.parent = root;
    building.position = new Vector3(x, height / 2, z);
    // Warm daytime building colors (creams, clay, warm whites)
    const buildingColors = ["#e8d5b0", "#d4c69a", "#c9b58a", "#e2c9a0"];
    building.material = this.mat(`building-${seed % 4}`, buildingColors[seed % 4]);

    // Roof (terracotta / red tile)
    const roof = MeshBuilder.CreateBox("roof", { width: 4.7, height: 0.4, depth: 6.2 });
    roof.parent = root;
    roof.position = new Vector3(x, height + 0.2, z);
    roof.material = this.mat("roof", "#b55a2a");
  }

  private mat(name: string, color: string, emissive = false): StandardMaterial {
    const existing = this.mats.get(name);
    if (existing) return existing;
    const material = new StandardMaterial(name);
    material.diffuseColor = Color3.FromHexString(color);
    material.specularColor = Color3.Black();
    // No emissive in daytime theme; preserve subtle highlights for medals/powerups only
    if (emissive) material.emissiveColor = Color3.FromHexString(color).scale(0.2);
    this.mats.set(name, material);
    return material;
  }
}


