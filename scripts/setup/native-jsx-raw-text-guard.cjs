#!/usr/bin/env node
'use strict';

/**
 * Find raw, single-line whitespace that TSX keeps as a string child.
 * React Native requires textual children of View/Pressable/etc. to be wrapped
 * in <Text>; TypeScript/Metro syntax checks do NOT detect this runtime error.
 */
function findRawTextRisks(ts, fileName, source) {
  const ast = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const issues = [];
  function visit(node) {
    if (ts.isJsxText(node) && typeof node.text === 'string' &&
      node.text.length > 0 && !/[\r\n]/.test(node.text) && /^\s+$/.test(node.text)) {
      const parent = node.parent;
      if (parent && ts.isJsxElement(parent)) {
        const tag = parent.openingElement.tagName.getText(ast);
        if (!/(?:^|\.)Text$|^(?:SvgText|TSpan|tspan|text)$/.test(tag)) {
          const at = ast.getLineAndCharacterOfPosition(node.getStart(ast));
          issues.push({ file: fileName, line: at.line + 1, column: at.character + 1, parent: tag, value: node.text });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return issues;
}
module.exports = { findRawTextRisks };
