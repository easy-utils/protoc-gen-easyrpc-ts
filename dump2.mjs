import { fromBinary } from '@bufbuild/protobuf'
import { CodeGeneratorRequestSchema } from '@bufbuild/protobuf/wkt'
const chunks=[]; for await (const c of process.stdin) chunks.push(c)
const req=fromBinary(CodeGeneratorRequestSchema,new Uint8Array(Buffer.concat(chunks)))
const f=req.protoFile.find(x=>x.name.includes('conformance'))
for(const svc of f?.service??[])for(const m of svc.method??[]){
  const o=m.options
  console.log(m.name,'uo:', o&&o.uninterpretedOption? JSON.stringify(o.uninterpretedOption).slice(0,240):null)
}
