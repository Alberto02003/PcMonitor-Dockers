import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

// Mock window.__TAURI_INTERNALS__ for isTauri() check
Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: {},
  writable: true,
  configurable: true,
})

// Mock window.__TAURI__ for isTauri() check
Object.defineProperty(window, '__TAURI__', {
  value: undefined,
  writable: true,
  configurable: true,
})

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    subtle: {
      generateKey: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      exportKey: vi.fn(),
      importKey: vi.fn(),
    },
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    },
  },
})

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: vi.fn((key) => localStorageMock.store[key] || null),
  setItem: vi.fn((key, value) => {
    localStorageMock.store[key] = value
  }),
  removeItem: vi.fn((key) => {
    delete localStorageMock.store[key]
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {}
  }),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.store = {}
})
