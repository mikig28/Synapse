const addVariant = (variants: Set<string>, candidate?: string | null) => {
  if (typeof candidate !== 'string') {
    return;
  }

  const trimmed = candidate.trim();
  if (!trimmed) {
    return;
  }

  variants.add(trimmed);
  variants.add(trimmed.toLowerCase());
};

const normalizeInput = (raw: unknown): string | null => {
  if (raw == null) {
    return null;
  }

  if (typeof raw === 'object') {
    const maybeSerialized = (raw as any)._serialized || (raw as any).id;
    if (typeof maybeSerialized === 'string') {
      return maybeSerialized;
    }

    const user = (raw as any).user;
    const server = (raw as any).server || (raw as any).domain;
    if (typeof user === 'string') {
      return server ? `${user}@${server}` : user;
    }
  }

  return String(raw);
};

export const buildGroupIdCandidates = (rawGroupId?: unknown): string[] => {
  const normalized = normalizeInput(rawGroupId);
  if (!normalized) {
    return [];
  }

  const variants = new Set<string>();
  addVariant(variants, normalized);

  const sanitised = normalized.replace(/\u0000/g, '');
  addVariant(variants, sanitised);

  const cleanedWhitespace = sanitised.replace(/\s+/g, '');
  addVariant(variants, cleanedWhitespace);

  const atIndex = sanitised.indexOf('@');
  const basePart = atIndex >= 0 ? sanitised.slice(0, atIndex) : sanitised;
  const domainPart = atIndex >= 0 ? sanitised.slice(atIndex + 1) : '';

  if (basePart) {
    addVariant(variants, basePart);
    const digitsOnly = basePart.replace(/[^\d]/g, '');
    if (digitsOnly) {
      addVariant(variants, digitsOnly);
    }

    const hyphenless = basePart.replace(/-/g, '');
    if (hyphenless && hyphenless !== basePart) {
      addVariant(variants, hyphenless);
    }

    const domainOptions = domainPart
      ? [domainPart]
      : ['g.us', 's.whatsapp.net', 'c.us'];

    domainOptions.forEach(domain => {
      const candidate = `${basePart}@${domain}`;
      addVariant(variants, candidate);
      const digitsOnly = basePart.replace(/[^\d]/g, '');
      if (digitsOnly) {
        addVariant(variants, `${digitsOnly}@${domain}`);
      }
      const hyphenlessCandidate = basePart.replace(/-/g, '');
      if (hyphenlessCandidate && hyphenlessCandidate !== basePart) {
        addVariant(variants, `${hyphenlessCandidate}@${domain}`);
      }
    });
  }

  return Array.from(variants).filter(Boolean);
};

export const mergeUniqueStrings = (
  ...values: Array<string | undefined | null | string[]>
): string[] => {
  const unique = new Set<string>();

  const handleValue = (value: string | undefined | null) => {
    if (typeof value !== 'string') {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    unique.add(trimmed);
    unique.add(trimmed.toLowerCase());
  };

  values.forEach(value => {
    if (Array.isArray(value)) {
      value.forEach(entry => handleValue(entry));
    } else {
      handleValue(value);
    }
  });

  return Array.from(unique);
};
