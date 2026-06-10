const CLIENT_FIELDS_MARKER = '__PMCC_CLIENT_V1__';

const normalize = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

type EncodedClientFields = {
  d?: string;
  o?: string;
  n?: string;
};

const encodePayload = (payload: EncodedClientFields) =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

const decodePayload = (payload: string): EncodedClientFields | null => {
  try {
    const json = Buffer.from(payload, 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as EncodedClientFields;
  } catch {
    return null;
  }
};

export const encodeClientFields = (params: {
  description?: string | null;
  owner?: string | null;
  notes?: string | null;
}) => {
  const description = normalize(params.description);
  const owner = normalize(params.owner);
  const notes = normalize(params.notes);

  if (!owner && !notes) {
    return description;
  }

  const encoded = encodePayload({
    d: description || '',
    o: owner || '',
    n: notes || '',
  });
  return `${CLIENT_FIELDS_MARKER}${encoded}`;
};

export const decodeClientFields = (rawDescription?: string | null) => {
  const value = rawDescription || '';
  if (!value.startsWith(CLIENT_FIELDS_MARKER)) {
    return {
      description: normalize(value),
      owner: null as string | null,
      notes: null as string | null,
    };
  }

  const encodedPayload = value.slice(CLIENT_FIELDS_MARKER.length);
  const decoded = decodePayload(encodedPayload);
  if (!decoded) {
    return {
      description: null as string | null,
      owner: null as string | null,
      notes: null as string | null,
    };
  }

  return {
    description: normalize(decoded.d),
    owner: normalize(decoded.o),
    notes: normalize(decoded.n),
  };
};
