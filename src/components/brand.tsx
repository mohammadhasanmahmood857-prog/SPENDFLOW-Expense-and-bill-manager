import { WalletCards } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="brand-mark grid size-9 place-items-center rounded-xl bg-[#265be8] text-white">
        <WalletCards size={19} strokeWidth={2.2} />
      </span>
      {!compact && <span className="brand-name text-[17px] font-bold tracking-[-.04em]">spendflow</span>}
    </span>
  );
}
