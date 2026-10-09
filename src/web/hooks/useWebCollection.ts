import type { Query, QueryConstraint, DocumentData } from "firebase/firestore";
import { collection, onSnapshot, query } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { webDb } from "../firebaseWeb";

export function useWebCollection<T extends object>(path: string | null, constraints: QueryConstraint[] = []) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  const key = useMemo(() => constraints.map(item => String(item)).join("|"), [constraints]);

  useEffect(() => {
    setItems([]);
    setError(null);
    setLoading(!!path);
    if (!path) return;
    const base = collection(webDb, path);
    const q = (constraints.length ? query(base, ...constraints) : base) as Query<DocumentData>;
    return onSnapshot(q, snap => {
      setItems(snap.docs.map(row => ({ id: row.id, ...row.data() } as T)));
      setLoading(false);
    }, err => {
      setError(err.message);
      setLoading(false);
    });
    // key intentionally represents constraint identity for simple W1 queries.
  }, [path, key]);

  return { items, loading, error };
}
