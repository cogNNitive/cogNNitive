/**
 * test/console-scope-models.test.mjs
 *
 * A scoped console narrows the payload to its models, is read-only when asked, keeps
 * its drafts apart from another scope's, and shows its label. Capability console-scope;
 * tasks 4a.3/4a.4.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { bootConsole, nnConsole, MODEL } from './helpers/console-boot.mjs';

const scopeModel = (consoleScope, models) => ({
  ...MODEL,
  meta: {
    ...MODEL.meta,
    ...(models ? { models } : {}),
    consoleScope,
  },
});

test('consoleScopeMeta normalizes view, models, readOnly and label', () => {
  assert.deepEqual(
    nnConsole.consoleScopeMeta({ consoleScope: { view: 'v', models: ['a', ' ', 'b'], readOnly: true, label: 'Delivery' } }),
    { view: 'v', models: ['a', 'b'], readOnly: true, label: 'Delivery' },
  );
  assert.deepEqual(nnConsole.consoleScopeMeta({}), { view: '', models: [], readOnly: false, label: '' });
  assert.equal(nnConsole.consoleScopeMeta({ consoleScope: { readOnly: 'yes' } }).readOnly, false);
});

test('the draft-store id is isolated per view and per model set', () => {
  const base = nnConsole.draftStoreId('domain', {});
  assert.equal(base, 'domain');
  const byView = nnConsole.draftStoreId('domain', { view: 'conntent-delivery' });
  const byModels = nnConsole.draftStoreId('domain', { models: ['a', 'b'] });
  assert.notEqual(byView, base);
  assert.notEqual(byModels, base);
  assert.notEqual(byView, byModels);
  assert.equal(byModels, nnConsole.draftStoreId('domain', { models: ['a', 'b'] }), 'stable');
});

test('consoleScope.models narrows the payload the console sees', () => {
  const models = [
    { id: 'alpha', title: 'Alpha' },
    { id: 'beta', title: 'Beta' },
  ];
  const { res } = bootConsole({ model: scopeModel({ models: ['beta'] }, models) });
  assert.deepEqual(res.scope.models, ['beta']);
  assert.deepEqual(
    res.state.meta.models.map((m) => m.id),
    ['beta'],
    'only the scoped model remains in the payload',
  );
});

test('readOnly marks the console and disables every edit control', () => {
  const { document, res } = bootConsole({
    model: scopeModel({ readOnly: true, label: 'Delivery' }),
    before: (doc) => {
      const edit = doc.createElement('button');
      edit.setAttribute('data-nn-edit', '');
      doc.body.appendChild(edit);
    },
  });
  assert.equal(res.scope.readOnly, true);
  assert.equal(res.scope.label, 'Delivery');
  assert.equal(document.documentElement.getAttribute('data-nn-readonly'), 'true');
  assert.equal(document.querySelector('[data-nn-edit]').disabled, true);
});

test('an unscoped console stays editable', () => {
  const { document, res } = bootConsole({});
  assert.equal(res.scope.readOnly, false);
  assert.equal(document.documentElement.hasAttribute('data-nn-readonly'), false);
});
