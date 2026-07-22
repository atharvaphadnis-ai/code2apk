import { mountFileUpload } from "/components/fileUpload.js";
import { getSettings } from "/components/settings.js";

export function mountChat(){
  const root=document.getElementById("chat");
  root.innerHTML=`
    <div class="card">
      <h2>📂 Analyze a document</h2>
      <div id="drop" style="border:2px dashed #333;border-radius:12px;padding:32px;text-align:center;cursor:pointer">
        Drag & drop a .txt, .pdf, or .png — or click to pick
        <input type="file" id="file" accept=".txt,.pdf,.png" hidden />
      </div>
      <pre id="out" style="white-space:pre-wrap;margin-top:16px"></pre>
      <button id="copy" style="display:none;margin-top:8px">Copy</button>
    </div>`;
  mountFileUpload(root, async (file)=>{
    const s=getSettings();
    if(!s.apiKey){alert("Add your API key in Settings first");return;}
    const fd=new FormData();
    fd.append("file",file);
    fd.append("provider",s.provider);
    fd.append("apiKey",s.apiKey);
    fd.append("model",s.model);
    fd.append("baseUrl",s.baseUrl||"");
    const out=document.getElementById("out");
    out.textContent="Analyzing…";
    const r=await fetch("/analyze",{method:"POST",body:fd});
    const reader=r.body.getReader();const dec=new TextDecoder();let buf="";out.textContent="";
    while(true){const {value,done}=await reader.read();if(done)break;
      const chunk=dec.decode(value);buf+=chunk;
      chunk.split("\n").forEach(l=>{if(l.startsWith("data: ")){try{const j=JSON.parse(l.slice(6));const t=j.choices?.[0]?.delta?.content;if(t)out.textContent+=t;}catch(_){}}});
    }
    const copy=document.getElementById("copy");copy.style.display="inline-block";
    copy.onclick=()=>navigator.clipboard.writeText(out.textContent);
  });
}
