export function formatJsonl(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) return '';
  return pairs
    .map(p => JSON.stringify({ instruction: String(p.instruction ?? ''), output: String(p.output ?? '') }))
    .join('\n');
}

export function validateJsonl(text) {
  if (typeof text !== 'string') {
    return { valid: false, pairs: [] };
  }
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length === 0) return { valid: true, pairs: [] };
  try {
    const parsed = lines.map((line, idx) => {
      const obj = JSON.parse(line);
      if (
        !obj ||
        typeof obj !== 'object' ||
        Array.isArray(obj) ||
        typeof obj.instruction !== 'string' ||
        typeof obj.output !== 'string'
      ) {
        throw new Error(`Invalid entry on line ${idx + 1}`);
      }
      return {
        instruction: obj.instruction,
        output: obj.output,
        id: Date.now() + idx + Math.random()
      };
    });
    return { valid: true, pairs: parsed };
  } catch {
    return { valid: false, pairs: [] };
  }
}
