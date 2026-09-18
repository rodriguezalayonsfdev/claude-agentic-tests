const { jestConfig } = require("@salesforce/sfdx-lwc-jest/config");

module.exports = {
  ...jestConfig,
  moduleNameMapper: {
    ...(jestConfig.moduleNameMapper || {}),
    "^lightning/modal$":
      "<rootDir>/force-app/test/jest-mocks/lightning/modal.js"
  },
  modulePathIgnorePatterns: ["<rootDir>/.localdevserver"]
};
