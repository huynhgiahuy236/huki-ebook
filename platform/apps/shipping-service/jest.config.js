module.exports = {
  displayName: 'shipping-service', rootDir: '.', testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }] },
  moduleFileExtensions: ['ts', 'js', 'json'], testEnvironment: 'node',
  moduleNameMapper: {
    '^@huki/shared$': '<rootDir>/../../libs/shared/src/index.ts',
    '^@huki/shared/(.*)$': '<rootDir>/../../libs/shared/src/$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/*.module.ts'],
};
