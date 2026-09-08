// read google.api.http (extension field 72295728) from MethodOptions.
// Protoc (with grpc-gateway's annotations linked) stores the extension in
// `uninterpretedOption` when the extension isn't registered; for this
// generator we manually decode both paths.
export function resolveMethods(file, req) {
  const out = [];
  for (const svc of file.service ?? []) {
    const svcName = svc.name ?? '';
    const pkg = file.package ?? '';
    for (const m of svc.method ?? []) {
      const http = readHttp(m, pkg, svcName);
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

function readHttp(method, pkg, svc) {
  const o = method.options;
  if (!o) return null;
  // Path 1: uninterpreted_option with name = http.get/post/etc
  const uo = o.uninterpretedOption;
  if (uo && Array.isArray(uo)) {
    for (const opt of uo) {
      const nm = (opt.name ?? []).map(n => n.namePart ?? '').join('.');
      if (!nm.endsWith('http')) continue;
      // look for aggregate_value which holds the HttpRule text: {get: "/v1/health"}
      const agg = opt.aggregateValue;
      if (!agg) continue;
      return parseHttpRuleText(agg);
    }
  }
  // Path 2: unknownFields tag 72295728 (extension not decoded by descriptor set)
  const uf = o.unknownFields ?? o.$unknown;
  if (uf && Array.isArray(uf)) {
    for (const fld of uf) {
      if (fld.no !== 72295728n && fld.no !== 72295728) continue;
      const rule = parseHttpRule(fld.data);
      if (rule) return rule;
    }
  }
  return null;
}

function parseHttpRuleText(text) {
  // text like "{ get: \"/v1/health\" }" or `"{ post: \"/v1/echo\", body: \"*\" }"`
  const get = matchText(text, 'get');
  const post = matchText(text, 'post');
  const put = matchText(text, 'put');
  const patch = matchText(text, 'patch');
  const del = matchText(text, 'delete');
  const body = matchText(text, 'body');
  if (get) return { path: get, method: 'GET', body: '' };
  if (post) return { path: post, method: 'POST', body: body ?? '' };
  if (put) return { path: put, method: 'PUT', body: body ?? '' };
  if (patch) return { path: patch, method: 'PATCH', body: body ?? '' };
  if (del) return { path: del, method: 'DELETE', body: '' };
  return null;
}

function matchText(text, key) {
  const idx = text.indexOf(key + ':');
  if (idx < 0) return null;
  let i = idx + key.length + 1;
  while (i < text.length && (text[i] === ' ' || text[i] === '\t')) i++;
  if (text[i] === '"' || text[i] === "'") {
    const q = text[i++];
    let out = '';
    while (i < text.length && text[i] !== q) { out += text[i++]; }
    return out;
  }
  return null;
}

function parseHttpRule(data) {
  const get = (n) => {
    let i = 0, slice = null;
    while (i < data.length) {
      let tag = 0n, shift = 0n, b;
      do { b = data[i++]; tag |= BigInt(b & 0x7f) << shift; shift += 7n; } while (b & 0x80);
      const field = Number(tag >> 3n), wt = Number(tag & 7n);
      if (field === n && wt === 2) {
        let len = 0n, s2 = 0n;
        do { b = data[i++]; len |= BigInt(b & 0x7f) << s2; s2 += 7n; } while (b & 0x80);
        slice = Buffer.from(data.slice(i, i + Number(len))).toString();
        return slice;
      }
      if (wt === 2) { let len=0n,s2=0n; do{b=data[i++];len|=BigInt(b&0x7f)<<s2;s2+=7n;}while(b&0x80); i+=Number(len); }
      else if (wt === 0) { do { b = data[i++]; } while (b & 0x80); }
      else if (wt === 5) i += 4;
      else if (wt === 1) i += 8;
    }
    return null;
  };
  const d = new Uint8Array(data);
  const getv = get(2), putv = get(3), postv = get(4), delv = get(5), patchv = get(6), body = get(7);
  if (getv) return { path: getv, method: 'GET', body: '' };
  if (postv) return { path: postv, method: 'POST', body: body ?? '' };
  if (putv) return { path: putv, method: 'PUT', body: body ?? '' };
  if (patchv) return { path: patchv, method: 'PATCH', body: body ?? '' };
  if (delv) return { path: delv, method: 'DELETE', body: '' };
  return null;
}
