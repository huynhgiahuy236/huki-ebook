module.exports = {
  displayName: 'api-gateway',
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@huki/shared$': '<rootDir>/../../libs/shared/src/index.ts',
    '^@huki/shared/(.*)$': '<rootDir>/../../libs/shared/src/$1',
  },
};
