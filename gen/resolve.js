// read google.api.http (extension field 72295728) from MethodOptions.
export function resolveMethods(file, req) {
  const out = [];
  for (const svc of file.service ?? []) {
    const svcName = svc.name ?? '';
    const pkg = file.package ?? '';
    for (const m of svc.method ?? []) {
      const http = readHttp(m);
      const mname = m.name ?? '';
      const path = http?.path ?? `/${pkg}.${svcName}/${mname}`;
      const method = http?.method ?? 'POST';
      out.push({
        service: `${pkg}.${svcName}`, name: mname, path, httpMethod: method,
        clientStream: m.clientStreaming === true, serverStream: m.serverStreaming === true,
        body: http?.body ?? '',
      });
    }
  }
  return out;
}

function readHttp(method) {
  // options may carry unknown fields (extension). @bufbuild stores unknown as
  // `unknownFields` on the message; each entry is { no, wireType, data }.
  const o = method.options;
  if (!o) return null;
  const uf = o.unknownFields;
  if (!uf || !Array.isArray(uf)) {
    // `uninterpreted_option` path (extension not linked) — skip.
    return null;
  }
  for (const f of uf) {
    if (f.no !== 72295728n) continue;
    // f.data is the serialized HttpRule message bytes.
    const rule = parseHttpRule(f.data);
    if (rule) return rule;
  }
  return null;
}

function parseHttpRule(data) {
  // Minimal protobuf decode of google.api.HttpRule: field 1=get,2=put,3=post,4=delete,5=patch,7=body.
  const get = (n) => {
    let i = 0;
    while (i < data.length) {
      // varint tag
      let tag = 0n, shift = 0n;
      let b;
      do { b = data[i++]; tag |= BigInt(b & 0x7f) << shift; shift += 7n; } while (b & 0x80);
      const field = Number(tag >> 3n), wt = Number(tag & 7n);
      if (field === n && wt === 2) {
        // length-delimited
        let len = 0n, s2 = 0n;
        do { b = data[i++]; len |= BigInt(b & 0x7f) << s2; s2 += 7n; } while (b & 0x80);
        const v = Buffer.from(data.slice(i, i + Number(len))).toString();
        return v;
      }
      if (wt === 2) {
        let len = 0n, s2 = 0n;
        do { b = data[i++]; len |= BigInt(b & 0x7f) << s2; s2 += 7n; } while (b & 0x80);
        i += Number(len);
      } else if (wt === 0) {
        do { b = data[i++]; } while (b & 0x80);
      } else if (wt === 5) i += 4;
      else if (wt === 1) i += 8;
    }
    return null;
  };
  const d = new Uint8Array(data);
  const getv = get(1), putv = get(2), postv = get(3), delv = get(4), patchv = get(5), body = get(7);
  if (typeof getv === 'string') return { path: getv, method: 'GET', body: '' };
  if (typeof postv === 'string') return { path: postv, method: 'POST', body: body ?? '' };
  if (typeof putv === 'string') return { path: putv, method: 'PUT', body: body ?? '' };
  if (typeof patchv === 'string') return { path: patchv, method: 'PATCH', body: body ?? '' };
  if (typeof delv === 'string') return { path: delv, method: 'DELETE', body: '' };
  return null;
}
