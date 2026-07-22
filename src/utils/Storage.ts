import type { Quality } from "../game/GameConfig";

const KEY = "urbtrain-game";
type Settings = { best: number; sound: boolean; vibration: boolean; quality: Quality; totalMedals: number; games: number; tutorial: boolean };
const defaults: Settings = { best: 0, sound: true, vibration: true, quality: "auto", totalMedals: 0, games: 0, tutorial: false };

export class Storage {
  private data: Settings;
  public constructor() {
    try { this.data = { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") } as Settings; }
    catch { this.data = { ...defaults }; }
  }
  public get<K extends keyof Settings>(key: K): Settings[K] { return this.data[key]; }
  public set<K extends keyof Settings>(key: K, value: Settings[K]): void { this.data[key] = value; this.save(); }
  public increase<K extends "totalMedals" | "games">(key: K, amount = 1): void { this.data[key] += amount; this.save(); }
  private save(): void { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* Browser storage can be disabled. */ } }
}
