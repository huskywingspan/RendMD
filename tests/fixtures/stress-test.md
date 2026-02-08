---
title: "RendMD Stress Test: Break Everything"
author: "Chaos Engineer"
date: 2026-02-08
tags: [stress, adversarial, edge-cases, breakage, "tag with spaces", "", null]
description: "A document designed to find every parser, renderer, and serializer bug in RendMD."
nested_object:
  level1:
    level2:
      level3: deeply nested
array_field: [1, 2, 3, "four", true, null]
multiline_value: |
  This is a multiline
  YAML value with
  multiple lines
empty_field:
unicode_key_日本語: "unicode in frontmatter key"
"quoted: key": value with colon
really_long_value: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur."
---

# 🔥 STRESS TEST: Break Everything 🔥

This document is designed to **intentionally** blow up RendMD's parser, renderer, and serializer. If the app survives this, it can survive anything.

---

## 1. Extreme Heading Torture

# H1
## H2
### H3
#### H4
##### H5
###### H6
####### Not a heading (7 levels)
# 
## <!-- empty heading with comment -->
### **Bold heading *with nested italic* and `code` and [link](url) and ~~strike~~ all at once**
# A heading that is extremely long and should definitely wrap across multiple lines in any reasonable viewport because it contains so many words that no single line could ever hope to contain them all without some kind of horizontal scrolling or text wrapping mechanism being engaged by the rendering engine

---

## 2. Formatting Abuse

### Nested Formatting Chaos

**bold *italic **bold-italic ~~strike `code` strike~~ italic** bold***

***~~`all at once`~~***

**_mixing asterisks and underscores_**

*__reverse nesting__*

This sentence has **bold that spans
across lines** and continues here.

### Unclosed Formatting (Parser Resilience)

**this bold is never closed

*this italic is never closed

~~this strikethrough is never closed

