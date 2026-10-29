import type { ReactNode } from "react";

export function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display text-2xl leading-tight">{title}</h1>
        <p className="mt-2 max-w-[620px] text-sm leading-6 text-[#788480]">{description}</p>
      </div>
      {action}
    </div>
  );
}
