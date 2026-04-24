"use client";

import { createContext, ReactNode, useContext, useState } from "react";
import { RootStore } from "./rootStore";

const StoreContext = createContext<RootStore | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new RootStore());
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStores(): RootStore {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStores must be used within StoreProvider");
  return ctx;
}
