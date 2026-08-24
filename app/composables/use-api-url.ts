export function useApiUrl() {
  const config = useRuntimeConfig();
  const base = `${config.public.tradingApiBase.replace(/\/$/, "")}/`;

  return (path: string | null | undefined) => {
    if (!path) return "";
    return new URL(path, base).toString();
  };
}
