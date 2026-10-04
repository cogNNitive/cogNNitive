import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const STAMP = String.raw`(?:_\d{8}T\d{6}Z(?:-\d+)?)?`

function members(dir, key, ext) {
  if (!existsSync(dir)) return []
  const re = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${STAMP}\\.${ext}$`)
  // Unsuffixed member first, then (stamp, seq) ascending, compared numerically (`-10` after `-2`).
  /** @returns {[string, number]} */
  const order = (name) => {
    const m = /_(\d{8}T\d{6}Z)(?:-(\d+))?\.[^.]+$/.exec(name)
    return m ? [m[1], Number(m[2] ?? 1)] : ['', 0]
  }
  return readdirSync(dir)
    .filter((name) => re.test(name))
    .sort((a, b) => {
      const [sa, qa] = order(a)
      const [sb, qb] = order(b)
      return sa === sb ? qa - qb : sa < sb ? -1 : 1
    })
}

/** Every `<stem>_console` member (HTML), oldest first. */
export function consoleMembers(root, stem) {
  const dir = join(root, 'artifacts', `${stem}_console`)
  return members(dir, `${stem}_console`, 'html').map((name) => join(dir, name))
}

/** The latest console HTML for a stem, or a non-existent placeholder path when there is none. */
export function consoleHtml(root, stem) {
  const all = consoleMembers(root, stem)
  return all.length > 0 ? all[all.length - 1] : join(root, 'artifacts', `${stem}_console`, `${stem}_console.html`)
}

/** The latest vendored bundle in a console folder, or a non-existent placeholder path. */
export function consoleBundle(root, stem) {
  const dir = join(root, 'artifacts', `${stem}_console`)
  const all = members(dir, 'innfo-console.bundle', 'js')
  return join(dir, all.length > 0 ? all[all.length - 1] : 'innfo-console.bundle.js')
}
