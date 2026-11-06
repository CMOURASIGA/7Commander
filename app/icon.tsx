import { ImageResponse } from "next/og";
export const size = { width: 192, height: 192 };
export const contentType = "image/png";
export default function Icon() {
 const markup = <svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
 <rect width="192" height="192" rx="30" fill="#fff"/>
 <path d="M142 28 A78 78 0 0 0 48 45 M36 58 A78 78 0 0 0 40 139 M51 153 A78 78 0 0 0 144 162" fill="none" stroke="#063467" strokeWidth="9" strokeLinecap="round"/>
 <path d="M148 44 L155 32 M146 157 L155 169" stroke="#063467" strokeWidth="9" strokeLinecap="round"/>
 <path d="M137 49 A62 62 0 0 0 57 52 M50 62 A62 62 0 0 0 137 146" fill="none" stroke="#063467" strokeWidth="9" strokeLinecap="round"/>
 <path d="M65 101 H83 L96 82 H158" fill="none" stroke="#155caa" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
 <path d="M66 113 H97 L112 96 H158" fill="none" stroke="#478cd3" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
 <path d="M90 129 H108 L126 113 H158" fill="none" stroke="#7db2e1" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
 <circle cx="158" cy="82" r="9" fill="#2974bf"/><circle cx="158" cy="96" r="9" fill="#4d94d3"/><circle cx="158" cy="113" r="9" fill="#7db2e1"/>
 <circle cx="154" cy="32" r="10" fill="#2a7bc4"/><circle cx="154" cy="32" r="5" fill="#a4ceef"/>
 <circle cx="154" cy="169" r="10" fill="#2a7bc4"/><circle cx="154" cy="169" r="5" fill="#a4ceef"/>
 <circle cx="36" cy="58" r="9" fill="#063467"/><circle cx="36" cy="58" r="4" fill="#70b5e8"/>
 <circle cx="48" cy="146" r="10" fill="#063467"/><circle cx="56" cy="54" r="9" fill="#063467"/>
 </svg>;
 return new ImageResponse(markup,{...size});
}
