import { Color3, Mesh, MeshBuilder, StandardMaterial, TransformNode, Vector3 } from "@babylonjs/core";
import { CONFIG, type PowerupKind } from "../game/GameConfig";

export type ObstacleKind = "normal" | "jump" | "slide";
export type WorldObject = { mesh: Mesh; lane: number; kind: ObstacleKind | "medal" | PowerupKind; localZ: number; collected: boolean };
type Segment = { root: TransformNode; objects: WorldObject[]; index: number };

export class TrackManager {
  private readonly segments: Segment[] = [];
  private readonly mats = new Map<string, StandardMaterial>();
  private readonly pools = new Map<string, Mesh[]>();

  public constructor() {
    for (let index = 0; index < CONFIG.segmentCount; index += 1) this.segments.push(this.createSegment(index));
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
    const road = MeshBuilder.CreateBox("road", { width: 12.6, height: 0.15, depth: CONFIG.segmentLength });
    road.parent = root;
    road.material = this.mat("road", "#1b2025");

    for (const x of [-5.3, 5.3]) {
      const sidewalk = MeshBuilder.CreateBox("sidewalk", { width: 1.4, height: 0.28, depth: CONFIG.segmentLength });
      sidewalk.parent = root;
      sidewalk.position.x = x;
      sidewalk.position.y = 0.08;
      sidewalk.material = this.mat("sidewalk", "#5f6467");
    }

    for (const x of [-1.6, 1.6]) {
      for (let z = -14; z < 16; z += 4.3) {
        const line = MeshBuilder.CreateBox("lane-mark", { width: 0.13, height: 0.03, depth: 2.25 });
        line.parent = root;
        line.position = new Vector3(x, 0.11, z);
        line.material = this.mat("mark", "#e9e5d9");
      }
    }

    for (let z = -12; z < 16; z += 8) {
      for (const side of [-1, 1]) {
        const pole = MeshBuilder.CreateCylinder("lamp", { height: 5.5, diameter: 0.13, tessellation: 6 });
        pole.parent = root;
        pole.position = new Vector3(side * 5.8, 2.8, z);
        pole.material = this.mat("pole", "#242629");

        const light = MeshBuilder.CreateSphere("lamp-light", { diameter: 0.46, segments: 8 });
        light.parent = root;
        light.position = new Vector3(side * 5.8, 5.45, z);
        light.material = this.mat("light", "#f6c739", true);
      }
    }

    for (const z of [-9, 7]) this.addBuilding(root, -9, z, index);
    for (const z of [-1, 14]) this.addBuilding(root, 9, z, index + 3);

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
    const height = 4 + (seed % 3) * 2;
    const building = MeshBuilder.CreateBox("building", { width: 4.5, height, depth: 6 });
    building.parent = root;
    building.position = new Vector3(x, height / 2, z);
    building.material = this.mat(`building-${seed % 3}`, ["#30373d", "#3c4148", "#28323b"][seed % 3]);

    const banner = MeshBuilder.CreateBox("urbtrain-banner", { width: 2.8, height: 0.8, depth: 0.05 });
    banner.parent = root;
    banner.position = new Vector3(x + (x < 0 ? 2.27 : -2.27), height * 0.65, z);
    banner.material = this.mat("banner", CONFIG.colors.yellow);
  }

  private mat(name: string, color: string, emissive = false): StandardMaterial {
    const existing = this.mats.get(name);
    if (existing) return existing;
    const material = new StandardMaterial(name);
    material.diffuseColor = Color3.FromHexString(color);
    material.specularColor = Color3.Black();
    if (emissive) material.emissiveColor = Color3.FromHexString(color).scale(0.45);
    this.mats.set(name, material);
    return material;
  }
}

