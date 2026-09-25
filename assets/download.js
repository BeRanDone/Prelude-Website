/* Download the chart. The site has to upload as one small zip, so it cannot carry a big picture file for downloading.
   Instead the picture is put together here, in the visitor's own browser, out of the same tiles the viewer uses:
   the half-size level, about 9,700 pixels wide (as large as a phone's browser can build), saved as a JPG. */
(function(){
  function go(btn){
    var T=window.TIMELINE; if(!T){ location.href='timeline.html#download'; return; }
    var label=btn.textContent; btn.textContent='Preparing\u2026'; btn.setAttribute('aria-busy','true');
    var level=T.maxLevel-1, lw=Math.ceil(T.width/2), lh=Math.ceil(T.height/2), s=Math.min(1,Math.sqrt(16000000/(lw*lh))), tile=T.tile;
    var cv=document.createElement('canvas'); cv.width=Math.floor(lw*s); cv.height=Math.floor(lh*s);
    var cx=cv.getContext('2d'); cx.fillStyle='#fff'; cx.fillRect(0,0,cv.width,cv.height);
    var cols=Math.ceil(lw/tile), rows=Math.ceil(lh/tile), left=cols*rows, failed=false;
    function done(){ if(--left>0) return;
      if(failed){ finish(); alert('Sorry, the picture could not be put together in this browser. Email me and I will send you the file.'); return; }
      cv.toBlob(function(b){ var a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='A-Prelude-to-the-End-of-the-World-timeline.jpg'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){URL.revokeObjectURL(a.href);},20000); finish(); },'image/jpeg',0.92); }
    function finish(){ btn.textContent=label; btn.removeAttribute('aria-busy'); }
    for(var c=0;c<cols;c++) for(var r=0;r<rows;r++) (function(c,r){ var im=new Image();
      im.onload=function(){ cx.drawImage(im,Math.floor(c*tile*s),Math.floor(r*tile*s),Math.ceil(im.naturalWidth*s),Math.ceil(im.naturalHeight*s)); done(); };
      im.onerror=function(){ failed=true; done(); }; im.src='timeline/tiles/'+level+'/'+c+'_'+r+'.'+T.format+(T.v?'?v='+T.v:''); })(c,r);
  }
  document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('[data-download-chart]'); if(b){ e.preventDefault(); go(b); } });
})();
