// read google.api.http (extension field 72295728) from MethodOptions.
// @bufbuild stores unknown extension values as {no:72295728, wireType:2, data}.
// data = [<varint length><HttpRule bytes>]; we skip the leading length varint.
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
  const o = method.options;
  if (!o) return null;
  const uf = o.unknownFields ?? o.$unknown;
  if (uf && Array.isArray(uf)) {
    for (const fld of uf) {
      if (String(fld.no) !== '72295728') continue;
      const raw = fld.data;
      let arr;
      if (Array.isArray(raw)) { arr = raw.map(Number) }
      else {
        const ks = Object.keys(raw).sort((a,b)=>Number(a)-Number(b))
        arr = ks.map(k=>Number(raw[k]))
      }
      const rule = parseHttpRule(arr);
      if (rule) return rule;
    }
  }
  return null;
}

// data = [<varint len><bytes>]; decode using HttpRule numeric field numbers
// get=2 put=3 post=4 delete=5 patch=6 body=7.
function parseHttpRule(data) {
  if (!data || data.length < 2) return null;
  // Skip leading varint length (usually 1 byte).
  let d = data;
  if (data[0] < 0x80) d = data.slice(1);
  else {
    // varint length
    let len = 0, s = 0, i = 0, b;
    do { b = data[i++]; len |= (b & 0x7f) << s; s += 7; } while (b & 0x80);
    d = data.slice(i);
  }
  const get = val => fieldString(d, val);
  const getv = get(2), putv = get(3), postv = get(4), delv = get(5), patchv = get(6), body = get(7);
  if (getv) return { path: getv, method: 'GET', body: '' };
  if (postv) return { path: postv, method: 'POST', body: body ?? '' };
  if (putv) return { path: putv, method: 'PUT', body: body ?? '' };
  if (patchv) return { path: patchv, method: 'PATCH', body: body ?? '' };
  if (delv) return { path: delv, method: 'DELETE', body: '' };
  return null;
}

function fieldString(d, n) {
  let i = 0;
  while (i < d.length) {
    let tag = 0, shift = 0, b;
    do { b = d[i++]; tag |= (b & 0x7f) << shift; shift += 7; } while (b & 0x80);
    const field = tag >> 3, wt = tag & 7;
    if (field === n && wt === 2) {
      let len = 0, s2 = 0;
      do { b = d[i++]; len |= (b & 0x7f) << s2; s2 += 7; } while (b & 0x80);
      return Buffer.from(d.slice(i, i + len)).toString();
    }
    if (wt === 2) { let len = 0, s2 = 0; do { b = d[i++]; len |= (b & 0x7f) << s2; s2 += 7; } while (b & 0x80); i += len; }
    else if (wt === 0) { do { b = d[i++]; } while (b & 0x80); }
    else if (wt === 5) i += 4;
    else if (wt === 1) i += 8;
    else return null;
  }
  return null;
}
