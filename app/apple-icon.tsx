import { ImageResponse } from "next/og";
export const size = {width: 180, height: 180};
export const contentType = "image/png";
export default function AppleIcon() {
 return new ImageResponse(
  <div style={{display:"flex",width:"100%",height:"100%",background:"#003B73",borderRadius:35,alignItems:"center",justifyContent:"center",color:"white",fontSize:88,fontWeight:900,letterSpacing:-10,paddingRight:13}}>7C</div>,
  {...size}
 );
}
