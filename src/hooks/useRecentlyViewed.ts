"use client";

import { useState, useEffect, useCallback } from "react";
import type { Product } from "@/types";

const KEY = "kafunda_recently_viewed";
const MAX = 12;

export function useRecentlyViewed() {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore corrupt data
    }
  }, []);

  const track = useCallback((product: Product) => {
    setItems((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      const next = [product, ...filtered].slice(0, MAX);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(KEY);
    setItems([]);
  }, []);

  return { items, track, clear };
}
