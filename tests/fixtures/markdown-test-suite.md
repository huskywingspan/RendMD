---
title: Markdown Round-Trip Test Suite
author: RendMD Test Framework
date: 2026-01-29
tags: [test, markdown, validation, edge-cases]
theme: dark-basic
custom_field: This is a custom frontmatter field
---

# Markdown Round-Trip Test Suite

> This document tests all GFM (GitHub Flavored Markdown) elements and edge cases.
> Use this to validate that markdown survives the parse → edit → serialize cycle.

---

## 1. Headings

# Heading Level 1
## Heading Level 2
### Heading Level 3
#### Heading Level 4
##### Heading Level 5
###### Heading Level 6

### Heading with `inline code`

### Heading with **bold** and *italic*

---

## 2. Text Formatting

### Basic Formatting

This is **bold text** and this is *italic text*.

This is ***bold and italic*** together.

This is ~~strikethrough~~ text.

This is `inline code` within a paragraph.

### Mixed Formatting

This paragraph has **bold with *nested italic* inside** it.

This has *italic with **nested bold** inside* as well.

A **bold phrase with `code` inside** should work.

### Special Characters

Escaping special characters: \*asterisks\*, \_underscores\_, \`backticks\`

Ampersands & angle brackets < > should be preserved.

---

## 3. Links

### Basic Links

[Simple link](https://example.com)

[Link with title](https://example.com "This is a title")

### Links with Formatting

[**Bold link text**](https://example.com)

[*Italic link text*](https://example.com)

[Link with `code`](https://example.com)

### Autolinks

Visit <https://example.com> directly.

Email: <test@example.com>

### Reference Links

This is a [reference link][ref1] and another [reference][ref2].

[ref1]: https://example.com "Reference 1 Title"
[ref2]: https://example.org

---

## 4. Images

### Basic Image

![Alt text for image](https://via.placeholder.com/150)

### Image with Title

![Alt text](https://via.placeholder.com/150 "Image title text")

### Image as Link

[![Clickable image](https://via.placeholder.com/100)](https://example.com)

---

## 5. Lists

### Unordered Lists

- Item 1
- Item 2
- Item 3

* Alternative marker
* Another item
* Third item

### Ordered Lists

1. First item
2. Second item
3. Third item

### Nested Lists (Critical Test)

- Level 1 item
  - Level 2 item
    - Level 3 item
      - Level 4 item (deep nesting)
    - Back to level 3
  - Back to level 2
- Back to level 1

1. Numbered level 1
   1. Numbered level 2
      1. Numbered level 3
   2. Another level 2
2. Back to level 1

### Mixed Nested Lists

1. Ordered item
   - Unordered child
   - Another unordered
     1. Ordered grandchild
     2. Another ordered
2. Back to ordered

### Lists with Paragraphs

- First item with a paragraph.

  This is a continuation paragraph under the first item.

- Second item with multiple paragraphs.

  Another paragraph here.

  And a third paragraph.

### Lists with Formatting

- **Bold item**
- *Italic item*
- `Code item`
- Item with [link](https://example.com)

---

## 6. Task Lists

### Basic Task List

- [ ] Unchecked task
- [x] Checked task
- [ ] Another unchecked task

### Nested Task Lists

- [ ] Parent task
  - [ ] Child task 1
  - [x] Child task 2 (completed)
  - [ ] Child task 3

---

## 7. Blockquotes

### Simple Blockquote

> This is a blockquote.
> It can span multiple lines.

### Nested Blockquotes

> Outer quote
> > Nested quote
> > > Deeply nested quote

### Blockquote with Formatting

> **Bold in blockquote**
> 
> *Italic in blockquote*
> 
> `Code in blockquote`
> 
> [Link in blockquote](https://example.com)

### Blockquote with Lists

> - Item 1
> - Item 2
> - Item 3

### Blockquote with Code Block

> ```javascript
> const x = 1;
> ```

---

## 8. Code Blocks

### Fenced Code Block (JavaScript)

```javascript
function hello(name) {
  console.log(`Hello, ${name}!`);
  return true;
}

const result = hello("World");
```

### Fenced Code Block (Python)

```python
def hello(name: str) -> str:
    """Greet someone."""
    return f"Hello, {name}!"

if __name__ == "__main__":
    print(hello("World"))
```

### Fenced Code Block (TypeScript)

```typescript
interface User {
  id: number;
  name: string;
  email?: string;
}

