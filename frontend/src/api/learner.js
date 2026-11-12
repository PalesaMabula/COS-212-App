import { learnerId } from './client';
import { post } from './useApi';

/*
 * Actions that the Python server checks. Answers are never sent to the
 * browser: the server checks, records the try, and returns the feedback.
 */

/** { topic, section, question, choice?, text?, conf?, rating? } → { right, feedback, ... } */
export const checkAnswer = (body) => post(`/api/learners/${learnerId()}/answers`, body);

/** Run a code example from the course: { section, task?, block? } → { ok, output, error, answer?, why? } */
export const runCode = (topicId, body) => post(`/api/topics/${encodeURIComponent(topicId)}/run`, body);

/** "Name the neighbours" on the map → { right, missing, extra, feedback, answer } */
export const checkNeighbours = (place, picked) => post('/api/graph/neighbours-check', { place, picked });
