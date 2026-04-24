import { makeAutoObservable } from "mobx";

export type SortKey =
  | "recent"
  | "mostDone"
  | "mostCorrect"
  | "mostWrong"
  | "lowestScore";

export class UIStore {
  type: string = "ALL";
  difficulty: string = "ALL";
  source: string = "ALL";
  sort: SortKey = "recent";
  wrongOnly: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }

  setType(t: string) {
    this.type = t;
  }
  setDifficulty(d: string) {
    this.difficulty = d;
  }
  setSource(s: string) {
    this.source = s;
  }
  setSort(s: SortKey) {
    this.sort = s;
  }
  setWrongOnly(v: boolean) {
    this.wrongOnly = v;
  }

  toQuery(): string {
    const p = new URLSearchParams();
    if (this.type !== "ALL") p.set("type", this.type);
    if (this.difficulty !== "ALL") p.set("difficulty", this.difficulty);
    if (this.source !== "ALL") p.set("source", this.source);
    p.set("sort", this.sort);
    if (this.wrongOnly) p.set("wrongOnly", "1");
    return p.toString();
  }
}

export class RootStore {
  ui = new UIStore();
}
