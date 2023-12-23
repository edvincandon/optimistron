import type { ActionCreatorWithPreparedPayload, AnyAction, PayloadAction, PrepareAction } from '@reduxjs/toolkit';
import { createAction } from '@reduxjs/toolkit';
import { MetaKey } from './constants';

export enum TransitionOperation {
    STAGE,
    COMMIT,
    STASH,
    FAIL,
}

export type TransitionNamespace = `${string}::${string}`;
export type TransitionAction<Action = AnyAction> = Action & { meta: { [MetaKey]: TransitionMeta } };
export type TransitionMeta = { id: string; operation: TransitionOperation; conflict: boolean; failed: boolean };

/** Extracts the transition meta definitions on an action */
export const getTransitionMeta = (action: TransitionAction) => action.meta[MetaKey];
export const getTransitionID = (action: TransitionAction) => action.meta[MetaKey].id;

/**  Hydrates an action's transition meta definition */
export const withTransitionMeta = (
    action: ReturnType<PrepareAction<any>>,
    options: TransitionMeta,
): TransitionAction<typeof action> => ({
    ...action,
    meta: {
        ...('meta' in action ? action.meta : {}),
        [MetaKey]: options,
    },
});

/** Checks wether an action is a transition for the supplied namespace */
export const isTransitionForNamespace = (
    action: AnyAction,
    namespace: string,
): action is TransitionAction<typeof action> =>
    action?.meta && MetaKey in action?.meta && action.type.startsWith(`${namespace}::`);

/** Updates the transition meta of a transition action */
export const updateTransition = <T>(
    action: TransitionAction<T>,
    update: Partial<TransitionMeta>,
): TransitionAction<T> => ({
    ...action,
    meta: {
        ...action.meta,
        [MetaKey]: {
            ...action.meta[MetaKey],
            ...update,
        },
    },
});

/** Helper action matcher function that will match the supplied
 * namespace when the transition operation is of type COMMIT */
const createCommitMatcher =
    <NS extends TransitionNamespace, PA extends PrepareAction<any>>(namespace: NS) =>
    <
        Result extends ReturnType<PA>,
        Error = Result extends { error: infer Err } ? Err : never,
        Meta = { [MetaKey]: TransitionMeta } & (Result extends { meta: infer Meta } ? Meta : {}),
    >(
        action: AnyAction,
    ): action is PayloadAction<Result['payload'], NS, Meta, Error> =>
        isTransitionForNamespace(action, namespace) &&
        getTransitionMeta(action).operation === TransitionOperation.COMMIT;

export const createTransition = <
    PA extends PrepareAction<any>,
    Action extends ReturnType<PA>,
    Params extends Parameters<PA>,
    Type extends TransitionNamespace,
    Err = Action extends { error: infer E } ? E : never,
    Meta = { [MetaKey]: TransitionMeta } & (Action extends { meta: infer M } ? M : {}),
>(
    type: Type,
    operation: TransitionOperation,
    prepare: PA,
): ActionCreatorWithPreparedPayload<[transitionId: string, ...Params], Action['payload'], Type, Err, Meta> =>
    createAction(type, (transitionId, ...params) =>
        withTransitionMeta(prepare(...params), {
            conflict: false,
            failed: false,
            id: transitionId,
            operation,
        }),
    );

type EmptyPayload = { payload: never };
type PA_Empty = () => EmptyPayload;
type PA_Error = (error: Error) => EmptyPayload & { error: Error };

export const createTransitions = <
    Type extends TransitionNamespace,
    PA_Stage extends PrepareAction<any>,
    PA_Commit extends PrepareAction<any> = PA_Empty,
    PA_Stash extends PrepareAction<never> = PA_Empty,
    PA_Fail extends PrepareAction<never> = PA_Error,
>(
    type: Type,
    options:
        | PA_Stage
        | {
              stage: PA_Stage;
              commit?: PA_Commit;
              fail?: PA_Fail;
              stash?: PA_Stash;
          },
) => {
    const noOptions = typeof options === 'function';

    const emptyPA = () => ({ payload: {} });
    const errorPA = (error: Error) => ({ error, payload: {} });

    const stagePA = noOptions ? options : options.stage;
    const commitPA = noOptions ? emptyPA : options.commit ?? emptyPA;
    const failPA = noOptions ? errorPA : options.fail ?? errorPA;
    const stashPA = noOptions ? emptyPA : options.stash ?? emptyPA;

    return {
        stage: createTransition(`${type}::stage`, TransitionOperation.STAGE, stagePA),
        commit: createTransition(`${type}::commit`, TransitionOperation.COMMIT, commitPA as PA_Commit),
        fail: createTransition(`${type}::fail`, TransitionOperation.FAIL, failPA as PA_Fail),
        stash: createTransition(`${type}::stash`, TransitionOperation.STASH, stashPA as PA_Stash),
        match: createCommitMatcher<Type, PA_Stage>(type),
    };
};
