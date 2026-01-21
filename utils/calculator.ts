export type CalcMode = 'auto' | 'number' | 'bigint'

export type CalcResult = {
  ok: true
  mode: 'number' | 'bigint'
  value: number | bigint
  text: string
  warnings: string[]
} | {
  ok: false
  error: string
  warnings: string[]
}

type Token =
  | { type: 'number'; raw: string }
  | { type: 'ident'; name: string }
  | { type: 'op'; op: string }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'comma' }

const MAX_BIGINT_DIGITS = 10_000

const isDigit = (c: string) => c >= '0' && c <= '9'
const isAlpha = (c: string) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')

export function tokenize(expr: string): Token[] {
  const s = expr.trim()
  const tokens: Token[] = []

  let i = 0
  while (i < s.length) {
    const c = s[i]

    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++
      continue
    }

    if (c === '(') {
      tokens.push({ type: 'lparen' })
      i++
      continue
    }
    if (c === ')') {
      tokens.push({ type: 'rparen' })
      i++
      continue
    }
    if (c === ',') {
      tokens.push({ type: 'comma' })
      i++
      continue
    }

    // operators (include unicode variants)
    if ('+-*/%^!'.includes(c) || c === '×' || c === '÷') {
      const op = c === '×' ? '*' : c === '÷' ? '/' : c
      tokens.push({ type: 'op', op })
      i++
      continue
    }

    // number: 123, 1.23, .5, 1e-3
    if (isDigit(c) || c === '.') {
      let start = i
      let sawDot = c === '.'
      i++
      while (i < s.length) {
        const cc = s[i]
        if (isDigit(cc)) {
          i++
          continue
        }
        if (cc === '.' && !sawDot) {
          sawDot = true
          i++
          continue
        }
        break
      }

      // exponent
      if (i < s.length && (s[i] === 'e' || s[i] === 'E')) {
        const ePos = i
        i++
        if (i < s.length && (s[i] === '+' || s[i] === '-')) i++
        const expStart = i
        while (i < s.length && isDigit(s[i])) i++
        if (expStart === i) {
          // rollback: treat 'e' as invalid char
          i = ePos
        }
      }

      const raw = s.slice(start, i)
      if (raw === '.' || raw === '+.' || raw === '-.') {
        throw new Error(`无效数字: ${raw}`)
      }
      tokens.push({ type: 'number', raw })
      continue
    }

    // identifier: sin, cos, pi, e
    if (isAlpha(c) || c === '_') {
      let start = i
      i++
      while (i < s.length) {
        const cc = s[i]
        if (isAlpha(cc) || isDigit(cc) || cc === '_') {
          i++
          continue
        }
        break
      }
      const name = s.slice(start, i)
      tokens.push({ type: 'ident', name })
      continue
    }

    throw new Error(`无法识别字符: ${c}`)
  }

  return tokens
}

type RpnToken =
  | { type: 'num'; raw: string }
  | { type: 'const'; name: string }
  | { type: 'op'; op: string }
  | { type: 'func'; name: string; argc: number }

const OP_INFO: Record<string, { prec: number; assoc: 'L' | 'R'; unary?: boolean; postfix?: boolean }> = {
  'u+': { prec: 5, assoc: 'R', unary: true },
  'u-': { prec: 5, assoc: 'R', unary: true },
  '!': { prec: 6, assoc: 'L', postfix: true },
  '^': { prec: 4, assoc: 'R' },
  '*': { prec: 3, assoc: 'L' },
  '/': { prec: 3, assoc: 'L' },
  '%': { prec: 3, assoc: 'L' },
  '+': { prec: 2, assoc: 'L' },
  '-': { prec: 2, assoc: 'L' },
}

const FUNCTIONS: Record<string, { minArgs: number; maxArgs: number }> = {
  // trig
  sin: { minArgs: 1, maxArgs: 1 },
  cos: { minArgs: 1, maxArgs: 1 },
  tan: { minArgs: 1, maxArgs: 1 },
  asin: { minArgs: 1, maxArgs: 1 },
  acos: { minArgs: 1, maxArgs: 1 },
  atan: { minArgs: 1, maxArgs: 1 },
  // basic
  sqrt: { minArgs: 1, maxArgs: 1 },
  abs: { minArgs: 1, maxArgs: 1 },
  ln: { minArgs: 1, maxArgs: 1 },
  log: { minArgs: 1, maxArgs: 2 }, // log(x) base10; log(x, base)
  exp: { minArgs: 1, maxArgs: 1 },
  pow: { minArgs: 2, maxArgs: 2 },
  min: { minArgs: 1, maxArgs: 64 },
  max: { minArgs: 1, maxArgs: 64 },
}

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
}

