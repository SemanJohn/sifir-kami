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
