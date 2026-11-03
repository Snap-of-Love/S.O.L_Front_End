import { lazy, Suspense, useEffect, useState } from 'react';
import './studio/studio.css';
const Photobooth=lazy(()=>import('./components/Photobooth'));
const SharePage=lazy(()=>import('./components/SharePage'));
export default function App(){
 const [location,setLocation]=useState(()=>({path:window.location.pathname,search:window.location.search}));
 useEffect(()=>{const update=()=>setLocation({path:window.location.pathname,search:window.location.search});window.addEventListener('popstate',update);return()=>window.removeEventListener('popstate',update);},[]);
 return <Suspense fallback={<main className="sol-studio route-message"><p role="status">Opening your studio…</p></main>}>{location.path==='/share'||location.path==='/share/'?<SharePage id={new URLSearchParams(location.search).get('id')}/>:location.path==='/'?<Photobooth/>:<main className="sol-studio route-message"><h1>This page wandered off.</h1><p>Return to the booth to make a little memory.</p><a className="button button-primary" href="/">Open S.O.L</a></main>}</Suspense>;
}