export function toRpn(tokens: Token[]): RpnToken[] {
  const output: RpnToken[] = []
  const opStack: Array<{ kind: 'op'; op: string } | { kind: 'func'; name: string } | { kind: 'lparen' }> = []

  // for function calls: store number of commas seen inside current call
  const fnCommaCountStack: number[] = []

  let prev: Token | null = null

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx]

    if (t.type === 'number') {
      output.push({ type: 'num', raw: t.raw })
      prev = t
      continue
    }

    if (t.type === 'ident') {
      const name = t.name.toLowerCase()
      const next = tokens[idx + 1]
      if (next && next.type === 'lparen') {
        if (!FUNCTIONS[name]) throw new Error(`未知函数: ${t.name}`)
        opStack.push({ kind: 'func', name })
        prev = t
        continue
      }
      if (CONSTANTS[name] !== undefined) {
        output.push({ type: 'const', name })
        prev = t
        continue
      }
      throw new Error(`未知标识符: ${t.name}`)
    }

    if (t.type === 'comma') {
      // comma must be inside a function call
      while (opStack.length > 0 && opStack[opStack.length - 1].kind !== 'lparen') {
        const top = opStack.pop()!
        if (top.kind === 'op') output.push({ type: 'op', op: top.op })
        else throw new Error('函数栈状态异常')
      }
      if (opStack.length === 0) throw new Error('逗号位置不合法')
      if (fnCommaCountStack.length === 0) throw new Error('逗号必须出现在函数参数中')
      fnCommaCountStack[fnCommaCountStack.length - 1]++
      prev = t
      continue
    }

    if (t.type === 'lparen') {
      // if previous token was a function name, opStack top is func
      const isFnCall = opStack.length > 0 && opStack[opStack.length - 1].kind === 'func'
      opStack.push({ kind: 'lparen' })
      if (isFnCall) fnCommaCountStack.push(0)
      prev = t
      continue
    }

    if (t.type === 'rparen') {
      while (opStack.length > 0 && opStack[opStack.length - 1].kind !== 'lparen') {
        const top = opStack.pop()!
        if (top.kind === 'op') output.push({ type: 'op', op: top.op })
        else throw new Error('函数栈状态异常')
      }
      if (opStack.length === 0) throw new Error('括号不匹配')
      opStack.pop() // pop lparen

      // if function on top, pop it to output
      if (opStack.length > 0 && opStack[opStack.length - 1].kind === 'func') {
        const fn = opStack.pop() as { kind: 'func'; name: string }
        const commaCount = fnCommaCountStack.pop() ?? 0
        const isEmptyCall = prev?.type === 'lparen'
        const argc = isEmptyCall ? 0 : (commaCount + 1)
        const rule = FUNCTIONS[fn.name]
        if (argc < rule.minArgs || argc > rule.maxArgs) {
          throw new Error(`函数 ${fn.name} 参数个数不合法: ${argc}`)
        }
        output.push({ type: 'func', name: fn.name, argc })
      }

      prev = t
      continue
    }

    if (t.type === 'op') {
      let op = t.op
      // unary +/-, determined by previous token
      if ((op === '+' || op === '-') && (!prev || (prev.type === 'op' && prev.op !== '!') || prev.type === 'lparen' || prev.type === 'comma')) {
        op = op === '+' ? 'u+' : 'u-'
      }
      if (!OP_INFO[op]) throw new Error(`不支持的运算符: ${t.op}`)

      while (opStack.length > 0) {
        const top = opStack[opStack.length - 1]
        if (top.kind !== 'op') break
        const a = OP_INFO[op]
        const b = OP_INFO[top.op]
        const shouldPop = (a.assoc === 'L' && a.prec <= b.prec) || (a.assoc === 'R' && a.prec < b.prec)
        if (!shouldPop) break
        output.push({ type: 'op', op: (opStack.pop() as any).op })
      }
      opStack.push({ kind: 'op', op })
      prev = t
      continue
    }

    throw new Error('未知 token')
  }

  while (opStack.length > 0) {
    const top = opStack.pop()!
    if (top.kind === 'lparen') throw new Error('括号不匹配')
    if (top.kind === 'func') throw new Error('函数调用不完整')
    output.push({ type: 'op', op: top.op })
  }

  return output
}

