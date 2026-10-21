import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const SAMPLES_DIR = path.join(REPO_ROOT, '_samples_nn', 'kNNowledge');

const SAMPLES_WITH_PREVIOUS_MARKERS = [
  'Ghostbusters_analysis_NN.md',
  'Ghostbusters_business_NN.md',
  'Ghostbusters_innovation_NN.md',
  'Ghostbusters_metrics_NN.md',
  'Ghostbusters_organization_NN.md',
  'Ghostbusters_projects_NN.md',
];

const ALL_SSOT_SAMPLES = [
  ...SAMPLES_WITH_PREVIOUS_MARKERS,
  'Ghostbusters_business-model_NN.md',
  'Ghostbusters_documentation_NN.md',
  'Ghostbusters_procedures_NN.md',
  'Ghostbusters_repository_NN.md',
  'Ghostbusters_design-presets_NN.md',
];

describe('Task 2.12: SSOT Ghostbusters samples hold no markers and flags are tags', () => {
  it('asserts none of the 6 SSOT samples declare an item-markers matrix', () => {
    for (const sampleFile of SAMPLES_WITH_PREVIOUS_MARKERS) {
      const content = fs.readFileSync(path.join(SAMPLES_DIR, sampleFile), 'utf8');
      expect(content).not.toMatch(/# NN matrices:\s*item-markers matrix/i);
    }
  });

  it('asserts none of the 6 SSOT samples mention removed evaluative marker names', () => {
    for (const sampleFile of SAMPLES_WITH_PREVIOUS_MARKERS) {
      const content = fs.readFileSync(path.join(SAMPLES_DIR, sampleFile), 'utf8');
      expect(content).not.toMatch(/(?:importance|completion|certainty|rating)::\s*/);
      expect(content).not.toMatch(/(?:is_variable|is_formula|is_derived)::\s*/);
    }
  });

  it('asserts flags are converted to tags in analysis sample', () => {
    const content = fs.readFileSync(path.join(SAMPLES_DIR, 'Ghostbusters_analysis_NN.md'), 'utf8');
    // High Spectral Density had * (important), > (complete), 80 (certainty dropped), ! (priority), + (starred)
    // Tags should include !, *, >, +
    expect(content).toMatch(/## NN Assumptions: High Spectral Density[\s\S]*?tags::\s*\[[^\]]*!/);
    expect(content).toMatch(/## NN Assumptions: High Spectral Density[\s\S]*?tags::\s*\[[^\]]*\*/);
    expect(content).toMatch(/## NN Assumptions: High Spectral Density[\s\S]*?tags::\s*\[[^\]]*>/);
    expect(content).toMatch(/## NN Assumptions: High Spectral Density[\s\S]*?tags::\s*\[[^\]]*\+/);
  });

  it('asserts flags are converted to tags in innovation sample', () => {
    const content = fs.readFileSync(path.join(SAMPLES_DIR, 'Ghostbusters_innovation_NN.md'), 'utf8');
    // Automated Remote Trap Triggering had priority !, certainty ?
    expect(content).toMatch(/## NN Opportunity: Automated Remote Trap Triggering[\s\S]*?tags::\s*\[[^\]]*!/);
    expect(content).toMatch(/## NN Opportunity: Automated Remote Trap Triggering[\s\S]*?tags::\s*\[[^\]]*\?/);
  });

  it('asserts flags are converted to tags in business sample', () => {
    const content = fs.readFileSync(path.join(SAMPLES_DIR, 'Ghostbusters_business_NN.md'), 'utf8');
    // Paranormal Infestation had weight 9 (dropped), completion >, certainty 5 (dropped), priority !, rating +
    expect(content).toMatch(/## NN Problems: Paranormal Infestation[\s\S]*?tags::\s*\[[^\]]*!/);
    expect(content).toMatch(/## NN Problems: Paranormal Infestation[\s\S]*?tags::\s*\[[^\]]*>/);
    expect(content).toMatch(/## NN Problems: Paranormal Infestation[\s\S]*?tags::\s*\[[^\]]*\+/);
  });

  it('asserts organization complexity markers became field complexity', () => {
    const content = fs.readFileSync(path.join(SAMPLES_DIR, 'Ghostbusters_organization_NN.md'), 'utf8');
    // Chief Science Officer had complexity 90 in item-markers matrix
    expect(content).toMatch(/## NN Roles: Chief Science Officer[\s\S]*?complexity::\s*90/);
  });

  it('asserts projects health markers became field health', () => {
    const content = fs.readFileSync(path.join(SAMPLES_DIR, 'Ghostbusters_projects_NN.md'), 'utf8');
    // Calibrate Particle Accelerators had health nominal
    expect(content).toMatch(/## NN Task: Calibrate Particle Accelerators[\s\S]*?health::\s*nominal/);
  });
});
