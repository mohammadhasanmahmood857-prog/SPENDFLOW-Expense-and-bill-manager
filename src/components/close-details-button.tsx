"use client";

// Closes the <details> menu it sits in, so a phone edit sheet can always be dismissed.
export function CloseDetailsButton() {
  return (
    <button
      type="button"
      className="button button-secondary mt-2 w-full"
      onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}
    >
      Cancel
    </button>
  );
}
