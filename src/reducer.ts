import { AnyAction } from 'redux';
import { BoundStateHandler, TransitionState } from './state';

export type BoundReducer<State = any> = (state: TransitionState<State>, action: AnyAction) => State;

export type HandlerReducer<
    State,
    CreateParams extends any[],
    UpdateParams extends any[],
    DeleteParams extends any[],
> = (boundStateHandler: BoundStateHandler<State, CreateParams, UpdateParams, DeleteParams>, action: AnyAction) => State;

export const ReducerMap = new Map<string, BoundReducer>();

export const bindReducer =
    <S, C extends any[], U extends any[], D extends any[]>(
        reducer: HandlerReducer<S, C, U, D>,
        bindState: (state: S) => BoundStateHandler<S, C, U, D>,
    ): BoundReducer<S> =>
    (transitionState, action) => {
        try {
            return reducer(bindState(transitionState.state), action);
        } catch (error) {
            console.warn(`Error while processing action ${action.type}`, error);
            return transitionState.state;
        }
    };
