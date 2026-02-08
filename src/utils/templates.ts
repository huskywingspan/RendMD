/** Starter templates for new documents */

export interface Template {
  id: string;
  label: string;
  description: string;
  icon: string; // emoji
  content: string;
}

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    label: 'Blank',
    description: 'Start from scratch',
    icon: '📄',
    content: '',
  },
  {
    id: 'note',
    label: 'Note',
    description: 'Quick dated note',
    icon: '📝',
    content: `# Note — ${new Date().toLocaleDateString()}

## Key Points

- 

## Action Items

- [ ] 
`,
  },
  {
    id: 'readme',
    label: 'README',
    description: 'Project README template',
    icon: '📦',
    content: `# Project Name

> One-line description.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Usage

## Contributing

## License

MIT
`,
  },
  {
    id: 'blog',
    label: 'Blog Post',
    description: 'Article with frontmatter',
    icon: '✍️',
    content: `---
title: "Untitled Post"
date: "${new Date().toISOString().slice(0, 10)}"
tags: []
---

# Untitled Post

Introduction paragraph.

## Section 1

## Conclusion
`,
  },
];

/** Return fresh template content (re-evaluates dynamic dates) */
export function getTemplateContent(id: string): string {
  // Re-create templates with fresh dates each time
  const now = new Date();
  switch (id) {
    case 'blank':
      return '';
    case 'note':
      return `# Note — ${now.toLocaleDateString()}\n\n## Key Points\n\n- \n\n## Action Items\n\n- [ ] \n`;
    case 'readme':
      return TEMPLATES.find((t) => t.id === 'readme')!.content;
    case 'blog':
      return `---\ntitle: "Untitled Post"\ndate: "${now.toISOString().slice(0, 10)}"\ntags: []\n---\n\n# Untitled Post\n\nIntroduction paragraph.\n\n## Section 1\n\n## Conclusion\n`;
    default:
      return '';
  }
}
