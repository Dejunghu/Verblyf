import { isDemoInventory } from '@/lib/config';

/**
 * Eén regel bovenaan de site zolang er voorbeelddata onder zit. Bewust niet
 * weg te klikken: een bezoeker die een kamer probeert te boeken moet weten
 * dat het hotel niet bestaat.
 */
export function DemoNotice() {
  if (!isDemoInventory()) return null;

  return (
    <div className="border-b border-line bg-surface-2 px-6 py-2 text-center text-[13px] text-ink-soft">
      Voorbeeldversie — de getoonde hotels en prijzen zijn fictief. Er wordt niets gereserveerd en
      niets afgeschreven.
    </div>
  );
}
