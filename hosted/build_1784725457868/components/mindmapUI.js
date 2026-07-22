export function mountMindmap(){
  const root=document.getElementById("mindmap");
  root.innerHTML=`<div class="card">
    <h2>🧩 Generate a mind map</h2>
    <input id="mm-in" placeholder="e.g. Photosynthesis in plants" style="width:100%;padding:10px;background:#0e0e1c;color:#fff;border:1px solid #333;border-radius:8px" />
    <button id="mm-go" style="margin-top:8px;padding:10px 16px;background:linear-gradient(135deg,var(--brand-from),var(--brand-to));border:none;color:#fff;border-radius:8px;cursor:pointer">Generate</button>
    <div id="mm-out" style="margin-top:16px"></div>
  </div>`;
  document.getElementById("mm-go").onclick=async()=>{
    const p=document.getElementById("mm-in").value.trim();if(!p)return;
    const out=document.getElementById("mm-out");out.textContent="Rendering…";
    const r=await fetch("/mindmap",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:p})});
    const {url}=await r.json();out.innerHTML=`<img src="${url}" style="max-width:100%;border-radius:12px" />`;
  };
}
