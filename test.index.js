const expect = require('chai').expect

const [EnsureModifiers] = require('./index')

describe("matchedModifiers", () => {
  it("matches wildcards, fully-qualified keys, and expanded keys", () => {
    let fixture = {
      required: {
        "*": ["wildcard"],
        "*.sol": {
          "*": ["wildcardToWildcard"],
          "Contract.method": ["wildcardToContractMethod"],
          "Contract": {
            "method": ["wildcardToContractNameToMethodName"]
          },
        },
        "*.sol:Contract.method": ["qualifiedContractMethod"],
        "*.sol:Contract": {
          "method": ["qualifiedContractNameToMethodName"],
        },
      }
    }
    let config = {
      rules: {"modifiers/ensure-modifiers": ["error", fixture]}
    }
    let plugin = new EnsureModifiers(null, config, null, "Test.sol")
    let modifiers = plugin.matchedModifiers("Contract", "method")
    expect([...modifiers]).to.have.members([
      "wildcard",
      "qualifiedContractMethod",
      "wildcardToWildcard",
      "wildcardToContractMethod",
      "wildcardToContractNameToMethodName",
      "qualifiedContractNameToMethodName"
    ])
  })

  context("override", () => {
    it("matches a single path", () => {
      let fixture = {
        override: {
          "*.sol": {
            "*": ["wildcardToWildcard"],
            "Contract.method": ["wildcardToContractMethod"],
            "Contract": {
              "method": ["wildcardToContractNameToMethodName"]
            },
          },
          "*.sol:Contract.method": ["qualifiedContractMethod"],
          "*.sol:Contract": {
            "method": ["qualifiedContractNameToMethodName"],
          },
        }
      }
      let config = {
        rules: {"modifiers/ensure-modifiers": ["error", fixture]}
      }
      let plugin = new EnsureModifiers(null, config, null, "Test.sol")
      let modifiers = plugin.matchedModifiers("Contract", "method")
      expect([...modifiers]).to.eql(["qualifiedContractMethod"])
    })

    it("overrides required", () => {
      let fixture = {
        required: {
          "*.sol": {
            "Contract.method": ["wildcardToContractMethod"],
          },
          "*.sol:Contract.method": ["qualifiedContractMethod"],
        },
        override: {
          "*.sol:Contract.method": ["overidden"],
        }
      }
      let config = {
        rules: {"modifiers/ensure-modifiers": ["error", fixture]}
      }
      let plugin = new EnsureModifiers(null, config, null, "Test.sol")
      let modifiers = plugin.matchedModifiers("Contract", "method")
      expect([...modifiers]).to.eql(["overidden"])
    })

    it("overrides with an empty list", () => {
      let fixture = {
        required: {
          "*.sol": {
            "Contract.method": ["wildcardToContractMethod"],
          },
          "*.sol:Contract.method": ["qualifiedContractMethod"],
        },
        override: {
          "*.sol:Contract.method": [],
        }
      }
      let config = {
        rules: {"modifiers/ensure-modifiers": ["error", fixture]}
      }
      let plugin = new EnsureModifiers(null, config, null, "Test.sol")
      let modifiers = plugin.matchedModifiers("Contract", "method")
      expect([...modifiers]).to.eql([])
    })
  })

  context("required", () => {
    it("unions matching modifiers", () => {
      let fixture = {
        required: {
          "*.sol": {
            "Contract.method": ["thing1"],
          },
          "*.sol:Contract.method": ["thing2", "thing3"],
        }
      }
      let config = {
        rules: {"modifiers/ensure-modifiers": ["error", fixture]}
      }
      let plugin = new EnsureModifiers(null, config, null, "Test.sol")
      let modifiers = plugin.matchedModifiers("Contract", "method")
      expect([...modifiers]).to.have.members(["thing1", "thing2", "thing3"])
    })
  })
})
