# solhint-plugin-modifiers

[![npm version](https://badge.fury.io/js/solhint-plugin-modifiers.svg)](https://badge.fury.io/js/solhint-plugin-modifiers)

[solhint](https://protofire.github.io/solhint/) plugin for linting function modifiers. Ensure modifiers are present in certain files, contracts, and methods with flexible matching.

## Installation

Available on npm:

```sh
npm install solhint-plugin-modifiers --save-dev
```

## Usage

Enable the plugin in your project's `.solhint.json`:

```json
{
  "extends": "solhint:recommended",
  "plugins": ["modifiers"],
  "rules": {
    "modifiers/ensure-modifiers": ["error", {
      "required": {
        "*": ["onlyAdmin"]
      }
    }]
  },
}
```

The above configuration will require the `onlyAdmin` modifier on all methods for all contracts in all linted files.

You can use globbing to limit the required modifiers:

```json
{
  "required": {
    "contracts/core/*.sol": {
      "Contract.method": ["onlyAdmin"],
      "Contract": {
        "method": ["onlyAdmin"]
      },
    },
    "contracts/core/*.sol:Contract.method": ["onlyAdmin"],
    "contracts/core/*.sol:Contract": {
      "method": ["onlyAdmin"],
    },
  }
}
```

All of the rules in the previous example are equivalent. That is, they require the `onlyAdmin` modifier for `Contract.method` defined inside some solidity file in `contracts/core/`.

The file path, contract name, and method may all be globbed e.g.

```json
{
  "required": {
    "contracts/core/*.sol": {
      "*.transfer": ["onlyAdmin"],
      "Token.*": {
        "transfer": ["onlyMinter"]
      },
    },
  }
}
```

If `Token.transfer` is defined in `contracts/core/Token.sol`, then it will be matched by both rules. Note that matching modifiers are unioned, so `Token.transfer` would require both `onlyAdmin` and `onlyMinter` modifiers.

### Overrides

You might want to require a modifier everywhere by default but explicitly override the requirement for some methods. You can use the `override` key to achieve this:

```json
{
  "required": {
    "*": ["onlyAdmin"]
  },
  "override": {
    "*.sol:Contract.method": []
  }
}
```

With this configuration, `Contract.method` is overridden to require no modifiers, but all other methods require the `onlyAdmin` modifier.

### Other configuration options

Default configuration is:

```json
{
      "ignoreVisibility": ["internal"],
      "ignoreStateMutability": ["view", "pure"],
      "ignoreContractKind": ["abstract", "interface"],
      "verbose": false,
      "required": {},
      "override": {}
}
```

In other words, `internal`, `view`, and `pure` methods are ignored by default, as are methods in `abstract` or `interface` contracts.
