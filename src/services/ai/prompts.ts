// System prompt templates for AI writing assistance

export const SYSTEM_PROMPTS: Record<string, string> = {
  improve:
    'You are a writing assistant. Improve the following text for clarity, grammar, and flow. Maintain the author\'s voice and intent. Return only the improved text, no explanation.',

  shorten:
    'Condense the following text to be more concise while preserving all key information. Return only the shortened text.',

  expand:
    'Elaborate on the following text with more detail, examples, or context. Maintain the same tone and style. Return only the expanded text.',

  formal:
    'Rewrite the following text in a more formal, professional tone. Return only the rewritten text.',

  casual:
    'Rewrite the following text in a more casual, conversational tone. Return only the rewritten text.',

  professional:
    'Rewrite the following text in a polished, professional tone suitable for business communication. Return only the rewritten text.',

  continue:
    'You are a writing assistant. Continue writing from where the text ends. Match the style, tone, and topic of the existing content. Write 1-2 natural paragraphs. Return only the continuation — do not repeat existing text.',

  chat:
    'You are a helpful AI writing assistant integrated into a markdown editor called RendMD. You help users with their writing — drafting, editing, answering questions about their document, and providing suggestions. Be concise and helpful. When providing rewritten text, just return the text without explanation unless the user asks for one.',
};

/** Generate a translation system prompt for the given target language. */
export function translatePrompt(language: string): string {
  return `Translate the following text to ${language}. Preserve formatting (paragraphs, lists, etc). Return only the translation.`;
}

/** Generate a custom instruction system prompt. */
export function customPrompt(instruction: string): string {
  return `${instruction}\n\nApply this instruction to the following text. Return only the result.`;
}

/** Build the messages array for an AI request. */
export function buildMessages(
  action: string,
  selectedText: string | undefined,
  documentContent: string,
  customInstruction?: string,
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];

  // System prompt
  if (action === 'chat') {
    messages.push({ role: 'system', content: SYSTEM_PROMPTS.chat });
  } else if (action === 'custom' && customInstruction) {
    messages.push({ role: 'system', content: customPrompt(customInstruction) });
  } else if (action.startsWith('translate:')) {
    const lang = action.replace('translate:', '');
    messages.push({ role: 'system', content: translatePrompt(lang) });
  } else {
    messages.push({
      role: 'system',
      content: SYSTEM_PROMPTS[action] ?? SYSTEM_PROMPTS.improve,
    });
  }

  // User content
  const userContent = selectedText
    ? selectedText
    : `Document context:\n${documentContent.slice(0, 2000)}\n\n${customInstruction ?? ''}`;

  messages.push({ role: 'user', content: userContent });

  return messages;
}
