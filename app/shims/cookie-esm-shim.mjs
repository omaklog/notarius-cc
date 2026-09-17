// Workaround for a toolchain bug: @supabase/ssr does
// `import { parse, serialize } from 'cookie'`, but esbuild's CJS→ESM
// named-export detection fails to pick these up from the installed
// `cookie` package in this project (SyntaxError: does not provide an
// export named 'parse'), breaking client-side hydration entirely.
// `optimizeDeps.include`/`needsInterop` (Vite's usual escape hatches for
// this exact class of bug) did not fix it either — the import never
// reached Vite's dependency pre-bundler at all in this setup.
//
// This is a minimal RFC 6265 parse/serialize, matching the subset of the
// `cookie` package's API that @supabase/ssr actually calls, as genuine
// ESM (no CJS interop involved at all, so no bundler quirk can apply).
// Aliased from "cookie" in nuxt.config.ts -> vite.resolve.alias. Revisit
// if the upstream toolchain issue is ever resolved.

export function parse(str, options) {
  const result = {}
  if (typeof str !== 'string') return result

  const decode = options?.decode ?? decodeURIComponent

  for (const pair of str.split(';')) {
    const eqIdx = pair.indexOf('=')
    if (eqIdx < 0) continue

    const key = pair.slice(0, eqIdx).trim()
    if (!key || result[key] !== undefined) continue

    let value = pair.slice(eqIdx + 1).trim()
    if (value[0] === '"') value = value.slice(1, -1)

    try {
      result[key] = decode(value)
    } catch {
      result[key] = value
    }
  }

  return result
}

export function serialize(name, value, options = {}) {
  const encode = options.encode ?? encodeURIComponent
  let str = `${name}=${encode(value)}`

  if (options.maxAge != null) str += `; Max-Age=${Math.floor(options.maxAge)}`
  if (options.domain) str += `; Domain=${options.domain}`
  const path = options.path ?? '/'
  str += `; Path=${path}`
  if (options.expires) {
    const exp = options.expires instanceof Date ? options.expires : new Date(options.expires)
    str += `; Expires=${exp.toUTCString()}`
  }
  if (options.httpOnly) str += '; HttpOnly'
  if (options.secure) str += '; Secure'

  if (options.sameSite) {
    const sameSite = typeof options.sameSite === 'string' ? options.sameSite.toLowerCase() : options.sameSite
    if (sameSite === true || sameSite === 'strict') str += '; SameSite=Strict'
    else if (sameSite === 'lax') str += '; SameSite=Lax'
    else if (sameSite === 'none') str += '; SameSite=None'
  }

  return str
}

export default { parse, serialize }
