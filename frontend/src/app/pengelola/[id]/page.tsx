import {ModerationDetail} from "@/components/ModerationDetail";
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;return <ModerationDetail id={id}/>;}
