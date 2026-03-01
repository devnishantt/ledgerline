import { useEffect,useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { request,setCredential } from './api'
import { Shell } from './components/Shell'
import { Empty } from './components/ui'
import { Login } from './pages/Login'
import { Overview } from './pages/Overview'
import { Accounts } from './pages/Accounts'
import { Imports } from './pages/Imports'
import { Transactions } from './pages/Transactions'
import { Rules } from './pages/Rules'
import { Runs } from './pages/Runs'
import { RunDetail } from './pages/RunDetail'
import { Audit } from './pages/Audit'
import { Keys } from './pages/Keys'
export function App(){
 const [session,setSession]=useState<any>(null),[page,setPage]=useState(window.location.hash.slice(1)||'overview'),client=useQueryClient()
 useEffect(()=>{const listener=()=>{setPage(window.location.hash.slice(1)||'overview');window.scrollTo(0,0)};window.addEventListener('hashchange',listener);return()=>window.removeEventListener('hashchange',listener)},[])
 async function connect(key:string){const result=await request('/me',{},key);client.clear();setCredential(key);setSession(result);window.location.hash='overview'}
 function signOut(){setCredential('');setSession(null);client.clear()}
 if(!session)return <Login onConnect={connect}/>
 const admin=session.principal.role==='admin'
 const content=page==='overview'?<Overview/>:page==='accounts'?<Accounts admin={admin}/>:page==='imports'?<Imports admin={admin}/>:page==='transactions'?<Transactions/>:page==='rules'?<Rules admin={admin}/>:page==='runs'?<Runs admin={admin}/>:page.startsWith('runs/')?<RunDetail id={page.slice(5)} role={session.principal.role}/>:page==='audit'?<Audit/>:page==='keys'?(admin?<Keys/>:<Empty title="Administrator access required">Credential management is limited to administrators.</Empty>):<Empty title="Page not found"><a href="#overview">Return to overview</a></Empty>
 return <Shell page={page} workspace={session.workspace.name} role={session.principal.role} onSignOut={signOut}>{content}</Shell>
}
