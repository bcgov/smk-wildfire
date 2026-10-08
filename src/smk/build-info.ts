// Build-time constants injected by vite.config.js via `define`
declare const __SMK_COMMIT__:      string
declare const __SMK_BRANCH__:      string
declare const __SMK_LAST_COMMIT__: string
declare const __SMK_ORIGIN__:      string
declare const __SMK_VERSION__:     string

/** The build stamp. SMK.BUILD and the version Tool's default share this object. */
export const BUILD = {
    commit:     __SMK_COMMIT__,
    branch:     __SMK_BRANCH__,
    lastCommit: __SMK_LAST_COMMIT__,
    origin:     __SMK_ORIGIN__,
    version:    __SMK_VERSION__,
}