function bigintDigits(n: bigint): number {
  const s = n < 0n ? (-n).toString() : n.toString()
  return s.length
}

function assertBigintSize(n: bigint) {
  if (bigintDigits(n) > MAX_BIGINT_DIGITS) {
    throw new Error(`BigInt 结果过大（>${MAX_BIGINT_DIGITS}位），为避免卡死已中止`) 
  }
}

function parseAsBigInt(raw: string): bigint {
  if (!/^[+-]?\d+$/.test(raw)) throw new Error('BigInt 模式仅支持整数')
  const n = BigInt(raw)
  assertBigintSize(n)
  return n
}

function parseAsNumber(raw: string): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) throw new Error('数值溢出/非有限数')
  return n
}

function numberWarnIfUnsafeInteger(n: number, warnings: string[]) {
  if (Number.isFinite(n) && Number.isInteger(n) && Math.abs(n) > Number.MAX_SAFE_INTEGER) {
    warnings.push('结果超出 JS Number 的安全整数范围（±9,007,199,254,740,991），可能存在精度丢失')
  }
}

function formatNumberForDisplay(n: number): string {
  // Avoid displaying -0
  if (Object.is(n, -0)) return '0'

  // Integers: keep exact string (note: may still be unsafe integer; warnings handled elsewhere)
  if (Number.isInteger(n)) return String(n)

  // For typical decimal calculations, remove common IEEE754 artifacts by rounding to 15 sig digits.
  // 15 is the max reliable significant digits for JS Number.
  const sig = 15
  const roundedStr = n.toPrecision(sig)

  // Preserve scientific notation when it appears
  if (/[eE]/.test(roundedStr)) return roundedStr

  // Trim trailing zeros and dangling decimal point
  const trimmed = roundedStr
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')

  // If rounding didn't change the value meaningfully, use trimmed representation.
  // (This is display-only; the internal value is still Number.)
  return trimmed
}

function factBigint(n: bigint): bigint {
  if (n < 0n) throw new Error('阶乘不支持负数')
  // soft limit to avoid huge loops
  if (n > 50_000n) throw new Error('阶乘输入过大（>50000），为避免卡死已拒绝')
  let r = 1n
  for (let i = 2n; i <= n; i++) {
    r *= i
    if (i % 200n === 0n) assertBigintSize(r)
  }
  assertBigintSize(r)
  return r
}

function factNumber(n: number): number {
  if (!Number.isFinite(n)) throw new Error('数值不合法')
  if (n < 0) throw new Error('阶乘不支持负数')
  if (!Number.isInteger(n)) throw new Error('阶乘仅支持整数')
  if (n > 170) throw new Error('阶乘结果会溢出（n>170）')
  let r = 1
  for (let i = 2; i <= n; i++) r *= i
  return r
}

