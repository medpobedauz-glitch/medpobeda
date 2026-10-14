// Deterministic shelf packing in the front plane. Real structure sizes are kept;
// gaps prevent overlapping bounds instead of stretching anatomy geometry.
export function packAnatomy(items, aspect = 1) {
  const gap = .025;
  const sorted = items.map(item => ({ ...item, w:Math.max(item.width,.008)+gap, h:Math.max(item.height,.008)+gap }))
    .sort((a,b) => b.h-a.h || a.id.localeCompare(b.id));
  const area = sorted.reduce((sum,item) => sum+item.w*item.h,0);
  const width = Math.max(...sorted.map(item=>item.w), Math.sqrt(area*Math.max(.35,Math.min(2.5,aspect))), .1);
  let x=0,y=0,rowHeight=0,usedWidth=0;
  const slots=[];
  for(const item of sorted) {
    if(x>0 && x+item.w>width) {y+=rowHeight;x=0;rowHeight=0;}
    slots.push({id:item.id,x:x+item.w/2,y:y+item.h/2,width:item.w-gap,height:item.h-gap});
    x+=item.w;usedWidth=Math.max(usedWidth,x);rowHeight=Math.max(rowHeight,item.h);
  }
  const height=y+rowHeight;
  return slots.map(slot=>({...slot,x:slot.x-usedWidth/2,y:height/2-slot.y}));
}
