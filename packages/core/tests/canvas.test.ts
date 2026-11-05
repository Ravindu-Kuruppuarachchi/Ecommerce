import assert from 'node:assert/strict';
import { createSection, validateSections } from '../src/sections';

const element = { kind: 'button', text: 'Shop now', link: '/products', x: 12, y: 30, width: 25, height: 10, font: 'Georgia', fontSize: 24, color: '#171717', fill: '#ffddbb', opacity: 85, fillOpacity: 60 };
const section = createSection('canvas', { canvasHeight: 650, canvasColor: '#ffffff', elements: [element] });
const valid = validateSections(JSON.parse(JSON.stringify([section])));
assert.equal(valid.ok, true);
if (valid.ok) assert.deepEqual(valid.sections[0].props.elements, [element]);
assert.equal(validateSections([createSection('hero', { elements: [element] })]).ok, true);
for (const invalid of [{ x: -1 }, { width: 101 }, { opacity: 101 }, { fontSize: 999 }, { link: 'javascript:alert(1)' }, { image: 'data:text/html,bad' }, { font: 'evil-font' }]) {
  assert.equal(validateSections([createSection('canvas', { elements: [{ ...element, ...invalid }] })]).ok, false);
}
assert.equal(validateSections([createSection('canvas', { elements: Array(31).fill(element) })]).ok, false);
const stripped = validateSections([createSection('canvas', { elements: [{ ...element, onclick: 'bad' }] })]);
if (stripped.ok) assert.equal('onclick' in (stripped.sections[0].props.elements as object[])[0], false);
else assert.fail('Expected a valid cleaned canvas');
console.log('Canvas persistence, validation, element limits and unsafe URL checks passed.');