export function evaluateExpression(expr: string, mode: CalcMode = 'auto'): CalcResult {
  const warnings: string[] = []
  try {
    const tokens = tokenize(expr)
    if (tokens.length === 0) return { ok: false, error: '请输入表达式', warnings }

    const rpn = toRpn(tokens)

    // auto mode decision: only integers, no decimal/exponent, and no float-only functions
    const hasDecimalOrExp = rpn.some(t => t.type === 'num' && /[.eE]/.test(t.raw))
    const hasFloatFunc = rpn.some(t => t.type === 'func' && ['sin','cos','tan','asin','acos','atan','ln','log','exp','sqrt'].includes(t.name))
    const hasDiv = rpn.some(t => t.type === 'op' && t.op === '/')
    const wantsBigint = mode === 'bigint' || (mode === 'auto' && !hasDecimalOrExp && !hasFloatFunc)

    if (wantsBigint) {
      if (hasDiv) warnings.push('BigInt 模式下除法为“整除”，若不能整除将报错')
      const stack: bigint[] = []
      for (const t of rpn) {
        if (t.type === 'num') {
          stack.push(parseAsBigInt(t.raw))
          continue
        }
        if (t.type === 'const') {
          throw new Error('BigInt 模式不支持常量 pi/e（会引入小数）')
        }
        if (t.type === 'op') {
          if (t.op === 'u+' || t.op === 'u-') {
            const a = stack.pop()
            if (a === undefined) throw new Error('表达式不完整')
            const r = t.op === 'u-' ? -a : a
            assertBigintSize(r)
            stack.push(r)
            continue
          }
          if (t.op === '!') {
            const a = stack.pop()
            if (a === undefined) throw new Error('表达式不完整')
            stack.push(factBigint(a))
            continue
          }
          const b = stack.pop()
          const a = stack.pop()
          if (a === undefined || b === undefined) throw new Error('表达式不完整')
          let r: bigint
          switch (t.op) {
            case '+': r = a + b; break
            case '-': r = a - b; break
            case '*': r = a * b; break
            case '%':
              if (b === 0n) throw new Error('除以 0')
              r = a % b
              break
            case '/':
              if (b === 0n) throw new Error('除以 0')
              if (a % b !== 0n) throw new Error('BigInt 除法仅支持整除')
              r = a / b
              break
            case '^':
              if (b < 0n) throw new Error('BigInt 幂运算不支持负指数')
              if (b > 1_000_000n) throw new Error('指数过大（>1,000,000），为避免卡死已拒绝')
              r = a ** b
              break
            default:
              throw new Error(`BigInt 不支持运算符: ${t.op}`)
          }
          assertBigintSize(r)
          stack.push(r)
          continue
        }
        if (t.type === 'func') {
          throw new Error('BigInt 模式暂不支持函数调用')
        }
      }
      if (stack.length !== 1) throw new Error('表达式不合法')
      const value = stack[0]
      return { ok: true, mode: 'bigint', value, text: value.toString(), warnings }
    }

    // number mode
    const stack: number[] = []
    for (const t of rpn) {
      if (t.type === 'num') {
        stack.push(parseAsNumber(t.raw))
        continue
      }
      if (t.type === 'const') {
        stack.push(CONSTANTS[t.name])
        continue
      }
      if (t.type === 'op') {
        if (t.op === 'u+' || t.op === 'u-') {
          const a = stack.pop()
          if (a === undefined) throw new Error('表达式不完整')
          const r = t.op === 'u-' ? -a : a
          if (!Number.isFinite(r)) throw new Error('数值溢出/非有限数')
          stack.push(r)
          continue
        }
        if (t.op === '!') {
          const a = stack.pop()
          if (a === undefined) throw new Error('表达式不完整')
          const r = factNumber(a)
          stack.push(r)
          continue
        }
        const b = stack.pop()
        const a = stack.pop()
        if (a === undefined || b === undefined) throw new Error('表达式不完整')
        let r: number
        switch (t.op) {
          case '+': r = a + b; break
          case '-': r = a - b; break
          case '*': r = a * b; break
          case '/':
            if (b === 0) throw new Error('除以 0')
            r = a / b
            break
          case '%':
            if (b === 0) throw new Error('除以 0')
            r = a % b
            break
          case '^':
            r = Math.pow(a, b)
            break
          default:
            throw new Error(`不支持的运算符: ${t.op}`)
        }
        if (!Number.isFinite(r)) throw new Error('数值溢出/非有限数')
        numberWarnIfUnsafeInteger(r, warnings)
        stack.push(r)
        continue
      }
      if (t.type === 'func') {
        const args: number[] = []
        for (let i = 0; i < t.argc; i++) {
          const v = stack.pop()
          if (v === undefined) throw new Error('表达式不完整')
          args.unshift(v)
        }
        let r: number
        switch (t.name) {
          case 'sin': r = Math.sin(args[0]); break
          case 'cos': r = Math.cos(args[0]); break
          case 'tan': r = Math.tan(args[0]); break
          case 'asin': r = Math.asin(args[0]); break
          case 'acos': r = Math.acos(args[0]); break
          case 'atan': r = Math.atan(args[0]); break
          case 'sqrt': r = Math.sqrt(args[0]); break
          case 'abs': r = Math.abs(args[0]); break
          case 'ln': r = Math.log(args[0]); break
          case 'exp': r = Math.exp(args[0]); break
          case 'pow': r = Math.pow(args[0], args[1]); break
          case 'log':
            if (args.length === 1) r = Math.log10(args[0])
            else r = Math.log(args[0]) / Math.log(args[1])
            break
          case 'min': r = Math.min(...args); break
          case 'max': r = Math.max(...args); break
          default:
            throw new Error(`未知函数: ${t.name}`)
        }
        if (!Number.isFinite(r)) throw new Error('数值溢出/非有限数')
        stack.push(r)
        continue
      }
    }
    if (stack.length !== 1) throw new Error('表达式不合法')
    const value = stack[0]
    numberWarnIfUnsafeInteger(value, warnings)
    return { ok: true, mode: 'number', value, text: formatNumberForDisplay(value), warnings }
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e), warnings }
  }
}
