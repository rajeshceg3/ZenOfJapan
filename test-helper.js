// Simple assertion helper
function assertEquals(expected, actual, message) {
  if (expected !== actual) {
    console.error(`Assertion failed: ${message || ''}`);
    console.error(`Expected: ${expected}, Actual: ${actual}`);
  } else {
    console.log(`Assertion passed: ${message || ''}`);
  }
}

function assertTrue(actual, message) {
  assertEquals(true, actual, message);
}

function assertFalse(actual, message) {
  assertEquals(false, actual, message);
}

// --- Mock LocalStorage ---
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

if (typeof window !== 'undefined') {
  try {
    Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage
    });
  } catch(e) {
      // If re-defined in some environments or already exists (but likely readable/writeable in JSDOM)
      // If it exists and is native, we might not be able to overwrite it easily without delete.
      // But for this simple test setup, this is usually enough.
  }
} else if (typeof global !== 'undefined') {
  global.localStorage = mockLocalStorage;
}
