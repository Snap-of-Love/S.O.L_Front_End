import { lazy, Suspense, useEffect, useState } from 'react';
const Photobooth=lazy(()=>import('./components/Photobooth'));
const SharePage=lazy(()=>import('./components/SharePage'));
export default function App(){
 const [location,setLocation]=useState(()=>({path:window.location.pathname,search:window.location.search}));
 useEffect(()=>{const update=()=>setLocation({path:window.location.pathname,search:window.location.search});window.addEventListener('popstate',update);return()=>window.removeEventListener('popstate',update);},[]);
 return <div className="min-h-screen bg-[#0c0c0c] flex flex-col"><Suspense fallback={<main className="min-h-screen bg-[#0c0c0c] text-stone-200 p-8 font-mono"><p role="status">Opening your studio…</p></main>}>{location.path==='/share'||location.path==='/share/'?<SharePage id={new URLSearchParams(location.search).get('id')}/>:location.path==='/'?<Photobooth/>:<main className="min-h-screen bg-[#0c0c0c] text-stone-200 p-8 font-mono"><h1>This page wandered off.</h1><p>Return to the booth to make a little memory.</p><a className="underline" href="/">Open S.O.L</a></main>}</Suspense></div>;
}
