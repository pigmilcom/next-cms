#!/usr/bin/env node

import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import readline from 'node:readline';

// ─── ANSI colours ────────────────────────────────────────────────────────────
const R = '\x1b[0m';
const bold = '\x1b[1m';
const dim = '\x1b[2m';
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const blue = '\x1b[34m';

const c = {
    cyan: (s) => `${cyan}${s}${R}`,
    green: (s) => `${green}${s}${R}`,
    yellow: (s) => `${yellow}${s}${R}`,
    red: (s) => `${red}${s}${R}`,
    blue: (s) => `${blue}${s}${R}`,
    bold: (s) => `${bold}${s}${R}`,
    dim: (s) => `${dim}${s}${R}`,
};

// ─── Constants ───────────────────────────────────────────────────────────────
const GITHUB_OWNER = 'pigmilcom';
const GITHUB_REPO = 'next-cms';
const GITHUB_BRANCH = 'main';
const CLONE_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git`;
const TARBALL_URL = `https://codeload.github.com/${GITHUB_OWNER}/${GITHUB_REPO}/tar.gz/refs/heads/${GITHUB_BRANCH}`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function log(msg = '') {
    process.stdout.write(`${msg}\n`);
}

function step(msg) {
    log(`${cyan}▸${R} ${msg}`);
}

function ok(msg) {
    log(`${green}✓${R} ${msg}`);
}

function warn(msg) {
    log(`${yellow}⚠${R}  ${msg}`);
}

function fail(msg) {
    log(`${red}✗${R}  ${msg}`);
}

function commandExists(cmd) {
    try {
        execSync(`${cmd} --version`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

// ─── Prompt helpers ──────────────────────────────────────────────────────────
let rl;

function createRL() {
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.on('SIGINT', () => {
        log(`\n${c.yellow('Cancelled.')}`);
        process.exit(1);
    });
}

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer.trim()));
    });
}

async function confirm(question, defaultYes = true) {
    const hint = c.dim(defaultYes ? '(Y/n)' : '(y/N)');
    const answer = await ask(`${question} ${hint} `);
    if (!answer) return defaultYes;
    return answer.toLowerCase().startsWith('y');
}

// ─── Download tarball fallback ────────────────────────────────────────────────
async function downloadTarball(targetDir, projectName) {
    step(`Downloading template from GitHub…`);

    const tmp = path.join(path.dirname(targetDir), `.${projectName}-tmp-${Date.now()}`);
    fs.mkdirSync(tmp, { recursive: true });

    const tarFile = path.join(tmp, 'template.tar.gz');

    // Download the tarball (follows redirects)
    await new Promise((resolve, reject) => {
        function request(url, redirects = 0) {
            if (redirects > 10) return reject(new Error('Too many redirects'));
            https.get(url, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    return request(res.headers.location, redirects + 1);
                }
                if (res.statusCode !== 200) {
                    res.resume();
                    return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
                }
                const file = fs.createWriteStream(tarFile);
                res.pipe(file);
                file.on('finish', () => file.close(resolve));
                file.on('error', reject);
            }).on('error', reject);
        }
        request(TARBALL_URL);
    });

    // Extract (tar is available on Linux, macOS, and Windows 10+)
    execSync(`tar -xzf "${tarFile}" -C "${tmp}" --strip-components=1`, { stdio: 'pipe' });
    fs.unlinkSync(tarFile);

    // Move extracted content to target directory
    fs.mkdirSync(targetDir, { recursive: true });
    for (const item of fs.readdirSync(tmp)) {
        fs.renameSync(path.join(tmp, item), path.join(targetDir, item));
    }
    fs.rmSync(tmp, { recursive: true, force: true });
}

// ─── Delete .git folder recursively ──────────────────────────────────────────
function removeGit(dir) {
    const gitDir = path.join(dir, '.git');
    if (fs.existsSync(gitDir)) {
        fs.rmSync(gitDir, { recursive: true, force: true });
    }
}

// ─── Validate project name ────────────────────────────────────────────────────
function isValidName(name) {
    return /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/i.test(name) && name.length <= 214;
}

// ─── Detect package manager ───────────────────────────────────────────────────
function detectPackageManager() {
    const userAgent = process.env.npm_config_user_agent ?? '';
    if (userAgent.startsWith('yarn')) return 'yarn';
    if (userAgent.startsWith('pnpm')) return 'pnpm';
    if (userAgent.startsWith('bun')) return 'bun';
    return 'npm';
}

function installCmd(pm) {
    return pm === 'yarn' ? 'yarn' : `${pm} install`;
}

function devCmd(pm) {
    const cmds = { npm: 'npm run dev', yarn: 'yarn dev', pnpm: 'pnpm dev', bun: 'bun dev' };
    return cmds[pm] ?? 'npm run dev';
}

