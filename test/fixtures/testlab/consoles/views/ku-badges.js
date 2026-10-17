/* testlab/consoles/views/ku-badges.js — Knowledge Unit Badges test section
   Registered as a domain view in the TestLab console. Demonstrates the unified
   knowledge-unit badge grammar with the updated border rules:
   - Content: NO border (border: none)
   - Structure: colored border (border: 1.5px solid var(--c))
   - Containers: double border
   - Sources: paper fill, read-only
*/
registerView({
  title: 'KU Badges',
  icon: 'tag',
  order: 25,
  kind: 'editable',
  mount: function (ctx) {
    var container = ctx.container;
    var doc = ctx.doc || container.ownerDocument;
    container.innerHTML = '';

    // Inject scoped CSS
    var style = doc.createElement('style');
    style.textContent = [
      '.ku-showcase { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 20px; padding: 16px 0; font-family: var(--innfo-font, system-ui, sans-serif); color: var(--innfo-text, #0f172a); }',
      '@media (max-width: 900px) { .ku-showcase { grid-template-columns: 1fr; } }',
      '.ku-main { display: flex; flex-direction: column; gap: 18px; min-width: 0; }',
      '.ku-card { background: var(--innfo-surface, #ffffff); border: 1px solid var(--innfo-border, #e2e8f0); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }',
      '.ku-card h2 { font-size: 0.95rem; font-weight: 600; margin: 0; color: var(--innfo-text, #0f172a); }',
      '.ku-card p.sub { font-size: 0.8rem; color: var(--innfo-muted, #64748b); margin: 0; }',
      '.ku-grid { display: grid; grid-template-columns: 160px minmax(0, 1fr); gap: 10px 14px; align-items: center; }',
      '@media (max-width: 560px) { .ku-grid { grid-template-columns: 1fr; } }',
      '.ku-lbl { font-size: 0.78rem; color: var(--innfo-muted, #64748b); }',
      '.ku-lbl b { color: var(--innfo-text, #0f172a); }',
      
      '/* Knowledge Unit Base */',
      '.ku-wrap { display: inline-flex; align-items: center; gap: 3px; vertical-align: middle; max-width: 100%; }',
      '.ku { display: inline-flex; align-items: center; gap: 0.4em; min-width: 0; max-width: 100%; font-size: 0.82rem; line-height: 1.25; padding: 3px 9px; border-radius: 6px; background: var(--innfo-surface-2, #f8fafc); color: var(--innfo-text, #0f172a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; transition: transform 0.1s, box-shadow 0.1s; }',
      '.ku:hover { transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.06); }',
      '.ku .ico { flex: 0 0 auto; display: inline-flex; }',
      '.ku .ico svg { width: 13px; height: 13px; }',
      
      '/* NEW BORDER RULES: Content has NO border; Structure has COLORED border */',
      '.ku[data-nature="content"] { border: none !important; background: var(--innfo-surface-2, #f1f5f9); }',
      '.ku[data-nature="structure"] { border: 1.5px solid var(--c, var(--innfo-concept-1, #3b82f6)) !important; color: var(--c, var(--innfo-text, #0f172a)); font-family: var(--innfo-mono, monospace); font-size: 0.78rem; background: var(--innfo-surface, #ffffff); }',
      '.ku[data-nature="container"] { border: 3px double var(--innfo-accent, #0f172a) !important; font-weight: 600; background: var(--innfo-surface, #ffffff); }',
      
      '/* Concept Color Slots */',
      '.ku[data-slot="1"], .ku:not([data-slot]) { --c: #3b82f6; --cb: #eff6ff; }',
      '.ku[data-slot="2"] { --c: #8b5cf6; --cb: #f5f3ff; }',
      '.ku[data-slot="3"] { --c: #14b8a6; --cb: #f0fdfa; }',
      '.ku[data-slot="4"] { --c: #f59e0b; --cb: #fffbeb; }',
      '.ku[data-kind="concept"] { background: var(--cb) !important; border-color: var(--c) !important; color: var(--c) !important; font-weight: 600; }',
      '.ku[data-kind="document"] { background: var(--cb) !important; border-color: var(--c) !important; }',
      
      '/* Value Types in Content */',
      '.ku[data-kind="value"] .ty { font-family: var(--innfo-mono, monospace); font-size: 0.68rem; color: var(--innfo-muted, #64748b); border-right: 1px solid var(--innfo-border, #cbd5e1); padding-right: 0.45em; }',
      '.ku[data-kind="value"][data-vtype="number"] .t { font-variant-numeric: tabular-nums; }',
      
      '/* Sources: Paper Background */',
      '.ku[data-origin="source"] { background: #f5f2ec !important; color: #57534e !important; }',
      '.ku[data-origin="source"][data-nature="content"] { border: none !important; }',
      '.ku[data-origin="source"][data-nature="structure"] { border: 1.5px solid #78716c !important; }',
      
      '/* Actions Outside Badge */',
      '.ku-actions { display: inline-flex; gap: 2px; }',
      '.ku-act { display: inline-grid; place-items: center; width: 22px; height: 22px; padding: 0; border: 1px solid transparent; border-radius: 4px; background: transparent; color: var(--innfo-muted, #64748b); cursor: pointer; }',
      '.ku-act:hover { background: var(--innfo-surface-2, #f1f5f9); color: var(--innfo-text, #0f172a); border-color: var(--innfo-border, #cbd5e1); }',
      '.ku-showcase[data-mode="view"] .ku-act[data-act="edit"] { display: none; }',
      '.ku-showcase[data-mode="review"][data-structure="off"] .ku-act[data-act="edit"][data-nature="structure"] { display: none; }',
      
      '/* Paired units row */',
      '.ku-pair { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }',
      '.ku-pair .sep { color: var(--innfo-muted, #94a3b8); font-size: 0.8rem; }',
      
      '/* In-context element card preview */',
      '.ku-preview-card { border: 1px solid var(--innfo-border, #e2e8f0); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 12px; background: var(--innfo-surface, #ffffff); }',
      '.ku-preview-card .ku-p-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }',
      '.ku-preview-card dl { margin: 0; display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 8px 14px; align-items: center; }',
      '.ku-preview-card dt, .ku-preview-card dd { margin: 0; }',
      
      '/* Matrix Preview */',
      '.ku-tbl-wrap { overflow-x: auto; }',
      '.ku-tbl { border-collapse: collapse; font-size: 0.82rem; width: 100%; }',
      '.ku-tbl th, .ku-tbl td { border: 1px solid var(--innfo-border, #e2e8f0); padding: 8px 10px; text-align: left; }',
      '.ku-tbl th { background: var(--innfo-surface-2, #f8fafc); font-weight: 500; }',
      
      '/* Info Panel */',
      '.ku-sidebar { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 16px; align-self: start; }',
      '.ku-info-card { background: var(--innfo-surface, #ffffff); border: 1px solid var(--innfo-border, #e2e8f0); border-radius: 8px; padding: 14px; font-size: 0.82rem; }',
      '.ku-info-card h3 { margin: 0 0 10px 0; font-size: 0.88rem; font-weight: 600; color: var(--innfo-text, #0f172a); }',
      '.ku-info-card dl { margin: 0; display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 6px 10px; }',
      '.ku-info-card dt { color: var(--innfo-muted, #64748b); }',
      '.ku-info-card dd { margin: 0; overflow-wrap: anywhere; font-weight: 500; }',
      '.ku-info-card code { font-family: var(--innfo-mono, monospace); font-size: 0.76rem; background: var(--innfo-surface-2, #f1f5f9); padding: 2px 4px; border-radius: 4px; }',
      '.ku-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }',
      '.ku-btn-group { display: inline-flex; border: 1px solid var(--innfo-border, #cbd5e1); border-radius: 6px; overflow: hidden; }',
      '.ku-btn-group button { font-size: 0.78rem; padding: 4px 10px; border: none; background: var(--innfo-surface, #ffffff); cursor: pointer; color: var(--innfo-muted, #64748b); }',
      '.ku-btn-group button.active { background: #0f172a; color: #ffffff; font-weight: 600; }'
    ].join('\n');
    container.appendChild(style);

    // Root wrapper
    var showcase = doc.createElement('div');
    showcase.className = 'ku-showcase';
    showcase.setAttribute('data-mode', 'view');
    showcase.setAttribute('data-structure', 'off');

    var mainCol = doc.createElement('div');
    mainCol.className = 'ku-main';

    var sideCol = doc.createElement('div');
    sideCol.className = 'ku-sidebar';

    // Top Toolbar
    var toolbar = doc.createElement('div');
    toolbar.className = 'ku-toolbar';
    toolbar.innerHTML = [
      '<div class="ku-btn-group">',
      '  <button type="button" class="ku-mode-btn active" data-mode="view">View Mode</button>',
      '  <button type="button" class="ku-mode-btn" data-mode="review">Review Mode</button>',
      '</div>',
      '<label style="display:inline-flex;align-items:center;gap:6px;font-size:0.78rem;cursor:pointer;">',
      '  <input type="checkbox" id="ku-toggle-structure"> Edit structure',
      '</label>'
    ].join('');
    mainCol.appendChild(toolbar);

    // Helper: make badge
    function makeBadge(spec) {
      var wrap = doc.createElement('div');
      wrap.className = 'ku-wrap';

      var badge = doc.createElement('div');
      badge.className = 'ku';
      badge.setAttribute('data-nature', spec.nature);
      badge.setAttribute('data-kind', spec.kind);
      if (spec.slot) badge.setAttribute('data-slot', spec.slot);
      if (spec.origin) badge.setAttribute('data-origin', spec.origin);
      if (spec.vtype) badge.setAttribute('data-vtype', spec.vtype);

      var content = '';
      if (spec.vtype) {
        content += '<span class="ty">' + spec.vtype + '</span>';
      }
      content += '<span class="t">' + spec.label + '</span>';
      badge.innerHTML = content;

      badge.addEventListener('click', function () {
        inspect(spec);
      });

      wrap.appendChild(badge);

      var actions = doc.createElement('div');
      actions.className = 'ku-actions';
      actions.innerHTML = [
        '<button type="button" class="ku-act" data-act="edit" data-nature="' + spec.nature + '" title="Edit">',
        '  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
        '</button>',
        '<button type="button" class="ku-act" data-act="info" title="Inspect">',
        '  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
        '</button>'
      ].join('');

      actions.querySelector('[data-act="info"]').addEventListener('click', function (e) {
        e.stopPropagation();
        inspect(spec);
      });
      actions.querySelector('[data-act="edit"]').addEventListener('click', function (e) {
        e.stopPropagation();
        alert('Edit action on: ' + spec.address);
      });

      wrap.appendChild(actions);
      return wrap;
    }

    // Helper: make section card
    function makeCard(title, subtitle, gridItems) {
      var card = doc.createElement('section');
      card.className = 'ku-card';
      var h = doc.createElement('h2');
      h.textContent = title;
      card.appendChild(h);
      if (subtitle) {
        var p = doc.createElement('p');
        p.className = 'sub';
        p.textContent = subtitle;
        card.appendChild(p);
      }
      var grid = doc.createElement('div');
      grid.className = 'ku-grid';
      gridItems.forEach(function (item) {
        var lbl = doc.createElement('div');
        lbl.className = 'ku-lbl';
        lbl.innerHTML = '<b>' + item.name + '</b>';
        grid.appendChild(lbl);
        var target = doc.createElement('div');
        target.appendChild(makeBadge(item.spec));
        grid.appendChild(target);
      });
      card.appendChild(grid);
      return card;
    }

    // 1. Containers
    mainCol.appendChild(makeCard(
      'Containers (Double Border)',
      'Units that hold other units. Double border indicates a container root.',
      [
        { name: 'Domain', spec: { nature: 'container', kind: 'domain', label: 'domaiNN_NN.md', address: 'domaiNN_NN.md', home: 'domain' } },
        { name: 'Document', spec: { nature: 'container', kind: 'document', slot: '1', label: 'kNNowledge/TestLab_coverage_TestLab', address: 'kNNowledge/TestLab_coverage_TestLab', home: 'knowledge' } }
      ]
    ));

    // 2. Structure (COLORED BORDER)
    mainCol.appendChild(makeCard(
      'Structure (Colored Border — BluepriNNt Rules)',
      'Structure definitions now have a solid colored border matching their concept color, replacing the former dashed border.',
      [
        { name: 'Concept 1 Definition', spec: { nature: 'structure', kind: 'concept', slot: '1', label: 'Concept 1', address: 'specs/testlab@concept:concept-1', home: 'blueprint' } },
        { name: 'Concept 2 Definition', spec: { nature: 'structure', kind: 'concept', slot: '2', label: 'Concept 2', address: 'specs/testlab@concept:concept-2', home: 'blueprint' } },
        { name: 'Field Definition', spec: { nature: 'structure', kind: 'field', slot: '1', label: 'summary', address: 'specs/testlab@concept:concept-1&summary', home: 'blueprint' } },
        { name: 'Matrix Definition', spec: { nature: 'structure', kind: 'matrix', slot: '3', label: 'Coverage matrix', address: 'specs/testlab@matrix:coverage-matrix', home: 'blueprint' } }
      ]
    ));

    // 3. Content (NO BORDER)
    mainCol.appendChild(makeCard(
      'Content (Borderless — kNNowledge Data)',
      'Data instances have NO border at all (border: none), displaying as clean, borderless pills.',
      [
        { name: 'Element Instance', spec: { nature: 'content', kind: 'element', slot: '1', label: 'Element 1B (Photo log)', address: 'kNNowledge/TestLab_coverage_TestLab@element-1b', home: 'knowledge' } },
        { name: 'Text Value', spec: { nature: 'content', kind: 'value', vtype: 'text', label: 'Photo log element with image', address: 'kNNowledge/TestLab_coverage_TestLab@element-1b&summary', home: 'knowledge' } },
        { name: 'Number Value', spec: { nature: 'content', kind: 'value', vtype: 'number', label: '42.50', address: 'kNNowledge/TestLab_coverage_TestLab@element-1b&metric', home: 'knowledge' } },
        { name: 'Boolean Value', spec: { nature: 'content', kind: 'value', vtype: 'boolean', label: 'true', address: 'kNNowledge/TestLab_coverage_TestLab@element-1b&verified', home: 'knowledge' } },
        { name: 'Reference Value', spec: { nature: 'content', kind: 'value', vtype: 'reference', slot: '2', label: '[[Element 2A]]', address: 'kNNowledge/TestLab_coverage_TestLab@element-1b&sibling', home: 'knowledge' } },
        { name: 'Matrix Cell', spec: { nature: 'content', kind: 'value', vtype: 'cell', label: '1A x 2A: Full coverage', address: 'kNNowledge/TestLab_coverage_TestLab@coverage-matrix&element-1a&element-2a', home: 'knowledge' } }
      ]
    ));

    // 4. Sources
    mainCol.appendChild(makeCard(
      'Sources (Paper Background)',
      'Cited evidence retains the distinctive warm paper fill (#f5f2ec). Always read-only.',
      [
        { name: 'Source Header', spec: { nature: 'content', kind: 'source', origin: 'source', label: 'field-notes.md@## Findings', address: 'sources/import/field-notes.md@## Findings', home: 'source' } },
        { name: 'Source Row', spec: { nature: 'content', kind: 'source', origin: 'source', label: 'dataset.csv@m-001', address: 'sources/import/dataset.csv@m-001', home: 'source' } }
      ]
    ));

    // 5. In context: Element Card
    var cardCtx = doc.createElement('section');
    cardCtx.className = 'ku-card';
    cardCtx.innerHTML = '<h2>In Context: Element Card</h2><p class="sub">Notice how Structure (colored border) and Content (borderless) sit side by side harmoniously.</p>';
    var previewCard = doc.createElement('div');
    previewCard.className = 'ku-preview-card';
    
    var pHead = doc.createElement('div');
    pHead.className = 'ku-p-head';
    pHead.appendChild(makeBadge({ nature: 'structure', kind: 'concept', slot: '1', label: 'Concept 1', address: 'specs/testlab@concept:concept-1', home: 'blueprint' }));
    pHead.appendChild(makeBadge({ nature: 'content', kind: 'element', slot: '1', label: 'Element 1B', address: 'kNNowledge/TestLab_coverage_TestLab@element-1b', home: 'knowledge' }));
    previewCard.appendChild(pHead);

    var dl = doc.createElement('dl');
    function addRow(fName, fSpec, vSpec) {
      var dt = doc.createElement('dt');
      dt.appendChild(makeBadge(fSpec));
      var dd = doc.createElement('dd');
      dd.appendChild(makeBadge(vSpec));
      dl.appendChild(dt);
      dl.appendChild(dd);
    }
    addRow('summary', 
      { nature: 'structure', kind: 'field', slot: '1', label: 'summary', address: 'specs/testlab@concept:concept-1&summary', home: 'blueprint' },
      { nature: 'content', kind: 'value', vtype: 'text', label: 'Photo log element with image and file fields', address: 'kNNowledge/TestLab_coverage_TestLab@element-1b&summary', home: 'knowledge' }
    );
    addRow('sibling',
      { nature: 'structure', kind: 'field', slot: '1', label: 'sibling', address: 'specs/testlab@concept:concept-1&sibling', home: 'blueprint' },
      { nature: 'content', kind: 'value', vtype: 'reference', slot: '2', label: '[[Element 2A]]', address: 'kNNowledge/TestLab_coverage_TestLab@element-1b&sibling', home: 'knowledge' }
    );
    addRow('sources',
      { nature: 'structure', kind: 'field', slot: '1', label: 'sources', address: 'specs/testlab@concept:concept-1&sources', home: 'blueprint' },
      { nature: 'content', kind: 'source', origin: 'source', label: 'field-notes.md@## Findings', address: 'sources/import/field-notes.md@## Findings', home: 'source' }
    );
    previewCard.appendChild(dl);
    cardCtx.appendChild(previewCard);
    mainCol.appendChild(cardCtx);

    // Inspector Sidebar
    var infoCard = doc.createElement('div');
    infoCard.className = 'ku-info-card';
    infoCard.innerHTML = [
      '<h3>Unit Inspector</h3>',
      '<div id="ku-inspect-body">',
      '  <p style="color:var(--innfo-muted);margin:0;">Click any knowledge unit badge to inspect its canonical address, nature, and home axis.</p>',
      '</div>'
    ].join('');
    sideCol.appendChild(infoCard);

    function inspect(spec) {
      var body = doc.getElementById('ku-inspect-body');
      if (!body) return;
      body.innerHTML = [
        '<dl>',
        '  <dt>Address</dt><dd><code>' + spec.address + '</code></dd>',
        '  <dt>Nature</dt><dd><b>' + spec.nature + '</b> (' + (spec.nature === 'content' ? 'borderless' : (spec.nature === 'structure' ? 'colored border' : 'double border')) + ')</dd>',
        '  <dt>Lives in</dt><dd>' + spec.home + '</dd>',
        '  <dt>Kind</dt><dd>' + spec.kind + '</dd>',
        spec.vtype ? '  <dt>Value Type</dt><dd>' + spec.vtype + '</dd>' : '',
        '</dl>'
      ].join('');
    }

    // Wiring Toolbar events
    toolbar.querySelectorAll('.ku-mode-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toolbar.querySelectorAll('.ku-mode-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var mode = btn.dataset.mode;
        showcase.setAttribute('data-mode', mode);
      });
    });
    doc.getElementById('ku-toggle-structure').addEventListener('change', function (e) {
      showcase.setAttribute('data-structure', e.target.checked ? 'on' : 'off');
    });

    showcase.appendChild(mainCol);
    showcase.appendChild(sideCol);
    container.appendChild(showcase);
  }
});
