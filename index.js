const merge = require('deepmerge')
const minimatch = require('minimatch')

class EnsureModifiers {
  constructor(reporter, config, inputSrc, fileName) {
    this.ruleId = 'ensure-modifiers'
    this.reporter = reporter
    this.config = config
    this.inputSrc = inputSrc
    this.fileName = fileName

    this.context = []

    let defaultOpts = {
      ignoreVisibility: ["internal"],
      ignoreStateMutability: ["view", "pure"],
      ignoreContractKind: ["abstract", "interface"],
      required: {},
      override: {}
    }
    let userOpts = config.rules['modifiers/ensure-modifiers'][1] || {}
    this.opts = merge(defaultOpts, userOpts)
  }

  ContractDefinition(ctx) {
    this.context.pop()
    this.context.push(ctx)
  }

  matchRules(rules, thing) {
    let modifiers = new Set()
    let nested = {}
    let matched = false

    if (!rules) {
      return {modifiers, nested, matched} 
    }

    Object.keys(rules).forEach((rule) => {
      if (minimatch(thing, rule, {matchBase: true})) {
        if (Array.isArray(rules[rule])) {
          matched = true
          rules[rule].forEach((r) => {
            modifiers.add(r)
          })
        } else {
          nested = {...nested, ...rules[rule]}
        }
      }
    })

    return {modifiers, nested, matched}
  }

  matchContractOrMethod(rules, contractName, functionName) {
    let modifiers = new Set()
    let contractMethod = `${contractName}.${functionName}`
    let matched = false

    let result = this.matchRules(rules, contractName)
    matched = matched || result.matched
    result.modifiers.forEach((m) => modifiers.add(m))

    result = this.matchRules(result.nested, functionName)
    matched = matched || result.matched
    result.modifiers.forEach(modifiers.add)

    result = this.matchRules(rules, contractMethod)
    matched = matched || result.matched
    result.modifiers.forEach((m) => modifiers.add(m))

    return {modifiers, matched}
  }

  matchedModifiers(contractName, functionName) {
    // TODO clean this up
    let fileName = this.fileName

    let qualifiedContract = `${fileName}:${contractName}`
    let qualifiedContractMethod = `${qualifiedContract}.${functionName}`

    let result = this.matchRules(this.opts.override, qualifiedContractMethod)
    if (result.matched) {
      return result.modifiers
    }

    result = this.matchRules(this.opts.override, qualifiedContract)
    if (result.matched) {
      return result.modifiers
    }
    if (Object.keys(result.nested).length) {
      result = this.matchRules(result.nested, functionName)
      if (result.matched) {
        return result.modifiers
      }
    }

    result = this.matchRules(this.opts.override, fileName)
    if (result.matched) {
      return result.modifiers
    }
    if (Object.keys(result.nested).length) {
      let {modifiers, matched} = this.matchContractOrMethod(result.nested, contractName, functionName)
      if (matched) {
        return modifiers
      }
    }

    let modifiers = new Set()

    result = this.matchRules(this.opts.required, qualifiedContractMethod)
    if (result.modifiers.size) {
      result.modifiers.forEach((m) => modifiers.add(m))
    }

    result = this.matchRules(this.opts.required, qualifiedContract)
    if (result.modifiers.size) {
      result.modifiers.forEach((m) => modifiers.add(m))
    }
    if (Object.keys(result.nested).length) {
      result = this.matchRules(result.nested, functionName)
      if (result.modifiers.size) {
        result.modifiers.forEach((m) => modifiers.add(m))
      }
    }

    result = this.matchRules(this.opts.required, fileName)
    if (result.modifiers.size) {
      result.modifiers.forEach((m) => modifiers.add(m))
    }
    if (Object.keys(result.nested).length) {
      this.matchContractOrMethod(result.nested, contractName, functionName).forEach((m) => modifiers.add(m))
    }

    return modifiers
  }

  FunctionDefinition(ctx) {
    let contract = this.context[this.context.length - 1]
    if (this.opts.ignoreContractKind.includes(contract.kind) ||
        this.opts.ignoreVisibility.includes(ctx.visibility)  ||
        this.opts.ignoreStateMutability.includes(ctx.stateMutability)) {
      return
    }

    let contractName = contract.name
    let functionName = ctx.name

    let requiredModifiers
    try {
      requiredModifiers = this.matchedModifiers(contractName, functionName)
    } catch(err) {
      console.log(err)
    }

    ctx.modifiers.forEach((m) => {
      requiredModifiers.delete(m.name)
    })

    if (requiredModifiers.size > 0) {
      requiredModifiers.forEach((m) => {
        this.reporter.error(
          ctx,
          this.ruleId,
          `Function \`${contractName}.${functionName}\` does not have required modifier \`${m}\`.`
        )
      })
    }
  }
}

module.exports = [EnsureModifiers]
