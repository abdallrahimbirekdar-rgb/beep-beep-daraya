'use strict';
const compactBrowseHome=renderHome;
renderHome=function(){
 compactBrowseHome();
 const filters=document.querySelector('.filters');if(!filters)return;
 filters.classList.add('compact-browse-filters');
 const search=filters.querySelector('.search-wrap');
 if(search){filters.prepend(search);const input=search.querySelector('input');if(input)input.placeholder='اسم المكان، الخدمة، أو الشارع…';}
 const track=document.createElement('div');track.className='browse-category-track';track.setAttribute('aria-label','أقسام الأماكن');
 filters.querySelectorAll(':scope>button').forEach(button=>track.append(button));
 filters.append(track);
 const selected=track.querySelector('.selected');if(selected)track.scrollLeft=selected.offsetLeft-track.offsetLeft-track.clientWidth/2+selected.clientWidth/2;
};
