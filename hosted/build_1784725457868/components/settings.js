const KEY="axiom-settings";
const DEFAULTS={provider:"groq",apiKey:"",model:"qwen/qwen3.6-27b",baseUrl:"https://openrouter.ai/api/v1"};
export function getSettings(){try{return {...DEFAULTS,...JSON.parse(localStorage.getItem(KEY)||"{}")};}catch(_){return DEFAULTS;}}
export function setSettings(s){localStorage.setItem(KEY,JSON.stringify(s));}
export function mountSettings(){
  document.getElementById("settings-btn").onclick=()=>{
    const s=getSettings();
    const provider=prompt("Provider (groq / openrouter):",s.provider)||s.provider;
    const apiKey=prompt("API key:",s.apiKey)||s.apiKey;
    let model=s.model,baseUrl=s.baseUrl;
    if(provider==="openrouter"){
      model=prompt("Model name:",s.model)||s.model;
      baseUrl=prompt("Base URL:",s.baseUrl)||s.baseUrl;
    } else {
      model="qwen/qwen3.6-27b";
    }
    setSettings({provider,apiKey,model,baseUrl});
    alert("Saved.");
  };
}
