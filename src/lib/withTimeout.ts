/**
 * Reject a pending request after {@link REQUEST_TIMEOUT_MS} so a dropped or
 * stalled connection surfaces as an error (with a "Повторить" button) instead
 * of a spinner that never resolves.
 */
export const REQUEST_TIMEOUT_MS = 20_000

export function withTimeout<T>(promise: Promise<T>, ms = REQUEST_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error('Превышено время ожидания ответа. Проверьте соединение и повторите.'),
        ),
      ms,
    )
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}
