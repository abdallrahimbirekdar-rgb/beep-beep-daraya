'use strict';
(() => {
  async function timeout(promise, ms) {
    let timer;
    try { return await Promise.race([promise, new Promise((_,reject) => { timer=setTimeout(()=>reject(Error('VIDEO_PREPARE_TIMEOUT')),ms); })]); }
    finally { clearTimeout(timer); }
  }
  async function prepare(file, options={}) {
    // Small source videos already have a practical size for slow connections.
    if (file.size <= 1024*1024 || !window.MediaRecorder || !window.AudioContext && !window.webkitAudioContext) return {file,compressed:false};
    const choices=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/webm;codecs=vp8,opus','video/webm'];
    const mime=choices.find(x=>window.MediaRecorder.isTypeSupported(x));
    if (!mime) return {file,compressed:false};
    const video=document.createElement('video'),canvas=document.createElement('canvas');
    if (!canvas.captureStream) return {file,compressed:false};
    let context,source,stream,recorder,animation,timer,onAbort,onVisibility;
    const src=URL.createObjectURL(file);
    try {
      video.playsInline=true; video.preload='auto'; video.muted=true;
      await timeout(new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=()=>reject(Error('INVALID_VIDEO'));video.src=src;}),15000);
      if (options.signal?.aborted || document.hidden) throw Object.assign(Error('VIDEO_PREPARE_CANCELLED'),{cancelled:true});
      if (!video.videoWidth || !video.videoHeight || !Number.isFinite(video.duration)) return {file,compressed:false};
      const scale=Math.min(1,640/Math.max(video.videoWidth,video.videoHeight));
      canvas.width=Math.max(2,Math.floor(video.videoWidth*scale/2)*2);canvas.height=Math.max(2,Math.floor(video.videoHeight*scale/2)*2);
      const paint=canvas.getContext('2d'); if(!paint) return {file,compressed:false};
      stream=canvas.captureStream(18);
      context=new (window.AudioContext||window.webkitAudioContext)();
      const destination=context.createMediaStreamDestination();
      source=context.createMediaElementSource(video);source.connect(destination);
      // Audio goes to the recording stream, never to the speakers or microphone.
      destination.stream.getAudioTracks().forEach(track=>stream.addTrack(track));
      await timeout(context.resume(),8000);
      if (context.state !== 'running') return {file,compressed:false};
      video.muted=false;
      const chunks=[];
      recorder=new window.MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:220000,audioBitsPerSecond:32000});
      const recorded=new Promise((resolve,reject)=>{
        recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
        recorder.onerror=()=>reject(Error('VIDEO_ENCODE_FAILED'));
        recorder.onstop=()=>resolve(new Blob(chunks,{type:mime.startsWith('video/mp4')?'video/mp4':'video/webm'}));
        const cancel=()=>{const error=Object.assign(Error('VIDEO_PREPARE_CANCELLED'),{cancelled:true});reject(error);if(recorder.state!=='inactive')recorder.stop();};
        onAbort=cancel;onVisibility=()=>{if(document.hidden)cancel();};
        options.signal?.addEventListener('abort',onAbort,{once:true});document.addEventListener('visibilitychange',onVisibility);
        timer=setTimeout(()=>{reject(Error('VIDEO_ENCODE_TIMEOUT'));if(recorder.state!=='inactive')recorder.stop();},45000);
        video.onended=()=>{if(recorder.state!=='inactive')recorder.stop();};
      });
      const draw=()=>{if(recorder.state!=='recording')return;paint.drawImage(video,0,0,canvas.width,canvas.height);options.onProgress?.(Math.min(99,Math.round(video.currentTime/video.duration*100)));animation=requestAnimationFrame(draw);};
      paint.drawImage(video,0,0,canvas.width,canvas.height);recorder.start(1000);
      // Observe recorder failures while play() is still pending.
      recorded.catch(()=>{});
      await video.play();draw();
      const blob=await recorded;
      if (!blob.size || blob.size>=file.size) return {file,compressed:false};
      options.onProgress?.(100);
      return {file:new File([blob],blob.type==='video/mp4'?'offer.mp4':'offer.webm',{type:blob.type}),compressed:true};
    } catch(error) {
      if(options.signal?.aborted||error.cancelled)throw error;
      // Preserve the original sound and video if this device cannot encode.
      return {file,compressed:false};
    } finally {
      clearTimeout(timer);cancelAnimationFrame(animation);video.pause();
      if(recorder?.state && recorder.state!=='inactive'){try{recorder.stop();}catch{}}
      stream?.getTracks().forEach(track=>track.stop());source?.disconnect();
      if(context){try{await context.close();}catch{}}
      options.signal?.removeEventListener('abort',onAbort);if(onVisibility)document.removeEventListener('visibilitychange',onVisibility);
      video.removeAttribute('src');video.load();URL.revokeObjectURL(src);
    }
  }
  window.DarayaVideo={prepare};
})();
