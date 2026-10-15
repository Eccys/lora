export function formatJsonl(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) return '';
  return pairs
    .map(p => {
      const entry = {
        instruction: String(p.instruction ?? ''),
        ...(typeof p.input === 'string' ? { input: p.input } : {}),
        output: String(p.output ?? '')
      };
      return JSON.stringify(entry);
    })
    .join('\n');
}

export function validateJsonl(text) {
  if (typeof text !== 'string') {
    return { valid: false, pairs: [], error: 'Input must be a string.' };
  }
  const rawLines = text.split(/\r?\n/);
  const parsed = [];
  for (let idx = 0; idx < rawLines.length; idx++) {
    const line = rawLines[idx];
    if (line.trim() === '') continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      return { valid: false, pairs: [], error: `Invalid JSON syntax on line ${idx + 1}.` };
    }
    if (
      !obj ||
      typeof obj !== 'object' ||
      Array.isArray(obj) ||
      typeof obj.instruction !== 'string' ||
      typeof obj.output !== 'string' ||
      (obj.input !== undefined && typeof obj.input !== 'string')
    ) {
      return {
        valid: false,
        pairs: [],
        error: `Line ${idx + 1} must be a JSON object with string "instruction" and "output" fields.`
      };
    }
    parsed.push({
      instruction: obj.instruction,
      ...(typeof obj.input === 'string' ? { input: obj.input } : {}),
      output: obj.output,
      id: Date.now() + idx + Math.random()
    });
  }
  return { valid: true, pairs: parsed, error: null };
}

