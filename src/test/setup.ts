import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

afterEach(() => {
  cleanup()
})

// Stub out Supabase so tests never make real network calls.
// The store's Supabase writes are fire-and-forget (void + .catch), so
// returning a resolved promise is enough for all existing store tests.
vi.mock('@/lib/notesDb', () => ({
  notesDb: {
    loadAll: vi.fn().mockResolvedValue({ notes: [], noteOrder: [] }),
    upsert: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    upsertOrder: vi.fn().mockResolvedValue(undefined),
  },
}))
