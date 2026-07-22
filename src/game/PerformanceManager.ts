import type { Engine } from "@babylonjs/core";
import type { Quality } from "./GameConfig";

export class PerformanceManager {
  private manualQuality: Quality;
  private frameSamples: number[] = [];
  private sampleTimer = 0;

  public constructor(private readonly engine: Engine, quality: Quality) {
    this.manualQuality = quality;
    this.apply(quality);
  }

  public apply(quality: Quality): void {
    this.manualQuality = quality;
    const detected = navigator.hardwareConcurrency <= 4 ? "low" : navigator.hardwareConcurrency <= 6 ? "medium" : "high";
    const profile = quality === "auto" ? detected : quality;
    this.engine.setHardwareScalingLevel(profile === "high" ? 1 : profile === "medium" ? 1.25 : 1.55);
  }

  public update(dt: number): void {
    if (this.manualQuality !== "auto") return;
    this.sampleTimer += dt;
    this.frameSamples.push(dt);
    if (this.sampleTimer < 4) return;
    const average = this.frameSamples.reduce((sum, frame) => sum + frame, 0) / this.frameSamples.length;
    if (average > 0.04) this.engine.setHardwareScalingLevel(Math.min(1.8, this.engine.getHardwareScalingLevel() + 0.12));
    this.frameSamples = [];
    this.sampleTimer = 0;
  }
}
