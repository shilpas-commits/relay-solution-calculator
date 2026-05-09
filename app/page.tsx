"use client";
import { useState, useCallback } from "react";

const C = {
  bg:"#080a0f", s1:"#0e1119", s2:"#141720", s3:"#1c2030", border:"#1f2435",
  cyan:"#00e5ff", cyanDim:"rgba(0,229,255,0.13)",
  orange:"#ff6b35", green:"#00ff9d", greenDim:"rgba(0,255,157,0.1)",
  yellow:"#ffd166", yellowDim:"rgba(255,209,102,0.1)",
  red:"#ff4060", redDim:"rgba(255,64,96,0.1)",
  purple:"#c084fc", teal:"#2dd4bf", tealDim:"rgba(45,212,191,0.1)",
  text:"#e2e8f0", muted:"#64748b",
  mono:"'Space Mono',monospace", dis:"'Arial Narrow',sans-serif", body:"Arial,sans-serif",
};

function calc(p) {
  const toteCycle   = p.owt + p.t2t;
  const tphPps      = 3600 / toteCycle;
  const uphPps      = tphPps * p.avgUnits;
  const sysTph      = tphPps * p.ppsCount;
  const sysUph      = uphPps * p.ppsCount;
  const maxTph      = 3600 / p.owt;
  const blendedVtmCycle = (p.hotPct/100)*p.hotVtmCycle + (1-p.hotPct/100)*p.coldVtmCycle;
  const htmCph      = 3600 / p.htmCycle;
  const vtmCphBase  = 3600 / p.vtmCycle;
  const vtmCphBlend = 3600 / blendedVtmCycle;
  const effectiveVtmDemand = sysTph * (1 - p.relayReuse / 100);
  const htmRaw  = Math.ceil(sysTph / htmCph);
  const htmBuf  = Math.ceil(htmRaw * p.buffer / 100);
  const htmTotal= htmRaw + htmBuf;
  const vtmBaseRaw  = Math.ceil(sysTph / vtmCphBase);
  const vtmBaseBuf  = Math.ceil(vtmBaseRaw * p.buffer / 100);
  const vtmBaseTotal= vtmBaseRaw + vtmBaseBuf;
  const vtmOptRaw   = Math.ceil(effectiveVtmDemand / vtmCphBlend);
  const vtmOptBuf   = Math.ceil(vtmOptRaw * p.buffer / 100);
  const vtmOptTotal = vtmOptRaw + vtmOptBuf;
  const vtmSaving   = vtmBaseTotal - vtmOptTotal;
  const htmPerPps   = htmTotal / p.ppsCount;
  const achievT2t   = p.htmCycle / htmPerPps;
  const queueSurplus= (htmPerPps * htmCph) - tphPps;
  const avgQueueWait  = (p.queueSize / 2) * toteCycle;
  const pipelineDepth = p.vtmCycle + p.relayQ + p.htmTravel + avgQueueWait + p.owt;
  const ordersInFlight= pipelineDepth / toteCycle;
  const activePps     = ordersInFlight;
  const returningPps  = p.returnCycle / toteCycle;
  const minTotesPps   = Math.ceil((activePps + returningPps) * p.safetyBuf);
  const minTotesSite  = minTotesPps * p.ppsCount;
  const shiftPres     = tphPps * p.ppsCount * p.shiftHours;
  const storageReuse  = 1 / (1 - Math.max(0.01, p.relayReuse / 100));
  const effectiveReuse= p.reuseRate * storageReuse;
  const uniqueTotes   = Math.ceil(shiftPres / effectiveReuse);
  const storageUtilPct= (uniqueTotes / p.storageCap) * 100;
  const storageAvail  = p.storageCap - uniqueTotes;
  const hoursOfStock  = (p.storageCap * effectiveReuse) / sysTph;
  const slottingScenarios = [0,10,20,30,40,50].map(hot => {
    const bc = (hot/100)*p.hotVtmCycle + (1-hot/100)*p.coldVtmCycle;
    const vd = sysTph * (1 - p.relayReuse/100);
    const vr = Math.ceil(Math.ceil(vd/(3600/bc))*(1+p.buffer/100));
    return { hot, bc: bc.toFixed(1), vtms: vr, saving: vtmBaseTotal - vr };
  });
  const vtmPerAisle   = vtmOptTotal / p.aisles;
  const vtmCphPerAisle= vtmPerAisle * vtmCphBlend;
  const reuseScenarios = [1,1.5,2,3,5].map(r => ({
    r, totes: Math.ceil(shiftPres/r), pct: (shiftPres/r/p.storageCap*100).toFixed(1)
  }));
  return {
    toteCycle, tphPps, uphPps, sysTph, sysUph, maxTph,
    blendedVtmCycle, htmCph, vtmCphBase, vtmCphBlend, effectiveVtmDemand,
    htmRaw, htmBuf, htmTotal, vtmBaseTotal, vtmOptRaw, vtmOptBuf, vtmOptTotal, vtmSaving,
    htmPerPps, achievT2t, queueSurplus,
    ordersInFlight, avgQueueWait, activePps, returningPps, minTotesPps, minTotesSite,
    shiftPres, uniqueTotes, storageUtilPct, storageAvail, hoursOfStock, effectiveReuse,
    slottingScenarios, vtmPerAisle, vtmCphPerAisle, reuseScenarios,
  };
}

