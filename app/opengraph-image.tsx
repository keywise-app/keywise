import { ImageResponse } from 'next/og';
import { brand } from './lib/brand';
export const alt = 'Keywise. Your rentals, under control. Property management for independent landlords.';
export const size = { width:1200,height:630 };
export const contentType = 'image/png';
export default function Image() {
 return new ImageResponse(<div style={{width:'100%',height:'100%',background:'#0F3460',color:'white',display:'flex',flexDirection:'column',justifyContent:'space-between',padding:64,fontFamily:'sans-serif'}}>
  <div style={{display:'flex',alignItems:'center',gap:18}}><svg width="58" height="58" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#194D7C"/><circle cx="13" cy="16" r="5.5" stroke="#00D4AA" strokeWidth="2.5"/><circle cx="13" cy="16" r="2" fill="#00D4AA"/><path d="M18 16h8m-3 0v4m-3-4v3" stroke="#00D4AA" strokeWidth="2.5"/></svg><span style={{fontSize:38,fontWeight:700}}>{brand.name}</span></div>
  <div style={{display:'flex',flexDirection:'column'}}><div style={{fontSize:72,fontWeight:700,lineHeight:1.08,letterSpacing:-3,maxWidth:850}}>{brand.promise}</div><div style={{fontSize:27,color:'#C8D7E7',marginTop:24}}>{brand.category}</div></div>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'1px solid #456382',paddingTop:24,fontSize:22}}><span>Rent. Repairs. Records.</span><span style={{color:'#4AE2C4'}}>{brand.freeLabel} · keywise.app</span></div>
 </div>,size);
}
