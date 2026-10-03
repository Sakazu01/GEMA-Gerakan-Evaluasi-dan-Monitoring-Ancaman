"use client";
import {useEffect,useRef,type RefObject} from "react";
export function useDialog(open:boolean,ref:RefObject<HTMLElement|null>,close:()=>void) {
  const closeRef=useRef(close);
  useEffect(()=>{closeRef.current=close;},[close]);
  useEffect(()=>{
    if(!open||!ref.current)return;
    const root=ref.current;
    const previous=document.activeElement as HTMLElement|null;
    const focusable=()=>Array.from(root.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex="0"]')).filter(el=>el.getClientRects().length>0);
    const siblings:HTMLElement[]=[];
    let ancestor:HTMLElement=root;
    while(ancestor.parentElement){
      for(const el of Array.from(ancestor.parentElement.children)){
        if(el!==ancestor&&el instanceof HTMLElement)siblings.push(el);
      }
      ancestor=ancestor.parentElement;
      if(ancestor===document.body)break;
    }
    const old=siblings.map(el=>el.inert);
    siblings.forEach(el=>el.inert=true);
    const overflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    (focusable()[0]||root).focus();
    function key(event:KeyboardEvent){
      if(event.key==="Escape"){event.preventDefault();closeRef.current();}
      if(event.key==="Tab"){
        const items=focusable(),first=items[0],last=items[items.length-1];
        if(!first){event.preventDefault();root.focus();}
        else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    }
    root.addEventListener("keydown",key);
    return()=>{root.removeEventListener("keydown",key);siblings.forEach((el,i)=>el.inert=old[i]);document.body.style.overflow=overflow;previous?.focus();};
  },[open,ref]);
}
