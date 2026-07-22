export type InputAction = "left" | "right" | "jump" | "slide" | "pause" | "confirm";

export class InputManager {
  private handlers = new Set<(action: InputAction) => void>();
  private origin: { x: number; y: number } | null = null;
  public constructor(target: HTMLElement) {
    window.addEventListener("keydown", this.onKey);
    target.addEventListener("pointerdown", this.onPointerDown, { passive: true });
    target.addEventListener("pointerup", this.onPointerUp, { passive: true });
  }
  public on(handler: (action: InputAction) => void): void { this.handlers.add(handler); }
  public dispose(): void { window.removeEventListener("keydown", this.onKey); }
  private emit(action: InputAction): void { this.handlers.forEach((handler) => handler(action)); }
  private onKey = (event: KeyboardEvent): void => {
    const actions: Record<string, InputAction> = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", ArrowUp: "jump", w: "jump", W: "jump", " ": "jump", ArrowDown: "slide", s: "slide", S: "slide", Escape: "pause", p: "pause", P: "pause", Enter: "confirm" };
    const action = actions[event.key];
    if (action) { event.preventDefault(); this.emit(action); }
  };
  private onPointerDown = (event: PointerEvent): void => { this.origin = { x: event.clientX, y: event.clientY }; };
  private onPointerUp = (event: PointerEvent): void => {
    if (!this.origin) return;
    const x = event.clientX - this.origin.x; const y = event.clientY - this.origin.y; this.origin = null;
    const threshold = 25;
    if (Math.max(Math.abs(x), Math.abs(y)) < threshold) { this.emit("confirm"); return; }
    if (Math.abs(x) > Math.abs(y)) this.emit(x > 0 ? "right" : "left"); else this.emit(y < 0 ? "jump" : "slide");
  };
}
