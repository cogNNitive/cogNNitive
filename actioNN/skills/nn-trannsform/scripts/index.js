#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const prompts = require('prompts');

const config = require('./config');
const scanner = require('./scanner');
const transformer = require('./transformer');
const provenance = require('./provenance');
const webImport = require('./webImport');
const { bootstrapProject } = require('./lib/bootstrap');
const { checkLineage } = require('./lib/lineage-check');

async function main() {
  const argv = minimist(process.argv.slice(2));

  const hasArgs =
    argv.scan ||
    argv.apply ||
    argv.provenance ||
    argv.lineage ||
    argv.check ||
    argv.src ||
    argv.dest ||
    argv.name ||
    argv['import-url'];

  if (hasArgs) {
    await handleCliMode(argv);
  } else {
    await handleInteractiveMode();
  }
}

async function handleCliMode(argv) {
  let projectDir = '';

  if (argv.dest && argv.name) {
    projectDir = path.join(argv.dest, argv.name);
  } else if (argv.src && !argv.dest) {
    projectDir = argv.src;
  } else {
    projectDir = getActiveProjectDir();
  }

  if (argv.src && argv.dest && argv.name) {
    console.log(`Bootstrapping project "${argv.name}" at "${projectDir}"...`);
    const bootstrap = bootstrapProject(argv.src, argv.dest, argv.name);
    console.log(`Copied ${bootstrap.copiedCount} file(s) to sources/original (subfolders preserved).`);
    console.log(`Initialized cogNNitive provenance model at: ${bootstrap.provModelPath}`);
    console.log(`\n📌 Place your files to import into: ${bootstrap.originalDir}\n`);
  }

  if (!fs.existsSync(projectDir)) {
    console.error(`Error: Project directory "${projectDir}" does not exist.`);
    console.error('Please specify valid --src, --dest and --name to bootstrap it first.');
    process.exit(1);
  }

  if (argv.check) {
    const { errors, warnings } = checkLineage(projectDir);
    for (const w of warnings) console.log(`⚠️  ${w}`);
    for (const e of errors) console.error(`❌ ${e}`);
    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ Lineage record is in sync with the workspace filesystem.');
    }
    process.exit(errors.length > 0 ? 1 : 0);
  }

  let importResult = null;
  if (argv['import-url']) {
    const originalDir = path.join(projectDir, 'sources', 'original');
    fs.mkdirSync(originalDir, { recursive: true });
    console.log(`Downloading "${argv['import-url']}" into sources/original/...`);
    try {
      importResult = await webImport.downloadToOriginal(argv['import-url'], originalDir);
      console.log(`Downloaded to: sources/original/${importResult.relPath}`);
    } catch (err) {
      console.error(`Error downloading URL: ${err.message}`);
      process.exit(1);
    }
  }

  if (argv.scan) {
    console.log(`Scanning and converting documents in "${projectDir}"...`);

    const scanOptions = { autoAcceptPrompt: true };

    if (argv.formats) {
      const originalDir = path.join(projectDir, 'sources', 'original');
      if (fs.existsSync(originalDir)) {
        const selected = argv.formats.split(',').map(f => '.' + f.trim().replace(/^\./, ''));
        scanOptions.formats = selected;
      }
    }

    if (importResult) {
      scanOptions.webImportMeta = {
        [importResult.relPath]: {
          source_url: importResult.sourceUrl,
          downloaded_at: importResult.downloadedAt,
          ...importResult.meta,
        }
      };
    }

    const result = await scanner.scanAndProcess(projectDir, scanOptions);
    console.log(`Scan completed! Discovered: ${result.totalDiscovered}, Processed: ${result.processedCount}, Skipped: ${result.skippedCount}`);

    const prov = provenance.buildProvenanceModel(projectDir);
    console.log(
      `cogNNitive lineage record ${prov.created ? 'created' : 'refreshed'}: ` +
        `${prov.sourceCount} source(s), ${prov.modelCount} model(s), ${prov.artifactCount} artifact(s) — ${prov.modelPath}`,
    );
    provenance.appendProcedureRun(projectDir, {
      command: importResult ? 'import-url + scan' : 'scan',
      flags: argv.formats ? `--formats ${argv.formats}` : undefined,
      inputs: importResult ? [`sources/original/${importResult.relPath}`] : ['sources/original/'],
      outputs: ['sources/nn/'],
    });
  }

  if ((argv.provenance || argv.lineage) && !argv.scan) {
    const prov = provenance.buildProvenanceModel(projectDir);
    console.log(
      `cogNNitive lineage record ${prov.created ? 'created' : 'refreshed'}: ` +
        `${prov.sourceCount} source(s), ${prov.modelCount} model(s), ${prov.artifactCount} artifact(s) — ${prov.modelPath}`,
    );
  }

  if (argv.apply) {
    const templateName = argv.apply;
    console.log(`Applying transformation "${templateName}" in "${projectDir}"...`);
    try {
      const result = await transformer.applyTransformation(projectDir, templateName);
      console.log(`Transformation applied successfully!`);
      console.log(`Output saved to: ${result.outputPath}`);
      provenance.buildProvenanceModel(projectDir);
      provenance.appendProcedureRun(projectDir, {
        command: `apply ${templateName}`,
        inputs: ['sources/nn/', 'models/'],
        outputs: [result.outputPath.replace(projectDir, '').replace(/^[\\/]/, '')],
      });
    } catch (err) {
      console.error(`Error applying transformation: ${err.message}`);
      process.exit(1);
    }
  }
}

