import { configureStore } from '@reduxjs/toolkit';
import { combineReducers, type Middleware } from 'redux';
import { todos } from './reducer';

export type State = ReturnType<ReturnType<typeof createStore>['getState']>;

export const createStore = <M extends Middleware>(middleware?: M) =>
    configureStore({ reducer: combineReducers({ todos }), middleware: [middleware].filter(Boolean) as Middleware[] });