function Inp({ label, val, onChange, unit, locked, step=1, col, sub }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 12px", borderBottom:`1px solid ${C.border}`, gap:6 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:10, fontWeight:600, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{label}</div>
        {sub && <div style={{ fontSize:8, color:C.muted, fontFamily:C.mono }}>{sub}</div>}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:2, background:locked?C.cyanDim:C.s3, border:`1px solid ${locked?C.cyan:col||C.border}`, borderRadius:4, padding:"2px 6px", flexShrink:0 }}>
        <input type="number" value={val} step={step} onChange={e=>onChange(parseFloat(e.target.value)||0)}
          style={{ background:"none", border:"none", outline:"none", color:locked?C.cyan:(col||C.text), fontFamily:C.mono, fontSize:11, fontWeight:700, width:50, textAlign:"right" }}/>
        <span style={{ fontSize:8, color:C.muted, fontFamily:C.mono, flexShrink:0 }}>{unit}</span>
      </div>
    </div>
  );
}
function GrpHdr({ children }) {
  return <div style={{ padding:"4px 12px", fontSize:8, fontWeight:700, letterSpacing:2, color:C.muted, textTransform:"uppercase", borderBottom:`1px solid ${C.border}`, background:C.bg, fontFamily:C.mono }}>{children}</div>;
}
function SecT({ children }) {
  return <div style={{ fontSize:9, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:C.muted, marginBottom:8, display:"flex", alignItems:"center", gap:8, fontFamily:C.mono }}>{children}<div style={{ flex:1, height:1, background:C.border }}/></div>;
}
function KV({ label, val, col }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", padding:"3px 0", borderBottom:`1px solid ${C.border}`, fontSize:10 }}>
      <span style={{ color:C.muted }}>{label}</span>
      <span style={{ color:col||C.text, fontWeight:700, fontFamily:C.dis }}>{val}</span>
    </div>
  );
}
function BigCard({ title, value, unit, col }) {
  return (
    <div style={{ background:C.s2, border:`1px solid ${C.border}`, borderTop:`2px solid ${col}`, borderRadius:6, padding:"10px 12px" }}>
      <div style={{ fontSize:8, color:C.muted, fontFamily:C.mono, letterSpacing:1, textTransform:"uppercase", marginBottom:4 }}>{title}</div>
      <div style={{ fontSize:28, fontWeight:800, fontFamily:C.dis, color:col, lineHeight:1 }}>{value}</div>
      {unit && <div style={{ fontSize:9, color:C.muted, fontFamily:C.mono, marginTop:3 }}>{unit}</div>}
    </div>
  );
}
function Gauge({ pct }) {
  const col = pct > 90 ? C.red : pct > 75 ? C.yellow : C.green;
  return (
    <div style={{ marginTop:4 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontFamily:C.mono, fontSize:9, marginBottom:2 }}>
        <span style={{ color:C.muted }}>0%</span>
        <span style={{ color:col, fontWeight:700 }}>{pct.toFixed(1)}% used</span>
        <span style={{ color:C.muted }}>100%</span>
      </div>
      <div style={{ height:8, background:C.s3, borderRadius:4, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${Math.min(pct,100)}%`, background:col, borderRadius:4 }}/>
      </div>
    </div>
  );
}
function Note({ type, children }) {
  const s = type==="warn" ? { bg:C.yellowDim, border:`1px solid ${C.yellow}30`, col:C.yellow }
    : type==="ok" ? { bg:C.greenDim, border:`1px solid ${C.green}30`, col:C.green }
    : { bg:C.redDim, border:`1px solid ${C.red}30`, col:C.red };
  return <div style={{ padding:"7px 10px", borderRadius:5, background:s.bg, border:s.border, fontSize:10, fontFamily:C.mono, color:s.col, lineHeight:1.6, marginTop:8 }}>{children}</div>;
}
function TH({ children }) {
  return <th style={{ background:C.s2, padding:"5px 8px", textAlign:"left", fontSize:8, letterSpacing:1, textTransform:"uppercase", color:C.muted, borderBottom:`1px solid ${C.border}`, fontFamily:C.mono }}>{children}</th>;
}
function TD({ children, active, col }) {
  return <td style={{ padding:"5px 8px", borderBottom:`1px solid ${C.border}`, color:active?C.cyan:(col||C.text), fontWeight:active?700:400, fontFamily:C.mono, fontSize:10 }}>{children}</td>;
}

export default function Page() {
  const [tab, setTab] = useState(0);
  const [p, setP] = useState({
    owt:22, t2t:3.71, avgUnits:3,
    htmCycle:195.6, vtmCycle:90,
    ppsCount:7, buffer:15, queueSize:8,
    relayQ:30, htmTravel:165, returnCycle:300, safetyBuf:2,
    relayReuse:0,
    storageCap:18000, shiftHours:12, reuseRate:1,
    hotPct:30, hotVtmCycle:45, coldVtmCycle:100,
    aisles:27, levels:2, relayPerLevel:13,
  });
  const set = useCallback((k,v)=>setP(prev=>({...prev,[k]:v})),[]);
  const r = calc(p);
  const tabs = ["⚡ Fleet","📦 Storage","🗂 Slotting"];

  return (
    <div style={{ background:C.bg, color:C.text, fontFamily:C.body, minHeight:"100vh", fontSize:12 }}>
      <div style={{ background:C.s1, borderBottom:`1px solid ${C.border}`, padding:"0 16px", display:"flex", alignItems:"center", gap:10, height:44 }}>
        <div style={{ background:C.cyan, color:"#000", fontSize:8, fontWeight:700, padding:"2px 7px", borderRadius:3, letterSpacing:1.5, fontFamily:C.mono }}>RELAY</div>
        <div style={{ fontSize:16, fontWeight:800, fontFamily:C.dis, letterSpacing:1 }}>Solution Calculator</div>
        <div style={{ marginLeft:"auto", fontSize:8, color:C.green, background:C.greenDim, padding:"2px 7px", borderRadius:3, border:`1px solid ${C.green}30`, fontFamily:C.mono }}>GreyOrange · O&M · v6</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", borderBottom:`1px solid ${C.border}` }}>
        {[
          { label:"TPH / PPS", val:r.tphPps.toFixed(1), unit:"totes/hr", col:C.cyan },
          { label:"UPH / PPS", val:r.uphPps.toFixed(0), unit:"units/hr", col:C.green },
          { label:"System TPH", val:r.sysTph.toFixed(0), unit:`${p.ppsCount} PPS`, col:C.orange },
          { label:"System UPH", val:Math.round(r.sysUph).toLocaleString(), unit:"total units/hr", col:C.yellow },
          { label:"HTM Fleet", val:r.htmTotal, unit:"bots", col:C.cyan },
          { label:"VTM Fleet", val:r.vtmOptTotal, unit:r.vtmSaving>0?`-${r.vtmSaving} vs baseline`:"bots", col:C.purple },
          { label:"Unique Totes", val:r.uniqueTotes.toLocaleString(), unit:`${r.effectiveReuse.toFixed(1)}× reuse`, col:C.teal },
          { label:"Storage Used", val:`${r.storageUtilPct.toFixed(1)}%`, unit:`of ${(p.storageCap/1000).toFixed(0)}k slots`, col:r.storageUtilPct>90?C.red:r.storageUtilPct>75?C.yellow:C.green },
        ].map(({label,val,unit,col},i)=>(
          <div key={i} style={{ background:i<4?C.s1:C.s2, padding:"9px 12px", borderRight:`1px solid ${C.border}`, borderBottom:i<4?`1px solid ${C.border}`:"none" }}>
            <div style={{ fontSize:7, color:C.muted, fontFamily:C.mono, letterSpacing:1.5, textTransform:"uppercase", marginBottom:3 }}>{label}</div>
            <div style={{ fontSize:20, fontWeight:800, fontFamily:C.dis, color:col, lineHeight:1 }}>{val}</div>
            <div style={{ fontSize:8, color:C.muted, fontFamily:C.mono, marginTop:2 }}>{unit}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"240px 1fr" }}>
        <div style={{ background:C.s1, borderRight:`1px solid ${C.border}`, overflowY:"auto", maxHeight:"calc(100vh - 132px)", position:"sticky", top:0 }}>
          <GrpHdr>🎯 Targets</GrpHdr>
          <Inp label="OWT" sub="Full time per tote" val={p.owt} onChange={v=>set("owt",v)} unit="sec" locked/>
          <Inp label="T2T" val={p.t2t} onChange={v=>set("t2t",v)} unit="sec" col={C.cyan} step={0.01}/>
          <Inp label="Avg Units/Tote" val={p.avgUnits} onChange={v=>set("avgUnits",v)} unit="units" col={C.cyan} step={0.5}/>
          <GrpHdr>🤖 Bot Cycles</GrpHdr>
          <Inp label="HTM Cycle" val={p.htmCycle} onChange={v=>set("htmCycle",v)} unit="sec" col={C.cyan} step={0.1}/>
          <Inp label="VTM Cycle (baseline)" val={p.vtmCycle} onChange={v=>set("vtmCycle",v)} unit="sec" col={C.purple} step={0.1}/>
          <GrpHdr>🏭 System</GrpHdr>
          <Inp label="PPS Stations" val={p.ppsCount} onChange={v=>set("ppsCount",v)} unit="PPS" col={C.orange}/>
          <Inp label="Queue / PPS" val={p.queueSize} onChange={v=>set("queueSize",v)} unit="totes" col={C.yellow}/>
          <Inp label="Bot Buffer %" val={p.buffer} onChange={v=>set("buffer",v)} unit="%"/>
          <Inp label="Relay Reuse %" sub="% totes reused at relay" val={p.relayReuse} onChange={v=>set("relayReuse",v)} unit="%" col={C.teal}/>
          <GrpHdr>📦 Storage & Shift</GrpHdr>
          <Inp label="Storage Capacity" val={p.storageCap} onChange={v=>set("storageCap",v)} unit="totes" col={C.teal} step={100}/>
          <Inp label="Shift Hours" val={p.shiftHours} onChange={v=>set("shiftHours",v)} unit="hrs"/>
          <Inp label="Tote Reuse Rate" sub="Avg calls/tote/shift" val={p.reuseRate} onChange={v=>set("reuseRate",v)} unit="×" col={C.green} step={0.1}/>
          <Inp label="Return Cycle ⚠" sub="Empty tote back to storable" val={p.returnCycle} onChange={v=>set("returnCycle",v)} unit="sec" col={C.teal}/>
          <Inp label="Safety Buffer" val={p.safetyBuf} onChange={v=>set("safetyBuf",v)} unit="×" step={0.5}/>
          <GrpHdr>🗂 Slotting</GrpHdr>
          <Inp label="Hot SKU % of picks" val={p.hotPct} onChange={v=>set("hotPct",v)} unit="%" col={C.orange}/>
          <Inp label="Hot SKU VTM cycle" sub="Level 1, near PPS" val={p.hotVtmCycle} onChange={v=>set("hotVtmCycle",v)} unit="sec" col={C.green} step={1}/>
          <Inp label="Cold SKU VTM cycle" sub="Higher levels, far aisles" val={p.coldVtmCycle} onChange={v=>set("coldVtmCycle",v)} unit="sec" col={C.muted} step={1}/>
          <GrpHdr>📍 Relay Arch.</GrpHdr>
          <Inp label="Aisles" val={p.aisles} onChange={v=>set("aisles",v)} unit="aisles"/>
          <Inp label="Levels/Aisle" val={p.levels} onChange={v=>set("levels",v)} unit="lvls"/>
          <Inp label="Relay Pts/Level" val={p.relayPerLevel} onChange={v=>set("relayPerLevel",v)} unit="pts"/>
        </div>
        <div style={{ overflowY:"auto", maxHeight:"calc(100vh - 132px)" }}>
          <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, background:C.s1 }}>
            {tabs.map((t,i)=>(
              <div key={i} onClick={()=>setTab(i)} style={{ padding:"9px 18px", fontSize:11, fontFamily:C.mono, cursor:"pointer", borderBottom:`2px solid ${tab===i?C.cyan:"transparent"}`, color:tab===i?C.cyan:C.muted, fontWeight:tab===i?700:400 }}>{t}</div>
            ))}
          </div>
          <div style={{ padding:14 }}>
            {tab===0&&(
              <>
                <SecT>TPH Derivation</SecT>
                <div style={{ background:C.s2, border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.cyan}`, borderRadius:5, padding:"8px 12px", fontFamily:C.mono, fontSize:11, color:C.muted, marginBottom:12, lineHeight:1.9 }}>
                  Tote Cycle = OWT + T2T = <span style={{color:C.cyan}}>{p.owt} + {p.t2t} = {r.toteCycle.toFixed(2)}s</span>
                  {" → "}TPH/PPS = <span style={{color:C.cyan,fontWeight:700}}>{r.tphPps.toFixed(1)}</span>
                  {" → "}UPH/PPS = <span style={{color:C.green,fontWeight:700}}>{r.uphPps.toFixed(0)}</span>
                  {" → "}System TPH = <span style={{color:C.orange,fontWeight:700}}>{r.sysTph.toFixed(0)}</span>
                </div>
                <SecT>Bot Fleet</SecT>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                  {[
                    { title:"HTM Fleet (M5F)", col:C.cyan, formula:`⌈${r.sysTph.toFixed(0)} ÷ ${r.htmCph.toFixed(2)} cph⌉ + ${p.buffer}% = ${r.htmRaw}+${r.htmBuf}`, total:r.htmTotal,
                      kvs:[["Cycle",`${p.htmCycle}s`],["Per PPS",r.htmPerPps.toFixed(1),C.cyan],["Achievable T2T",`${r.achievT2t.toFixed(1)}s`,r.achievT2t<=p.t2t?C.green:C.yellow],["Queue surplus",`${r.queueSurplus>0?"+":""}${r.queueSurplus.toFixed(1)} t/hr`,r.queueSurplus>0?C.green:C.red],["O&M Actual","99",C.green]] },
                    { title:"VTM Fleet (C5F)", col:C.purple, formula:`⌈${r.effectiveVtmDemand.toFixed(0)} ÷ ${r.vtmCphBlend.toFixed(2)} cph⌉ + ${p.buffer}% = ${r.vtmOptRaw}+${r.vtmOptBuf}`, total:r.vtmOptTotal,
                      kvs:[["Baseline cycle",`${p.vtmCycle}s`],["Blended cycle",`${r.blendedVtmCycle.toFixed(1)}s`,C.purple],["Effective demand",`${r.effectiveVtmDemand.toFixed(0)} t/hr`],["Baseline fleet",r.vtmBaseTotal],["Saving",r.vtmSaving>0?`-${r.vtmSaving} bots`:"—",r.vtmSaving>0?C.green:C.muted],["O&M Actual","38",C.green]] },
                  ].map(({title,col,formula,total,kvs})=>(
                    <div key={title} style={{ background:C.s2, border:`1px solid ${C.border}`, borderTop:`3px solid ${col}`, borderRadius:6, padding:12 }}>
                      <div style={{ fontSize:9, fontWeight:700, letterSpacing:2, color:col, fontFamily:C.mono, textTransform:"uppercase", marginBottom:8 }}>{title}</div>
                      <div style={{ fontSize:10, color:C.muted, fontFamily:C.mono, marginBottom:8, lineHeight:1.7 }}>{formula} = <span style={{color:col,fontWeight:700}}>{total}</span></div>
                      {kvs.map(([l,v,c])=><KV key={l} label={l} val={v} col={c}/>)}
                      <div style={{ display:"flex", justifyContent:"space-between", paddingTop:8 }}>
                        <span style={{ fontSize:9, color:C.muted, fontFamily:C.mono, textTransform:"uppercase", letterSpacing:1 }}>TOTAL</span>
                        <span style={{ fontSize:30, fontWeight:800, fontFamily:C.dis, color:col }}>{total}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <SecT>Queue & Pipeline</SecT>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
                  {[
                    {label:"Queue Buffer",val:`${(p.queueSize*r.toteCycle/60).toFixed(1)} min`,sub:`${p.queueSize} totes/PPS`,col:C.yellow},
                    {label:"Orders/Flight",val:r.ordersInFlight.toFixed(1),sub:"per PPS",col:C.purple},
                    {label:"Min Tote Pool",val:r.minTotesSite,sub:`site (${r.minTotesPps}/PPS)`,col:C.teal},
                    {label:"Total Bots",val:r.htmTotal+r.vtmOptTotal,sub:"HTM + VTM",col:C.green},
                  ].map(({label,val,sub,col})=>(
                    <div key={label} style={{ background:C.s2, border:`1px solid ${C.border}`, borderRadius:5, padding:"9px 10px" }}>
                      <div style={{ fontSize:8, color:C.muted, fontFamily:C.mono, letterSpacing:1, textTransform:"uppercase", marginBottom:3 }}>{label}</div>
                      <div style={{ fontSize:20, fontWeight:800, fontFamily:C.dis, color:col }}>{val}</div>
                      <div style={{ fontSize:8, color:C.muted, fontFamily:C.mono }}>{sub}</div>
                    </div>
                  ))}
                </div>
                <SecT>Relay Advisory</SecT>
                <div style={{ background:C.s2, border:`1px solid ${C.border}`, borderRadius:5, padding:"9px 12px", fontFamily:C.mono, fontSize:10, color:C.muted, lineHeight:1.8 }}>
                  <span style={{color:C.yellow,fontWeight:700}}>Relay points: </span>{p.aisles}×{p.levels}×{p.relayPerLevel} = <span style={{color:C.cyan}}>{p.aisles*p.levels*p.relayPerLevel}</span>
                  {" · "}<span style={{color:C.yellow,fontWeight:700}}>TPH/pt: </span><span style={{color:C.cyan}}>{(r.sysTph/(p.aisles*p.levels*p.relayPerLevel)).toFixed(2)}</span>
                  {" · "}<span style={{color:C.yellow,fontWeight:700}}>VTM supply: </span><span style={{color:C.cyan}}>{(r.vtmOptTotal*(3600/p.vtmCycle)).toFixed(0)} t/hr</span><br/>
                  <span style={{color:C.green,fontWeight:700}}>Monitor: </span>Queue depth (1–2) · Handoff (&lt;{(p.t2t/2).toFixed(1)}s) · Utilization (60–80%)
                </div>
              </>
            )}
            {tab===1&&(
              <>
                <SecT>Shift Demand vs Storage</SecT>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:12 }}>
                  <BigCard title="Tote Presentations" value={r.shiftPres.toLocaleString()} unit={`${p.shiftHours}hr shift`} col={C.orange}/>
                  <BigCard title="Unique Totes Needed" value={r.uniqueTotes.toLocaleString()} unit={`${r.effectiveReuse.toFixed(1)}× eff. reuse`} col={C.teal}/>
                  <BigCard title="Storage Free" value={r.storageAvail.toLocaleString()} unit={`of ${p.storageCap.toLocaleString()}`} col={C.green}/>
                </div>
                <div style={{ background:C.s2, border:`1px solid ${C.border}`, borderRadius:6, padding:12, marginBottom:12 }}>
                  <Gauge pct={r.storageUtilPct}/>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:10 }}>
                    <KV label="Hours of stock" val={`${r.hoursOfStock.toFixed(1)} hrs`} col={r.hoursOfStock>=p.shiftHours?C.green:C.red}/>
                    <KV label="Shift coverage" val={r.hoursOfStock>=p.shiftHours?"✓ Full shift":"⚠ Partial"} col={r.hoursOfStock>=p.shiftHours?C.green:C.red}/>
                    <KV label="Presentations/shift" val={r.shiftPres.toLocaleString()} col={C.orange}/>
                    <KV label="Effective reuse" val={`${r.effectiveReuse.toFixed(2)}×`} col={C.teal}/>
                  </div>
                </div>
                <Note type="warn">⚠ Reuse rate ({p.reuseRate}×) and return cycle ({p.returnCycle}s) are assumed — validate from live Grafana.</Note>
                <SecT style={{marginTop:12}}>Reuse Rate Sensitivity</SecT>
                <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:14 }}>
                  <thead><tr><TH>Reuse</TH><TH>Meaning</TH><TH>Unique Totes</TH><TH>Storage %</TH><TH>Fits?</TH></tr></thead>
                  <tbody>
                    {r.reuseScenarios.map(({r:rr,totes,pct})=>{
                      const fits=totes<=p.storageCap; const active=Math.abs(rr-p.reuseRate)<0.05;
                      return <tr key={rr} style={{background:active?"rgba(0,229,255,0.08)":"transparent"}}>
                        <TD active={active}>{rr}×</TD>
                        <TD active={active} col={C.muted}>{rr===1?"Once per shift":rr<=1.5?"Low repeat":rr<=3?"Moderate":"High repeat"}</TD>
                        <TD active={active}>{totes.toLocaleString()}</TD>
                        <TD active={active} col={parseFloat(pct)>90?C.red:parseFloat(pct)>75?C.yellow:C.green}>{pct}%</TD>
                        <TD active={active} col={fits?C.green:C.red}>{fits?"✓":"✗"}</TD>
                      </tr>;
                    })}
                  </tbody>
                </table>
                <SecT>Pipeline Totes (Always Out of Storage)</SecT>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                  {[
                    {label:"In Pipeline/PPS",val:r.activePps.toFixed(1),col:C.cyan},
                    {label:"In Queue/PPS",val:p.queueSize,col:C.yellow},
                    {label:"Returning/PPS",val:r.returningPps.toFixed(1),col:C.teal},
                    {label:"Min Pool Site",val:r.minTotesSite,col:C.orange},
                  ].map(({label,val,col})=>(
                    <div key={label} style={{ background:C.s2, border:`1px solid ${C.border}`, borderRadius:5, padding:"9px 10px" }}>
                      <div style={{ fontSize:8, color:C.muted, fontFamily:C.mono, letterSpacing:1, textTransform:"uppercase", marginBottom:3 }}>{label}</div>
                      <div style={{ fontSize:20, fontWeight:800, fontFamily:C.dis, color:col }}>{val}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {tab===2&&(
              <>
                <SecT>Velocity-Based Slotting Design</SecT>
                <div style={{ background:C.s2, border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.orange}`, borderRadius:5, padding:"8px 12px", fontFamily:C.mono, fontSize:10, color:C.muted, marginBottom:12, lineHeight:1.9 }}>
                  <span style={{color:C.orange,fontWeight:700}}>Strategy: </span>Hot SKUs ({p.hotPct}% of picks) → Level 1 + replicated across aisles<br/>
                  Blended VTM cycle = ({p.hotPct}% × {p.hotVtmCycle}s) + ({100-p.hotPct}% × {p.coldVtmCycle}s) = <span style={{color:C.green,fontWeight:700}}>{r.blendedVtmCycle.toFixed(1)}s</span> vs baseline {p.vtmCycle}s<br/>
                  VTM: {r.vtmBaseTotal} → <span style={{color:C.green,fontWeight:700}}>{r.vtmOptTotal}</span> = <span style={{color:C.green,fontWeight:700}}>{r.vtmSaving>0?`-${r.vtmSaving} bots saved`:"adjust inputs to see savings"}</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
                  {[
                    {label:"Blended VTM Cycle",val:`${r.blendedVtmCycle.toFixed(1)}s`,col:C.green},
                    {label:"VTM Optimised",val:r.vtmOptTotal,col:C.purple},
                    {label:"VTM Baseline",val:r.vtmBaseTotal,col:C.muted},
                    {label:"Bots Saved",val:r.vtmSaving>0?r.vtmSaving:0,col:r.vtmSaving>0?C.green:C.muted},
                  ].map(({label,val,col})=>(
                    <div key={label} style={{ background:C.s2, border:`1px solid ${C.border}`, borderRadius:5, padding:"9px 10px" }}>
                      <div style={{ fontSize:8, color:C.muted, fontFamily:C.mono, letterSpacing:1, textTransform:"uppercase", marginBottom:3 }}>{label}</div>
                      <div style={{ fontSize:20, fontWeight:800, fontFamily:C.dis, color:col }}>{val}</div>
                    </div>
                  ))}
                </div>
                <SecT>Hot SKU % Sensitivity</SecT>
                <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:14 }}>
                  <thead><tr><TH>Hot SKU %</TH><TH>Blended Cycle</TH><TH>VTM Fleet</TH><TH>Saving</TH><TH>Improvement</TH></tr></thead>
                  <tbody>
                    {r.slottingScenarios.map(({hot,bc,vtms,saving})=>{
                      const active=hot===p.hotPct;
                      return <tr key={hot} style={{background:active?"rgba(0,229,255,0.08)":"transparent"}}>
                        <TD active={active}>{hot}%</TD><TD active={active}>{bc}s</TD><TD active={active}>{vtms}</TD>
                        <TD active={active} col={saving>0?C.green:C.muted}>{saving>0?`-${saving} bots`:"—"}</TD>
                        <TD active={active} col={saving>0?C.green:C.muted}>{saving>0?`${((saving/r.vtmBaseTotal)*100).toFixed(1)}%`:"—"}</TD>
                      </tr>;
                    })}
                  </tbody>
                </table>
                <SecT>Replication Design</SecT>
                <div style={{ background:C.s2, border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.yellow}`, borderRadius:5, padding:"8px 12px", fontFamily:C.mono, fontSize:10, color:C.muted, marginBottom:10, lineHeight:1.9 }}>
                  VTMs/aisle = {r.vtmOptTotal} ÷ {p.aisles} = <span style={{color:C.cyan}}>{r.vtmPerAisle.toFixed(1)}</span>{" · "}
                  Capacity/aisle = <span style={{color:C.cyan}}>{r.vtmCphPerAisle.toFixed(1)} totes/hr</span><br/>
                  Top 10% velocity SKUs → <span style={{color:C.orange,fontWeight:700}}>3–4 aisles</span>, Level 1 mandatory, aisles nearest PPS first
                </div>
                <Note type="ok">✓ With {p.hotPct}% hot SKUs on Level 1, blended VTM cycle = {r.blendedVtmCycle.toFixed(1)}s.</Note>
                <Note type="warn">⚠ Tote hopping not yet enabled at O&M. When live, add hop rate — PPS→PPS transfers will further reduce VTM demand.</Note>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