// ─── Banner ───────────────────────────────────────────────────────────────────
function printBanner() {
    log();
    log(`  ${bold}${cyan}┌─────────────────────────────────────┐${R}`);
    log(`  ${bold}${cyan}│${R}  ${bold}NextCMS${R} – Create a new project     ${bold}${cyan}│${R}`);
    log(`  ${bold}${cyan}│${R}  ${c.dim('Next.js 16 · CMS & E-commerce')}       ${bold}${cyan}│${R}`);
    log(`  ${bold}${cyan}└─────────────────────────────────────┘${R}`);
    log();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    printBanner();
    createRL();

    // ── 1. Project name ────────────────────────────────────────────────────
    let projectName = process.argv[2] ?? '';

    if (!projectName) {
        projectName = await ask(`  ${c.bold('Project name')} ${c.dim('(my-cms)')} › `);
        if (!projectName) projectName = 'my-cms';
    }

    if (!isValidName(projectName)) {
        fail(`"${projectName}" is not a valid project name. Use lowercase letters, numbers, hyphens, or dots.`);
        process.exit(1);
    }

    const cwd = process.cwd();
    const targetDir = path.resolve(cwd, projectName);

    // ── 2. Directory check ─────────────────────────────────────────────────
    if (fs.existsSync(targetDir)) {
        const files = fs.readdirSync(targetDir);
        if (files.length > 0) {
            warn(`Directory ${c.yellow(projectName)} already exists and is not empty.`);
            const proceed = await confirm('  Continue and overwrite?', false);
            if (!proceed) {
                log(`\n${c.dim('Aborted.')}`);
                rl.close();
                process.exit(0);
            }
        }
    }

    log();

    // ── 3. Clone / download template ──────────────────────────────────────
    const hasGit = commandExists('git');

    if (hasGit) {
        step(`Cloning template from ${c.cyan(CLONE_URL)}…`);
        try {
            execSync(
                `git clone --depth=1 --branch ${GITHUB_BRANCH} "${CLONE_URL}" "${targetDir}"`,
                { stdio: 'pipe' },
            );
            ok('Template cloned.');
        } catch (e) {
            fail('git clone failed. Trying tarball download…');
            try {
                await downloadTarball(targetDir, projectName);
                ok('Template downloaded.');
            } catch (e2) {
                fail(`Download failed: ${e2.message}`);
                rl.close();
                process.exit(1);
            }
        }
    } else {
        warn('git not found – downloading tarball instead.');
        try {
            await downloadTarball(targetDir, projectName);
            ok('Template downloaded.');
        } catch (e) {
            fail(`Download failed: ${e.message}`);
            rl.close();
            process.exit(1);
        }
    }

    // ── 4. Clean up git history ────────────────────────────────────────────
    removeGit(targetDir);
    ok('Removed .git history.');

    // ── 5. Copy .env-sample → .env ─────────────────────────────────────────
    const envSample = path.join(targetDir, '.env-sample');
    const envFile = path.join(targetDir, '.env');
    if (fs.existsSync(envSample) && !fs.existsSync(envFile)) {
        fs.copyFileSync(envSample, envFile);
        ok(`Created ${c.cyan('.env')} from ${c.dim('.env-sample')}.`);
    }

    // ── 6. Update package.json name ────────────────────────────────────────
    const pkgPath = path.join(targetDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            pkg.name = projectName;
            pkg.private = true;
            fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 4)}\n`);
            ok(`Updated ${c.cyan('package.json')} name to ${c.bold(projectName)}.`);
        } catch {
            warn('Could not update package.json name.');
        }
    }

    log();

    // ── 7. Install dependencies ────────────────────────────────────────────
    const pm = detectPackageManager();
    const doInstall = await confirm(
        `  Install dependencies with ${c.bold(pm)}?`,
        true,
    );

    if (doInstall) {
        log();
        step(`Running ${c.cyan(installCmd(pm))}…`);
        const result = spawnSync(pm, pm === 'npm' ? ['install'] : [], {
            cwd: targetDir,
            stdio: 'inherit',
            shell: true,
        });
        if (result.status !== 0) {
            warn('dependency installation failed – run it manually.');
        } else {
            ok('Dependencies installed.');
        }
    }

    rl.close();

    // ── 8. Next steps ──────────────────────────────────────────────────────
    log();
    log(`  ${c.green('✓')} ${c.bold('Project created!')} ${c.dim('Get started:')}`);
    log();
    if (projectName !== '.') {
        log(`  ${c.cyan('cd')} ${projectName}`);
    }
    if (!doInstall) {
        log(`  ${c.cyan(installCmd(pm))}`);
    }
    log(`  ${c.cyan('# Configure your database and secrets in .env')}`);
    log(`  ${c.cyan(devCmd(pm))}`);
    log();
    log(`  ${c.dim('Docs:')} ${c.blue('https://github.com/pigmilcom/next-cms#readme')}`);
    log();
}

main().catch((e) => {
    fail(e.message ?? String(e));
    process.exit(1);
});
