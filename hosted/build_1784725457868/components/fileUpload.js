export function mountFileUpload(root,onFile){
  const drop=root.querySelector("#drop");const input=root.querySelector("#file");
  drop.onclick=()=>input.click();
  input.onchange=()=>input.files[0]&&onFile(input.files[0]);
  drop.ondragover=e=>{e.preventDefault();drop.style.background="#1a1a30";};
  drop.ondragleave=()=>drop.style.background="";
  drop.ondrop=e=>{e.preventDefault();drop.style.background="";const f=e.dataTransfer.files[0];if(f)onFile(f);};
}
