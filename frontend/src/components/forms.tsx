import { useRef } from "react";
export function useIdempotency() {
  const last = useRef({ payload: "", key: "" });
  return (body: unknown) => {
    const payload = JSON.stringify(body);
    if (payload !== last.current.payload)
      last.current = { payload, key: crypto.randomUUID() };
    return last.current.key;
  };
}
