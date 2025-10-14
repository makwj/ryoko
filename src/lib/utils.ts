import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Merge or insert an item by `id` into an array in an immutable way
export function mergeById<T extends { id: string }>(
  list: T[],
  item: T,
  { prepend = true }: { prepend?: boolean } = {}
): T[] {
  const index = list.findIndex((x) => x.id === item.id)
  if (index === -1) {
    return prepend ? [item, ...list] : [...list, item]
  }
  const copy = list.slice()
  copy[index] = { ...copy[index], ...item }
  return copy
}
