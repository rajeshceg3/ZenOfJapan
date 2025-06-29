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

// Example usage (optional - can be removed or commented out)
// assertTrue(1 === 1, "1 should be equal to 1");
// assertFalse(1 === 0, "1 should not be equal to 0");
