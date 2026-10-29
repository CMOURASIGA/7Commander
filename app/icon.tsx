import { ImageResponse } from "next/og";
export const size = {width: 192, height: 192};
export const contentType = "image/png";
export default function Icon() {
 return new ImageResponse(
  <div style={{display:"flex",width:"100%",height:"100%",background:"#003B73",borderRadius:38,alignItems:"center",justifyContent:"center",color:"white",fontSize:92,fontWeight:900,letterSpacing:-10,paddingRight:13}}>7C</div>,
  {...size}
 );
}
