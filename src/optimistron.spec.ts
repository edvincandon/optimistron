import { updateAction } from './actions';
import { OptimistronReducerRefs } from './optimistron';
import { selectIsConflicting, selectIsFailed, selectIsOptimistic } from './selectors';
import { createItem, editItem, reducer } from './test/item-record';

describe('optimistron', () => {
    beforeEach(() => OptimistronReducerRefs.clear());

    describe('item record state', () => {
        const initial = reducer(undefined, { type: 'INIT' });

        describe('create', () => {
            test('stage', () => {
                const stage = createItem.stage('001', { id: '001', value: '1', revision: 0 });
                const nextState = reducer(initial, stage);

                expect(nextState).toStrictEqual(initial);
                expect(nextState.mutations).toEqual([stage]);
                expect(selectIsOptimistic('001')(nextState)).toBe(true);
                expect(selectIsFailed('001')(nextState)).toBe(false);
            });

            test('stage - fail', () => {
                const stage = createItem.stage('001', { id: '001', value: '1', revision: 0 });
                const fail = createItem.fail('001', new Error());
                const nextState = [stage, fail].reduce(reducer, initial);

                expect(nextState).toStrictEqual(initial);
                expect(nextState.mutations).toEqual([updateAction(stage, { failed: true })]);
                expect(selectIsOptimistic('001')(nextState)).toBe(true);
                expect(selectIsFailed('001')(nextState)).toBe(true);
            });

            test('stage - fail - stage', () => {
                const stage = createItem.stage('001', { id: '001', value: '1', revision: 0 });
                const fail = createItem.fail('001', new Error());
                const nextState = [stage, fail, stage].reduce(reducer, initial);

                expect(nextState).toStrictEqual(initial);
                expect(nextState.mutations).toEqual([stage]);
                expect(selectIsOptimistic('001')(nextState)).toBe(true);
                expect(selectIsFailed('001')(nextState)).toBe(false);
            });

            test('stage - stash', () => {
                const stage = createItem.stage('001', { id: '001', value: '1', revision: 0 });
                const stash = createItem.stash('001');
                const nextState = [stage, stash].reduce(reducer, initial);

                expect(nextState).toStrictEqual(initial);
                expect(nextState.mutations).toEqual([]);
                expect(selectIsOptimistic('001')(nextState)).toBe(false);
                expect(selectIsFailed('001')(nextState)).toBe(false);
            });

            test('stage - commit', () => {
                const stage = createItem.stage('001', { id: '001', value: '1', revision: 0 });
                const commit = createItem.commit('001', stage.payload.item);
                const nextState = [stage, commit].reduce(reducer, initial);

                expect(nextState).toEqual({ state: { ['001']: stage.payload.item } });
                expect(nextState.mutations).toEqual([]);
                expect(selectIsOptimistic('001')(nextState)).toBe(false);
                expect(selectIsFailed('001')(nextState)).toBe(false);
            });
        });

        describe('update', () => {
            test('non-existing skip', () => {
                const update = editItem.stage('002', { id: '002', value: '2', revision: 2 });
                const nextState = [update].reduce(reducer, initial);

                expect(nextState).toStrictEqual(initial);
                expect(nextState.mutations).toEqual([]);
            });

            test('revision conflict', () => {
                const commit = createItem.commit('001', { id: '001', value: '1', revision: 1 });
                const update = editItem.stage('001', { id: '001', value: '1', revision: 0 });
                const nextState = [commit, update].reduce(reducer, initial);

                expect(selectIsOptimistic('001')(nextState)).toBe(true);
                expect(selectIsFailed('001')(nextState)).toBe(false);
                expect(selectIsConflicting('001')(nextState)).toBe(true);
            });
        });
    });
});
