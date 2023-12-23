import { createTransitions, getTransitionMeta } from './actions';
import { processTransition } from './transitions';

describe('Transitions', () => {
    const transition = createTransitions('test::transition', (revision: number) => ({ payload: { revision } }));

    describe('`processTransition`', () => {
        test('it should push staging transition', () => {
            const stage = transition.stage('transition_id', 1);
            const processed = processTransition(stage, []);

            expect(processed.length).toEqual(1);
            expect(processed[0]).toEqual(stage);
        });

        test('it should replace staging transition if already in transition list', () => {
            const existing = transition.stage('transition_id', 1);
            const stage = transition.stage('transition_id', 2);

            const processed = processTransition(stage, [existing]);
            expect(processed.length).toEqual(1);
            expect(processed[0]).toEqual(stage);
        });

        test('it should flag transition as failed', () => {
            const stage = transition.stage('transition_id', 1);
            const fail = transition.fail('transition_id', new Error());

            const processed = processTransition(fail, [stage]);

            expect(processed.length).toEqual(1);
            expect(getTransitionMeta(processed[0]).failed).toEqual(true);
            expect(processed[0].type).toEqual(stage.type);
            expect(processed[0].payload).toEqual(stage.payload);
        });

        // test('it should remove transition on commit', () => {
        //     const stage = transition.stage('transition_id', 1);
        //     const commit = transition.commit('transition_id', 1);
        // })
    });
});
