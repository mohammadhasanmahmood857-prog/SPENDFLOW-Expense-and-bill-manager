const PAKISTAN_TIME_ZONE = "Asia/Karachi";

export function pakistanDateParts(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PAKISTAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: "year" | "month" | "day") => Number(parts.find((item) => item.type === type)?.value);
  const year = part("year");
  const month = part("month");
  const day = part("day");
  return {
    year,
    month,
    day,
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

export function formatPakistanDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString("en-PK", {
    timeZone: PAKISTAN_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPakistanTimestampDate(value: string) {
  return pakistanDateParts(new Date(value)).date;
}
