// A release only activates the same answer that received a fresh press.
// Advancing the question invalidates touches that began on the previous one.
export function createAnswerInput() {
  let question=0, press=null;
  return {
    reset(id) { question=id; press=null; },
    press(id,choice,pointer) { if(id!==question)return false; press={id,choice,pointer};return true; },
    release(id,choice,pointer) {
      const valid=!!press&&id===question&&press.id===id&&press.choice===choice&&press.pointer===pointer;
      press=null;return valid;
    },
    cancel() {press=null;}
  };
}

// Some mobile browsers can emit a second synthetic click after the first tap.
// Ignore only an immediate repeat of the same control so a toggle cannot flip back.
export function createActionGuard(windowMs=400){
  let lastKey='',lastAt=-Infinity;
  return {
    accept(key,at=Date.now()){
      if(key===lastKey&&at-lastAt<windowMs)return false;
      lastKey=key;lastAt=at;return true;
    },
    reset(){lastKey='';lastAt=-Infinity;}
  };
}

// Classify by usable viewport and input type; avoids brittle user-agent checks.
export function deviceClass(width,coarsePointer=false) {
  const w=Number(width);
  if(coarsePointer&&w<600)return 'phone';
  if(coarsePointer&&w<1100)return 'tablet';
  return 'desktop';
}

// Stable, separate home positions for every crew member, including tall phones.
export function stationSlots(width,height,count){
  if(width<2||height<2||count<1)return [];
  const cols=height>width?2:Math.min(4,Math.ceil(count/2)),rows=Math.ceil(count/cols);
  const top=Math.max(60,height*.28),bottom=height-24,cellH=(bottom-top)/rows,cellW=width*.9/cols;
  const size=Math.max(16,Math.min(112,cellW*.64,(cellH-28)/1.3));
  return Array.from({length:count},(_,i)=>{
    const row=Math.floor(i/cols),items=Math.min(cols,count-row*cols),col=i%cols;
    return {x:width*.05+width*.9*(col+.5)/items,y:top+cellH*(row+.5),size,labelWidth:cellW*.9};
  });
}
