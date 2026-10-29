export function Notice({ message, type = "error" }: { message?: string; type?: "error" | "success" | "notice" }) {
  if (!message) return null;
  const style = type === "error"
    ? "border-[#f0d7d4] bg-[#fff5f4] text-[#a9433a]"
    : type === "success"
      ? "border-[#d7ebdf] bg-[#f0faf4] text-[#25704f]"
      : "border-[#dce5fb] bg-[#f2f6ff] text-[#36589f]";
  return <p role={type === "error" ? "alert" : "status"} className={`mb-5 rounded-lg border px-4 py-3 text-sm ${style}`}>{message}</p>;
}
