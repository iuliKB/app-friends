/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow hardcoded color hex literals and raw numeric spacing/typography values in styles',
    },
    schema: [],
    messages: {
      noHardcodedColor:
        'Hardcoded color "{{value}}" — use a COLORS token from @/theme instead.',
      noHardcodedSpacing:
        'Hardcoded {{property}}: {{value}} — use a SPACING token from @/theme instead.',
      noHardcodedFontSize:
        'Hardcoded fontSize: {{value}} — use a FONT_SIZE token from @/theme instead.',
    },
  },
  create(context) {
    // Skip files inside src/theme/ (token definitions)
    const filename = context.filename || context.getFilename();
    if (filename.includes('src/theme/') || filename.includes('src\\theme\\')) {
      return {};
    }

    const SPACING_PROPS = new Set([
      'padding',
      'paddingHorizontal',
      'paddingVertical',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'margin',
      'marginHorizontal',
      'marginVertical',
      'marginTop',
      'marginRight',
      'marginBottom',
      'marginLeft',
      'gap',
      'rowGap',
      'columnGap',
    ]);

    const FONT_SIZE_PROPS = new Set(['fontSize']);

    // Check if a node is inside a StyleSheet.create() call
    function isInStyleContext(node) {
      let current = node;
      while (current) {
        // StyleSheet.create({...})
        if (
          current.type === 'CallExpression' &&
          current.callee?.type === 'MemberExpression' &&
          current.callee.object?.name === 'StyleSheet' &&
          current.callee.property?.name === 'create'
        ) {
          return true;
        }
        current = current.parent;
      }
      return false;
    }

    return {
      // Detect hardcoded color hex literals and raw numeric spacing/typography values
      Property(node) {
        if (!isInStyleContext(node)) return;

        const key = node.key?.name || node.key?.value;
        const value = node.value;

        // Check for hex color strings
        if (value?.type === 'Literal' && typeof value.value === 'string') {
          const hexMatch = /^#[0-9a-fA-F]{3,8}$/.test(value.value);
          if (hexMatch) {
            context.report({
              node: value,
              messageId: 'noHardcodedColor',
              data: { value: value.value },
            });
            return;
          }
          // Also catch rgba() string literals
          if (/^rgba?\(/.test(value.value)) {
            context.report({
              node: value,
              messageId: 'noHardcodedColor',
              data: { value: value.value },
            });
            return;
          }
        }

        // Check for raw numeric spacing values (exempt 0 and 1)
        if (value?.type === 'Literal' && typeof value.value === 'number' && value.value > 1) {
          if (SPACING_PROPS.has(key)) {
            context.report({
              node: value,
              messageId: 'noHardcodedSpacing',
              data: { property: key, value: String(value.value) },
            });
            return;
          }
          if (FONT_SIZE_PROPS.has(key)) {
            context.report({
              node: value,
              messageId: 'noHardcodedFontSize',
              data: { value: String(value.value) },
            });
            return;
          }
        }

        // Check for negative UnaryExpression (e.g., margin: -8)
        if (
          value?.type === 'UnaryExpression' &&
          value.operator === '-' &&
          value.argument?.type === 'Literal' &&
          typeof value.argument.value === 'number' &&
          value.argument.value > 1
        ) {
          if (SPACING_PROPS.has(key)) {
            context.report({
              node: value,
              messageId: 'noHardcodedSpacing',
              data: { property: key, value: `-${value.argument.value}` },
            });
          }
        }
      },
    };
  },
};
