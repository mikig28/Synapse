/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // Use jsdom for browser-like environment, which includes File API
  moduleNameMapper: {
    // If you have module aliases in tsconfig.json, map them here
    // Example: '^@components/(.*)$': '<rootDir>/src/components/$1'
    '^@/(.*)$': '<rootDir>/src/frontend/src/$1', // Added for @/ alias
    // Mock for UI component libraries and icons
    '^@radix-ui/react-slot$': '<rootDir>/src/frontend/src/services/__mocks__/radixMock.js', // Path to a generic mock
    '^lucide-react$': '<rootDir>/src/frontend/src/services/__mocks__/lucideMock.js', // Path to a generic mock for lucide
    '^class-variance-authority$': '<rootDir>/src/frontend/src/services/__mocks__/classVarianceAuthorityMock.js', // Mock for cva
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      // ts-jest configuration options
      tsconfig: 'src/frontend/tsconfig.json', // Point to the frontend tsconfig
    }]
  },
  // Automatically clear mock calls, instances and results before every test
  clearMocks: true,
};
