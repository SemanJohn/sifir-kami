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
