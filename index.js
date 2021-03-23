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
      verbose: false,
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

  collectModifiers(rules, paths, reduceFn) {
    let modifiers = new Set()
    let matched = false

    paths.forEach((path) => {
      let r = rules
      path = path.slice()
      let pathComponent = path.shift()
      while (pathComponent && r) {
        let result = this.matchRules(r, pathComponent)
        if (result.matched) {
          matched = matched || result.matched
          modifiers = reduceFn(modifiers, result.modifiers)
        }

        pathComponent = path.shift()
        r = result.nested
      }
    })

    return {modifiers, matched}
  }

  matchedModifiers(contractName, functionName) {
    let fileName = this.fileName

    let qualifiedContract = `${fileName}:${contractName}`
    let qualifiedContractMethod = `${qualifiedContract}.${functionName}`
    let contractMethod = `${contractName}.${functionName}`

    let paths = [
      [qualifiedContractMethod],
      [qualifiedContract, functionName],
      [fileName, contractMethod],
      [fileName, contractName, functionName]
    ]

    let matched = false
    let result = this.collectModifiers(this.opts.override, paths, (acc, modifiers) => {
      // (Effectively) short circuit rather than collecting
      if (matched) {
        return acc
      }

      matched = true
      return modifiers
    })

    if (result.matched) {
      return result.modifiers
    }

    result = this.collectModifiers(this.opts.required, paths, (acc, modifiers) => {
      modifiers.forEach((m) => acc.add(m))
      return acc
    })

    return result.modifiers
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
      if (this.opts.verbose) {
        console.log(err)
      }

      throw err
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