`this code is never closed

### Empty Formatting

****
**  **
*  *
~~  ~~
``

### Escaped Characters Galore

\*not bold\* \*\*not double bold\*\* \_not italic\_ \~\~not strike\~\~ \`not code\`

\# not a heading

\- not a list

\> not a blockquote

\[not a link\](not-a-url)

\!\[not an image\](not-a-src)

Backslash at end of line\
And this continues.

### Unicode Formatting

**日本語の太字** *Ελληνικά πλάγια* ~~العربية يتوسطه خط~~

**🎉🚀🔥** formatting around emoji

`কোড` inline code with Bengali

---

## 3. Link Torture

### Pathological Links

[](empty-text-link)

[link with no url]()

[link with spaces in url](https://example.com/path with spaces/file name.html)

[link](https://example.com/path?q=hello&world=true&special=%20%3C%3E#fragment-with-special-chars)

[link with "quotes" in text](https://example.com "title with \"escaped quotes\"")

[link with (parens) in text](https://example.com/path(1)/file(2).html)

[deeply [nested [brackets]] in](https://example.com) link text

[link
spanning
multiple
lines](https://example.com)

### URL Edge Cases

<https://example.com/path?q=<angle>&brackets>

<not-a-valid-url>

[javascript:alert(1)](javascript:alert(1))

[data:text/html,<h1>hi](data:text/html,<h1>hi</h1>)

[ftp://old.school/protocol](ftp://old.school/protocol)

[mailto:test@example.com](mailto:test@example.com)

### Reference Link Chaos

[ref with spaces][ref 1]
[ref with special chars][ref-2!@#]
[undefined reference][this-doesnt-exist]
[circular ref][circular]

[ref 1]: https://example.com "Reference 1"
[ref-2!@#]: https://example.com
[circular]: #3-link-torture

---

## 4. Image Stress

![](empty-src.png)

![alt text with **bold** and *italic* and `code`](https://example.com/image.png)

![extremely long alt text that goes on and on and on and on and on and on and on and on and on and describes an image in excruciating detail that nobody would ever actually write in practice but we need to test what happens when alt text is absurdly long](https://example.com/img.png "equally long title text that also goes on forever and ever to test title handling with extreme lengths")

![image with special chars: <>&"'](https://example.com/img.png?size=100x100&format=webp)

![broken
alt
on multiple
lines](https://example.com/img.png)

---

## 5. Code Block Nightmares

### Language Edge Cases

```
no language
```

```a]b[c{d}e
invalid language identifier with special chars
```

```javascript-but-really-long-language-name-that-should-not-exist
const x = 1;
```

### Nested Backticks in Code

````markdown
This code block uses 4 backticks and contains:
```
three backtick fences inside
```
````

### Code Block Content Torture

```html
<script>alert("XSS test: </script>")</script>
<div onclick="alert(1)" style="background:url('javascript:alert(1)')">
  <!--[if IE]><script>alert("IE conditional")</script><![endif]-->
</div>
```

```
Line with trailing spaces   
Line with	tabs		inside
Line with CRLF line ending
Line with unicode: 日本語 العربية 한국어 Ελληνικά

Zero-width characters: ​​​ (there are invisible chars here)
```

```python
# Code with markdown-like content that should NOT be parsed
**not bold** *not italic* [not a link](url)
# not a heading
- not a list
> not a blockquote
```

### Inline Code Edge Cases

`` `double backtick with inner backtick` ``

`code with **bold** not parsed`

`very long inline code that extends far beyond the visible area and should handle wrapping or horizontal scrolling gracefully in the rendered output without breaking the layout of surrounding text`

` ` (single space in code)

---

## 6. Table Destruction

### Minimal Table

| A |
|---|
| 1 |

### Misaligned Table

| Short | Very Long Column Header That Goes On Forever |
|---|---|
| x | y |
| This cell has way more content than the header above | z |

### Table with Complex Content

| Feature | Code | Link | Image |
|---------|------|------|-------|
| **Bold** | `code` | [link](url) | ![img](src) |
| *Italic* | `` `nested` `` | [**bold link**](url) | N/A |
| ~~Strike~~ | ```not a code block``` | [link with (parens)](url) | ![](empty) |

### Table with Alignment Extremes

| Left | Center | Right | Default |
|:-----|:------:|------:|---------|
| LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL | CCCCCCCC | RRRRRR | DDDDD |
| L | C | R | D |

### Table with Pipes in Content

| Expression | Result |
|-----------|--------|
| `a \| b` | true |
| `x \|\| y` | false |
| Regular \| pipe | works? |

### Huge Table (Performance Test)

| C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 |
|----|----|----|----|----|----|----|----|----|-----|
| 1  | 2  | 3  | 4  | 5  | 6  | 7  | 8  | 9  | 10  |
| 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20  |
| 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30  |
| 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40  |
| 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50  |
| 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60  |
| 61 | 62 | 63 | 64 | 65 | 66 | 67 | 68 | 69 | 70  |
| 71 | 72 | 73 | 74 | 75 | 76 | 77 | 78 | 79 | 80  |
| 81 | 82 | 83 | 84 | 85 | 86 | 87 | 88 | 89 | 90  |
| 91 | 92 | 93 | 94 | 95 | 96 | 97 | 98 | 99 | 100 |

---

## 7. List Nightmares

### Deep Nesting (8 Levels)

- Level 1
  - Level 2
    - Level 3
      - Level 4
        - Level 5
          - Level 6
            - Level 7
              - Level 8 — if you can see this, nesting works deep

### Mixed List Types Interleaved

1. Ordered
   - Unordered
     1. Ordered again
        - Unordered again
          1. Ordered once more
             - And unordered
2. Back to top

### List with Blank Lines (Loose Lists)

- Item 1

- Item 2

- Item 3

### List Items with Multiple Paragraphs, Code, and Quotes

1. First item with paragraph.

   A second paragraph under first item.

   ```js
   // Code block inside list item
   const inList = true;
   ```

   > Blockquote inside list item

   - Nested list inside list item
     - With its own nesting

2. Second item continues normally.

### Task List Edge Cases

- [ ] Unchecked
- [x] Checked
- [X] Uppercase X — should this work?
- [ ]No space after bracket
- [  ] Double space
- [-] Dash instead of x
- [?] Question mark
- Indeterminate task

### Single-Character List Items

- a
- b
- c

1. x
2. y
3. z

---

## 8. Blockquote Chaos

### Deep Nesting

> Level 1
>> Level 2
>>> Level 3
>>>> Level 4
>>>>> Level 5 — how deep can we go?

### Blockquote with Everything

> # Heading in blockquote
>
> **Bold** *italic* `code` ~~strike~~
>
> - List in blockquote
>   - Nested list
>
> 1. Ordered in blockquote
>
> [Link in blockquote](url)
>
> ![Image in blockquote](src)
>
> > Nested blockquote
> >
> > > Double-nested blockquote
>
> | Table | In | Blockquote |
> |-------|-----|-----------|
> | Yes   | It  | Works?    |
>
> ```js
> // Code in blockquote
> const x = 1;
> ```
>
> ---
>
> - [ ] Task in blockquote
> - [x] Completed task in blockquote

### Blockquote Without Space After >

>no space here
>still no space

---

## 9. Horizontal Rule Variants

All of these should render as horizontal rules:

---

***

___

- - -

* * *

_ _ _

-----------------------------

*****************************

_____________________________

## But These Should NOT Be Rules:

--

**

__

---

## 10. Unicode & Encoding Stress

### RTL Text

This paragraph contains العربية text that goes right-to-left mixed with English.

### CJK Text

日本語のテスト文章です。中文测试文本。한국어 테스트 텍스트입니다。

### Combining Characters

Ṫḧïṡ üṡëṡ ċöṁḅïṅïṅġ ċḧäṛäċṫëṛṡ (not precomposed).

é vs é (composed vs decomposed — these may look the same but are different bytes)

### Emoji Sequences

👨‍👩‍👧‍👦 Family emoji (ZWJ sequence)
🏳️‍🌈 Rainbow flag (ZWJ sequence)
👍🏻👍🏼👍🏽👍🏾👍🏿 Skin tone modifiers
1️⃣2️⃣3️⃣ Keycap sequences

### Zero-Width Characters

Hello​World (zero-width space between Hello and World)
Hello‌World (zero-width non-joiner)
Hello‍World (zero-width joiner)

### Math & Special Symbols

∀x∈ℝ: x² ≥ 0
∫₀^∞ e^(-x²) dx = √π/2
α β γ δ ε ζ η θ ι κ λ μ ν ξ π ρ σ τ υ φ χ ψ ω

### Box Drawing

```
┌──────────┬──────────┐
│  Cell 1  │  Cell 2  │
├──────────┼──────────┤
│  Cell 3  │  Cell 4  │
└──────────┴──────────┘
```

---

## 11. HTML Injection Attempts

These should be safely handled (our config has html: false):

<script>alert('XSS')</script>

<img src="x" onerror="alert(1)">

<div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:red;z-index:99999">TAKEOVER</div>

<iframe src="https://evil.com"></iframe>

<svg onload="alert(1)"><circle r="50"/></svg>

<math><mi>x</mi></math>

<details><summary>Click me</summary><script>alert(1)</script></details>

---

## 12. Performance Stress

### Massive Paragraph

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. This paragraph is intentionally over 1000 characters to test rendering and serialization of very large text blocks without any formatting breaks.

### Many Headings (TOC Stress)

#### Sub 1
#### Sub 2
#### Sub 3
#### Sub 4
#### Sub 5
#### Sub 6
#### Sub 7
#### Sub 8
#### Sub 9
#### Sub 10
#### Sub 11
#### Sub 12
#### Sub 13
#### Sub 14
#### Sub 15
#### Sub 16
#### Sub 17
#### Sub 18
#### Sub 19
#### Sub 20

### Repetitive Content (Serializer Stress)

The quick brown fox. The quick brown fox. The quick brown fox. The quick brown fox. The quick brown fox. The quick brown fox. The quick brown fox. The quick brown fox. The quick brown fox. The quick brown fox. The quick brown fox. The quick brown fox. The quick brown fox. The quick brown fox. The quick brown fox. The quick brown fox. The quick brown fox. The quick brown fox. The quick brown fox. The quick brown fox.

---

## 13. Frontmatter Round-Trip Killers

These are frontmatter-specific edge cases tested via the YAML parser:

- Frontmatter with `---` inside a value
- Frontmatter with YAML that looks like markdown
- Boolean-like values: true, false, yes, no, on, off
- Number-like values: 42, 3.14, 0x1F, 0o17, 0b1010, .inf, .nan
- Null variants: null, ~, Null, NULL
- Date-like values: 2026-02-08, 2026-02-08T12:00:00Z

---

## 14. Mixed Content Chaos

### Everything Nested In Everything

1. **Bold list item with [link](url) and `code` and ![image](src)**
   > Blockquote in list
   >
   > | Table | In | Blockquote | In | List |
   > |-------|-----|-----------|-----|------|
   > | **Bold cell** | `code cell` | *italic* | [link](url) | ~~strike~~ |
   >
   > - [ ] Task in blockquote in list
   >   ```js
   >   // Code in task in blockquote in list
   >   const deeply = { nested: true };
   >   ```

### Paragraph → List → Back to Paragraph

Regular paragraph text.

- This is a list.
- With multiple items.

Back to paragraph text. Does the list end properly?

1. Numbered list.
2. More items.

And back again. Toggle works?

> Blockquote.
> More blockquote.

Plain paragraph again.

```
Code block.
```

Final paragraph. All transitions clean?

---

## 15. Whitespace Torture

No trailing whitespace here.
Two trailing spaces here.  
Three trailing spaces.   
Tab at start:	this line.
Multiple		tabs		here.
Mixed   	spaces	  and		tabs.

Paragraph with no blank line after heading above — did it separate?

   Leading spaces on this line (3 spaces).

      Leading spaces on this line (6 spaces — possibly indented code?).

---

## 16. Empty & Minimal Content

### Empty Sections

###

####

### Single Characters as Content

a

1

*

### Edge Case Documents

The document after this line is just whitespace lines:



The above was empty. The document ends immediately after the next horizontal rule with no trailing content.

---
