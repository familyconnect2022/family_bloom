'use strict';

function parseVersion(input) {
  const raw = String(input || '').trim().replace(/^v/i, '');
  const match = raw.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    raw,
  };
}

function compareVersions(aInput, bInput) {
  const a = typeof aInput === 'string' ? parseVersion(aInput) : aInput;
  const b = typeof bInput === 'string' ? parseVersion(bInput) : bInput;
  if (!a || !b) throw new Error(`Cannot compare invalid versions: ${aInput} / ${bInput}`);
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return 0;
}

function upperBoundForCaret(base) {
  if (base.major > 0) return { major: base.major + 1, minor: 0, patch: 0 };
  if (base.minor > 0) return { major: 0, minor: base.minor + 1, patch: 0 };
  return { major: 0, minor: 0, patch: base.patch + 1 };
}

function upperBoundForTilde(base) {
  return { major: base.major, minor: base.minor + 1, patch: 0 };
}

function satisfiesComparator(version, operator, target) {
  const cmp = compareVersions(version, target);
  if (operator === '>=') return cmp >= 0;
  if (operator === '<=') return cmp <= 0;
  if (operator === '>') return cmp > 0;
  if (operator === '<') return cmp < 0;
  if (operator === '=' || operator === '') return cmp === 0;
  return false;
}

function satisfiesRange(versionInput, specInput) {
  const version = parseVersion(versionInput);
  const spec = String(specInput || '').trim();
  if (!version || !spec) return false;

  if (/^(workspace:|file:|link:|git\+|https?:)/i.test(spec)) {
    // Non-registry specs are not used by the critical Expo packages. Keep them
    // outside this validator instead of pretending to understand them.
    return true;
  }

  const exact = parseVersion(spec);
  if (exact) return compareVersions(version, exact) === 0;

  if (spec.startsWith('~')) {
    const base = parseVersion(spec.slice(1));
    if (!base) return false;
    return compareVersions(version, base) >= 0 && compareVersions(version, upperBoundForTilde(base)) < 0;
  }

  if (spec.startsWith('^')) {
    const base = parseVersion(spec.slice(1));
    if (!base) return false;
    return compareVersions(version, base) >= 0 && compareVersions(version, upperBoundForCaret(base)) < 0;
  }

  if (/^[<>]=?\s*\d+\.\d+\.\d+/.test(spec)) {
    const parts = spec.split(/\s+/).filter(Boolean);
    return parts.every((part) => {
      const match = part.match(/^(>=|<=|>|<|=)?(\d+\.\d+\.\d+(?:[-+].*)?)$/);
      if (!match) return false;
      const target = parseVersion(match[2]);
      return Boolean(target && satisfiesComparator(version, match[1] || '=', target));
    });
  }

  return false;
}

module.exports = {
  parseVersion,
  compareVersions,
  satisfiesRange,
};
