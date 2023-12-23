import type { AnyAction, Reducer } from 'redux';
import {
    TransitionOperation,
    getTransitionID,
    getTransitionMeta,
    isTransitionForNamespace,
    updateTransition,
} from './actions';
import { ReducerMap, bindReducer, type HandlerReducer } from './reducer';
import {
    TransitionState,
    buildTransitionState,
    bindStateFactory,
    updateTransitionState,
    type StateHandler,
} from './state';
import { processTransition, sanitizeTransitions } from './transitions';

export const optimistron = <S, C extends any[], U extends any[], D extends any[]>(
    namespace: string,
    initialState: S,
    handler: StateHandler<S, C, U, D>,
    reducer: HandlerReducer<S, C, U, D>,
    options?: { sanitizeAction: <T extends AnyAction>(action: T) => T },
): Reducer<TransitionState<S>> => {
    const bindState = bindStateFactory<S, C, U, D>(handler);
    const boundReducer = bindReducer(reducer, bindState);

    /* keep a reference to the underlying reducer in order for optimistic
     * selectors to apply the optimistic transitions when executed */
    if (ReducerMap.has(namespace)) throw new Error(`An optimistic reducer for [${namespace}] is already registered`);
    ReducerMap.set(namespace, boundReducer);

    const sanitizer = sanitizeTransitions(boundReducer, bindState);
    const initial: TransitionState<S> = buildTransitionState(initialState, [], namespace);

    return (transition = initial, action) => {
        const nextTransition: TransitionState<S> = (() => {
            const { state, transitions } = transition;
            const next = updateTransitionState(transition);

            if (isTransitionForNamespace(action, namespace)) {
                const nextTransitions = processTransition(options?.sanitizeAction?.(action) ?? action, transitions);
                const { operation, id } = getTransitionMeta(action);

                switch (operation) {
                    case TransitionOperation.COMMIT:
                        /* Find the matching staged action in the transition list. If
                         * it does not exist, do nothing else treat it as a commit */
                        const staged = transitions.find((entry) => id === getTransitionID(entry));
                        if (!staged) return next(state, nextTransitions);

                        /* Comitting will apply the action to the reducer */
                        const commit = updateTransition(staged, { operation: TransitionOperation.COMMIT });
                        return next(boundReducer(transition, commit), nextTransitions);
                    default:
                        /* Every other transition actions will not be applied.
                         * If you need to get the optimistic state use the provided
                         * selectors which will apply the optimistic transitions */
                        return next(state, nextTransitions);
                }
            }

            return next(boundReducer(transition, action), transitions);
        })();

        /* only sanitize the mutations if the states are referentially different to avoid
         * checking for conflicts and noops unnecessarily on the bound reducer */
        const mutated = nextTransition !== transition;
        nextTransition.transitions = mutated ? sanitizer(nextTransition) : nextTransition.transitions;

        return nextTransition;
    };
};
