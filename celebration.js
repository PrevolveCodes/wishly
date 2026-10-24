(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.wishlyCelebrate = () => {
    if (reduced) return;
    const layer = document.createElement("div");
    layer.setAttribute("aria-hidden", "true");
    layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden";
    const colors = ["#8b78ff","#f3a6c8","#ffd166","#7bd8bd","#8bc6ff"];
    for (let i=0;i<46;i++) {
      const bit=document.createElement("i");
      const angle=(Math.PI*2*i/46)+(Math.random()-.5)*.22;
      const distance=90+Math.random()*230;
      const x=Math.cos(angle)*distance, y=Math.sin(angle)*distance;
      bit.style.cssText="position:absolute;left:50%;top:45%;width:"+(5+Math.random()*6)+"px;height:"+(7+Math.random()*9)+"px;border-radius:2px;background:"+colors[i%colors.length]+";opacity:0;transform:translate(-50%,-50%)";
      layer.appendChild(bit);
      bit.animate([
        {opacity:1,transform:"translate(-50%,-50%) scale(.4)"},
        {opacity:1,transform:"translate(calc(-50% + "+x+"px),calc(-50% + "+y+"px)) rotate("+(Math.random()*900-450)+"deg)"},
        {opacity:0,transform:"translate(calc(-50% + "+(x*1.25)+"px),calc(-50% + "+(y*1.25+120)+"px)) rotate("+(Math.random()*1200-600)+"deg)"}
      ],{duration:950+Math.random()*450,easing:"cubic-bezier(.12,.7,.2,1)"});
    }
    document.body.appendChild(layer);
    window.setTimeout(()=>layer.remove(),1600);
  };
})();