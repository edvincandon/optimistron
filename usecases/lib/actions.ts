import { createTransitions } from '../../src/actions';
import type { Todo } from './types';

const create_PA = (todo: Todo) => ({ payload: { todo } });
const edit_PA = (id: string, update: Partial<Todo>) => ({ payload: { id, update } });
const delete_PA = (id: string) => ({ payload: { id } });

export const createTodo = createTransitions('todos::add', { stage: create_PA, commit: create_PA });
export const editTodo = createTransitions('todos::edit', { stage: edit_PA, commit: edit_PA });
export const deleteTodo = createTransitions('todos::delete', delete_PA);
