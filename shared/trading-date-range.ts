const tradingDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function tradingDateParts(now: Date) {
  const parts = Object.fromEntries(
    tradingDateFormatter.formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: parts.year!,
    month: parts.month!,
    day: parts.day!,
  };
}

function utcDate(value: Date) {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function getDefaultTradingDateRange(now = new Date()) {
  const { year, month, day } = tradingDateParts(now);
  const end = new Date(Date.UTC(year, month - 1, day));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  return {
    from: utcDate(start),
    to: utcDate(end),
  };
}
