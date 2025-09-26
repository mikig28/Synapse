const { describe, it, test, expect, beforeAll, beforeEach, afterAll, afterEach } = require('@jest/globals');

const vi = {
  fn: (...args) => jest.fn(...args),
  spyOn: (...args) => jest.spyOn(...args),
  mock: (...args) => jest.mock(...args),
  clearAllMocks: () => jest.clearAllMocks(),
  resetAllMocks: () => jest.resetAllMocks(),
  restoreAllMocks: () => jest.restoreAllMocks(),
  useFakeTimers: (options) => jest.useFakeTimers(options),
  useRealTimers: () => jest.useRealTimers(),
  advanceTimersByTime: (ms) => jest.advanceTimersByTime(ms),
};

module.exports = {
  describe,
  it,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  vi,
};