async function handleInteractiveMode() {
  console.log('=== Welcome to traNNsform CLI ===\n');

  let projectDir = getActiveProjectDir();
  let projectExists = fs.existsSync(projectDir) &&
    fs.existsSync(path.join(projectDir, 'sources', 'original'));

  const choices = [];
  if (projectExists) {
    choices.push({ title: `Use current project: ${path.basename(projectDir)} (${projectDir})`, value: 'current' });
  }
  choices.push({ title: 'Bootstrap/Create a new project', value: 'bootstrap' });
  choices.push({ title: 'Configure default paths', value: 'configure' });
  choices.push({ title: 'Exit', value: 'exit' });

  const response = await prompts({
    type: 'select',
    name: 'action',
    message: 'What would you like to do?',
    choices
  });

  if (!response.action || response.action === 'exit') {
    console.log('Goodbye!');
    return;
  }

  if (response.action === 'configure') {
    await configureDefaults();
    return handleInteractiveMode();
  }

  if (response.action === 'bootstrap') {
    projectDir = await runBootstrapperFlow();
    if (!projectDir) return handleInteractiveMode();
    projectExists = true;
  }

  await runProjectMenu(projectDir);
}

async function configureDefaults() {
  const currentDefault = config.getDefaultPath();
  const response = await prompts({
    type: 'text',
    name: 'path',
    message: 'Enter new default parent target directory:',
    initial: currentDefault
  });

  if (response.path) {
    const cleanPath = response.path.replace(/^["']|["']$/g, '').trim();
    config.saveConfig({ defaultPath: path.resolve(cleanPath) });
    console.log(`Saved default path: ${config.getDefaultPath()}`);
  }
}

async function runBootstrapperFlow() {
  const defaultDest = config.getDefaultPath();

  const questions = [
    {
      type: 'text',
      name: 'src',
      message: 'Enter the source directory containing raw files to import (will be copied to sources/original):',
      validate: value => {
        const clean = value.replace(/^["']|["']$/g, '').trim();
        return fs.existsSync(clean) ? true : 'Source directory does not exist';
      }
    },
    {
      type: 'confirm',
      name: 'useSrcAsDest',
      message: 'Use the source directory as the target parent directory?',
      initial: false
    },
    {
      type: (prev, values) => values.useSrcAsDest ? null : 'text',
      name: 'dest',
      message: 'Enter the target parent directory:',
      initial: defaultDest,
      validate: value => {
        const clean = value.replace(/^["']|["']$/g, '').trim();
        return clean.length > 0 ? true : 'Target parent directory cannot be empty';
      }
    },
    {
      type: 'text',
      name: 'name',
      message: 'Enter the project name:',
      initial: (prev, values) => values.useSrcAsDest ? 'traNNsform' : 'MyTransformProject',
      validate: value => value.trim().length > 0 ? true : 'Project name cannot be empty'
    },
  ];

  const answers = await prompts(questions);

  if (!answers.src || !answers.name || (answers.useSrcAsDest === undefined) || (!answers.useSrcAsDest && !answers.dest)) {
    console.log('Bootstrapping cancelled.');
    return null;
  }

  answers.src = answers.src.replace(/^["']|["']$/g, '').trim();
  const targetDest = answers.useSrcAsDest ? answers.src : answers.dest.replace(/^["']|["']$/g, '').trim();

  const projectDir = path.join(targetDest, answers.name);
  const bootstrap = bootstrapProject(answers.src, targetDest, answers.name);
  console.log(`Copied ${bootstrap.copiedCount} file(s) to sources/original (subfolders preserved).`);
  console.log(`Initialized cogNNitive provenance model at: ${bootstrap.provModelPath}`);

  config.saveConfig({ lastProjectPath: projectDir });

  console.log(`Project successfully bootstrapped at: ${projectDir}\n`);
  console.log(`\n📌 Place your files to import into: ${bootstrap.originalDir}\n`);
  return projectDir;
}

async function runProjectMenu(projectDir) {
  console.log(`\nActive Project: ${path.basename(projectDir)}`);
  console.log(`Path: ${projectDir}\n`);

  const response = await prompts({
    type: 'select',
    name: 'action',
    message: 'Select an action:',
    choices: [
      { title: 'Scan and process original files in sources/original', value: 'scan' },
      { title: 'Apply template transformation', value: 'transform' },
      { title: 'Create new transformation template', value: 'create_template' },
      { title: 'Back to main menu', value: 'back' }
    ]
  });

  if (response.action === 'back' || !response.action) {
    return handleInteractiveMode();
  }

  if (response.action === 'create_template') {
    await runCreateTemplateFlow(projectDir);
    return runProjectMenu(projectDir);
  }

  if (response.action === 'scan') {
    // Scan sources/original directly, normalizing straight into sources/nn
    console.log('\nScanning sources/original directory...');
    const result = await scanner.scanAndProcess(projectDir, { autoAcceptPrompt: true });
    console.log('\n=== Ingestion Manifest Created ===');
    console.log(`Processed: ${result.processedCount} files successfully.`);
    console.log(`Skipped/Needs Review: ${result.skippedCount} files.`);
    console.log(`Review the manifest log at: ${path.join(projectDir, 'sources', 'nn', 'index.md')}`);

    const prov = provenance.buildProvenanceModel(projectDir);
    console.log(
      `cogNNitive lineage record ${prov.created ? 'created' : 'refreshed'}: ` +
        `${prov.sourceCount} source(s), ${prov.modelCount} model(s), ${prov.artifactCount} artifact(s) — ${prov.modelPath}\n`,
    );
    provenance.appendProcedureRun(projectDir, {
      command: 'scan',
      inputs: ['sources/original/'],
      outputs: ['sources/nn/'],
    });

    return runProjectMenu(projectDir);
  }

  if (response.action === 'transform') {
    const templates = transformer.listTemplates(projectDir);
    if (templates.length === 0) {
      console.log('No transformation templates found in traNNsformations/ directory.');
      return runProjectMenu(projectDir);
    }

    const templateResponse = await prompts({
      type: 'select',
      name: 'templateName',
      message: 'Choose a transformation template to apply:',
      choices: templates.map(t => ({ title: t, value: t }))
    });

    if (!templateResponse.templateName) {
      return runProjectMenu(projectDir);
    }

    try {
      console.log('\nApplying transformation...');
      const result = await transformer.applyTransformation(projectDir, templateResponse.templateName);
      console.log(`\nTransformation successful!`);
      console.log(`Output saved to: ${result.outputPath}`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }

    return runProjectMenu(projectDir);
  }
}

async function runCreateTemplateFlow(projectDir) {
  console.log('\n=== Create New Transformation Template ===\n');

  const answers = await prompts([
    {
      type: 'text',
      name: 'name',
      message: 'Enter template name (e.g., Summary Report):',
      validate: value => value.trim().length > 0 ? true : 'Template name cannot be empty'
    },
    {
      type: 'text',
      name: 'purpose',
      message: 'Enter the purpose of this transformation:',
      validate: value => value.trim().length > 0 ? true : 'Purpose cannot be empty'
    },
    {
      type: 'text',
      name: 'instructions',
      message: 'Enter transformation instructions/criteria:',
      validate: value => value.trim().length > 0 ? true : 'Instructions cannot be empty'
    },
    {
      type: 'text',
      name: 'structure',
      message: 'Enter template markdown structure (optional):',
      initial: '### [Title]\n**Field:** [Value]'
    }
  ]);

  if (!answers.name || !answers.purpose || !answers.instructions) {
    console.log('Template creation cancelled.');
    return;
  }

  const transDir = path.join(projectDir, 'traNNsformations');
  if (!fs.existsSync(transDir)) {
    fs.mkdirSync(transDir, { recursive: true });
  }

  let fileName = answers.name.trim();
  if (!fileName.endsWith('.md')) {
    fileName += '.md';
  }

  const templatePath = path.join(transDir, fileName);
  const content = `# Transformation: ${answers.name}

## Purpose
${answers.purpose}

## Instructions
${answers.instructions}

## Template
${answers.structure || ''}
`;

  fs.writeFileSync(templatePath, content, 'utf8');
  console.log(`\nTemplate successfully created at: ${templatePath}`);
}

function getActiveProjectDir() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'sources', 'original'))) {
    return cwd;
  }

  const cfg = config.getConfig();
  if (cfg.lastProjectPath && fs.existsSync(cfg.lastProjectPath)) {
    return cfg.lastProjectPath;
  }

  const workspaceSamplePath = path.join(cwd, 'Sample');
  if (fs.existsSync(workspaceSamplePath)) {
    return workspaceSamplePath;
  }

  return cwd;
}

main().catch(err => {
  console.error('An unexpected error occurred:', err);
});
