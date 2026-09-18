/**
 * Standalone bundle entry.
 *
 * Exposes every external library SMK relies on as a window global, then loads
 * SMK itself. The resulting bundle (`dist/smk.<version>.js` + `.css`) is a
 * single drop-in script that needs no other <script> tags.
 *
 * The order of these two imports is the whole point of the file: ESM evaluates
 * an imported module in source order, so the globals exist before SMK reads
 * them. Do not fold the assignments back into this file — imports hoist above
 * statements, which is what made this fail before.
 */
import './standalone-globals'
import './main'
