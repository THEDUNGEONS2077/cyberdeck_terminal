import{n as e}from"./catalog-CeLTMxcJ.js";function t(e,t,n,r,i){let a=r>0&&Number.isFinite(r)?r:1;return{w:e/a,h:t/a,dpr:Math.min(i,Math.max(1,n))*a}}var n={w:[14,18],h:[10,13],at:[.62,.46]},r=1.6,i={w:[5,9],h:[4,7]},a=[2,6],o={first:[2,6],diagonal:[1,5],straight:[4,18],length:[24,90]},s=[2,4],c=[10,48],l=.3,u=[.9,1.5],d=2.6,f=.06,p=2.2,m=[90,260],h=[40,150],g=.5,_=[2.5,6],v=.18,y=1.6,b=.6,x=1.4,S=2.5,C={low:{board:0,halo:3,haloAlpha:.16,head:5},medium:{board:2,halo:4,haloAlpha:.2,head:7},high:{board:3,halo:5,haloAlpha:.24,head:9},max:{board:5,halo:6.5,haloAlpha:.3,head:12}},w=.1,T=3,E=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]],D=(e,[t,n])=>t+(n-t)*e(),O=(e,t)=>Math.floor(D(e,[t[0],t[1]+1]));function ee(e,t,p){let m=Math.ceil(e/14),h=Math.ceil(t/14),g=m+8+1,_=h+8+1,v=new Int32Array(g*_),y=(e,t)=>e+4+(t+4)*g,b=(e,t)=>e>=-4&&t>=-4&&e<=m+4&&t<=h+4,x=(e,t)=>e>=0&&t>=0&&e<=m&&t<=h,S=(m+1)*(h+1),C=0,w=[],T=[],ee=[],k=(e,t,n,r)=>{let i=Math.round(n-e/2),a=Math.round(r-t/2);for(let n=a-3;n<=a+t+2;n++)for(let t=i-3;t<=i+e+2;t++)if(!x(t,n)||v[y(t,n)]!==0)return!1;return!0},A=(e,t,n,r,i)=>{if(!k(e,t,n,r))return!1;let a=Math.round(n-e/2),o=Math.round(r-t/2);for(let n=o-1;n<=o+t;n++)for(let t=a-1;t<=a+e;t++)v[y(t,n)]=-1;let s=w.length,c=[];for(let t=1;t<=e-2;t+=2)c.push({x:a+t,y:o-1,dir:6,chip:s});for(let n=1;n<=t-2;n+=2)c.push({x:a+e,y:o+n,dir:0,chip:s});for(let n=1;n<=e-2;n+=2)c.push({x:a+n,y:o+t,dir:2,chip:s});for(let e=1;e<=t-2;e+=2)c.push({x:a-1,y:o+e,dir:4,chip:s});return w.push({x:a,y:o,w:e,h:t,main:i,pins:c}),!0},j=(e,t,n,r)=>{let[i,a]=E[r],o=t+i,s=n+a;if(!b(o,s))return`edge`;if(v[y(o,s)]!==0)return null;if(i!==0&&a!==0){let e=b(o,n)?v[y(o,n)]:0,r=b(t,s)?v[y(t,s)]:0;if(e>0&&r>0)return null}for(let[t,n]of[[1,0],[-1,0],[0,1],[0,-1]]){if(!b(o+t,s+n))continue;let r=v[y(o+t,s+n)];if(r>0&&r!==e+1)return null}return[o,s]},M=[],N=(e,t,n)=>{v[y(t,n)]=e+1,M.push(y(t,n)),x(t,n)&&C++},te=()=>{for(let e of M){v[e]=0;let t=e%g-4,n=Math.floor(e/g)-4;x(t,n)&&C--}M.length=0},P=(e,t,n,r,i)=>{let a=[t,n],o=t,s=n,c=-1,l=`via`,u=0;for(;u<i;u++){let t=r(u,c);if(t<0)break;let n=j(e,o,s,t);if(n===`edge`){l=`edge`;break}if(n===null)break;c!==-1&&t!==c&&a.push(o,s),c=t,[o,s]=n,N(e,o,s)}return(a[a.length-2]!==o||a[a.length-1]!==s)&&a.push(o,s),{pts:a,end:l,steps:u}},F=(e,t,n,r,i,a,o)=>{let s=[0];for(let t=2;t<e.length;t+=2){let n=e[t]-e[t-2],r=e[t+1]-e[t-1];s.push(s[s.length-1]+Math.hypot(n,r))}return T.push({pts:e,len:s,width:t,cool:n,start:r,end:i,chip:a,bus:o}),T.length-1},I=e=>{let t=[{dir:e,steps:O(p,o.first),bend:0}],n=O(p,o.length),r=t[0].steps,i=e;for(;r<n;){let n=p()<.5?1:-1,a=(i+n+8)%8,s=p()<.55?i:(i+2*n+8)%8;s===(e+4)%8&&(s=i),t[t.length-1].bend=s===i?0:n;let c=O(p,o.diagonal),l=O(p,o.straight);t.push({dir:a,steps:c,bend:0},{dir:s,steps:l,bend:0}),r+=c+l,i=s}return t},L=Math.min(O(p,n.w),Math.floor(m*.5)),R=Math.min(O(p,n.h),Math.floor(h*.3));A(Math.max(4,L),Math.max(3,R),m*n.at[0],h*n.at[1],!0);let z=Math.max(2,Math.round(r*e*t/1e6));for(let e=0;e<z;e++){let e=O(p,i.w),t=O(p,i.h),n=null,r=-1;for(let i=0;i<60;i++){let i=3+p()*(m-6),a=3+p()*(h-6),o=Math.min(...w.map(e=>Math.hypot(e.x+e.w/2-i,e.y+e.h/2-a)));o>r&&k(e,t,i,a)&&(n=[i,a],r=o)}n&&A(e,t,n[0],n[1],!1)}let B=(e,t,n,r,i)=>{let a=e.length,o=I(t),s=p()<l,c=D(p,u),[d,f]=E[(t+2)%8],m=e.map(e=>e.x*d+e.y*f),h=[...m].sort((e,t)=>e-t),g=ee.length,_=[];return e.forEach((e,t)=>{let l=h.indexOf(m[t]),u=o.map(e=>e.bend===0?e:{...e,steps:e.steps+(e.bend>0?a-1-l:l)*2}),d=T.length;M.length=0,N(d,e.x,e.y);let f=0,p=u[0].steps,b=P(d,e.x,e.y,()=>{for(;p<=0;){if(f++,f>=u.length)return-1;p=u[f].steps}return p--,u[f].dir},1e4);b.steps<i?(te(),n>=0&&(v[y(e.x,e.y)]=-1)):_.push(F(b.pts,c,s,n>=0?`chip`:r(),b.end,n,g))}),_.length>0&&ee.push(_),_};w.forEach((e,t)=>{let n=new Map;for(let t of e.pins)n.set(t.dir,[...n.get(t.dir)??[],t]);for(let e of n.values())for(let n=0;n<e.length;){let r=Math.min(e.length-n,O(p,a)),i=e.slice(n,n+r);n+=r,!(p()<.15)&&B(i,i[0].dir,t,()=>`chip`,3)}});let V=(e,t)=>{if(!x(e,t))return!1;for(let n=-1;n<=1;n++)for(let r=-1;r<=1;r++)if(b(e+r,t+n)&&v[y(e+r,t+n)]!==0)return!1;return!0};for(let e=0;C/S<.16&&e<4e3;e++){let e=Math.floor(p()*(m+1)),t=Math.floor(p()*(h+1));if(p()<.5){let n=Math.floor(p()*4)*2,[r,i]=E[(n+2)%8],a=O(p,s),o=Array.from({length:a},(n,a)=>({x:e+r*a*2,y:t+i*a*2}));if(!o.every(e=>V(e.x,e.y)))continue;let c=p()<.4?`pad`:`via`;B(o,n,-1,()=>c,6);continue}let n=T.length;if(!V(e,t))continue;M.length=0,N(n,e,t);let r=O(p,c),i=p()<.7?Math.floor(p()*4)*2:Math.floor(p()*4)*2+1,a=i%2==1?O(p,[1,4]):0,o=P(n,e,t,()=>(i%2==1?a--<=0&&(i=(i+(p()<.5?1:-1)+8)%8):p()<.12&&(i=(i+(p()<.5?1:-1)+8)%8,a=O(p,[1,4])),i),r);if(o.steps<4){te();continue}let g=p()<f;F(o.pts,g?d:D(p,u),p()<l,p()<.3?`pad`:`via`,o.end===`edge`?`edge`:p()<.3?`pad`:`via`,-1,-1)}return{w:e,h:t,cols:g,rows:_,chips:w,traces:T,buses:ee}}function k(e,t,n){let r=e.len[e.len.length-1],i=Math.min(Math.max(t,0),r),a=1;for(;a<e.len.length-1&&e.len[a]<i;)a++;let o=e.len[a-1],s=e.len[a],c=s>o?(i-o)/(s-o):0;return n[0]=e.pts[2*(a-1)]+(e.pts[2*a]-e.pts[2*(a-1)])*c,n[1]=e.pts[2*(a-1)+1]+(e.pts[2*a+1]-e.pts[2*(a-1)+1])*c,n}var A=e=>e.len[e.len.length-1];function j(e){let t=parseInt(e.replace(`#`,``),16);return[t>>16&255,t>>8&255,t&255]}var M=(e,t,n)=>[e[0]+(t[0]-e[0])*n,e[1]+(t[1]-e[1])*n,e[2]+(t[2]-e[2])*n],N=([e,t,n],r=1)=>`rgba(${Math.round(e)}, ${Math.round(t)}, ${Math.round(n)}, ${r})`;function te(e){let t=j(e.bg),n=j(e.line),r=j(e.dim),i=j(e.cool),a=[255,255,255];return{dot:M(t,n,.9),warmTrace:M(n,r,.5),coolTrace:M(t,i,.6),warmVia:M(n,r,.75),coolVia:M(t,i,.85),chipBody:M(t,n,.4),chipEdge:M(n,r,.6),die:M(n,r,.25),warmLight:j(e.accent),warmHead:j(e.bright),coolLight:M(i,a,.35),coolHead:M(i,a,.8)}}function P(e,t,n,r=!1){let i=Math.max(2,Math.ceil(n)),a=new OffscreenCanvas(i*2,i*2),o=a.getContext(`2d`);if(!o)return a;let s=o.createRadialGradient(i,i,0,i,i,i);return r?(s.addColorStop(0,N(t,0)),s.addColorStop(.35,N(t,.35)),s.addColorStop(.5,N(e,.9)),s.addColorStop(.7,N(t,.3)),s.addColorStop(1,N(t,0))):(s.addColorStop(0,N(e,1)),s.addColorStop(.2,N(M(e,t,.5),.85)),s.addColorStop(.45,N(t,.35)),s.addColorStop(1,N(t,0))),o.fillStyle=s,o.fillRect(0,0,i*2,i*2),a}function F(e,n,r=Math.random){let i=e.getContext(`2d`),a=n.palette,o=n.glow,s=n.still,c=0,l=0,u=1,d=!1,f=!1,E=0,D=0,O=null,M=null,F=te(a),I=[],L=[],R=new Float32Array,z=new Float32Array,B=new Float32Array,V=0,ne=0,H=[0,0],re=e=>{let t=new OffscreenCanvas(Math.max(1,Math.round(c*u)),Math.max(1,Math.round(l*u))),n=t.getContext(`2d`);if(!n)return t;n.setTransform(u,0,0,u,0,0);let r=C[o],i=e.chips.find(e=>e.main),s=i?(i.x+i.w/2)*14:c/2,d=i?(i.y+i.h/2)*14:l/2,f=Math.hypot(Math.max(s,c-s),Math.max(d,l-d));n.fillStyle=N(F.dot);for(let e=0;e<=l;e+=14)for(let t=0;t<=c;t+=14)n.globalAlpha=.85-.6*(Math.hypot(t-s,e-d)/f),n.fillRect(t-.5,e-.5,1,1);n.globalAlpha=1,n.lineCap=`round`,n.lineJoin=`round`;for(let t of e.traces){let e=t.cool?F.coolTrace:F.warmTrace;n.strokeStyle=N(e),n.lineWidth=t.width,n.shadowColor=N(e,.7),n.shadowBlur=r.board*u,n.beginPath(),n.moveTo(t.pts[0]*14,t.pts[1]*14);for(let e=2;e<t.pts.length;e+=2)n.lineTo(t.pts[e]*14,t.pts[e+1]*14);n.stroke()}n.shadowBlur=0;for(let t of e.traces){let e=t.cool?F.coolVia:F.warmVia,r=t.pts.length;for(let[i,o,s]of[[t.start,t.pts[0],t.pts[1]],[t.end,t.pts[r-2],t.pts[r-1]]])if(i===`via`)n.fillStyle=N(j(a.bg)),n.strokeStyle=N(e),n.lineWidth=1.2,n.beginPath(),n.arc(o*14,s*14,4.2,0,Math.PI*2),n.fill(),n.stroke();else if(i===`pad`){let t=14*.55;n.fillStyle=N(e,.45),n.strokeStyle=N(e),n.lineWidth=1,n.fillRect(o*14-t/2,s*14-t/2,t,t),n.strokeRect(o*14-t/2,s*14-t/2,t,t)}}for(let t of e.chips){let e=(t.x-.5)*14,r=(t.y-.5)*14,i=t.w*14,a=t.h*14;n.strokeStyle=N(F.chipEdge),n.lineWidth=1.2;for(let e of t.pins){n.beginPath(),n.moveTo(e.x*14,e.y*14);let[t,r]=e.dir===0?[-1,0]:e.dir===2?[0,-1]:e.dir===4?[1,0]:[0,1];n.lineTo((e.x+t*.5)*14,(e.y+r*.5)*14),n.stroke()}if(n.fillStyle=N(F.chipBody),n.fillRect(e,r,i,a),n.strokeRect(e,r,i,a),n.fillStyle=N(F.chipEdge,.8),n.beginPath(),n.arc(e+14*.7,r+14*.7,1.9600000000000002,0,Math.PI*2),n.fill(),t.main){n.strokeStyle=N(F.die,.9),n.lineWidth=1,n.strokeRect(e+28,r+28,i-56,a-56),n.strokeStyle=N(F.die,.35),n.beginPath();for(let t=e+28+14;t<e+i-28;t+=14)n.moveTo(t,r+28),n.lineTo(t,r+a-28);for(let t=r+28+14;t<r+a-28;t+=14)n.moveTo(e+28,t),n.lineTo(e+i-28,t);n.stroke()}}return t},ie=()=>{if(!O)return;let e=C[o].head*u;M={layer:re(O),warmHead:P(F.warmHead,F.warmLight,e),coolHead:P(F.coolHead,F.coolLight,e),warmRing:P(F.warmHead,F.warmLight,12.6*u,!0),coolRing:P(F.coolHead,F.coolLight,12.6*u,!0)}},ae=()=>{O=ee(c,l,r),R=new Float32Array(O.traces.length),z=new Float32Array(O.chips.length),B=new Float32Array(O.traces.length);let e=0;O.traces.forEach((t,n)=>{e+=A(t),B[n]=e}),I=[],L=[],ne=1,ie();for(let e=0;e<S;e+=1/30)ce(1/30)},oe=(e,t,n,r,i)=>{I.push({trace:e,d:0,speed:n,tail:r,reverse:t,wait:i,arrived:!1})},U=()=>{let e=B[B.length-1]??0,t=r()*e,n=0,i=B.length-1;for(;n<i;){let e=n+i>>1;B[e]<t?n=e+1:i=e}return n},se=e=>e.chip>=0?r()<g:r()<.5,ce=e=>{let t=O;if(t&&t.traces.length!==0){for(V+=p*c*l/1e6*e;V>=1;){--V;let e=U();oe(e,se(t.traces[e]),(r()*(m[1]-m[0])+m[0])/14,(r()*(h[1]-h[0])+h[0])/14,0)}if(ne-=e,ne<=0&&t.buses.length>0){ne=_[0]+r()*(_[1]-_[0]);let e=t.buses[Math.floor(r()*t.buses.length)],n=t.traces[e[0]],i=se(n),a=(r()*(m[1]-m[0])+m[0])/14,o=(r()*(h[1]-h[0])+h[0])/14;for(let t of e)oe(t,i,a,o,r()*v)}for(let n of I){if(n.wait>0){n.wait-=e;continue}n.d+=n.speed*e;let r=t.traces[n.trace],i=A(r);if(R[n.trace]=Math.min(1,Math.max(R[n.trace],.6)),!n.arrived&&n.d>=i){n.arrived=!0;let e=n.reverse?r.start:r.end,t=r.pts.length,[i,a]=n.reverse?[r.pts[0],r.pts[1]]:[r.pts[t-2],r.pts[t-1]];(e===`via`||e===`pad`)&&L.push({x:i,y:a,life:1,cool:r.cool}),e===`chip`&&r.chip>=0&&(z[r.chip]=Math.min(1,z[r.chip]+.35))}}I=I.filter(e=>e.wait>0||e.d<A(t.traces[e.trace])+e.tail);for(let t=0;t<R.length;t++)R[t]=Math.max(0,R[t]-e/y);for(let t=0;t<z.length;t++)z[t]=Math.max(0,z[t]-e/x);for(let t of L)t.life-=e/b;L=L.filter(e=>e.life>0)}},le=(e,t,n)=>{if(i){k(e,t,H),i.moveTo(H[0]*14,H[1]*14);for(let r=1;r<e.len.length-1;r++)e.len[r]>t&&e.len[r]<n&&i.lineTo(e.pts[2*r]*14,e.pts[2*r+1]*14);k(e,n,H),i.lineTo(H[0]*14,H[1]*14)}},W=()=>{if(!i||!O||!M)return;let t=C[o];i.setTransform(1,0,0,1,0,0),i.globalCompositeOperation=`source-over`,i.clearRect(0,0,e.width,e.height),i.drawImage(M.layer,0,0),i.setTransform(u,0,0,u,0,0),i.globalCompositeOperation=`lighter`,i.lineCap=`round`,i.lineJoin=`round`,O.chips.forEach((e,t)=>{let n=z[t];n<.01||(i.fillStyle=N(F.warmLight,.1*n),i.fillRect((e.x-.5)*14,(e.y-.5)*14,e.w*14,e.h*14),i.strokeStyle=N(F.warmLight,.55*n),i.lineWidth=1.5,i.strokeRect((e.x-.5)*14,(e.y-.5)*14,e.w*14,e.h*14))}),O.traces.forEach((e,t)=>{let n=R[t];n<.02||(i.strokeStyle=N(e.cool?F.coolLight:F.warmLight,.3*n),i.lineWidth=e.width+.6,i.beginPath(),le(e,0,A(e)),i.stroke())});for(let e of I){if(e.wait>0)continue;let n=O.traces[e.trace],r=A(n),a=Math.min(e.d,r),o=Math.max(0,e.d-e.tail);if(a<=o)continue;let s=n.cool?F.coolLight:F.warmLight,c=(t,i)=>e.reverse?le(n,r-i,r-t):le(n,t,i);i.strokeStyle=N(s,t.haloAlpha),i.lineWidth=n.width*t.halo,i.beginPath(),c(o,a),i.stroke(),i.lineWidth=n.width+.8;for(let e=0;e<6;e++){let t=o+(a-o)*e/6,n=o+(a-o)*(e+1)/6,r=(e+1)/6;i.strokeStyle=N(s,r*r),i.beginPath(),c(t,n),i.stroke()}if(e.d<=r){k(n,e.reverse?r-a:a,H);let t=n.cool?M.coolHead:M.warmHead,o=t.width/2/u;i.drawImage(t,H[0]*14-o,H[1]*14-o,o*2,o*2)}}for(let e of L){let t=e.cool?M.coolRing:M.warmRing,n=t.width/2/u;i.globalAlpha=e.life,i.drawImage(t,e.x*14-n,e.y*14-n,n*2,n*2)}i.globalAlpha=1,i.globalCompositeOperation=`source-over`,f||(f=!0,n.onReady?.())},ue=e=>{if(E=0,!d||s)return;let t=D?Math.min((e-D)/1e3,w):0;D=e,ce(t),W(),E=requestAnimationFrame(ue)},G={resize(n,r,i,a){let{w:o,h:s,dpr:d}=t(n,r,i,a,T);e.width=Math.round(o*d),e.height=Math.round(s*d);let f=o!==c||s!==l||!O,p=d!==u;c=o,l=s,u=d,f?ae():p&&ie(),W()},start(){d=!0,!(s||E)&&(D=0,E=requestAnimationFrame(ue))},stop(){d=!1,cancelAnimationFrame(E),E=0},setStill(e){s=e,s?G.stop():d&&G.start(),W()},setGlow(e){o=e,ie(),s&&W()},setPalette(e){a=e,F=te(a),ie(),s&&W()},destroy(){G.stop(),O=null,M=null,c=0}};return G}var I={id:`data-flow`,create:(e,t)=>F(e,t)},L=[{font:8,colW:7,rowH:8,speed:[8,14],occupancy:.95,alpha:[.45,.8],headChance:.15},{font:10,colW:10,rowH:10,speed:[10,18],occupancy:.6,alpha:[.6,.95],headChance:.35},{font:13,colW:14,rowH:13,speed:[12,22],occupancy:.2,alpha:[.8,1],headChance:.6}],R=.2,z={low:{alpha:.4,head:5,headLayers:1,body:2},medium:{alpha:.65,head:7,headLayers:2,body:3},high:{alpha:.8,head:9,headLayers:2,body:5},max:{alpha:.9,head:12,headLayers:3,body:6.5}},B=.9,V=.5,ne=[.2,4],H=.25,re=1/20,ie=.15,ae=.1,oe=3,U={head:0,body:1,dim:2,erase:3,halo:4},se=.5,ce=`0123456789ZTHEMXAKR:.=*+-<>¦|"`,le=`ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ`,W=`"JetBrains Mono", "MS Gothic", "Yu Gothic", "Hiragino Sans", "Noto Sans CJK JP", monospace`;function ue(e,t){let n=parseInt(e.replace(`#`,``),16);return`rgba(${n>>16&255}, ${n>>8&255}, ${n&255}, ${t})`}function G(e,t){let n=parseInt(e.replace(`#`,``),16),[r,i,a]=[n>>16&255,n>>8&255,n&255],o=.299*r+.587*i+.114*a,s=e=>Math.round(e+(o-e)*t);return`rgb(${s(r)}, ${s(i)}, ${s(a)})`}function de(e){let t=[...ce].map(e=>({char:e,mirrored:!1}));if(!e)return t;let n=[...le].map(e=>({char:e,mirrored:!0}));return[...n,...n,...t]}function fe(e){let t=new OffscreenCanvas(24,24).getContext(`2d`,{willReadFrequently:!0});if(!t)return!1;let n=e=>(t.clearRect(0,0,24,24),t.font=`16px ${W}`,t.textBaseline=`middle`,t.textAlign=`center`,t.fillStyle=`#fff`,t.fillText(e,12,12),t.getImageData(0,0,24,24).data),r=n(e),i=n(`͸`),a=!0,o=!0;for(let e=3;e<r.length;e+=4)r[e]&&(a=!1),r[e]!==i[e]&&(o=!1);return!a&&!o}function pe(e,t,n,r,i){let a=[i.head,i.body,i.body,0,i.head],o=0,s=a.map(t=>{let r=Math.ceil((t*B+1)*n),i={y:o,w:Math.ceil(e.colW*n)+r*2,h:Math.ceil(e.rowH*n)+r*2,pad:r};return o+=i.h,i}),c=new OffscreenCanvas(Math.max(...s.map(e=>e.w))*r.length,o),l=c.getContext(`2d`);if(!l)return{canvas:c,glyphs:r.length,rows:s,finish:null};let u=(e,t,n,i)=>{let a=s[t];r.forEach((t,r)=>{let o=r*a.w+a.w/2,s=n+a.h/2;e.save(),t.mirrored&&(e.translate(o,s),e.scale(-1,1),e.translate(-o,-s)),i(t.char,o,s),e.restore()})},d=r=>{r.font=`${Math.round(e.font*n)}px ${W}`,r.textAlign=`center`,r.textBaseline=`middle`,r.shadowColor=ue(t.accent,i.alpha),r.lineWidth=se*n},f=(e,t,n)=>{e.shadowBlur=0,e.fillStyle=e.strokeStyle=`#fff`,u(e,t,n,(t,n,r)=>{e.fillText(t,n,r),e.strokeText(t,n,r)})};d(l);let p=s[U.head],m=new OffscreenCanvas(p.w*r.length,p.h),h=m.getContext(`2d`);h&&(d(h),h.fillStyle=t.bright,h.shadowBlur=a[U.head]*n,u(h,U.head,0,(e,t,n)=>{for(let r=0;r<i.headLayers;r++)h.fillText(e,t,n)}),l.drawImage(m,0,p.y));for(let[e,r]of[[U.body,G(t.text,V)],[U.dim,G(t.dim,V)]])l.fillStyle=r,l.shadowBlur=a[e]*n,u(l,e,s[e].y,(e,t,n)=>l.fillText(e,t,n));let g={canvas:c,glyphs:r.length,rows:s,finish:null};return g.finish=()=>{g.finish=null,f(l,U.erase,s[U.erase].y),l.drawImage(m,0,s[U.halo].y),l.globalCompositeOperation=`destination-out`,f(l,U.halo,s[U.halo].y),l.globalCompositeOperation=`source-over`},g}var me=(e,[t,n])=>t+(n-t)*e();function he(e,t,n,r,i=!1){let a=me(r,e.speed),o=Math.max(4,Math.round(t*(1-r()**5)*1.08)),s=o/a,c=i?0:Math.max(me(r,ne),s*((1-e.occupancy)/e.occupancy)*(.5+r())),l=i?r()*o:0;return{y:l,drawn:Math.floor(l)-1,end:o,speed:a,alpha:me(r,e.alpha),style:r()<.55?U.dim:U.body,lit:r()<e.headChance,glyph:Math.floor(r()*n),wait:c}}var ge=1-.02**(R/12);function _e(e,t){return e*(1-ge)**Math.floor(t/R)}var ve=Array.from({length:12},(e,t)=>t*7%12),ye=`rgba(0, 0, 0, ${ge})`,be=65535;function xe(e,t,n,r,i){if(e&&t===r&&n===i)return e;let a=new Uint16Array(r*i).fill(be);if(!e)return a;let o=Math.min(r,t);for(let s=0;s<Math.min(i,n);s++)a.set(e.subarray(s*t,s*t+o),s*r);return a}function Se(e,t){let n=e*t,r=()=>new Float32Array(n).fill(-1/0);return{cols:e,rows:t,time:r(),glyph:new Uint16Array(n),style:new Uint8Array(n),alpha:new Float32Array(n),halo:r()}}function Ce(e,t){for(let n=0;n<e.glyph.length;n++){let r=t-e.time[n];(!(r<12)||_e(e.alpha[n],r)<.05)&&(e.glyph[n]=be)}return e.glyph}function we(){return typeof document>`u`?self.fonts:document.fonts}function Te(e,n,r=Math.random){let i=e.getContext(`2d`),a=typeof document>`u`,o=a?250:16,s=a?250:6,c=n.palette,l=n.still,u=n.glow,d=[],f=0,p=!1,m=!1,h=!1,g=0,_=0,v=0,y=0,b=null,x=0,S=null,C=0,w=0,T=0,E=0,D=0,O=!1,ee=null,k=0,A=de(!1),j=t=>{if(!i)return;i.globalCompositeOperation=`destination-out`,i.fillStyle=ye;let n=e.width;for(let r=t*2;r<e.height;r+=24)i.fillRect(0,r,n,2);i.globalCompositeOperation=`source-over`},M=(e,t,n,r,i,a)=>{if(b){let o=b[e.index];if(!o||n<0||n>=o.rows||t>=o.cols)return;let s=n*o.cols+t;o.time[s]=x,o.glyph[s]=r,o.style[s]=i,o.alpha[s]=a}else N(e,t,n,r,i,a),n>=0&&n<e.rows&&(e.glyphAt[n*e.drops.length+t]=r)},N=(e,t,n,r,a,o)=>{if(!i)return;let s=e.atlas.rows[a];i.globalAlpha=o,i.drawImage(e.atlas.canvas,r*s.w,s.y,s.w,s.h,Math.round(t*e.colW)-s.pad,Math.round(n*e.rowH)-s.pad,s.w,s.h),i.globalAlpha=1},te=(e,t,n)=>{if(!i||n<0||n>=e.rows)return;let r=n*e.drops.length+t,a=e.glyphAt[r];a!==be&&(e.glyphAt[r]=be,i.globalCompositeOperation=`destination-out`,N(e,t,n,a,U.erase,1),i.globalCompositeOperation=`source-over`)},P=(e,t,n,r)=>{let i=b?.[e.index];i?n>=0&&n<i.rows&&t<i.cols&&(i.halo[n*i.cols+t]=x):te(e,t,n),M(e,t,n,r.glyph,r.style,r.alpha)},F=e=>{if(b)x+=e;else for(v+=e/R*12;v>=1;)--v,j(ve[y]),y=(y+1)%12;for(let t of d)for(let n=0;n<t.drops.length;n++){let i=t.drops[n];if(i.wait>0){i.wait-=e;continue}for(i.y+=i.speed*e;i.drawn<Math.floor(i.y)&&i.drawn<i.end;)i.lit&&i.drawn>=0&&P(t,n,i.drawn,i),i.drawn++,i.glyph=Math.floor(r()*f),i.lit?M(t,n,i.drawn,i.glyph,U.head,1):M(t,n,i.drawn,i.glyph,i.style,i.alpha);let a=Math.min(i.drawn,Math.round(i.speed*12));if(!b&&a>1&&r()<1.2*e*(a/12)){let e=1+Math.floor(r()*(a-1)),o=i.drawn-e;te(t,n,o),M(t,n,o,Math.floor(r()*f),i.style,_e(i.alpha,e/i.speed))}i.drawn>=i.end&&(i.lit&&P(t,n,i.drawn,i),t.drops[n]=he(t.p,t.rows,f,r))}},I=()=>{O||(O=!0,n.onReady?.())},B=e=>{if(!b)return!0;for(;C<2;C++,w=0,T=0){for(;w<d.length;w++,T=0){let t=d[w],n=b[w];if(!n)continue;let r=n.cols*n.rows;for(;T<r;T++){if(!(T&255)&&performance.now()>e)return!1;let r=x-n.time[T];if(!(r<12))continue;let i=_e(n.alpha[T],r),a=i>=H;if(C===0){a&&N(t,T%n.cols,Math.floor(T/n.cols),n.glyph[T],n.style[T],i);continue}let o=x-n.halo[T],s=o<12?_e(1,o):0,c=!a&&i>=.05,l=s>=ie;if(!l&&!c)continue;let u=T%n.cols,d=Math.floor(T/n.cols),f=n.glyph[T];l&&N(t,u,d,f,U.halo,s),c&&N(t,u,d,f,n.style[T],i)}}if(C===0){I();for(let e of d)e.atlas.finish?.();return C=1,w=0,T=0,!1}}return!0},V=()=>{if(D=0,S===null||m)return;let e=performance.now()+(O?s:o);for(;S>0&&performance.now()<e;)F(re),S-=re;S>0||!B(e)?D=requestAnimationFrame(V):(d.forEach((e,t)=>{let n=b[t];n&&(e.glyphAt=xe(Ce(n,x),n.cols,n.rows,e.drops.length,e.rows))}),b=null,S=null,performance.measure(`rain-prewarm`,{start:E}),I(),h&&!l&&!g&&(_=0,g=requestAnimationFrame(G)))},ne=e=>{S=e,E=performance.now(),x=0,C=0,w=0,T=0,b=d.map(e=>Se(e.drops.length,e.rows)),D||V()},se=(e,t)=>{let n=performance.now(),r=pe(e,c,t,A,z[u]);return performance.measure(`rain-atlas`,{start:n}),r},ce=(e,t,n)=>{let i=n!==k;return d=L.map((a,o)=>{let s=i?void 0:d[o],c=a.colW*n,l=a.rowH*n,u=Math.ceil(e/a.colW),p=Math.ceil(t/a.rowH),m=(s?.drops??[]).slice(0,u);for(;m.length<u;)m.push(he(a,p,f,r,r()<a.occupancy));let h=xe(s?.glyphAt??null,s?.drops.length??0,s?.rows??0,u,p);return{index:o,p:a,atlas:s?.atlas??se(a,n),colW:c,rowH:l,rows:p,drops:m,glyphAt:h}}),k=n,i},ue=()=>{if(!p||!ee||!i)return;let{w:t,h:n,dpr:r}=ee,a=Math.round(t*r),o=Math.round(n*r),s=d.length===0;if(e.width!==a||e.height!==o){let t=!s&&r===k&&e.width>0&&e.height>0?new OffscreenCanvas(e.width,e.height):null;t?.getContext(`2d`)?.drawImage(e,0,0),e.width=a,e.height=o,i.imageSmoothingEnabled=!1,t&&i.drawImage(t,0,0)}let c=ce(t,n,r);(s||c)&&(i.clearRect(0,0,e.width,e.height),ne(18))},G=e=>{if(g=0,!h||S!==null)return;if(_&&e-_<13.88888888888889){g=requestAnimationFrame(G);return}let t=_?Math.min((e-_)/1e3,ae):0;_=e,F(t),g=requestAnimationFrame(G)},me={resize(e,n,r,i){ee=t(e,n,r,i,oe),ue()},start(){h=!0,!(!p||l||g||S!==null)&&(_=0,g=requestAnimationFrame(G))},stop(){h=!1,cancelAnimationFrame(g),g=0},setPalette(e){c=e;for(let e of d)e.atlas=se(e.p,k),e.atlas.finish?.()},setGlow(e){if(e!==u){u=e;for(let e of d)e.atlas=se(e.p,k),e.atlas.finish?.()}},setStill(e){l=e,l?(cancelAnimationFrame(g),g=0):h&&me.start()},destroy(){m=!0,me.stop(),cancelAnimationFrame(D),d=[]}};return(async()=>{try{await Promise.all(L.map(e=>we().load(`${e.font}px ${W}`,le)))}catch{}m||(A=de(fe(le[0])),f=A.length,p=!0,ue(),h&&(h=!1,me.start()))})(),me}var Ee={id:`matrix-rain`,create:(e,t)=>Te(e,t)},De=[{width:[14,38],gap:[0,3],skip:0,top:[-.35,.3],cell:[3,4],fog:.74},{width:[18,50],gap:[0,8],skip:.1,top:[-.3,.4],cell:[3,5],fog:.62},{width:[22,62],gap:[0,14],skip:.18,top:[-.25,.5],cell:[4,5],fog:.52},{width:[28,78],gap:[6,34],skip:.3,top:[-.2,.62],cell:[4,6],fog:.42},{width:[40,110],gap:[24,120],skip:.45,top:[-.2,.8],cell:[5,7],fog:.28}],Oe={chance:.3,width:[.4,.75],rise:[.04,.18]},ke={chance:.18,rise:[.03,.1]},Ae={perMpx:10,vertical:.6,tall:{w:[12,20],h:[40,110]},wide:{w:[44,96],h:[14,24]},cool:.3},je={perMpx:3,w:[30,70],h:[8,14]},Me={chance:.25,period:[1.6,2.6],on:.22},K={per:220,min:3,max:10,speed:[14,46],y:[.1,.72],tail:[8,26],size:[1.1,2]},q={count:3,rx:[.3,.55],ry:[.05,.1],y:[.2,.8],speed:[3,8],alpha:[.04,.07]},Ne={every:[6,25],length:[.3,.8],rate:14},Pe=64e3,Fe={tall:{top:.855,right:[.43,.072],rail:.066},wide:{top:.875,right:[.3,.0624],rail:.0572}},Ie={low:{window:0,sign:6,light:4},medium:{window:.35,sign:9,light:6},high:{window:.6,sign:12,light:8},max:{window:1,sign:16,light:11}},Le=.1,Re=3,ze=2048,Be=(e,[t,n])=>t+(n-t)*e(),Ve=(e,[t,n])=>Math.floor(Be(e,[t,n+1])),He=1e6;function Ue(e,t,n,r){let i=De[e],a=[],o=-Ve(r,[0,20]);for(;o<t;){let e=Ve(r,i.width),t=Ve(r,i.gap);if(r()>=i.skip){let t=Math.round(Be(r,i.top)*n),s=1+Math.floor(r()*8388607),c=null;if(r()<Oe.chance&&e>=12){let i=Math.max(4,Math.round(e*Be(r,Oe.width)));c={x:o+Math.floor(r()*(e-i+1)),w:i,top:Math.round(t-Be(r,Oe.rise)*n)}}let l=null,u=c??{x:o,w:e,top:t};u.top>0&&r()<ke.chance&&(l={x:u.x+Math.floor(r()*u.w),top:Math.round(u.top-Be(r,ke.rise)*n)}),a.push({x:o,w:e,top:t,upper:c,spire:l,seed:s})}o+=e+t}return a}function We(e,t){let n=new Float32Array(t).fill(He),r=(e,r,i)=>{for(let a=Math.max(0,e);a<Math.min(t,e+r);a++)n[a]=Math.min(n[a],i)};for(let t of e)r(t.x,t.w,t.top),t.upper&&r(t.upper.x,t.upper.w,t.upper.top),t.spire&&r(t.spire.x,1,t.spire.top);return n}function Ge(e,t,n,r,i){for(let a=t+1;a<e.tops.length;a++){let t=e.tops[a];for(let a=Math.max(0,Math.floor(n));a<=Math.min(e.cols-1,Math.floor(r));a++)if(t[a]<=i)return!1}return!0}function Ke(e,t){let n=[],r=e.w*e.h/1e6,i=[{n:Math.round(Ae.perMpx*r),billboard:!1},{n:Math.round(je.perMpx*r),billboard:!0}];for(let{n:r,billboard:a}of i){let i=0;for(let o=0;i<r&&o<r*40;o++){let r=a?1:2+Math.floor(t()*2),o=!a&&t()<Ae.vertical,s=a?je:o?Ae.tall:Ae.wide,c=Ve(t,s.w),l=Ve(t,s.h),u=e.layers[r],d=u[Math.floor(t()*u.length)];if(!d||d.w<c+4)continue;let f=d.x+2+Math.floor(t()*(d.w-c-3)),p=Math.max(d.top,0)+6,m=Math.round(Be(t,[p,e.h*.8]));f<0||f+c>e.w||m+l>e.h*.85||!Ge(e,r,f-1,f+c+1,m+l+1)||n.some(e=>f<e.x+e.w+3&&e.x<f+c+3&&m<e.y+e.h+3&&e.y<m+l+3)||(n.push({x:f,y:m,w:c,h:l,layer:r,cool:a||t()<Ae.cool,vertical:o,seed:1+Math.floor(t()*8388607),phase:t()*Math.PI*2}),i++)}}return n}function qe(e,t){let n=[];return e.layers.forEach((r,i)=>{if(!(i<2))for(let a of r){let r=a.spire?{x:a.spire.x+.5,y:a.spire.top}:{x:a.x+a.w/2,y:(a.upper??a).top};r.y<=2||r.y>e.h*.7||!a.spire&&t()>=Me.chance||Ge(e,i,r.x-2,r.x+2,r.y-2)&&n.push({x:r.x,y:r.y-1,layer:i,period:Be(t,Me.period),phase:t()})}}),n}function Je(e,t){let n=e<t?Fe.tall:Fe.wide,r=n.top*t;return{top:r,right:n.right[0]*e+n.right[1]*t,railTop:r-n.rail*t}}function Ye(e,t,n){let r=Math.ceil(e)+1,i=De.map((r,i)=>Ue(i,e,t,n)),a={w:e,h:t,cols:r,layers:i,tops:i.map(e=>We(e,r)),signs:[],beacons:[],ledge:Je(e,t)};return a.signs=Ke(a,n),a.beacons=qe(a,n),a}function Xe(e){return Math.ceil(e.cols/ze)}function Ze(e){let t=Xe(e),n=new Float32Array(ze*t*e.layers.length*4),r=(e,n)=>((e*t+Math.floor(n/ze))*ze+n%ze)*4;for(let t=0;t<e.layers.length;t++){for(let i=0;i<e.cols;i++)n[r(t,i)]=He;for(let i of e.layers[t]){let a=(a,o,s,c)=>{for(let l=Math.max(0,a);l<Math.min(e.cols,a+o);l++){let e=r(t,l);s>n[e]||(n[e]=s,n[e+1]=i.x,n[e+2]=i.w,n[e+3]=c)}};a(i.x,i.w,i.top,i.seed),i.upper&&a(i.upper.x,i.upper.w,i.upper.top,i.seed),i.spire&&a(i.spire.x,1,i.spire.top,-i.seed)}}return n}function Qe(e){let t=parseInt(e.replace(`#`,``),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}function J(e,t,n){return[e[0]+(t[0]-e[0])*n,e[1]+(t[1]-e[1])*n,e[2]+(t[2]-e[2])*n]}var Y=[1,1,1];function $e(e){let t=Qe(e.bg),n=Qe(e.cool),r=Qe(e.accent),i=Qe(e.bright);return{skyTop:n,skyMid:J(J(n,r,.18),t,.08),skyLow:J(n,r,.55),lowGlow:J(t,r,.24),faceFar:J(n,t,.2),faceNear:J(n,t,.6),edge:J(n,Y,.55),winPale:J(n,Y,.55),winViolet:J(J(n,r,.5),Y,.3),winPink:J(r,Y,.3),winWhite:J(n,Y,.82),signWarm:r,signCool:J(n,Y,.45),beacon:r,droneWhite:J(i,Y,.5),droneCool:J(n,Y,.5),seam:J(t,n,.16),ledge:J(t,n,.16),ledgeTop:J(J(n,Y,.15),t,.3),rail:J(t,n,.3),glass:J(t,n,.45)}}function et(e,t,n){let r=Math.min(1,Math.max(0,t/n)),i=r<.5?J(e.skyTop,e.skyMid,r*2):J(e.skyMid,e.skyLow,r*2-1),a=Math.min(1,Math.max(0,(r-.4)/.6)),o=a*a*(3-2*a);return[i[0]+e.lowGlow[0]*o,i[1]+e.lowGlow[1]*o,i[2]+e.lowGlow[2]*o]}function tt(e,t){let n=[],r=(e,t,r,i)=>n.push(e,t,r[0]*i,r[1]*i,r[2]*i,i),i=(e,t,n,i,a,o)=>{r(e,t,a,o),r(n,t,a,o),r(e,i,a,o),r(n,t,a,o),r(n,i,a,o),r(e,i,a,o)},a=e.ledge,{w:o,h:s}=e,c=a.right-3;i(-2,a.railTop,c,a.top,t.glass,.3),i(-2,a.railTop,c,a.railTop+2.2,t.rail,1);for(let e of[o*.02,(o*.02+c)/2,c-3])i(e,a.railTop,e+3,a.top,t.rail,1);i(-2,a.top,a.right,s+2,t.ledge,1),i(-2,a.top,a.right,a.top+1.6,t.ledgeTop,.85),i(-2,a.top+s*.03,a.right,a.top+s*.042,t.seam,.6);for(let e of[.22,.51,.8])i(a.right*e,a.top+s*.042,a.right*e+1,s+2,t.seam,.5);return new Float32Array(n)}var nt=`#version 300 es
// megacity city.frag: the whole city, once per pixel. Each layer of towers
// is a skyline (city.ts skyline: per column the top there, the tower's left
// edge, width and seed); the pixel walks the layers near to far and takes
// the first tower it's inside, so nothing is drawn twice. A tower's face,
// its lit roof edge, a bright strip down one side for some, and its windows
// are all made here from its seed: a grid of small dashes, each lit or dark
// by a hash, and each re-lit or put out at its own moments as the clock runs
// (WINDOW_PERIOD on average), so a few change every second. Then the haze:
// far layers take more of its colour. Where no tower is, the haze itself.
// One set of shaders, byte for byte: cyberdeck_terminal src/wallpaper/megacity/shaders/city.frag, fluid_motion assets/shaders/mc_city.frag.
precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D uSkyline;
uniform int uLayers;
uniform int uRows;        // skyline rows per layer
uniform int uCols;        // columns across
uniform vec2 uTarget;     // the target (px)
uniform float uDensity;   // px per CSS px (dp on a phone)
uniform float uHeight;    // the screen's height (CSS px)
uniform float uTime;      // the city's clock (s, wrapped)
uniform vec2 uCell[5];    // each layer's window cell (CSS px)
uniform float uFog[5];    // each layer's share of the haze
uniform vec3 uSkyTop;
uniform vec3 uSkyMid;
uniform vec3 uSkyLow;
uniform vec3 uLowGlow;
uniform vec3 uFaceFar;
uniform vec3 uFaceNear;
uniform vec3 uEdge;
uniform vec3 uWinPale;
uniform vec3 uWinViolet;
uniform vec3 uWinPink;
uniform vec3 uWinWhite;
uniform float uWindowGlow;

out vec4 fragColor;

const int SKYLINE_WIDTH = 2048;
const float WINDOW_PERIOD = 4000.0;

uint hash(uint x) {
    x ^= x >> 16;
    x *= 0x7feb352dU;
    x ^= x >> 15;
    x *= 0x846ca68bU;
    x ^= x >> 16;
    return x;
}

// A hash as 0–1.
float rnd(uint x) {
    return float(hash(x) >> 8) * (1.0 / 16777216.0);
}

// The haze at height y (CSS px): --cool at the top, violet low down, a glow rising from below (city.ts hazeAt).
vec3 haze(float y) {
    float t = clamp(y / uHeight, 0.0, 1.0);
    vec3 c = t < 0.5 ? mix(uSkyTop, uSkyMid, t * 2.0) : mix(uSkyMid, uSkyLow, t * 2.0 - 1.0);
    return c + uLowGlow * smoothstep(0.4, 1.0, t);
}

vec3 windowColour(uint id) {
    float k = rnd(id + 5u);
    return k < 0.55 ? uWinPale : k < 0.76 ? uWinViolet : k < 0.85 ? uWinPink : uWinWhite;
}

// Tower t (top, left, width, seed) of layer L at p (CSS px).
vec3 tower(int L, vec2 p, vec4 t) {
    float depth = float(L) / float(uLayers - 1);
    bool spire = t.a < 0.0;
    uint seed = uint(abs(t.a));
    vec3 c = mix(uFaceFar, uFaceNear, depth) * (0.8 + 0.4 * rnd(seed * 3u + 1u));
    float lx = p.x - t.g;
    float onePx = 1.0 / uDensity;
    // The roof's edge catches the light.
    if (p.y - t.r < max(onePx, 0.75)) c = mix(c, uEdge, 0.4);
    if (!spire && t.b > 6.0) {
        // A bright strip down one edge, on some towers.
        uint side = hash(seed + 11u) % 6u;
        if ((side == 0u && lx < 1.0) || (side == 1u && t.b - lx < 1.0)) c = mix(c, uEdge, 0.65);
        // Windows: a grid from just inside the left edge and under the roof.
        vec2 cell = uCell[L] * (0.85 + 0.4 * vec2(rnd(seed + 21u), rnd(seed + 22u)));
        vec2 g = vec2(lx - 1.5, p.y - t.r - 3.0) / cell;
        if (g.x >= 0.0 && g.y >= 0.0 && lx < t.b - 1.5) {
            vec2 ci = floor(g);
            vec2 f = (g - ci) * cell;
            uint id = hash(seed ^ hash(uint(ci.x) * 73856093u ^ uint(ci.y) * 19349663u));
            // How lit: some towers nearly dark, most part lit; whole floors lit or dark together, a few
            // blazing; far fewer far off (the haze swallows them).
            float lit = rnd(seed + 31u) < 0.2 ? 0.03 : 0.12 + 0.3 * rnd(seed + 32u);
            float floorBand = rnd(seed ^ hash(uint(ci.y / 3.0) + 101u));
            lit *= (floorBand < 0.35 ? 0.2 : floorBand < 0.88 ? 1.0 : 2.4) * mix(0.45, 1.0, depth);
            float epoch = floor((uTime + rnd(id + 2u) * WINDOW_PERIOD) / WINDOW_PERIOD);
            bool on = rnd(id ^ hash(uint(epoch) + 77u)) < lit;
            // The window: a dash across the cell, its edges smooth to the pixel.
            vec2 dash = vec2(cell.x - 1.0, max(onePx, cell.y * 0.3));
            vec2 d = abs(f - cell * 0.5) - dash * 0.5;
            float inside = clamp(0.5 - max(d.x, d.y) * uDensity, 0.0, 1.0);
            if (on) {
                vec3 w = windowColour(id) * (0.7 + 0.5 * rnd(id + 9u));
                float halo = uWindowGlow * exp(-length(max(d, 0.0)) * 1.6) * (1.0 - inside);
                c = mix(c, w, inside) + w * halo * 0.35;
            } else {
                c *= 1.0 - 0.18 * inside;
            }
        }
    }
    return mix(c, haze(p.y), uFog[L]);
}

void main() {
    vec2 p = vec2(gl_FragCoord.x, uTarget.y - gl_FragCoord.y) / uDensity;
    int col = clamp(int(p.x), 0, uCols - 1);
    vec3 c = haze(p.y);
    for (int L = uLayers - 1; L >= 0; L--) {
        vec4 t = texelFetch(uSkyline, ivec2(col % SKYLINE_WIDTH, L * uRows + col / SKYLINE_WIDTH), 0);
        if (p.y >= t.r) {
            c = tower(L, p, t);
            break;
        }
    }
    // Noise of ±half a step, so the haze's long gradients never band.
    float n = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    fragColor = vec4(c + (n - 0.5) / 255.0, 1.0);
}
`,rt=`#version 300 es
// megacity full.vert: one triangle covering the whole target; the city is
// worked out per pixel from gl_FragCoord (city.frag).
// One set of shaders, byte for byte: cyberdeck_terminal src/wallpaper/megacity/shaders/full.vert, fluid_motion assets/shaders/mc_full.vert.
void main() {
    vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
    gl_Position = vec4(p, 0.0, 1.0);
}
`,it=`#version 300 es
// megacity glow.frag: a patch of haze (soft all over) or a light: a sharp
// core and a halo, along a tail fading behind it. Added (premultiplied,
// no alpha).
// One set of shaders, byte for byte: cyberdeck_terminal src/wallpaper/megacity/shaders/glow.frag, fluid_motion assets/shaders/mc_glow.frag.
precision highp float;

uniform float uDensity;

in vec2 vLocal;
flat in vec4 vPos;
flat in vec4 vColor;
flat in vec4 vShape;
out vec4 fragColor;

void main() {
    if (vShape.z > 0.5) {
        float r = length(vLocal / vPos.zw);
        float a = vColor.a * pow(clamp(1.0 - r, 0.0, 1.0), 2.0);
        fragColor = vec4(vColor.rgb * a, 0.0);
        return;
    }
    // The nearest point on the tail (from the head back), and how far along it is.
    vec2 s = vec2(-vShape.y, 0.0);
    float k = dot(s, s) > 0.0 ? clamp(dot(vLocal, s) / dot(s, s), 0.0, 1.0) : 0.0;
    float dist = length(vLocal - s * k);
    float fade = 1.0 - k;
    float core = clamp(vShape.x * uDensity + 0.5 - dist * uDensity, 0.0, 1.0) * fade;
    float halo = exp(-dist / max(vPos.z * 0.35, 0.5)) * fade * 0.55;
    float a = vColor.a * min(1.0, core + halo);
    fragColor = vec4(vColor.rgb * a, 0.0);
}
`,at=`#version 300 es
// megacity glow.vert: a light (a beacon, a drone and its tail) or a patch
// of haze (sim.ts GLOW), one quad round it.
// One set of shaders, byte for byte: cyberdeck_terminal src/wallpaper/megacity/shaders/glow.vert, fluid_motion assets/shaders/mc_glow.vert.
layout(location = 0) in vec4 aPos;    // x, y, halo (or patch) radius across, down (CSS px)
layout(location = 1) in vec4 aColor;  // r, g, b, strength
layout(location = 2) in vec4 aShape;  // core radius, tail (CSS px, + behind a light going right), kind (0 light, 1 haze), unused

uniform vec2 uTarget;
uniform float uDensity;

out vec2 vLocal;         // CSS px from the light's head (or the patch's middle)
flat out vec4 vPos;
flat out vec4 vColor;
flat out vec4 vShape;

void main() {
    vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1));
    float tail = aShape.y;
    vec2 lo = vec2(-aPos.z - max(tail, 0.0), -aPos.w);
    vec2 hi = vec2(aPos.z + max(-tail, 0.0), aPos.w);
    vLocal = mix(lo, hi, corner);
    vPos = aPos;
    vColor = aColor;
    vShape = aShape;
    vec2 px = (aPos.xy + vLocal) * uDensity;
    gl_Position = vec4(px.x / uTarget.x * 2.0 - 1.0, 1.0 - px.y / uTarget.y * 2.0, 0.0, 1.0);
}
`,ot=`#version 300 es
// megacity shape.frag: a foreground triangle's colour (premultiplied: its
// fading edge blends smoothly).
// One set of shaders, byte for byte: cyberdeck_terminal src/wallpaper/megacity/shaders/shape.frag, fluid_motion assets/shaders/mc_shape.frag.
precision mediump float;

in vec4 vColor;
out vec4 fragColor;

void main() {
    fragColor = vColor;
}
`,st=`#version 300 es
// megacity shape.vert: the foreground's triangles (city.ts foreground: the
// railing and the ledge), each vertex with its own colour.
// One set of shaders, byte for byte: cyberdeck_terminal src/wallpaper/megacity/shaders/shape.vert, fluid_motion assets/shaders/mc_shape.vert.
layout(location = 0) in vec2 aPos;    // CSS px
layout(location = 1) in vec4 aColor;  // premultiplied

uniform vec2 uTarget;
uniform float uDensity;

out vec4 vColor;

void main() {
    vColor = aColor;
    vec2 px = aPos * uDensity;
    gl_Position = vec4(px.x / uTarget.x * 2.0 - 1.0, 1.0 - px.y / uTarget.y * 2.0, 0.0, 1.0);
}
`,ct=`#version 300 es
// megacity sign.frag: a sign's panel in its colour with glyphs on it (a
// column of square cells down an upright sign, a row along a wide one, each
// a 3 × 4 grid of strokes picked by a hash), a brighter rim, and a halo
// round it. Premultiplied: the panel covers the tower, the halo (no alpha)
// is added; a sign flickering off is a dark panel.
// One set of shaders, byte for byte: cyberdeck_terminal src/wallpaper/megacity/shaders/sign.frag, fluid_motion assets/shaders/mc_sign.frag.
precision highp float;
precision highp int;

uniform float uDensity;

in vec2 vLocal;
flat in vec4 vRect;
flat in vec4 vColor;
flat in vec4 vSign;
out vec4 fragColor;

uint hash(uint x) {
    x ^= x >> 16;
    x *= 0x7feb352dU;
    x ^= x >> 15;
    x *= 0x846ca68bU;
    x ^= x >> 16;
    return x;
}

void main() {
    vec2 size = vRect.zw;
    vec2 q = vLocal;
    vec2 d = abs(q - size * 0.5) - size * 0.5;
    float outside = max(d.x, d.y);
    float inside = clamp(0.5 - outside * uDensity, 0.0, 1.0);
    float bright = vColor.a;
    vec3 panel = vColor.rgb;
    // Glyphs: cells as wide as the sign is (upright) or as tall (wide), strokes in a 3 × 4 grid.
    bool upright = vSign.y > 0.5;
    float cs = upright ? size.x : size.y;
    vec2 along = upright ? q : q.yx;
    float k = floor(along.y / cs);
    vec2 f = vec2(along.x, along.y - k * cs) / cs;
    vec2 inner = (f - 0.18) / 0.64;
    float stroke = 0.0;
    if (all(greaterThanEqual(inner, vec2(0.0))) && all(lessThan(inner, vec2(1.0)))) {
        uvec2 sub = uvec2(floor(inner * vec2(3.0, 4.0)));
        stroke = float(hash(uint(vSign.x) ^ hash(uint(k) * 31u + sub.x * 7u + sub.y)) % 100u < 45u);
    }
    vec3 c = panel * (0.62 + 0.3 * stroke) + vec3(0.42) * stroke;
    // A brighter rim along the panel's edge.
    float rim = clamp(1.0 - abs(outside + 0.6) * uDensity, 0.0, 1.0);
    c = mix(c, min(panel * 1.5 + 0.15, vec3(1.0)), rim * 0.7);
    float halo = exp(-max(outside, 0.0) / max(vSign.z * 0.4, 0.5)) * (1.0 - inside) * 0.7;
    fragColor = vec4(c * inside * bright + panel * halo * bright, inside);
}
`,lt=`#version 300 es
// megacity sign.vert: a neon sign or billboard (sim.ts SIGN), one quad over
// it and its halo.
// One set of shaders, byte for byte: cyberdeck_terminal src/wallpaper/megacity/shaders/sign.vert, fluid_motion assets/shaders/mc_sign.vert.
layout(location = 0) in vec4 aRect;   // left, top, width, height (CSS px)
layout(location = 1) in vec4 aColor;  // r, g, b, brightness
layout(location = 2) in vec4 aSign;   // seed, upright (1) or wide, halo (CSS px), unused

uniform vec2 uTarget;    // the target (px)
uniform float uDensity;  // px per CSS px

out vec2 vLocal;         // CSS px from the sign's top left
flat out vec4 vRect;
flat out vec4 vColor;
flat out vec4 vSign;

void main() {
    vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1));
    float m = aSign.z + 1.0;
    vec2 pos = aRect.xy - m + corner * (aRect.zw + 2.0 * m);
    vLocal = pos - aRect.xy;
    vRect = aRect;
    vColor = aColor;
    vSign = aSign;
    vec2 px = pos * uDensity;
    gl_Position = vec4(px.x / uTarget.x * 2.0 - 1.0, 1.0 - px.y / uTarget.y * 2.0, 0.0, 1.0);
}
`,X=(e,[t,n])=>t+(n-t)*e(),ut=K.max,dt=class{city;rng;time=0;signBright;flickerIn;flickerLeft;dx=new Float32Array(ut);dy=new Float32Array(ut);dv=new Float32Array(ut);dTail=new Float32Array(ut);dSize=new Float32Array(ut);dKind=new Uint8Array(ut);drones=0;hx=new Float32Array(q.count);hy=new Float32Array(q.count);hrx=new Float32Array(q.count);hry=new Float32Array(q.count);hv=new Float32Array(q.count);ha=new Float32Array(q.count);droneTarget;constructor(e,t){this.city=e,this.rng=t;let n=e.signs.length;this.signBright=new Float32Array(n).fill(1),this.flickerIn=new Float32Array(n).map(()=>X(t,Ne.every)),this.flickerLeft=new Float32Array(n),this.droneTarget=Math.min(K.max,Math.max(K.min,Math.round(e.w/K.per)));for(let n=0;n<q.count;n++)this.hrx[n]=X(t,q.rx)*e.w,this.hry[n]=X(t,q.ry)*e.h,this.hx[n]=t()*e.w,this.hy[n]=X(t,q.y)*e.h,this.hv[n]=X(t,q.speed)*(t()<.5?-1:1),this.ha[n]=X(t,q.alpha);for(;this.drones<this.droneTarget;)this.launch(!0)}launch(e){let t=this.rng,n=this.drones++,r=t()<.5;this.dv[n]=X(t,K.speed)*(r?1:-1),this.dTail[n]=X(t,K.tail),this.dSize[n]=X(t,K.size),this.dx[n]=e?t()*this.city.w:r?-this.dTail[n]:this.city.w+this.dTail[n],this.dy[n]=X(t,K.y)*this.city.h,this.dKind[n]=t()<.6?0:t()<.6?1:2}advance(e){let{city:t,rng:n}=this;this.time=(this.time+e)%Pe;for(let r=0;r<t.signs.length;r++)if(this.flickerLeft[r]>0){this.flickerLeft[r]=this.flickerLeft[r]-e;let t=Math.floor(this.time*Ne.rate+r*7.3)%3!=0;this.signBright[r]=t?.95:.12}else this.flickerIn[r]=this.flickerIn[r]-e,this.flickerIn[r]<=0&&(this.flickerIn[r]=X(n,Ne.every),this.flickerLeft[r]=X(n,Ne.length)),this.signBright[r]=.88+.12*Math.sin(this.time*.6+t.signs[r].phase);let r=0;for(;r<this.drones;)this.dx[r]=this.dx[r]+this.dv[r]*e,(this.dv[r]>0?this.dx[r]-this.dTail[r]>t.w:this.dx[r]+this.dTail[r]<0)?(this.drones--,this.dx[r]=this.dx[this.drones],this.dy[r]=this.dy[this.drones],this.dv[r]=this.dv[this.drones],this.dTail[r]=this.dTail[this.drones],this.dSize[r]=this.dSize[this.drones],this.dKind[r]=this.dKind[this.drones]):r++;for(;this.drones<this.droneTarget;)this.launch(!1);for(let n=0;n<q.count;n++){this.hx[n]=this.hx[n]+this.hv[n]*e;let r=this.hrx[n];this.hx[n]>t.w+r?this.hx[n]=-r:this.hx[n]<-r&&(this.hx[n]=t.w+r)}}beacon(e){let t=this.city.beacons[e],n=(this.time+t.phase*t.period)%t.period;return n<Me.on?Math.sin(Math.PI*n/Me.on):0}};function ft(e,t,n,r,i,a,o,s){let c=J(n,et(r,a,o),De[i].fog*s);e[t]=c[0],e[t+1]=c[1],e[t+2]=c[2]}function pt(e,t,n,r){let{city:i}=e,a=Ie[n],o=0;for(let n=0;n<i.signs.length&&(o+1)*12<=r.length;n++){let s=i.signs[n],c=o++*12;r[c]=s.x,r[c+1]=s.y,r[c+2]=s.w,r[c+3]=s.h,ft(r,c+4,s.cool?t.signCool:t.signWarm,t,s.layer,s.y,i.h,.6),r[c+7]=e.signBright[n],r[c+8]=s.seed,r[c+9]=+!!s.vertical,r[c+10]=a.sign*(s.layer===1?.5:1),r[c+11]=0}return o}function mt(e,t,n,r){let{city:i}=e,a=Ie[n],o=0,s=(e,t,n,i,a,s,c,l,u)=>{if((o+1)*12>r.length)return;let d=o++*12;r[d]=e,r[d+1]=t,r[d+2]=n,r[d+3]=i,r[d+4]=a[0],r[d+5]=a[1],r[d+6]=a[2],r[d+7]=s,r[d+8]=c,r[d+9]=l,r[d+10]=u,r[d+11]=0};for(let n=0;n<q.count;n++){let r=et(t,e.hy[n],i.h);s(e.hx[n],e.hy[n],e.hrx[n],e.hry[n],J(r,[1,1,1],.25),e.ha[n],0,0,1)}let c=[0,0,0];for(let n=0;n<i.beacons.length;n++){let r=e.beacon(n);if(r<=.01)continue;let o=i.beacons[n];ft(c,0,t.beacon,t,o.layer,o.y,i.h,.5),s(o.x,o.y,a.light,a.light,c,r,1,0,0)}for(let n=0;n<e.drones;n++){let r=e.dKind[n],i=r===0?t.droneWhite:r===1?t.droneCool:t.beacon;s(e.dx[n],e.dy[n],a.light,a.light,i,.9,e.dSize[n]/2,e.dTail[n]*Math.sign(e.dv[n]),0)}return o}function ht(e){return{signs:new Float32Array(Math.max(1,e.signs.length)*12),glows:new Float32Array((q.count+e.beacons.length+ut)*12)}}var gt=`#version 300 es
precision mediump float;
uniform sampler2D uCache;
out vec4 fragColor;
void main() {
    fragColor = texelFetch(uCache, ivec2(gl_FragCoord.xy), 0);
}
`;function _t(e,t,n){let r=(t,n)=>{let r=e.createShader(t);return r?(e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(console.error(`megacity shader:`,e.getShaderInfoLog(r)),null)):null},i=r(e.VERTEX_SHADER,t),a=r(e.FRAGMENT_SHADER,n),o=e.createProgram();if(!i||!a||!o)return null;if(e.attachShader(o,i),e.attachShader(o,a),e.linkProgram(o),!e.getProgramParameter(o,e.LINK_STATUS))return console.error(`megacity program:`,e.getProgramInfoLog(o)),null;let s=new Map;return{program:o,u(t){return s.has(t)||s.set(t,e.getUniformLocation(o,t)),s.get(t)}}}function vt(e,t,n){let r=e.createBuffer(),i=e.createVertexArray();e.bindVertexArray(i),e.bindBuffer(e.ARRAY_BUFFER,r);let a=t.reduce((e,t)=>e+t,0)*4,o=0;return t.forEach((t,r)=>{e.enableVertexAttribArray(r),e.vertexAttribPointer(r,t,e.FLOAT,!1,a,o*4),n&&e.vertexAttribDivisor(r,1),o+=t}),e.bindVertexArray(null),{buffer:r,vao:i}}function yt(e){let t=_t(e,rt,nt),n=_t(e,lt,ct),r=_t(e,at,it),i=_t(e,st,ot),a=_t(e,rt,gt);if(!t||!n||!r||!i||!a)return null;let o=e.createTexture();return e.bindTexture(e.TEXTURE_2D,o),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),{city:t,copy:a,cache:null,sign:n,glow:r,shape:i,empty:e.createVertexArray(),skyline:o,signs:vt(e,[4,4,4],!0),glows:vt(e,[4,4,4],!0),shapes:{...vt(e,[2,4],!1),count:0}}}function bt(e,t,n,r,i){let a=e=>`rgb(${e.map(e=>Math.round(Math.min(1,e)*255)).join(`, `)})`;e.setTransform(r,0,0,r,0,0);let o=e.createLinearGradient(0,0,0,n);o.addColorStop(0,a(i.skyTop)),o.addColorStop(.5,a(i.skyMid)),o.addColorStop(1,a(i.skyLow)),e.fillStyle=o,e.fillRect(0,0,t,n),e.fillStyle=a(i.ledge),e.fillRect(0,n*.855,t*.5,n*.145)}function xt(e,n,r=Math.random){let i=e,a=i.getContext(`webgl2`,{alpha:!1,antialias:!1,depth:!1,preserveDrawingBuffer:!0,powerPreference:`low-power`}),o=a?yt(a):null,s=n.glow,c=$e(n.palette),l=n.still,u=null,d=null,f=null,p=null,m=!1,h=!1,g=!1,_=0,v=0,y=NaN,b=(t,n)=>{if(n.cache&&n.cache.w===e.width&&n.cache.h===e.height)return n.cache;n.cache&&(t.deleteFramebuffer(n.cache.fbo),t.deleteTexture(n.cache.texture));let r=t.createTexture();t.bindTexture(t.TEXTURE_2D,r),t.texStorage2D(t.TEXTURE_2D,1,t.RGBA8,e.width,e.height),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST);let i=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,i),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,r,0),t.bindFramebuffer(t.FRAMEBUFFER,null),n.cache={texture:r,fbo:i,w:e.width,h:e.height},y=NaN,n.cache},x=()=>{a&&o&&d&&(a.bindTexture(a.TEXTURE_2D,o.skyline),a.texImage2D(a.TEXTURE_2D,0,a.RGBA32F,ze,Xe(d)*d.layers.length,0,a.RGBA,a.FLOAT,Ze(d)))},S=()=>{if(!a||!o||!d||!u)return;let e=tt(d,c);a.bindBuffer(a.ARRAY_BUFFER,o.shapes.buffer),a.bufferData(a.ARRAY_BUFFER,e,a.STATIC_DRAW),o.shapes.count=e.length/6},C=()=>{if(!a||!o||!d||!u)return;y=NaN;let t=o.city;a.useProgram(t.program),a.uniform1i(t.u(`uSkyline`),0),a.uniform1i(t.u(`uLayers`),De.length),a.uniform1i(t.u(`uRows`),Xe(d)),a.uniform1i(t.u(`uCols`),d.cols),a.uniform2f(t.u(`uTarget`),e.width,e.height),a.uniform1f(t.u(`uDensity`),u.dpr),a.uniform1f(t.u(`uHeight`),d.h),a.uniform2fv(t.u(`uCell`),new Float32Array(De.flatMap(e=>[e.cell[0],e.cell[1]]))),a.uniform1fv(t.u(`uFog`),new Float32Array(De.map(e=>e.fog))),a.uniform3f(t.u(`uSkyTop`),...c.skyTop),a.uniform3f(t.u(`uSkyMid`),...c.skyMid),a.uniform3f(t.u(`uSkyLow`),...c.skyLow),a.uniform3f(t.u(`uLowGlow`),...c.lowGlow),a.uniform3f(t.u(`uFaceFar`),...c.faceFar),a.uniform3f(t.u(`uFaceNear`),...c.faceNear),a.uniform3f(t.u(`uEdge`),...c.edge),a.uniform3f(t.u(`uWinPale`),...c.winPale),a.uniform3f(t.u(`uWinViolet`),...c.winViolet),a.uniform3f(t.u(`uWinPink`),...c.winPink),a.uniform3f(t.u(`uWinWhite`),...c.winWhite),a.uniform1f(t.u(`uWindowGlow`),Ie[s].window),a.useProgram(o.copy.program),a.uniform1i(o.copy.u(`uCache`),0);for(let t of[o.sign,o.glow,o.shape])a.useProgram(t.program),a.uniform2f(t.u(`uTarget`),e.width,e.height),a.uniform1f(t.u(`uDensity`),u.dpr)},w=()=>{u&&(d=Ye(u.w,u.h,r),f=new dt(d,r),p=ht(d),x(),S(),C())},T=()=>{if(u){if(a&&o&&!h&&d&&f&&p){a.viewport(0,0,e.width,e.height),a.disable(a.BLEND),a.bindVertexArray(o.empty),a.activeTexture(a.TEXTURE0);let t=b(a,o),n=Math.floor(f.time);n!==y&&(y=n,a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.useProgram(o.city.program),a.uniform1f(o.city.u(`uTime`),n),a.bindTexture(a.TEXTURE_2D,o.skyline),a.drawArrays(a.TRIANGLES,0,3),a.bindFramebuffer(a.FRAMEBUFFER,null)),a.useProgram(o.copy.program),a.bindTexture(a.TEXTURE_2D,t.texture),a.drawArrays(a.TRIANGLES,0,3),a.enable(a.BLEND),a.blendFunc(a.ONE,a.ONE_MINUS_SRC_ALPHA);let r=pt(f,c,s,p.signs);r&&(a.useProgram(o.sign.program),a.bindBuffer(a.ARRAY_BUFFER,o.signs.buffer),a.bufferData(a.ARRAY_BUFFER,p.signs.subarray(0,r*12),a.STREAM_DRAW),a.bindVertexArray(o.signs.vao),a.drawArraysInstanced(a.TRIANGLE_STRIP,0,4,r));let i=mt(f,c,s,p.glows);i&&(a.useProgram(o.glow.program),a.bindBuffer(a.ARRAY_BUFFER,o.glows.buffer),a.bufferData(a.ARRAY_BUFFER,p.glows.subarray(0,i*12),a.STREAM_DRAW),a.bindVertexArray(o.glows.vao),a.drawArraysInstanced(a.TRIANGLE_STRIP,0,4,i)),a.useProgram(o.shape.program),a.bindVertexArray(o.shapes.vao),a.drawArrays(a.TRIANGLES,0,o.shapes.count),a.bindVertexArray(null),a.disable(a.BLEND)}else if(!a){let e=i.getContext(`2d`);e&&bt(e,u.w,u.h,u.dpr,c)}g||(g=!0,n.onReady?.())}},E=e=>{if(_=0,!m||l)return;if(v&&e-v<13.88888888888889){_=requestAnimationFrame(E);return}let t=v?Math.min((e-v)/1e3,Le):0;v=e,f?.advance(t),T(),_=requestAnimationFrame(E)},D={resize(n,r,i,a){let o=t(n,r,i,a,Re);e.width=Math.round(o.w*o.dpr),e.height=Math.round(o.h*o.dpr);let s=!u||o.w!==u.w||o.h!==u.h;u=o,s||!d?w():(S(),C()),T()},start(){m=!0,!(l||_||!o)&&(v=0,_=requestAnimationFrame(E))},stop(){m=!1,cancelAnimationFrame(_),_=0},setStill(e){l=e,l?D.stop():m&&D.start(),T()},setGlow(e){s=e,C(),l&&T()},setPalette(e){c=$e(e),S(),C(),l&&T()},destroy(){D.stop(),u=null,d=null,f=null}};return i.addEventListener(`contextlost`,e=>{e.preventDefault(),h=!0}),i.addEventListener(`contextrestored`,()=>{h=!1,o=a?yt(a):null,x(),S(),C(),T()}),D}var St={id:`megacity`,create:(e,t)=>xt(e,t)},Ct=.14,wt=[[.78,.18,.16,.24],[.6,.55,.18,.18],[.88,.62,.12,.16],[.32,.42,.2,.12]],Tt=[2,2,3,3,3,4,4,6,9],Et=.42,Dt=[10,38],Ot=[26,70],kt=[1.3,3.6],At=[.6,.16],jt=[.35,1.6],Mt=.9,Nt=[4,24],Pt=[.05,.3],Ft=[2,9],It=1.1,Lt=[240,460],Rt=[1,4],zt=.8,Bt=.12,Vt={low:{halo:.35,haloSize:4,lineGlow:0},medium:{halo:.5,haloSize:5,lineGlow:.08},high:{halo:.65,haloSize:6.5,lineGlow:.14},max:{halo:.8,haloSize:8,lineGlow:.22}},Ht=.1,Ut=3,Z=(e,[t,n])=>t+(n-t)*e();function Wt(e){let t=parseInt(e.replace(`#`,``),16);return[t>>16&255,t>>8&255,t&255]}function Gt(e,t,n){return[e[0]+(t[0]-e[0])*n,e[1]+(t[1]-e[1])*n,e[2]+(t[2]-e[2])*n]}function Q([e,t,n],r=1){return`rgba(${Math.round(e)}, ${Math.round(t)}, ${Math.round(n)}, ${r})`}function Kt(e,t){return Math.min(1,Math.max(0,1.05*t+.35*e-.2))}function qt(e,t){let n=Wt(e.bright),r=e=>e*e*(3-2*e),i=Gt(Wt(e.cool),[255,255,255],.4);return t<Jt?Gt(i,n,r(t/Jt)):Gt(n,Wt(e.accent),r(Math.min(1,(t-Jt)/(Yt-Jt))))}var Jt=.3,Yt=.64;function Xt(e,t,n,r,i){let a=e.length,o=new Set,s=[];for(let c=0;c<a;c++){let l=[];for(let n=0;n<a;n++){if(n===c)continue;let i=Math.hypot(e[n]-e[c],t[n]-t[c]);i<=r&&l.push([i,n])}l.sort((e,t)=>e[0]-t[0]);let u=l.slice(0,n[c]*3);for(let e=u.length-1;e>0;e--){let t=Math.floor(i()*(e+1));[u[e],u[t]]=[u[t],u[e]]}for(let[,e]of u.slice(0,n[c])){let[t,n]=c<e?[c,e]:[e,c];o.has(t*a+n)||(o.add(t*a+n),s.push([t,n]))}}return s}function Zt(e,t,n){let r=e*(1+2*Ct),i=t*(1+2*Ct),a=Math.max(12,Math.round(26*r*i/1e6)),o=()=>new Float32Array(a),s={w:e,h:t,hx:o(),hy:o(),ax:o(),ay:o(),wx:o(),wy:o(),px:o(),py:o(),radius:o(),flash:o(),rise:new Uint8Array(a),x:o(),y:o()},c=new Uint8Array(a),l=wt.reduce((e,t)=>e+t[3],0);for(let o=0;o<a;o++){if(n()<.55)s.hx[o]=-Ct*e+n()*r,s.hy[o]=-Ct*t+n()*i;else{let r=n()*l,i=wt.find(e=>(r-=e[3])<0)??wt[0];s.hx[o]=i[0]*e+(n()+n()-1)*i[2]*e,s.hy[o]=i[1]*t+(n()+n()-1)*i[2]*e}s.ax[o]=Z(n,Dt),s.ay[o]=Z(n,Dt),s.wx[o]=2*Math.PI/Z(n,Ot),s.wy[o]=s.wx[o]*(.7+n()*.6),s.px[o]=n()*2*Math.PI,s.py[o]=n()*2*Math.PI,c[o]=Tt[Math.floor(n()*Tt.length)],s.radius[o]=kt[0]+(kt[1]-kt[0])*Math.min(1,(c[o]-2)/5+n()*.35)}let u=Xt(s.hx,s.hy,c,Et*Math.hypot(e,t),n),d=Array.from({length:a},()=>[]);u.forEach(([e,t],n)=>{d[e].push(n),d[t].push(n)});let f=Math.round(22*e*t/1e6),p=()=>new Float32Array(f),m={bx:p(),by:p(),br:p(),ba:p(),bvx:p(),bvy:p()};for(let r=0;r<f;r++){m.bx[r]=n()*e,m.by[r]=n()*t,m.br[r]=Z(n,Nt),m.ba[r]=Z(n,Pt);let i=Z(n,Ft),a=-Math.PI/2+(n()-.5)*1.6;m.bvx[r]=Math.cos(a)*i,m.bvy[r]=Math.sin(a)*i}let h=new Float32Array(u.length).map(()=>Z(n,jt));return{...s,links:u,weight:h,linksOf:d,...m}}function Qt(e,t,n){let r=Vt[t],i=Math.ceil(4*n),a=Math.ceil(i*r.haloSize),o=Math.ceil(24*n),s=[],c=[],l=[],u=[255,255,255];for(let t=0;t<32;t++){let n=qt(e,t/31);l.push(Q(n));let d=new OffscreenCanvas(a*2,a*2),f=d.getContext(`2d`);if(f){let e=f.createRadialGradient(a,a,0,a,a,a),t=i/a;e.addColorStop(0,Q(Gt(n,u,.75))),e.addColorStop(t*.55,Q(Gt(n,u,.45))),e.addColorStop(t,Q(n,.95)),e.addColorStop(Math.min(.99,t*1.6),Q(n,r.halo*.55)),e.addColorStop(Math.min(.995,t*3),Q(n,r.halo*.18)),e.addColorStop(1,Q(n,0)),f.fillStyle=e,f.fillRect(0,0,a*2,a*2)}s.push(d);let p=new OffscreenCanvas(o*2,o*2),m=p.getContext(`2d`);if(m){let e=m.createRadialGradient(o,o,0,o,o,o);e.addColorStop(0,Q(n,.9)),e.addColorStop(.65,Q(n,.75)),e.addColorStop(1,Q(n,0)),m.fillStyle=e,m.fillRect(0,0,o*2,o*2)}c.push(p)}return{node:s,core:i,size:a,bokeh:c,bokehSize:o,line:l}}function $t(e,n,r=Math.random){let i=e.getContext(`2d`),a=n.palette,o=n.glow,s=n.still,c=null,l=null,u=1,d=!1,f=!1,p=!1,m=0,h=0,g=0,_=[],v=(e,t)=>{if(c){for(let n=0;n<c.hx.length;n++)c.x[n]=c.hx[n]+c.ax[n]*Math.sin(c.wx[n]*e+c.px[n]),c.y[n]=c.hy[n]+c.ay[n]*Math.sin(c.wy[n]*e+c.py[n]),c.rise[n]?(c.flash[n]=Math.min(1,c.flash[n]+t/Bt),c.flash[n]===1&&(c.rise[n]=0)):c.flash[n]=Math.max(0,c.flash[n]-t/zt);for(let e=0;e<c.bx.length;e++){let n=c.br[e];c.bx[e]=((c.bx[e]+c.bvx[e]*t+n)%(c.w+2*n)+c.w+2*n)%(c.w+2*n)-n,c.by[e]=((c.by[e]+c.bvy[e]*t+n)%(c.h+2*n)+c.h+2*n)%(c.h+2*n)-n}for(g+=It*t;g>=1&&c.links.length;){--g;let e=Math.floor(r()*c.links.length),t=c.links[e],n=r()<.5?t[0]:t[1];c.rise[n]=1,_.push({link:e,from:n,along:0,speed:0,hops:Math.round(Z(r,Rt))-1,first:!0})}for(let e=_.length-1;e>=0;e--){let n=_[e],[i,a]=c.links[n.link];if(n.speed||=Z(r,Lt)/Math.max(1,Math.hypot(c.x[a]-c.x[i],c.y[a]-c.y[i])),n.along+=n.speed*t,n.along<1)continue;let o=n.from===i?a:i;c.rise[o]=1;let s=c.linksOf[o].filter(e=>e!==n.link);n.hops>0&&s.length?(n.link=s[Math.floor(r()*s.length)],n.from=o,n.along=0,n.speed=0,n.hops--,n.first=!1):_.splice(e,1)}}},y=()=>{if(!i||!c||!l)return;let{w:t,h:r}=c,a=Vt[o];i.setTransform(1,0,0,1,0,0),i.clearRect(0,0,e.width,e.height),i.setTransform(u,0,0,u,0,0);let s=(e,n)=>Math.round(Kt(e/t,n/r)*31);for(let e=0;e<c.bx.length;e++){let n=c.br[e],a=Kt(c.bx[e]/t,c.by[e]/r);i.globalAlpha=Math.min(1,c.ba[e]*(.6+.9*a)),i.drawImage(l.bokeh[Math.round(a*31)],c.bx[e]-n,c.by[e]-n,2*n,2*n)}let d=Et*Math.hypot(t,r),f=c.links,m=(e,n)=>{i.lineWidth=e;let a=-1;for(let e=0;e<f.length;e++){let[o,u]=f[e],p=c.x[o],m=c.y[o],h=c.x[u],g=c.y[u];if(p<0&&h<0||p>t&&h>t||m<0&&g<0||m>r&&g>r)continue;let _=Math.min(1,Math.hypot(h-p,g-m)/d);i.globalAlpha=n*Math.min(1,(At[0]+(At[1]-At[0])*_)*c.weight[e]);let v=s((p+h)/2,(m+g)/2);v!==a&&(i.strokeStyle=l.line[a=v]),i.beginPath(),i.moveTo(p,m),i.lineTo(h,g),i.stroke()}};a.lineGlow>0&&m(Mt*4,a.lineGlow),m(Mt,1);let h=l.size/l.core;for(let e=0;e<c.x.length;e++){let n=c.x[e],a=c.y[e],o=c.radius[e]*(1+.8*c.flash[e])*h;n<-o||a<-o||n>t+o||a>r+o||(i.globalAlpha=Math.min(1,.8+.2*c.flash[e]),i.drawImage(l.node[s(n,a)],n-o,a-o,2*o,2*o))}for(let e of _){let[t,n]=c.links[e.link],r=e.from===t?n:t,a=c.x[e.from]+(c.x[r]-c.x[e.from])*e.along,o=c.y[e.from]+(c.y[r]-c.y[e.from])*e.along,u=2.2*h;i.globalAlpha=e.first?Math.min(1,e.along*8):1,i.drawImage(l.node[s(a,o)],a-u,o-u,2*u,2*u)}i.globalAlpha=1,p||(p=!0,n.onReady?.())},b=e=>{if(m=0,!d||s)return;let t=h?Math.min((e-h)/1e3,Ht):0;h=e,v(e/1e3,t),y(),m=requestAnimationFrame(b)},x=()=>{v(performance.now()/1e3,0),y()},S={resize(n,s,d,p){if(f||!i)return;let{w:m,h,dpr:g}=t(n,s,d,p,Ut);if(e.width=Math.round(m*g),e.height=Math.round(h*g),l&&g===u||(l=Qt(a,o,g)),u=g,!c||c.w!==m||c.h!==h){let e=performance.now();c=Zt(m,h,r),_.length=0,performance.measure(`neural-scene`,{start:e})}x()},start(){d=!0,!(s||m||f)&&(h=0,m=requestAnimationFrame(b))},stop(){d=!1,cancelAnimationFrame(m),m=0},setStill(e){s=e,s?(cancelAnimationFrame(m),m=0,x()):d&&S.start()},setGlow(e){e!==o&&(o=e,l=Qt(a,o,u),s&&x())},setPalette(e){a=e,l=Qt(a,o,u),s&&x()},destroy(){f=!0,S.stop(),c=null,l=null}};return S}var en={id:`neural-net`,create:(e,t)=>$t(e,t)},tn={width:[.2,.26],lean:[.11,.16],alpha:[.85,1],speed:[.0035,.006]},nn={width:[.07,.2],lean:[0,.05],alpha:[.1,.22],speed:[.006,.014]},rn=.18,an=.35,on=4.5,sn=[.35,1.1],cn=[.12,.45],ln=[.8,2.2],un=.2,dn=[.05,.22],fn={low:.75,medium:.9,high:1,max:1.18},pn=.1,mn=3,$=(e,[t,n])=>t+(n-t)*e();function hn(e){let t=parseInt(e.replace(`#`,``),16);return[t>>16&255,t>>8&255,t&255]}function gn(e){let t=hn(e.cool),n=hn(e.accent);return{pale:t.map((e,t)=>Math.round(e+(255-e)*(t===2?.92:.62))).join(`, `),red:n.join(`, `),flare:((e,t)=>e.map(e=>Math.round(e+(255-e)*t)).join(`, `))(t,.35)}}function _n(e,t,n=Math.random){let r=e.getContext(`2d`),i=t.palette,a=t.glow,o=t.still,s=0,c=0,l=1,u=1,d=!1,f=!1,p=0,m=0,h=0,g=gn(i),_=[],v=[],y=[],b=null,x=(e,t,r)=>{let i=$(n,t.width)*s*u,a=$(n,t.lean)*s;return{kind:e,width:i,lean:a,x:r?n()*s:-i-a,alpha:$(n,t.alpha),speed:$(n,t.speed)*s*u,phase:n()*6.28}},S=()=>{let e=new OffscreenCanvas(4,96),t=e.getContext(`2d`);if(!t||!r)return null;for(let e=0;e<96;e++)t.fillStyle=`rgba(255, 255, 255, ${(n()<.12?.6+n()*.4:n()*.25).toFixed(3)})`,t.fillRect(0,e,4,1);return r.createPattern(e,`repeat`)},C=()=>{let e=x(`pale`,tn,!0);e.x=s*(-.03+n()*.06),_=[e,...Array.from({length:3},(e,t)=>{let r=x(`red`,nn,!0);return r.x=s*(.42+t*.55/3+n()*.06),r})],v=[],y=Array.from({length:10},()=>({y:c*n()**1.5,alpha:$(n,dn),rate:.3+n()*1.2,phase:n()*6.28})),b=S(),b?.setTransform({a:u,b:0,c:0,d:u,e:0,f:0})},w=e=>{for(let t of _)t.x+=t.speed*e,t.x-t.lean>s+t.width&&Object.assign(t,x(t.kind,t.kind===`pale`?tn:nn,!1));for(h+=on*e;h>=1;){--h;let e=c*Math.min(1,n()**2.6);v.push({x:0,y:e,speed:$(n,sn)*s*u,length:$(n,cn)*s*u,width:$(n,ln)*u,pale:n()<un,alpha:.35+n()*.6})}for(let t of v)t.x+=t.speed*e;v=v.filter(e=>e.x-e.length<s)},T=n=>{if(!r||!s)return;let i=fn[a];r.setTransform(1,0,0,1,0,0),r.globalCompositeOperation=`source-over`,r.clearRect(0,0,e.width,e.height),r.globalCompositeOperation=`lighter`;for(let e of _){let t=e.kind===`pale`,a=t?g.pale:g.red,o=Math.min(1,e.alpha*i*(.9+.1*Math.sin(n*.4+e.phase))),s=t?rn*.45:rn;if(r.setTransform(l,0,-l*e.lean/c,l,l*e.lean,0),t){let t=r.createLinearGradient(e.x-e.width*.6,0,e.x+e.width*1.6,0);t.addColorStop(0,`rgba(${a}, 0)`),t.addColorStop(.35,`rgba(${a}, ${.12*o})`),t.addColorStop(.65,`rgba(${a}, ${.12*o})`),t.addColorStop(1,`rgba(${a}, 0)`),r.fillStyle=t,r.fillRect(e.x-e.width*.6,0,e.width*2.2,c)}let u=r.createLinearGradient(e.x,0,e.x+e.width,0);if(u.addColorStop(0,`rgba(${a}, 0)`),u.addColorStop(s,`rgba(${a}, ${o})`),u.addColorStop(1-s,`rgba(${a}, ${o*.92})`),u.addColorStop(1,`rgba(${a}, 0)`),r.fillStyle=u,r.fillRect(e.x,0,e.width,c),!t){let t=r.createLinearGradient(0,0,0,c);t.addColorStop(0,`rgba(${a}, ${o*.55})`),t.addColorStop(.45,`rgba(${a}, 0)`),r.fillStyle=t,r.fillRect(e.x+e.width*s,0,e.width*(1-2*s),c)}b&&(r.globalAlpha=an*o*(t?.22:1),r.fillStyle=b,r.fillRect(e.x+e.width*rn*.5,0,e.width*(1-rn),c),r.globalAlpha=1)}r.setTransform(l,0,0,l,0,0);for(let e of y){let t=e.alpha*i*(.55+.45*Math.sin(n*e.rate+e.phase)),a=r.createLinearGradient(0,0,s,0);a.addColorStop(0,`rgba(${g.red}, 0)`),a.addColorStop(.45,`rgba(${g.red}, ${t})`),a.addColorStop(1,`rgba(${g.red}, ${t*.4})`),r.fillStyle=a,r.fillRect(0,e.y,s,u)}for(let e of v){let t=e.pale?g.pale:g.red,n=r.createLinearGradient(e.x-e.length,0,e.x,0);n.addColorStop(0,`rgba(${t}, 0)`),n.addColorStop(1,`rgba(${t}, ${Math.min(1,e.alpha*i)})`),r.fillStyle=n,r.fillRect(e.x-e.length,e.y-e.width/2,e.length,e.width),r.globalAlpha=.18*i,r.fillRect(e.x-e.length,e.y-e.width*2,e.length,e.width*4),r.globalAlpha=1}let o=.85+.15*Math.sin(n*.25),d=s*.995,p=c*.88,m=s*.17*u,h=r.createRadialGradient(d,p,0,d,p,m);h.addColorStop(0,`rgba(${g.pale}, ${.95*i*o})`),h.addColorStop(.18,`rgba(${g.flare}, ${.6*i*o})`),h.addColorStop(.5,`rgba(${g.flare}, ${.16*i*o})`),h.addColorStop(1,`rgba(${g.flare}, 0)`),r.fillStyle=h,r.fillRect(d-m,p-m,2*m,2*m),r.strokeStyle=`rgba(${g.flare}, ${.45*i*o})`,r.lineWidth=4*u,r.beginPath(),r.arc(d+(s*.72-d)*u,p+(c*.5-p)*u,s*.36*u,Math.PI*.08,Math.PI*.4),r.stroke(),r.globalCompositeOperation=`source-over`,f||(f=!0,t.onReady?.())},E=e=>{if(p=0,!d||o)return;if(m&&e-m<13.88888888888889){p=requestAnimationFrame(E);return}let t=m?Math.min((e-m)/1e3,pn):0;m=e,w(t),T(e/1e3),p=requestAnimationFrame(E)},D={resize(t,n,r,i){let a=Math.min(mn,Math.max(1,r));e.width=Math.round(t*a),e.height=Math.round(n*a);let o=i>0&&Number.isFinite(i)?i:1,d=t!==s||n!==c||o!==u;s=t,c=n,l=a,u=o,(d||!b)&&C(),T(performance.now()/1e3)},start(){d=!0,!(o||p)&&(m=0,p=requestAnimationFrame(E))},stop(){d=!1,cancelAnimationFrame(p),p=0},setStill(e){o=e,o?D.stop():d&&D.start(),T(performance.now()/1e3)},setGlow(e){a=e,o&&T(performance.now()/1e3)},setPalette(e){i=e,g=gn(i),o&&T(performance.now()/1e3)},destroy(){D.stop(),s=0}};return D}var vn=[Ee,en,{id:`velocity`,create:(e,t)=>_n(e,t)},I,St];function yn(t){let n=e(t);return vn.find(e=>e.id===n)??vn[0]}export{yn as findWallpaper};