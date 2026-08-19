import { useCallback, useEffect, useState } from "react";
import {
  loadCatalogue,
  onCatalogueInvalidated,
  type Catalogue,
} from "@/db/catalogue";

const EMPTY: Catalogue = {
  symptoms: [],
  moods: [],
  medications: [],
  birthControl: [],
};

/**
 * Subscription only. The rules are in db/catalogue.ts; this re-reads when that
 * module says the Catalogue changed.
 */
export function useCatalogue(): Catalogue {
  const [catalogue, setCatalogue] = useState<Catalogue>(EMPTY);

  const refresh = useCallback(() => {
    let stale = false;
    loadCatalogue().then((next) => {
      if (!stale) setCatalogue(next);
    });
    return () => {
      stale = true;
    };
  }, []);

  useEffect(() => {
    const cancel = refresh();
    const unsubscribe = onCatalogueInvalidated(() => refresh());
    return () => {
      cancel();
      unsubscribe();
    };
  }, [refresh]);

  return catalogue;
}
