/** Backend paginated list shape (DRF default pagination, unenveloped). */
export interface Page<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}
