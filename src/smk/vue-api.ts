/**
 * The Vue a Host and a run-time template see as window.Vue.
 *
 * The whole Vue namespace is 46 KB gzip, more than Vue 2 with its compiler, so
 * this names what a Host writes with and every helper the template compiler
 * emits. KeepAlive, Teleport, Suspense and server rendering are left out.
 */
import {
    // What a Host writes with
    createApp, h, reactive, ref, computed, watch, nextTick, readonly, shallowReactive,
    isReactive, isRef, toRaw, markRaw, defineComponent, defineAsyncComponent, version,
    // What compiled templates call
    Fragment, openBlock, createBlock, createElementBlock, createVNode, createElementVNode,
    createCommentVNode, createTextVNode, createStaticVNode, resolveComponent,
    resolveDynamicComponent, resolveDirective, withDirectives, renderList, renderSlot,
    createSlots, toDisplayString, mergeProps, normalizeClass, normalizeStyle, normalizeProps,
    guardReactiveProps, toHandlers, camelize, capitalize, toHandlerKey, setBlockTracking,
    pushScopeId, popScopeId, withCtx, unref, withMemo, isMemoSame, withModifiers, withKeys,
    vShow, vModelText, vModelCheckbox, vModelRadio, vModelSelect, vModelDynamic,
    Transition, TransitionGroup, BaseTransition,
} from 'vue'

export const VUE_API = {
    createApp, h, reactive, ref, computed, watch, nextTick, readonly, shallowReactive,
    isReactive, isRef, toRaw, markRaw, defineComponent, defineAsyncComponent, version,
    Fragment, openBlock, createBlock, createElementBlock, createVNode, createElementVNode,
    createCommentVNode, createTextVNode, createStaticVNode, resolveComponent,
    resolveDynamicComponent, resolveDirective, withDirectives, renderList, renderSlot,
    createSlots, toDisplayString, mergeProps, normalizeClass, normalizeStyle, normalizeProps,
    guardReactiveProps, toHandlers, camelize, capitalize, toHandlerKey, setBlockTracking,
    pushScopeId, popScopeId, withCtx, unref, withMemo, isMemoSame, withModifiers, withKeys,
    vShow, vModelText, vModelCheckbox, vModelRadio, vModelSelect, vModelDynamic,
    Transition, TransitionGroup, BaseTransition,
}
