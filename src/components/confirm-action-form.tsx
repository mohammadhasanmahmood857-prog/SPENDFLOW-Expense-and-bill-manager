"use client";

import type { FormEvent, ReactNode } from "react";

type ServerAction = (formData: FormData) => void | Promise<void>;

export function ConfirmActionForm({
  action,
  message,
  className,
  children,
}: {
  action: ServerAction;
  message: string;
  className?: string;
  children: ReactNode;
}) {
  function confirmSubmission(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(message)) event.preventDefault();
  }

  return <form action={action} className={className} onSubmit={confirmSubmission}>{children}</form>;
}