function greet(user: User): string {
  return `Hello, ${user.name}!`;
}
```

### Fenced Code Block (No Language)

```
This is a code block without a language specified.
It should render as plain text.
```

### Fenced Code Block (Markdown)

```markdown
# Heading in code block

This is **bold** in a code block.

- List item
```

### Fenced Code Block (JSON)

```json
{
  "name": "RendMD",
  "version": "1.0.0",
  "features": ["editing", "themes", "ai"]
}
```

### Fenced Code Block (CSS)

```css
.editor {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-family-body);
}
```

### Fenced Code Block (Shell)

```bash
npm install
npm run dev
npm run build
```

### Indented Code Block

    This is an indented code block.
    It uses 4 spaces of indentation.
    No language highlighting here.

---

## 9. Tables

### Basic Table

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

### Table with Alignment

| Left | Center | Right |
|:-----|:------:|------:|
| L1   | C1     | R1    |
| L2   | C2     | R2    |
| L3   | C3     | R3    |

### Table with Formatting

| Feature | Status | Notes |
|---------|--------|-------|
| **Bold** | ✅ | Works in cells |
| *Italic* | ✅ | Also works |
| `Code` | ✅ | Inline code |
| [Link](https://example.com) | ✅ | Links work too |

### Wide Table

| ID | Name | Email | Role | Department | Start Date | Status |
|----|------|-------|------|------------|------------|--------|
| 1 | Alice | alice@example.com | Admin | Engineering | 2020-01-15 | Active |
| 2 | Bob | bob@example.com | User | Marketing | 2021-03-22 | Active |
| 3 | Charlie | charlie@example.com | User | Sales | 2022-07-01 | Inactive |

### Table with Long Content

| Setting | Value | Description |
|---------|-------|-------------|
| theme | dark-basic | The default theme for the application when no user preference is set |
| autosave | true | Whether to automatically save documents after a period of inactivity |
| debounce | 2000 | The number of milliseconds to wait before triggering autosave |

---

## 10. Horizontal Rules

Above the rule.

---

Below the rule.

Above another rule.

***

Below that rule.

Above yet another rule.

___

Below the final rule.

---

## 11. HTML (if supported)

### Inline HTML

This has <strong>HTML bold</strong> and <em>HTML italic</em>.

### Block HTML

<div style="background: #333; padding: 10px;">
  This is a div block.
</div>

<details>
<summary>Click to expand</summary>

This content is hidden by default.

</details>

---

## 12. Edge Cases

### Empty Elements

-
- 

1.
2. 

### Single Character Items

- a
- b
- c

### Unicode and Emoji

- 日本語 (Japanese)
- Ελληνικά (Greek)
- العربية (Arabic)
- 🎉 Party emoji
- ✅ Check mark
- 🚀 Rocket

### Very Long Lines

This is a very long line that should not wrap unexpectedly and should be preserved exactly as written without any modifications to whitespace or content even though it extends far beyond the typical line length that most editors would display without horizontal scrolling or soft wrapping enabled.

### Multiple Consecutive Blank Lines




There were three blank lines above this paragraph.

### Trailing Whitespace

This line has trailing spaces.   
This line has a hard break (two spaces then newline).

### Tabs vs Spaces

	This line starts with a tab.
    This line starts with 4 spaces.

---

## 13. Complex Combinations

### List with Code Block

1. First step:
   ```bash
   npm install
   ```
2. Second step:
   ```bash
   npm run dev
   ```

### Blockquote with Table

> | Header 1 | Header 2 |
> |----------|----------|
> | Data 1   | Data 2   |

### Nested Everything

- Top level
  > Blockquote in list
  > 
  > - Nested list in blockquote
  >   - Deeper nesting
  >   
  >   ```js
  >   // Code in nested structure
  >   const x = 1;
  >   ```

---

## Test Metadata

**Test Created:** 2026-01-29
**Purpose:** Validate markdown round-trip fidelity
**Expected:** All elements should survive parse → edit → serialize cycle

### Validation Checklist

- [ ] Frontmatter preserved (all fields)
- [ ] All heading levels render correctly
- [ ] Text formatting survives round-trip
- [ ] Links preserve URL and title
- [ ] Images preserve alt text and title
- [ ] List nesting preserved (4+ levels)
- [ ] Task list states preserved
- [ ] Blockquote nesting preserved
- [ ] Code blocks preserve language
- [ ] Tables preserve alignment
- [ ] Horizontal rules preserved
- [ ] Edge cases handled gracefully
