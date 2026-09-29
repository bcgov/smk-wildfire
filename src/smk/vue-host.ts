/**
 * The Host's side of Vue 3 (D28).
 *
 * SMK.component registers a component for every SMK map, as Vue 2's global
 * Vue.component did. SMK.mount( el, options ) is Vue 2's new Vue( { el } ):
 * the root takes el's place and sees every component. window.Vue is the Vue
 * those maps run on, so a Host's render function uses the same Vue.h.
 */
import { component, mountRoot } from './vue'
import { VUE_API } from './vue-api'
import { SMK } from './smk-ref'

const w = window as any
w.Vue ??= VUE_API

if ( SMK ) {
    SMK.component = component
    SMK.mount     = mountRoot
}
