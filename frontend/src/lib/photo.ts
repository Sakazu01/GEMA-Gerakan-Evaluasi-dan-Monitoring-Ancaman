export async function preparePhoto(file:File):Promise<File>{
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||!file.size)throw new Error("Pilih foto JPEG, PNG, atau WebP yang tidak kosong.");
  if(file.size>10*1024*1024)throw new Error("Ukuran foto maksimal 10 MB.");
  const bitmap=await createImageBitmap(file);
  try{
    if(bitmap.width*bitmap.height>25000000)throw new Error("Dimensi foto terlalu besar.");
    const scale=Math.min(1,2048/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement("canvas");canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    const context=canvas.getContext("2d");if(!context)return file;
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",0.85));
    return blob?new File([blob],"laporan.jpg",{type:"image/jpeg"}):file;
  }finally{bitmap.close();}
}
