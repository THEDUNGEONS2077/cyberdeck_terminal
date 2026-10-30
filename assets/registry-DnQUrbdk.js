import{n as e}from"./catalog-CPVtViut.js";function t(e,t,n,r,i){let a=r>0&&Number.isFinite(r)?r:1;return{w:e/a,h:t/a,dpr:Math.min(i,Math.max(1,n))*a}}var n={w:[14,18],h:[10,13],at:[.62,.46]},r=1.6,i={w:[5,9],h:[4,7]},a=[2,6],o={first:[2,6],diagonal:[1,5],straight:[4,18],length:[24,90]},s=[2,4],c=[10,48],l=.3,u=[.9,1.5],d=2.6,f=.06,p=2.2,m=[90,260],h=[40,150],g=.5,_=[2.5,6],v=.18,y=1.6,b=.6,x=1.4,S=2.5,C={low:{board:0,halo:3,haloAlpha:.16,head:5},medium:{board:2,halo:4,haloAlpha:.2,head:7},high:{board:3,halo:5,haloAlpha:.24,head:9},max:{board:5,halo:6.5,haloAlpha:.3,head:12}},w=.1,T=3,E=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]],D=(e,[t,n])=>t+(n-t)*e(),O=(e,t)=>Math.floor(D(e,[t[0],t[1]+1]));function k(e,t,p){let m=Math.ceil(e/14),h=Math.ceil(t/14),g=m+8+1,_=h+8+1,v=new Int32Array(g*_),y=(e,t)=>e+4+(t+4)*g,b=(e,t)=>e>=-4&&t>=-4&&e<=m+4&&t<=h+4,x=(e,t)=>e>=0&&t>=0&&e<=m&&t<=h,S=(m+1)*(h+1),C=0,w=[],T=[],k=[],j=(e,t,n,r)=>{let i=Math.round(n-e/2),a=Math.round(r-t/2);for(let n=a-3;n<=a+t+2;n++)for(let t=i-3;t<=i+e+2;t++)if(!x(t,n)||v[y(t,n)]!==0)return!1;return!0},M=(e,t,n,r,i)=>{if(!j(e,t,n,r))return!1;let a=Math.round(n-e/2),o=Math.round(r-t/2);for(let n=o-1;n<=o+t;n++)for(let t=a-1;t<=a+e;t++)v[y(t,n)]=-1;let s=w.length,c=[];for(let t=1;t<=e-2;t+=2)c.push({x:a+t,y:o-1,dir:6,chip:s});for(let n=1;n<=t-2;n+=2)c.push({x:a+e,y:o+n,dir:0,chip:s});for(let n=1;n<=e-2;n+=2)c.push({x:a+n,y:o+t,dir:2,chip:s});for(let e=1;e<=t-2;e+=2)c.push({x:a-1,y:o+e,dir:4,chip:s});return w.push({x:a,y:o,w:e,h:t,main:i,pins:c}),!0},N=(e,t,n,r)=>{let[i,a]=E[r],o=t+i,s=n+a;if(!b(o,s))return`edge`;if(v[y(o,s)]!==0)return null;if(i!==0&&a!==0){let e=b(o,n)?v[y(o,n)]:0,r=b(t,s)?v[y(t,s)]:0;if(e>0&&r>0)return null}for(let[t,n]of[[1,0],[-1,0],[0,1],[0,-1]]){if(!b(o+t,s+n))continue;let r=v[y(o+t,s+n)];if(r>0&&r!==e+1)return null}return[o,s]},P=[],F=(e,t,n)=>{v[y(t,n)]=e+1,P.push(y(t,n)),x(t,n)&&C++},ee=()=>{for(let e of P){v[e]=0;let t=e%g-4,n=Math.floor(e/g)-4;x(t,n)&&C--}P.length=0},I=(e,t,n,r,i)=>{let a=[t,n],o=t,s=n,c=-1,l=`via`,u=0;for(;u<i;u++){let t=r(u,c);if(t<0)break;let n=N(e,o,s,t);if(n===`edge`){l=`edge`;break}if(n===null)break;c!==-1&&t!==c&&a.push(o,s),c=t,[o,s]=n,F(e,o,s)}return(a[a.length-2]!==o||a[a.length-1]!==s)&&a.push(o,s),{pts:a,end:l,steps:u}},L=(e,t,n,r,i,a,o)=>{let s=[0];for(let t=2;t<e.length;t+=2){let n=e[t]-e[t-2],r=e[t+1]-e[t-1];s.push(s[s.length-1]+Math.hypot(n,r))}return T.push({pts:e,len:s,width:t,cool:n,start:r,end:i,chip:a,bus:o}),T.length-1},R=e=>{let t=[{dir:e,steps:O(p,o.first),bend:0}],n=O(p,o.length),r=t[0].steps,i=e;for(;r<n;){let n=p()<.5?1:-1,a=(i+n+8)%8,s=p()<.55?i:(i+2*n+8)%8;s===(e+4)%8&&(s=i),t[t.length-1].bend=s===i?0:n;let c=O(p,o.diagonal),l=O(p,o.straight);t.push({dir:a,steps:c,bend:0},{dir:s,steps:l,bend:0}),r+=c+l,i=s}return t},z=Math.min(O(p,n.w),Math.floor(m*.5)),B=Math.min(O(p,n.h),Math.floor(h*.3));M(Math.max(4,z),Math.max(3,B),m*n.at[0],h*n.at[1],!0);let V=Math.max(2,Math.round(r*e*t/1e6));for(let e=0;e<V;e++){let e=O(p,i.w),t=O(p,i.h),n=null,r=-1;for(let i=0;i<60;i++){let i=3+p()*(m-6),a=3+p()*(h-6),o=Math.min(...w.map(e=>Math.hypot(e.x+e.w/2-i,e.y+e.h/2-a)));o>r&&j(e,t,i,a)&&(n=[i,a],r=o)}n&&M(e,t,n[0],n[1],!1)}let H=(e,t,n,r,i)=>{let a=e.length,o=R(t),s=p()<l,c=D(p,u),[d,f]=E[(t+2)%8],m=e.map(e=>e.x*d+e.y*f),h=[...m].sort((e,t)=>e-t),g=k.length,_=[];return e.forEach((e,t)=>{let l=h.indexOf(m[t]),u=o.map(e=>e.bend===0?e:{...e,steps:e.steps+(e.bend>0?a-1-l:l)*2}),d=T.length;P.length=0,F(d,e.x,e.y);let f=0,p=u[0].steps,b=I(d,e.x,e.y,()=>{for(;p<=0;){if(f++,f>=u.length)return-1;p=u[f].steps}return p--,u[f].dir},1e4);b.steps<i?(ee(),n>=0&&(v[y(e.x,e.y)]=-1)):_.push(L(b.pts,c,s,n>=0?`chip`:r(),b.end,n,g))}),_.length>0&&k.push(_),_};w.forEach((e,t)=>{let n=new Map;for(let t of e.pins)n.set(t.dir,[...n.get(t.dir)??[],t]);for(let e of n.values())for(let n=0;n<e.length;){let r=Math.min(e.length-n,O(p,a)),i=e.slice(n,n+r);n+=r,p()<.15||H(i,i[0].dir,t,()=>`chip`,3)}});let U=(e,t)=>{if(!x(e,t))return!1;for(let n=-1;n<=1;n++)for(let r=-1;r<=1;r++)if(b(e+r,t+n)&&v[y(e+r,t+n)]!==0)return!1;return!0};for(let e=0;C/S<.16&&e<4e3;e++){let e=Math.floor(p()*(m+1)),t=Math.floor(p()*(h+1));if(p()<.5){let n=Math.floor(p()*4)*2,[r,i]=E[(n+2)%8],a=O(p,s),o=Array.from({length:a},(n,a)=>({x:e+r*a*2,y:t+i*a*2}));if(!o.every(e=>U(e.x,e.y)))continue;let c=p()<.4?`pad`:`via`;H(o,n,-1,()=>c,6);continue}let n=T.length;if(!U(e,t))continue;P.length=0,F(n,e,t);let r=O(p,c),i=p()<.7?Math.floor(p()*4)*2:Math.floor(p()*4)*2+1,a=i%2==1?O(p,[1,4]):0,o=I(n,e,t,()=>(i%2==1?a--<=0&&(i=(i+(p()<.5?1:-1)+8)%8):p()<.12&&(i=(i+(p()<.5?1:-1)+8)%8,a=O(p,[1,4])),i),r);if(o.steps<4){ee();continue}let g=p()<f;L(o.pts,g?d:D(p,u),p()<l,p()<.3?`pad`:`via`,o.end===`edge`?`edge`:p()<.3?`pad`:`via`,-1,-1)}return A(T),{w:e,h:t,cols:g,rows:_,chips:w,traces:T,buses:k}}function A(e){let t=e=>e.len[e.len.length-1]??0,n=e.reduce((e,n)=>e+t(n),0),r=e.reduce((e,n)=>e+(n.cool?t(n):0),0);if(n<=0||r>=.2*n)return;let i=new Map;e.forEach((e,t)=>{if(e.cool)return;let n=e.bus>=0?`b${e.bus}`:`t${t}`;i.set(n,[...i.get(n)??[],e])});let a=[...i.values()].map(e=>({g:e,len:e.reduce((e,n)=>e+t(n),0)}));a.sort((e,t)=>e.len-t.len);for(let{g:e,len:t}of a){if(r>=.2*n)break;for(let t of e)t.cool=!0;r+=t}}function j(e,t,n){let r=e.len[e.len.length-1],i=Math.min(Math.max(t,0),r),a=1;for(;a<e.len.length-1&&e.len[a]<i;)a++;let o=e.len[a-1],s=e.len[a],c=s>o?(i-o)/(s-o):0;return n[0]=e.pts[2*(a-1)]+(e.pts[2*a]-e.pts[2*(a-1)])*c,n[1]=e.pts[2*(a-1)+1]+(e.pts[2*a+1]-e.pts[2*(a-1)+1])*c,n}var M=e=>e.len[e.len.length-1];function N(e){let t=parseInt(e.replace(`#`,``),16);return[t>>16&255,t>>8&255,t&255]}var P=(e,t,n)=>[e[0]+(t[0]-e[0])*n,e[1]+(t[1]-e[1])*n,e[2]+(t[2]-e[2])*n],F=([e,t,n],r=1)=>`rgba(${Math.round(e)}, ${Math.round(t)}, ${Math.round(n)}, ${r})`;function ee(e){let t=N(e.bg),n=N(e.line),r=N(e.dim),i=N(e.cool),a=[255,255,255];return{dot:P(t,n,.9),warmTrace:P(n,r,.5),coolTrace:P(t,i,.6),warmVia:P(n,r,.75),coolVia:P(t,i,.85),chipBody:P(t,n,.4),chipEdge:P(n,r,.6),die:P(n,r,.25),warmLight:N(e.accent),warmHead:N(e.bright),coolLight:P(i,a,.35),coolHead:P(i,a,.8)}}function I(e,t,n,r=!1){let i=Math.max(2,Math.ceil(n)),a=new OffscreenCanvas(i*2,i*2),o=a.getContext(`2d`);if(!o)return a;let s=o.createRadialGradient(i,i,0,i,i,i);return r?(s.addColorStop(0,F(t,0)),s.addColorStop(.35,F(t,.35)),s.addColorStop(.5,F(e,.9)),s.addColorStop(.7,F(t,.3)),s.addColorStop(1,F(t,0))):(s.addColorStop(0,F(e,1)),s.addColorStop(.2,F(P(e,t,.5),.85)),s.addColorStop(.45,F(t,.35)),s.addColorStop(1,F(t,0))),o.fillStyle=s,o.fillRect(0,0,i*2,i*2),a}function L(e,n,r=Math.random){let i=e.getContext(`2d`),a=n.palette,o=n.glow,s=n.still,c=0,l=0,u=1,d=!1,f=!1,E=0,D=0,O=null,A=null,P=ee(a),L=[],R=[],z=new Float32Array,B=new Float32Array,V=new Float32Array,H=0,U=0,W=[0,0],te=e=>{let t=new OffscreenCanvas(Math.max(1,Math.round(c*u)),Math.max(1,Math.round(l*u))),n=t.getContext(`2d`);if(!n)return t;n.setTransform(u,0,0,u,0,0);let r=C[o],i=e.chips.find(e=>e.main),s=i?(i.x+i.w/2)*14:c/2,d=i?(i.y+i.h/2)*14:l/2,f=Math.hypot(Math.max(s,c-s),Math.max(d,l-d));n.fillStyle=F(P.dot);for(let e=0;e<=l;e+=14)for(let t=0;t<=c;t+=14)n.globalAlpha=.85-.6*(Math.hypot(t-s,e-d)/f),n.fillRect(t-.5,e-.5,1,1);n.globalAlpha=1,n.lineCap=`round`,n.lineJoin=`round`;for(let t of e.traces){let e=t.cool?P.coolTrace:P.warmTrace;n.strokeStyle=F(e),n.lineWidth=t.width,n.shadowColor=F(e,.7),n.shadowBlur=r.board*u,n.beginPath(),n.moveTo(t.pts[0]*14,t.pts[1]*14);for(let e=2;e<t.pts.length;e+=2)n.lineTo(t.pts[e]*14,t.pts[e+1]*14);n.stroke()}n.shadowBlur=0;for(let t of e.traces){let e=t.cool?P.coolVia:P.warmVia,r=t.pts.length;for(let[i,o,s]of[[t.start,t.pts[0],t.pts[1]],[t.end,t.pts[r-2],t.pts[r-1]]])if(i===`via`)n.fillStyle=F(N(a.bg)),n.strokeStyle=F(e),n.lineWidth=1.2,n.beginPath(),n.arc(o*14,s*14,4.2,0,Math.PI*2),n.fill(),n.stroke();else if(i===`pad`){let t=14*.55;n.fillStyle=F(e,.45),n.strokeStyle=F(e),n.lineWidth=1,n.fillRect(o*14-t/2,s*14-t/2,t,t),n.strokeRect(o*14-t/2,s*14-t/2,t,t)}}for(let t of e.chips){let e=(t.x-.5)*14,r=(t.y-.5)*14,i=t.w*14,a=t.h*14;n.strokeStyle=F(P.chipEdge),n.lineWidth=1.2;for(let e of t.pins){n.beginPath(),n.moveTo(e.x*14,e.y*14);let[t,r]=e.dir===0?[-1,0]:e.dir===2?[0,-1]:e.dir===4?[1,0]:[0,1];n.lineTo((e.x+t*.5)*14,(e.y+r*.5)*14),n.stroke()}if(n.fillStyle=F(P.chipBody),n.fillRect(e,r,i,a),n.strokeRect(e,r,i,a),n.fillStyle=F(P.chipEdge,.8),n.beginPath(),n.arc(e+14*.7,r+14*.7,1.9600000000000002,0,Math.PI*2),n.fill(),t.main){n.strokeStyle=F(P.die,.9),n.lineWidth=1,n.strokeRect(e+28,r+28,i-56,a-56),n.strokeStyle=F(P.die,.35),n.beginPath();for(let t=e+28+14;t<e+i-28;t+=14)n.moveTo(t,r+28),n.lineTo(t,r+a-28);for(let t=r+28+14;t<r+a-28;t+=14)n.moveTo(e+28,t),n.lineTo(e+i-28,t);n.stroke()}}return t},ne=()=>{if(!O)return;let e=C[o].head*u;A={layer:te(O),warmHead:I(P.warmHead,P.warmLight,e),coolHead:I(P.coolHead,P.coolLight,e),warmRing:I(P.warmHead,P.warmLight,12.6*u,!0),coolRing:I(P.coolHead,P.coolLight,12.6*u,!0)}},re=()=>{O=k(c,l,r),z=new Float32Array(O.traces.length),B=new Float32Array(O.chips.length),V=new Float32Array(O.traces.length);let e=0;O.traces.forEach((t,n)=>{e+=M(t),V[n]=e}),L=[],R=[],U=1,ne();for(let e=0;e<S;e+=1/30)oe(1/30)},G=(e,t,n,r,i)=>{L.push({trace:e,d:0,speed:n,tail:r,reverse:t,wait:i,arrived:!1})},ie=()=>{let e=V[V.length-1]??0,t=r()*e,n=0,i=V.length-1;for(;n<i;){let e=n+i>>1;V[e]<t?n=e+1:i=e}return n},ae=e=>e.chip>=0?r()<g:r()<.5,oe=e=>{let t=O;if(t&&t.traces.length!==0){for(H+=p*c*l/1e6*e;H>=1;){--H;let e=ie();G(e,ae(t.traces[e]),(r()*(m[1]-m[0])+m[0])/14,(r()*(h[1]-h[0])+h[0])/14,0)}if(U-=e,U<=0&&t.buses.length>0){U=_[0]+r()*(_[1]-_[0]);let e=t.buses[Math.floor(r()*t.buses.length)],n=t.traces[e[0]],i=ae(n),a=(r()*(m[1]-m[0])+m[0])/14,o=(r()*(h[1]-h[0])+h[0])/14;for(let t of e)G(t,i,a,o,r()*v)}for(let n of L){if(n.wait>0){n.wait-=e;continue}n.d+=n.speed*e;let r=t.traces[n.trace],i=M(r);if(z[n.trace]=Math.min(1,Math.max(z[n.trace],.6)),!n.arrived&&n.d>=i){n.arrived=!0;let e=n.reverse?r.start:r.end,t=r.pts.length,[i,a]=n.reverse?[r.pts[0],r.pts[1]]:[r.pts[t-2],r.pts[t-1]];(e===`via`||e===`pad`)&&R.push({x:i,y:a,life:1,cool:r.cool}),e===`chip`&&r.chip>=0&&(B[r.chip]=Math.min(1,B[r.chip]+.35))}}L=L.filter(e=>e.wait>0||e.d<M(t.traces[e.trace])+e.tail);for(let t=0;t<z.length;t++)z[t]=Math.max(0,z[t]-e/y);for(let t=0;t<B.length;t++)B[t]=Math.max(0,B[t]-e/x);for(let t of R)t.life-=e/b;R=R.filter(e=>e.life>0)}},se=(e,t,n)=>{if(i){j(e,t,W),i.moveTo(W[0]*14,W[1]*14);for(let r=1;r<e.len.length-1;r++)e.len[r]>t&&e.len[r]<n&&i.lineTo(e.pts[2*r]*14,e.pts[2*r+1]*14);j(e,n,W),i.lineTo(W[0]*14,W[1]*14)}},ce=()=>{if(!i||!O||!A)return;let t=C[o];i.setTransform(1,0,0,1,0,0),i.globalCompositeOperation=`source-over`,i.clearRect(0,0,e.width,e.height),i.drawImage(A.layer,0,0),i.setTransform(u,0,0,u,0,0),i.globalCompositeOperation=`lighter`,i.lineCap=`round`,i.lineJoin=`round`,O.chips.forEach((e,t)=>{let n=B[t];n<.01||(i.fillStyle=F(P.warmLight,.1*n),i.fillRect((e.x-.5)*14,(e.y-.5)*14,e.w*14,e.h*14),i.strokeStyle=F(P.warmLight,.55*n),i.lineWidth=1.5,i.strokeRect((e.x-.5)*14,(e.y-.5)*14,e.w*14,e.h*14))}),O.traces.forEach((e,t)=>{let n=z[t];n<.02||(i.strokeStyle=F(e.cool?P.coolLight:P.warmLight,.3*n),i.lineWidth=e.width+.6,i.beginPath(),se(e,0,M(e)),i.stroke())});for(let e of L){if(e.wait>0)continue;let n=O.traces[e.trace],r=M(n),a=Math.min(e.d,r),o=Math.max(0,e.d-e.tail);if(a<=o)continue;let s=n.cool?P.coolLight:P.warmLight,c=(t,i)=>e.reverse?se(n,r-i,r-t):se(n,t,i);i.strokeStyle=F(s,t.haloAlpha),i.lineWidth=n.width*t.halo,i.beginPath(),c(o,a),i.stroke(),i.lineWidth=n.width+.8;for(let e=0;e<6;e++){let t=o+(a-o)*e/6,n=o+(a-o)*(e+1)/6,r=(e+1)/6;i.strokeStyle=F(s,r*r),i.beginPath(),c(t,n),i.stroke()}if(e.d<=r){j(n,e.reverse?r-a:a,W);let t=n.cool?A.coolHead:A.warmHead,o=t.width/2/u;i.drawImage(t,W[0]*14-o,W[1]*14-o,o*2,o*2)}}for(let e of R){let t=e.cool?A.coolRing:A.warmRing,n=t.width/2/u;i.globalAlpha=e.life,i.drawImage(t,e.x*14-n,e.y*14-n,n*2,n*2)}i.globalAlpha=1,i.globalCompositeOperation=`source-over`,f||(f=!0,n.onReady?.())},le=e=>{if(E=0,!d||s)return;let t=D?Math.min((e-D)/1e3,w):0;D=e,oe(t),ce(),E=requestAnimationFrame(le)},ue={resize(n,r,i,a){let{w:o,h:s,dpr:d}=t(n,r,i,a,T);e.width=Math.round(o*d),e.height=Math.round(s*d);let f=o!==c||s!==l||!O,p=d!==u;c=o,l=s,u=d,f?re():p&&ne(),ce()},start(){d=!0,s||E||(D=0,E=requestAnimationFrame(le))},stop(){d=!1,cancelAnimationFrame(E),E=0},setStill(e){s=e,s?ue.stop():d&&ue.start(),ce()},setGlow(e){o=e,ne(),s&&ce()},setPalette(e){a=e,P=ee(a),ne(),s&&ce()},destroy(){ue.stop(),O=null,A=null,c=0}};return ue}var R={id:`data-flow`,create:(e,t)=>L(e,t)},z=1080,B={min:.5,max:1.2},V={x:.38,z:.2},H={low:[0,.2],peakChance:.14,peak:[.26,.48]},U={height:1,near:.25},W={focal:.95,horizon:.5},te=.45,ne={start:3,end:44},re={width:.5,glowWidth:3.6,near:4.5,soften:3.2},G={x:.5,lift:.016,core:.011,glow:.22,dome:{rx:.26,ry:.62}},ie={low:{edge:.2,sun:.85},medium:{edge:.32,sun:.95},high:{edge:.45,sun:1},max:{edge:.62,sun:1.1}},ae=.1,oe=3,se=(e,[t,n])=>t+(n-t)*e();function ce(e){let t=z/Math.max(1,e);return Math.min(B.max,Math.max(B.min,t))}function le(e,t=1){let n=Math.round(64/t),r=2*Math.ceil(48/t)+1,i=n*r,a=new Float32Array(i),o=new Float32Array(i),s=new Float32Array(i),c=(r-1)/2*t;for(let i=0;i<n;i++)for(let n=0;n<r;n++){let l=i*r+n;a[l]=-c+n*t+(e()*2-1)*V.x*t,o[l]=(e()*2-1)*V.z,s[l]=(e()<H.peakChance?se(e,H.peak):se(e,H.low))*t}let l=new Uint8Array(n*(r-1));for(let t=0;t<l.length;t++)l[t]=+(e()<.5);return{rows:n,cols:r,cell:t,x:a,dz:o,y:s,flip:l}}var ue=e=>(e-1)*6;function de(e){let{rows:t,cols:n}=e,r=new Float32Array((t*ue(n)+6)*6),i=0,a=(a,o,s,c)=>{let l=(a+o)%t*n+s;r[i++]=e.x[l],r[i++]=e.y[l],r[i++]=a,r[i++]=o,r[i++]=e.dz[l],r[i++]=c};for(let r=0;r<t;r++)for(let t=0;t<n-1;t++)e.flip[r*(n-1)+t]?(a(r,0,t,0),a(r,0,t+1,1),a(r,1,t,2),a(r,0,t+1,0),a(r,1,t+1,1),a(r,1,t,2)):(a(r,0,t,0),a(r,0,t+1,1),a(r,1,t+1,2),a(r,0,t,0),a(r,1,t+1,1),a(r,1,t,2));for(let[e,t]of[[-372,-1],[372,-1],[372,U.height],[-372,-1],[372,U.height],[-372,U.height]])r[i++]=e,r[i++]=t,r[i++]=-1,r[i++]=0,r[i++]=62,r[i++]=3;return r}function fe(e){let t=Number.parseInt(e.slice(1),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}function pe(e,t,n){return[e[0]+(t[0]-e[0])*n,e[1]+(t[1]-e[1])*n,e[2]+(t[2]-e[2])*n]}var me=[1,1,1];function he(e){let t=fe(e.bg),n=fe(e.accent),r=fe(e.cool);return{skyTop:pe(t,n,.09),skyLow:pe(t,n,.24),glow:n,core:pe(n,me,.85),line:pe(r,t,.3),face:pe(t,r,.05)}}var ge=`#version 300 es
// horizon full.vert: one triangle covering the whole target; the sky is
// worked out per pixel from gl_FragCoord (sky.frag).
// One set of shaders: cyberdeck_terminal src/wallpaper/horizon/shaders/*, and later fluid_motion's own copy, byte for byte.
void main() {
    vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
    gl_Position = vec4(p, 0.0, 1.0);
}
`,_e=`#version 300 es
// horizon land.frag: the land's triangles, drawn as their edges only: thin
// teal lines with a soft glow over dark faces. How far a pixel is from the
// nearest edge comes from its corner weights (vBary) and how fast they
// change across the screen (their gradient), so every line is the same few
// px wide whatever its distance and angle. The nearest are softer and wider (the reference's
// depth of field); the far land fades into the haze (the same as
// sky.frag's), worked out only where there is haze.
// One set of shaders: cyberdeck_terminal src/wallpaper/horizon/shaders/*, and later fluid_motion's own copy, byte for byte.
precision highp float;

uniform vec2 uTarget;
uniform float uDensity;   // px per CSS px (zoomed)
uniform vec2 uSun;
uniform float uGlowR;
uniform vec2 uDome;
uniform vec3 uSkyTop;
uniform vec3 uSkyLow;
uniform vec3 uGlow;
uniform vec3 uCore;       // the core's colour (its bloom is part of the haze)
uniform float uCoreR;     // the core's radius (px)
uniform vec3 uLine;
uniform vec3 uFace;
uniform float uLineW;     // an edge's width (CSS px)
uniform float uGlowW;     // its glow's width (CSS px)
uniform float uGlowA;     // its glow's strength
uniform float uSoftNear;  // within this distance (units) edges soften
uniform float uSoften;    // how much wider and softer the nearest are

in vec3 vBary;
in float vZ;
in float vFog;

out vec4 fragColor;

// The sky and its glow at p (px from the top), with the core's bloom and the darker corners: the same in both shaders, so the far land melts into the sky without a seam.
vec3 haze(vec2 p) {
    float t = clamp(p.y / uTarget.y, 0.0, 1.0);
    vec3 c = mix(uSkyTop, uSkyLow, t * t);
    vec2 d = (p - uSun) / uDome;
    vec2 g = (p - uSun) / uGlowR;
    c += uGlow * (0.42 * exp(-dot(d, d) * 2.2) + 0.85 * exp(-dot(g, g) * 2.4));
    c += uCore * 0.45 * exp(-length(p - uSun) / (uCoreR * 2.2));
    vec2 v = (p / uTarget - vec2(0.5, 0.6)) * vec2(1.0, 1.3);
    return c * (1.0 - 0.3 * smoothstep(0.35, 0.9, length(v)));
}

void main() {
    // Px to the nearest edge, straight across it: the weights' change along the steepest way (fwidth over-reads slanted
    // edges, drawing them thinner, in steps: jagged; 0.17.4, the user: smoother, glowing more).
    vec3 bx = dFdx(vBary);
    vec3 by = dFdy(vBary);
    vec3 a = vBary / max(sqrt(bx * bx + by * by), vec3(1e-5));
    float d = min(min(a.x, a.y), a.z);
    // Near the camera: wider and softer, and a little dimmer (out of focus).
    float soft = 1.0 + uSoften * clamp((uSoftNear - vZ) / uSoftNear, 0.0, 1.0);
    // A soft core (a bell across the edge, never a hard pixel step) and a smooth glow round it: a close bloom and a long tail.
    float core = (uLineW * uDensity + 0.45) * soft;
    float line = exp(-0.5 * d * d / (core * core)) * inversesqrt(soft);
    float halo = uGlowW * uDensity * soft;
    float glow = 0.75 * exp(-0.5 * d * d / (halo * halo)) + 0.25 * exp(-d / (halo * 2.5));
    vec3 c = uFace + uLine * (line + uGlowA * glow);
    // Into the haze with distance: the haze's colour only where there's haze to see.
    if (vFog > 0.004) c = mix(c, haze(vec2(gl_FragCoord.x, uTarget.y - gl_FragCoord.y)), vFog);
    fragColor = vec4(c, 1.0);
}
`,ve=`#version 300 es
// horizon land.vert: a point of the land seen by a pinhole camera gliding
// forward. Each strip of triangles is placed at its distance from the
// camera now: as the camera passes a strip it goes out of sight behind the
// near clip, then comes round again at the far end, deep in the haze, so
// the land never ends (land.ts). The far wall (strip −1) stands where it's
// put. How much haze covers a point is worked out here, once per corner,
// not per pixel.
// One set of shaders: cyberdeck_terminal src/wallpaper/horizon/shaders/*, and later fluid_motion's own copy, byte for byte.
precision highp float;

layout(location = 0) in vec2 aPoint;  // across, height (units)
layout(location = 1) in vec4 aStrip;  // strip (−1: the far wall), row in it (0/1), depth offset (rows; the wall's depth in units), corner (0, 1, 2; 3: no edges)

uniform vec2 uTarget;   // the target (px)
uniform float uFocal;   // focal length (px)
uniform float uHorizon; // the horizon (px from the top)
uniform float uCamH;    // the camera's height (units)
uniform float uCamZ;    // how far the camera has come (units, wrapped at uRows × uCell)
uniform float uRows;    // rows of land (it repeats after uRows × uCell units)
uniform float uCell;    // a row's depth (units)
uniform float uNear;    // the near clip (units)
uniform float uFar;     // the far clip (units)
uniform float uFogStart;
uniform float uFogEnd;

out vec3 vBary;
out float vZ;
out float vFog;

void main() {
    // A strip's distance in rows: from just behind the camera (−1, out of sight) to uRows − 1 away; in units, times the cell. The wall's: as given.
    float z = aStrip.x < 0.0 ? aStrip.z : (mod(aStrip.x - uCamZ / uCell + 1.0, uRows) - 1.0 + aStrip.y + aStrip.z) * uCell;
    // Pinhole: on screen at (W/2 + f·x/z, horizon + f·(camH − y)/z), written with w = z so the GPU divides (and clips at the near plane).
    gl_Position = vec4(
        2.0 * uFocal * aPoint.x / uTarget.x,
        (1.0 - 2.0 * uHorizon / uTarget.y) * z - 2.0 * uFocal * (uCamH - aPoint.y) / uTarget.y,
        (z * (uFar + uNear) - 2.0 * uFar * uNear) / (uFar - uNear),
        z);
    int corner = int(aStrip.w + 0.5);
    // Corner 3 (the wall): every weight 1, so no pixel is near an edge.
    vBary = corner == 3 ? vec3(1.0) : vec3(corner == 0 ? 1.0 : 0.0, corner == 1 ? 1.0 : 0.0, corner == 2 ? 1.0 : 0.0);
    vZ = z;
    vFog = sqrt(smoothstep(uFogStart, uFogEnd, z));
}
`,ye=`#version 300 es
// horizon sky.frag: everything above the land, per pixel: the dark plum
// sky, the glow on the horizon and its tall haze dome, the white-hot core,
// darker toward the top corners. Nothing in it moves, so it's drawn once
// (engine.ts): the land is drawn over the bottom half each frame, its far
// end fading into the very same haze (the function below is the same in
// land.frag).
// One set of shaders: cyberdeck_terminal src/wallpaper/horizon/shaders/*, and later fluid_motion's own copy, byte for byte.
precision highp float;

uniform vec2 uTarget;   // the target (px)
uniform vec2 uSun;      // the glow's centre (px, from the top)
uniform float uGlowR;   // the glow's radius (px)
uniform vec2 uDome;     // the haze dome's radii (px)
uniform float uCoreR;   // the core's radius (px)
uniform vec3 uSkyTop;
uniform vec3 uSkyLow;
uniform vec3 uGlow;
uniform vec3 uCore;

out vec4 fragColor;

// The sky and its glow at p (px from the top), with the core's bloom and the darker corners: the same in both shaders, so the far land melts into the sky without a seam.
vec3 haze(vec2 p) {
    float t = clamp(p.y / uTarget.y, 0.0, 1.0);
    vec3 c = mix(uSkyTop, uSkyLow, t * t);
    vec2 d = (p - uSun) / uDome;
    vec2 g = (p - uSun) / uGlowR;
    c += uGlow * (0.42 * exp(-dot(d, d) * 2.2) + 0.85 * exp(-dot(g, g) * 2.4));
    c += uCore * 0.45 * exp(-length(p - uSun) / (uCoreR * 2.2));
    vec2 v = (p / uTarget - vec2(0.5, 0.6)) * vec2(1.0, 1.3);
    return c * (1.0 - 0.3 * smoothstep(0.35, 0.9, length(v)));
}

void main() {
    vec2 p = vec2(gl_FragCoord.x, uTarget.y - gl_FragCoord.y);
    // The haze (with the core's bloom), then the white-hot core itself.
    vec3 c = haze(p) + uCore * (1.0 - smoothstep(uCoreR * 0.2, uCoreR * 1.3, length(p - uSun)));
    fragColor = vec4(c, 1.0);
}
`,be=67;function xe(e,t,n){let r=(t,n)=>{let r=e.createShader(t);return r?(e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(console.error(`horizon shader:`,e.getShaderInfoLog(r)),null)):null},i=r(e.VERTEX_SHADER,t),a=r(e.FRAGMENT_SHADER,n),o=e.createProgram();if(!i||!a||!o)return null;if(e.attachShader(o,i),e.attachShader(o,a),e.linkProgram(o),!e.getProgramParameter(o,e.LINK_STATUS))return console.error(`horizon program:`,e.getProgramInfoLog(o)),null;let s=new Map;return{program:o,u(t){return s.has(t)||s.set(t,e.getUniformLocation(o,t)),s.get(t)}}}function Se(e){let t=xe(e,ge,ye),n=xe(e,ve,_e);if(!t||!n)return null;let r=e.createBuffer(),i=e.createVertexArray();return e.bindVertexArray(i),e.bindBuffer(e.ARRAY_BUFFER,r),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,24,0),e.enableVertexAttribArray(1),e.vertexAttribPointer(1,4,e.FLOAT,!1,24,8),e.bindVertexArray(null),{sky:t,land:n,empty:e.createVertexArray(),mesh:{buffer:r,vao:i,count:0}}}function Ce(e,t,n,r,i){let a=e=>`rgb(${e.map(e=>Math.round(Math.min(1,e)*255)).join(`, `)})`;e.setTransform(r,0,0,r,0,0);let o=e.createLinearGradient(0,0,0,n);o.addColorStop(0,a(i.skyTop)),o.addColorStop(1,a(i.skyLow)),e.fillStyle=o,e.fillRect(0,0,t,n);let s=e.createRadialGradient(t*G.x,n*W.horizon,0,t*G.x,n*W.horizon,n*G.dome.ry);s.addColorStop(0,a(i.glow)),s.addColorStop(1,`rgba(0, 0, 0, 0)`),e.fillStyle=s,e.fillRect(0,0,t,n)}function we(e,n,r=Math.random){let i=e,a=i.getContext(`webgl2`,{alpha:!1,antialias:!1,depth:!0,preserveDrawingBuffer:!0,powerPreference:`low-power`}),o=a?Se(a):null,s=n.glow,c=he(n.palette),l=n.still,u=null,d=null,f=0,p=!0,m=!1,h=!1,g=!1,_=0,v=0,y=(e=!1)=>{if(!a||!o||!u)return;let t=ce(u.h);if(!e&&d&&d.cell===t)return;d=le(r,t);let n=de(d);a.bindBuffer(a.ARRAY_BUFFER,o.mesh.buffer),a.bufferData(a.ARRAY_BUFFER,n,a.STATIC_DRAW),o.mesh.count=n.length/6,f%=d.rows*d.cell,a.useProgram(o.land.program),a.uniform1f(o.land.u(`uRows`),d.rows),a.uniform1f(o.land.u(`uCell`),d.cell)},b=()=>{if(!a||!o||!u)return;let t=e.width,n=e.height,r=u.dpr,i=W.focal*n*u.zoom,l=[t*G.x,n*(W.horizon-G.lift)],d=ie[s];for(let e of[o.sky,o.land])a.useProgram(e.program),a.uniform2f(e.u(`uTarget`),t,n),a.uniform2f(e.u(`uSun`),...l),a.uniform1f(e.u(`uGlowR`),n*G.glow*d.sun),a.uniform2f(e.u(`uDome`),t*G.dome.rx,n*G.dome.ry),a.uniform3f(e.u(`uSkyTop`),...c.skyTop),a.uniform3f(e.u(`uSkyLow`),...c.skyLow),a.uniform3f(e.u(`uGlow`),...c.glow);for(let e of[o.sky,o.land])a.useProgram(e.program),a.uniform1f(e.u(`uCoreR`),n*G.core),a.uniform3f(e.u(`uCore`),...c.core);let f=o.land;a.useProgram(f.program),a.uniform1f(f.u(`uDensity`),r),a.uniform1f(f.u(`uFocal`),i),a.uniform1f(f.u(`uHorizon`),n*W.horizon),a.uniform1f(f.u(`uCamH`),U.height),a.uniform1f(f.u(`uNear`),U.near),a.uniform1f(f.u(`uFar`),be),a.uniform3f(f.u(`uLine`),...c.line),a.uniform3f(f.u(`uFace`),...c.face),a.uniform1f(f.u(`uLineW`),re.width),a.uniform1f(f.u(`uGlowW`),re.glowWidth),a.uniform1f(f.u(`uGlowA`),d.edge),a.uniform1f(f.u(`uSoftNear`),re.near),a.uniform1f(f.u(`uSoften`),re.soften),a.uniform1f(f.u(`uFogStart`),ne.start),a.uniform1f(f.u(`uFogEnd`),ne.end),p=!0},x=()=>{if(u){if(a&&o&&!h&&d){let t=e.width,n=e.height;a.viewport(0,0,t,n),a.disable(a.BLEND),a.bindVertexArray(o.empty),p&&(p=!1,a.disable(a.SCISSOR_TEST),a.disable(a.DEPTH_TEST),a.useProgram(o.sky.program),a.drawArrays(a.TRIANGLES,0,3)),a.enable(a.SCISSOR_TEST),a.scissor(0,0,t,Math.ceil(n*(1-W.horizon))+1),a.clear(a.DEPTH_BUFFER_BIT),a.enable(a.DEPTH_TEST),a.depthFunc(a.LESS),a.useProgram(o.land.program),a.uniform1f(o.land.u(`uCamZ`),f),a.bindVertexArray(o.mesh.vao);let{rows:r}=d,i=ue(d.cols),s=Math.max(0,Math.ceil(f/d.cell-1+1e-6)%r);a.drawArrays(a.TRIANGLES,s*i,(r-s)*i),s>0&&a.drawArrays(a.TRIANGLES,0,s*i),a.drawArrays(a.TRIANGLES,r*i,6),a.bindVertexArray(null),a.disable(a.DEPTH_TEST),a.disable(a.SCISSOR_TEST)}else if(!a){let e=i.getContext(`2d`);e&&Ce(e,u.w,u.h,u.dpr,c)}g||(g=!0,n.onReady?.())}},S=e=>{if(_=0,!m||l)return;if(v&&e-v<13.88888888888889){_=requestAnimationFrame(S);return}let t=v?Math.min((e-v)/1e3,ae):0;v=e,d&&(f=(f+t*te)%(d.rows*d.cell)),x(),_=requestAnimationFrame(S)},C={resize(n,r,i,a){let o=t(n,r,i,a,oe);e.width=Math.round(o.w*o.dpr),e.height=Math.round(o.h*o.dpr),u={...o,zoom:a>0&&Number.isFinite(a)?a:1},y(),b(),x()},start(){m=!0,l||_||!o||(v=0,_=requestAnimationFrame(S))},stop(){m=!1,cancelAnimationFrame(_),_=0},setStill(e){l=e,l?C.stop():m&&C.start(),x()},setGlow(e){s=e,b(),l&&x()},setPalette(e){c=he(e),b(),l&&x()},destroy(){C.stop(),u=null,d=null}};return i.addEventListener(`webglcontextlost`,e=>{e.preventDefault(),h=!0}),i.addEventListener(`webglcontextrestored`,()=>{h=!1,o=a?Se(a):null,y(!0),b(),x()}),C}var Te={id:`horizon`,create:(e,t)=>we(e,t)},Ee=.61,De={x:.5,y:.48,r:.17,glow:.05},Oe={from:-.32,period:.15,gap:[.1,.5]},ke={height:1,focal:1080},Ae={cell:1,line:1,glow:3},je={amount:.32,across:9,along:13},Me=.6,Ne=.05,Pe={cell:3,chance:.006},Fe={every:3,depth:.16},Ie=.1,Le=3,Re=`#version 300 es
// sunset full.vert: one triangle covering the whole target; the sky and the
// ground are worked out per pixel from gl_FragCoord (sky.frag, ground.frag).
void main() {
    vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
    gl_Position = vec4(p, 0.0, 1.0);
}
`,ze=`#version 300 es
// sunset ground.frag: everything below the horizon, per pixel, the only
// part redrawn each frame: the dark ground and its grid in perspective,
// gently waving, gliding toward you; pink and orange on the left, teal on
// the right; melting into the sky at the horizon; the scanlines. No
// geometry: each pixel finds its spot on the ground, then how far it is
// from the nearest grid line (in px, from the grid's gradient), so the
// lines are smooth at any size and angle.
precision highp float;

uniform vec2 uTarget;   // the target (px)
uniform float uUnit;    // px per CSS px of the reference layout
uniform float uHorizon; // the horizon (px from the top)
uniform float uFocal;   // focal length (px per unit at distance 1)
uniform float uCamH;    // the camera's height (units)
uniform float uTravel;  // how far the grid has come (units, wrapped)
uniform float uLine;    // a line's width (CSS px)
uniform float uGlowW;   // its glow's width (CSS px)
uniform vec3 uWave;     // how much the lines bend (cells), waves across and along (radians a unit)
uniform float uDrift;   // how the across-waves shift with distance (radians a unit: whole cycles per wrap, so it's seamless)
uniform float uMeltH;   // how far below the horizon the ground melts into the sky (px)
uniform vec3 uGround;
uniform vec3 uWarm;     // the lines on the left
uniform vec3 uCool;     // the lines on the right
// The sky just above the horizon, as sky.frag draws it there (its colours across, and the sun's glow).
uniform vec3 uSkyLeft;
uniform vec3 uSkyRight;
uniform vec3 uGlow;
uniform vec2 uSun;
uniform float uSunR;
uniform float uGlowR;
uniform float uScanEvery;
uniform float uScanDepth;

out vec4 fragColor;

void main() {
    vec2 p = vec2(gl_FragCoord.x, uTarget.y - gl_FragCoord.y);
    float dy = max(p.y - uHorizon, 0.5);
    // The spot on the ground this pixel sees: its distance, and how far across.
    float z = uFocal * uCamH / dy;
    float x = (p.x - uTarget.x * 0.5) * z / uFocal;
    float zt = z + uTravel;
    // Gently rolling ground: the rows rise and fall in slow waves across (the reference's hills); the long lines bend only a little.
    float u = x + 0.35 * uWave.x * sin(zt * uWave.z + x * 0.21);
    float w = zt + uWave.x * sin(x * uWave.y + zt * uDrift);
    // Px to the nearest line of each set, straight across it: grid units per px along the steepest way (fwidth over-reads
    // slanted lines, drawing them thinner, in steps: jagged; 0.17.3, the user: smooth glowing lines).
    vec2 g = vec2(u, w);
    vec2 f = abs(fract(g) - 0.5);
    vec2 gx = dFdx(g);
    vec2 gy = dFdy(g);
    vec2 fw = max(sqrt(gx * gx + gy * gy), vec2(1e-4));
    vec2 dpx = (0.5 - f) / fw;
    float d = min(dpx.x, dpx.y);
    // A soft core (a bell across the line, never a hard pixel edge) and a smooth glow round it.
    float lw = uLine * uUnit;
    float core = 0.65 * lw + 0.4;
    float line = exp(-0.5 * (d * d) / (core * core));
    float halo = uGlowW * uUnit;
    float glow = exp(-0.5 * (d * d) / (halo * halo)) * 0.28 + exp(-d / (halo * 2.0)) * 0.08;
    // Far off the lines crowd together (a square under a few px): there they fade into the dark ground, as into the night, instead of
    // shimmering or piling up into a bright band (0.17.2, the user: the horizon read as a thick line of thin ones). A little of their
    // average light is kept, so the grid thins out rather than stops.
    float crowd = 1.0 - smoothstep(0.3, 1.0, max(fw.x, fw.y));
    float average = min(0.14, lw * (fw.x + fw.y)) * (1.0 - smoothstep(1.0, 3.0, fw.y));
    vec3 lc = mix(uWarm, uCool, smoothstep(0.25, 0.85, p.x / uTarget.x));
    vec3 c = uGround + lc * mix(average, line + glow, crowd);
    // At the horizon the ground melts into the sky: there it's the sky's own colour (as sky.frag draws it just above, glow and
    // all), so there's no line between them (0.17.3, the user: get rid of that line completely).
    vec3 sky = mix(uSkyLeft, uSkyRight, smoothstep(0.1, 0.95, p.x / uTarget.x));
    sky += uGlow * exp(-max(length(vec2(p.x, uHorizon) - uSun) - uSunR, 0.0) / uGlowR) * 0.55;
    c = mix(sky, c, smoothstep(0.0, 1.0, (p.y - uHorizon) / uMeltH));
    // Scanlines.
    c *= 1.0 - uScanDepth * step(uScanEvery - 1.0, mod(p.y / uUnit, uScanEvery));
    fragColor = vec4(c, 1.0);
}
`,Be=`#version 300 es
// sunset sky.frag: everything above the horizon, per pixel, drawn once
// (it never changes: engine.ts): the night sky (purple left, blue right,
// darker up top), fine stars, the striped sun with its glow, and the
// scanlines over it all.
precision highp float;
// Integers at full width too: the stars' hash multiplies 32-bit numbers (a phone's fragment shaders default to medium precision ints).
precision highp int;

uniform vec2 uTarget;   // the target (px)
uniform float uUnit;    // px per CSS px of the reference layout
uniform float uHorizon; // the horizon (px from the top)
uniform vec2 uSun;      // the sun's centre (px from the top)
uniform float uSunR;    // its radius (px)
uniform float uGlowR;   // its glow's reach (px)
uniform vec3 uSkyLeft;
uniform vec3 uSkyRight;
uniform vec3 uSkyTop;
uniform vec3 uSunTop;
uniform vec3 uSunBase;
uniform vec3 uGlow;
uniform vec3 uStar;
uniform vec3 uStripe;   // from, period, the first gap's width (sun units)
uniform float uGapGrow; // how much wider the gaps get by the sun's base
uniform float uStarCell;   // a star cell (CSS px)
uniform float uStarChance; // the share of cells with a star
uniform float uScanEvery;  // a dark row every so many CSS px
uniform float uScanDepth;  // how dark it is

out vec4 fragColor;

// A hash of a cell: 0 ≤ n < 1 (integer mixing: no streaks, unlike a sine hash).
float hash(vec2 p) {
    uvec2 q = uvec2(ivec2(p) + 32768) * uvec2(1597334673u, 3812015801u);
    uint n = (q.x ^ q.y) * 1597334673u;
    n ^= n >> 16;
    return float(n) * (1.0 / 4294967296.0);
}

void main() {
    vec2 p = vec2(gl_FragCoord.x, uTarget.y - gl_FragCoord.y);
    vec2 s = p / uTarget;
    // The sky: purple to blue across, darker toward the top, a little lighter near the horizon.
    vec3 c = mix(uSkyLeft, uSkyRight, smoothstep(0.1, 0.95, s.x));
    c = mix(uSkyTop, c, smoothstep(0.0, uHorizon / uTarget.y, s.y) * 0.85 + 0.15);
    // Stars: a few cells lit, of varied brightness; a rare bright one.
    vec2 cell = floor(p / (uStarCell * uUnit));
    float h = hash(cell);
    if (h < uStarChance) {
        vec2 q = fract(p / (uStarCell * uUnit)) - 0.5;
        float b = 1.0 - smoothstep(0.1, 0.5, length(q));
        c += uStar * b * (0.35 + 0.65 * hash(cell + 7.0)) * (h < uStarChance * 0.08 ? 2.0 : 1.0);
    }
    // The sun's glow, all round it.
    float d = length(p - uSun);
    c += uGlow * exp(-max(d - uSunR, 0.0) / uGlowR) * 0.55;
    // The sun: golden to pink down its face, cut by gaps that widen toward its base.
    if (d < uSunR + 1.0) {
        float v = (p.y - uSun.y) / uSunR;
        vec3 sun = mix(uSunTop, uSunBase, smoothstep(-0.7, 0.9, v));
        float k = (v - uStripe.x) / uStripe.y;
        float gap = uStripe.z + uGapGrow * clamp((v - uStripe.x) / (1.0 - uStripe.x), 0.0, 1.0);
        // In a gap: below where they start, in the band's top \`gap\` share (its edges anti-aliased over a pixel).
        float pxPerBand = uStripe.y * uSunR;
        float edge = 1.0 / pxPerBand;
        float inGap = v > uStripe.x ? 1.0 - smoothstep(gap - edge, gap + edge, fract(k)) : 0.0;
        float inside = 1.0 - smoothstep(uSunR - 0.75, uSunR + 0.75, d);
        c = mix(c, sun, inside * (1.0 - inGap));
    }
    // Scanlines.
    c *= 1.0 - uScanDepth * step(uScanEvery - 1.0, mod(p.y / uUnit, uScanEvery));
    fragColor = vec4(c, 1.0);
}
`;function Ve(e){let t=Number.parseInt(e.slice(1),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}function K(e,t,n){return[e[0]+(t[0]-e[0])*n,e[1]+(t[1]-e[1])*n,e[2]+(t[2]-e[2])*n]}var He=[1,1,1];function Ue(e){let t=Ve(e.bg),n=Ve(e.accent),r=Ve(e.cool),i=Ve(e.bright);return{skyLeft:K(K(n,r,.45),t,.7),skyRight:K(r,t,.58),skyTop:K(t,r,.06),sunTop:i,sunBase:n,glow:n,star:K(i,He,.7),ground:K(t,K(n,r,.6),.1),warm:K(n,i,.3),cool:K(r,He,.25)}}function We(e,t,n){let r=(t,n)=>{let r=e.createShader(t);return r?(e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(console.error(`sunset shader:`,e.getShaderInfoLog(r)),null)):null},i=r(e.VERTEX_SHADER,t),a=r(e.FRAGMENT_SHADER,n),o=e.createProgram();if(!i||!a||!o)return null;if(e.attachShader(o,i),e.attachShader(o,a),e.linkProgram(o),!e.getProgramParameter(o,e.LINK_STATUS))return console.error(`sunset program:`,e.getProgramInfoLog(o)),null;let s=new Map;return{program:o,u(t){return s.has(t)||s.set(t,e.getUniformLocation(o,t)),s.get(t)}}}function Ge(e){let t=We(e,Re,Be),n=We(e,Re,ze);return!t||!n?null:{sky:t,ground:n,empty:e.createVertexArray()}}function Ke(e,t,n,r,i){let a=e=>`rgb(${e.map(e=>Math.round(Math.min(1,e)*255)).join(`, `)})`;e.setTransform(r,0,0,r,0,0);let o=e.createLinearGradient(0,0,t,0);o.addColorStop(0,a(i.skyLeft)),o.addColorStop(1,a(i.skyRight)),e.fillStyle=o,e.fillRect(0,0,t,n);let s=e.createLinearGradient(0,n*(De.y-.2),0,n*Ee);s.addColorStop(0,a(i.sunTop)),s.addColorStop(1,a(i.sunBase)),e.fillStyle=s,e.beginPath(),e.arc(t*De.x,n*De.y,n*De.r,0,Math.PI*2),e.fill(),e.fillStyle=a(i.ground),e.fillRect(0,n*Ee,t,n*(1-Ee))}function qe(e,n){let r=e,i=r.getContext(`webgl2`,{alpha:!1,antialias:!1,depth:!1,preserveDrawingBuffer:!0,powerPreference:`low-power`}),a=i?Ge(i):null,o=Ue(n.palette),s=n.still,c=null,l=0,u=!0,d=!1,f=!1,p=!1,m=0,h=0,g=()=>{if(!i||!a||!c)return;let t=e.width,n=e.height,r=c.dpr,s=n*c.zoom,l=n*Ee,d=[t*De.x,n*De.y];for(let e of[a.sky,a.ground])i.useProgram(e.program),i.uniform2f(e.u(`uTarget`),t,n),i.uniform1f(e.u(`uUnit`),r),i.uniform1f(e.u(`uHorizon`),l),i.uniform1f(e.u(`uScanEvery`),Fe.every),i.uniform1f(e.u(`uScanDepth`),Fe.depth);for(let e of[a.sky,a.ground])i.useProgram(e.program),i.uniform2f(e.u(`uSun`),...d),i.uniform1f(e.u(`uSunR`),De.r*s),i.uniform1f(e.u(`uGlowR`),De.glow*s),i.uniform3f(e.u(`uSkyLeft`),...o.skyLeft),i.uniform3f(e.u(`uSkyRight`),...o.skyRight),i.uniform3f(e.u(`uGlow`),...o.glow);let f=a.sky;i.useProgram(f.program),i.uniform3f(f.u(`uSkyTop`),...o.skyTop),i.uniform3f(f.u(`uSunTop`),...o.sunTop),i.uniform3f(f.u(`uSunBase`),...o.sunBase),i.uniform3f(f.u(`uStar`),...o.star),i.uniform3f(f.u(`uStripe`),Oe.from,Oe.period,Oe.gap[0]),i.uniform1f(f.u(`uGapGrow`),Oe.gap[1]-Oe.gap[0]),i.uniform1f(f.u(`uStarCell`),Pe.cell),i.uniform1f(f.u(`uStarChance`),Pe.chance);let p=a.ground;i.useProgram(p.program),i.uniform1f(p.u(`uFocal`),ke.focal*r),i.uniform1f(p.u(`uCamH`),ke.height),i.uniform1f(p.u(`uLine`),Ae.line),i.uniform1f(p.u(`uGlowW`),Ae.glow);let m=Math.PI*2/240;i.uniform3f(p.u(`uWave`),je.amount,m*je.across,m*je.along),i.uniform1f(p.u(`uDrift`),m*5),i.uniform1f(p.u(`uMeltH`),Ne*s),i.uniform3f(p.u(`uGround`),...o.ground),i.uniform3f(p.u(`uWarm`),...o.warm),i.uniform3f(p.u(`uCool`),...o.cool),u=!0},_=()=>{if(c){if(i&&a&&!f){let t=e.width,n=e.height;i.viewport(0,0,t,n),i.bindVertexArray(a.empty),u&&(u=!1,i.disable(i.SCISSOR_TEST),i.useProgram(a.sky.program),i.drawArrays(i.TRIANGLES,0,3)),i.enable(i.SCISSOR_TEST),i.scissor(0,0,t,Math.ceil(n*(1-Ee))),i.useProgram(a.ground.program),i.uniform1f(a.ground.u(`uTravel`),l),i.drawArrays(i.TRIANGLES,0,3),i.disable(i.SCISSOR_TEST),i.bindVertexArray(null)}else if(!i){let e=r.getContext(`2d`);e&&Ke(e,c.w,c.h,c.dpr,o)}p||(p=!0,n.onReady?.())}},v=e=>{if(m=0,!d||s)return;if(h&&e-h<13.88888888888889){m=requestAnimationFrame(v);return}let t=h?Math.min((e-h)/1e3,Ie):0;h=e,l=(l+t*Me)%240,_(),m=requestAnimationFrame(v)},y={resize(n,r,i,a){let o=t(n,r,i,a,Le);e.width=Math.round(o.w*o.dpr),e.height=Math.round(o.h*o.dpr),c={...o,zoom:a>0&&Number.isFinite(a)?a:1},g(),_()},start(){d=!0,s||m||!a||(h=0,m=requestAnimationFrame(v))},stop(){d=!1,cancelAnimationFrame(m),m=0},setStill(e){s=e,s?y.stop():d&&y.start(),_()},setGlow(){},setPalette(e){o=Ue(e),g(),s&&_()},destroy(){y.stop(),c=null}};return r.addEventListener(`webglcontextlost`,e=>{e.preventDefault(),f=!0}),r.addEventListener(`webglcontextrestored`,()=>{f=!1,a=i?Ge(i):null,g(),_()}),y}var Je={id:`sunset`,create:(e,t)=>qe(e,t)},Ye=[{font:8,colW:7,rowH:8,speed:[8,14],occupancy:.95,alpha:[.45,.8],headChance:.15},{font:10,colW:10,rowH:10,speed:[10,18],occupancy:.6,alpha:[.6,.95],headChance:.35},{font:13,colW:14,rowH:13,speed:[12,22],occupancy:.2,alpha:[.8,1],headChance:.6}],Xe=.2,Ze={low:{alpha:.4,head:5,headLayers:1,body:2},medium:{alpha:.65,head:7,headLayers:2,body:3},high:{alpha:.8,head:9,headLayers:2,body:5},max:{alpha:.9,head:12,headLayers:3,body:6.5}},Qe=.9,$e=.5,et=[.2,4],tt=.25,nt=1/20,rt=.15,it=.1,at=3,q={head:0,body:1,dim:2,erase:3,halo:4},ot=.5,st=`0123456789ZTHEMXAKR:.=*+-<>¦|"`,ct=`ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ`,lt=`"JetBrains Mono", "MS Gothic", "Yu Gothic", "Hiragino Sans", "Noto Sans CJK JP", monospace`;function ut(e,t){let n=parseInt(e.replace(`#`,``),16);return`rgba(${n>>16&255}, ${n>>8&255}, ${n&255}, ${t})`}function dt(e,t){let n=parseInt(e.replace(`#`,``),16),[r,i,a]=[n>>16&255,n>>8&255,n&255],o=.299*r+.587*i+.114*a,s=e=>Math.round(e+(o-e)*t);return`rgb(${s(r)}, ${s(i)}, ${s(a)})`}function ft(e){let t=[...st].map(e=>({char:e,mirrored:!1}));if(!e)return t;let n=[...ct].map(e=>({char:e,mirrored:!0}));return[...n,...n,...t]}function pt(e){let t=new OffscreenCanvas(24,24).getContext(`2d`,{willReadFrequently:!0});if(!t)return!1;let n=e=>(t.clearRect(0,0,24,24),t.font=`16px ${lt}`,t.textBaseline=`middle`,t.textAlign=`center`,t.fillStyle=`#fff`,t.fillText(e,12,12),t.getImageData(0,0,24,24).data),r=n(e),i=n(`͸`),a=!0,o=!0;for(let e=3;e<r.length;e+=4)r[e]&&(a=!1),r[e]!==i[e]&&(o=!1);return!a&&!o}function mt(e,t,n,r,i){let a=[i.head,i.body,i.body,0,i.head],o=0,s=a.map(t=>{let r=Math.ceil((t*Qe+1)*n),i={y:o,w:Math.ceil(e.colW*n)+r*2,h:Math.ceil(e.rowH*n)+r*2,pad:r};return o+=i.h,i}),c=new OffscreenCanvas(Math.max(...s.map(e=>e.w))*r.length,o),l=c.getContext(`2d`);if(!l)return{canvas:c,glyphs:r.length,rows:s,finish:null};let u=(e,t,n,i)=>{let a=s[t];r.forEach((t,r)=>{let o=r*a.w+a.w/2,s=n+a.h/2;e.save(),t.mirrored&&(e.translate(o,s),e.scale(-1,1),e.translate(-o,-s)),i(t.char,o,s),e.restore()})},d=r=>{r.font=`${Math.round(e.font*n)}px ${lt}`,r.textAlign=`center`,r.textBaseline=`middle`,r.shadowColor=ut(t.accent,i.alpha),r.lineWidth=ot*n},f=(e,t,n)=>{e.shadowBlur=0,e.fillStyle=e.strokeStyle=`#fff`,u(e,t,n,(t,n,r)=>{e.fillText(t,n,r),e.strokeText(t,n,r)})};d(l);let p=s[q.head],m=new OffscreenCanvas(p.w*r.length,p.h),h=m.getContext(`2d`);h&&(d(h),h.fillStyle=t.bright,h.shadowBlur=a[q.head]*n,u(h,q.head,0,(e,t,n)=>{for(let r=0;r<i.headLayers;r++)h.fillText(e,t,n)}),l.drawImage(m,0,p.y));for(let[e,r]of[[q.body,dt(t.text,$e)],[q.dim,dt(t.dim,$e)]])l.fillStyle=r,l.shadowBlur=a[e]*n,u(l,e,s[e].y,(e,t,n)=>l.fillText(e,t,n));let g={canvas:c,glyphs:r.length,rows:s,finish:null};return g.finish=()=>{g.finish=null,f(l,q.erase,s[q.erase].y),l.drawImage(m,0,s[q.halo].y),l.globalCompositeOperation=`destination-out`,f(l,q.halo,s[q.halo].y),l.globalCompositeOperation=`source-over`},g}var ht=(e,[t,n])=>t+(n-t)*e();function gt(e,t,n,r,i=!1){let a=ht(r,e.speed),o=Math.max(4,Math.round(t*(1-r()**5)*1.08)),s=o/a,c=i?0:Math.max(ht(r,et),s*((1-e.occupancy)/e.occupancy)*(.5+r())),l=i?r()*o:0;return{y:l,drawn:Math.floor(l)-1,end:o,speed:a,alpha:ht(r,e.alpha),style:r()<.55?q.dim:q.body,lit:r()<e.headChance,glyph:Math.floor(r()*n),wait:c}}var _t=1-.02**(Xe/12);function vt(e,t){return e*(1-_t)**Math.floor(t/Xe)}var yt=Array.from({length:12},(e,t)=>t*7%12),bt=`rgba(0, 0, 0, ${_t})`,xt=65535;function St(e,t,n,r,i){if(e&&t===r&&n===i)return e;let a=new Uint16Array(r*i).fill(xt);if(!e)return a;let o=Math.min(r,t);for(let s=0;s<Math.min(i,n);s++)a.set(e.subarray(s*t,s*t+o),s*r);return a}function Ct(e,t){let n=e*t,r=()=>new Float32Array(n).fill(-1/0);return{cols:e,rows:t,time:r(),glyph:new Uint16Array(n),style:new Uint8Array(n),alpha:new Float32Array(n),halo:r()}}function wt(e,t){for(let n=0;n<e.glyph.length;n++){let r=t-e.time[n];(!(r<12)||vt(e.alpha[n],r)<.05)&&(e.glyph[n]=xt)}return e.glyph}function Tt(){return typeof document>`u`?self.fonts:document.fonts}function Et(e,n,r=Math.random){let i=e.getContext(`2d`),a=typeof document>`u`,o=a?250:16,s=a?250:6,c=n.palette,l=n.still,u=n.glow,d=[],f=0,p=!1,m=!1,h=!1,g=0,_=0,v=0,y=0,b=null,x=0,S=null,C=0,w=0,T=0,E=0,D=0,O=!1,k=null,A=0,j=ft(!1),M=t=>{if(!i)return;i.globalCompositeOperation=`destination-out`,i.fillStyle=bt;let n=e.width;for(let r=t*2;r<e.height;r+=24)i.fillRect(0,r,n,2);i.globalCompositeOperation=`source-over`},N=(e,t,n,r,i,a)=>{if(b){let o=b[e.index];if(!o||n<0||n>=o.rows||t>=o.cols)return;let s=n*o.cols+t;o.time[s]=x,o.glyph[s]=r,o.style[s]=i,o.alpha[s]=a}else P(e,t,n,r,i,a),n>=0&&n<e.rows&&(e.glyphAt[n*e.drops.length+t]=r)},P=(e,t,n,r,a,o)=>{if(!i)return;let s=e.atlas.rows[a];i.globalAlpha=o,i.drawImage(e.atlas.canvas,r*s.w,s.y,s.w,s.h,Math.round(t*e.colW)-s.pad,Math.round(n*e.rowH)-s.pad,s.w,s.h),i.globalAlpha=1},F=(e,t,n)=>{if(!i||n<0||n>=e.rows)return;let r=n*e.drops.length+t,a=e.glyphAt[r];a!==xt&&(e.glyphAt[r]=xt,i.globalCompositeOperation=`destination-out`,P(e,t,n,a,q.erase,1),i.globalCompositeOperation=`source-over`)},ee=(e,t,n,r)=>{let i=b?.[e.index];i?n>=0&&n<i.rows&&t<i.cols&&(i.halo[n*i.cols+t]=x):F(e,t,n),N(e,t,n,r.glyph,r.style,r.alpha)},I=e=>{if(b)x+=e;else for(v+=e/Xe*12;v>=1;)--v,M(yt[y]),y=(y+1)%12;for(let t of d)for(let n=0;n<t.drops.length;n++){let i=t.drops[n];if(i.wait>0){i.wait-=e;continue}for(i.y+=i.speed*e;i.drawn<Math.floor(i.y)&&i.drawn<i.end;)i.lit&&i.drawn>=0&&ee(t,n,i.drawn,i),i.drawn++,i.glyph=Math.floor(r()*f),i.lit?N(t,n,i.drawn,i.glyph,q.head,1):N(t,n,i.drawn,i.glyph,i.style,i.alpha);let a=Math.min(i.drawn,Math.round(i.speed*12));if(!b&&a>1&&r()<1.2*e*(a/12)){let e=1+Math.floor(r()*(a-1)),o=i.drawn-e;F(t,n,o),N(t,n,o,Math.floor(r()*f),i.style,vt(i.alpha,e/i.speed))}i.drawn>=i.end&&(i.lit&&ee(t,n,i.drawn,i),t.drops[n]=gt(t.p,t.rows,f,r))}},L=()=>{O||(O=!0,n.onReady?.())},R=e=>{if(!b)return!0;for(;C<2;C++,w=0,T=0){for(;w<d.length;w++,T=0){let t=d[w],n=b[w];if(!n)continue;let r=n.cols*n.rows;for(;T<r;T++){if(!(T&255)&&performance.now()>e)return!1;let r=x-n.time[T];if(!(r<12))continue;let i=vt(n.alpha[T],r),a=i>=tt;if(C===0){a&&P(t,T%n.cols,Math.floor(T/n.cols),n.glyph[T],n.style[T],i);continue}let o=x-n.halo[T],s=o<12?vt(1,o):0,c=!a&&i>=.05,l=s>=rt;if(!l&&!c)continue;let u=T%n.cols,d=Math.floor(T/n.cols),f=n.glyph[T];l&&P(t,u,d,f,q.halo,s),c&&P(t,u,d,f,n.style[T],i)}}if(C===0){L();for(let e of d)e.atlas.finish?.();return C=1,w=0,T=0,!1}}return!0},z=()=>{if(D=0,S===null||m)return;let e=performance.now()+(O?s:o);for(;S>0&&performance.now()<e;)I(nt),S-=nt;S>0||!R(e)?D=requestAnimationFrame(z):(d.forEach((e,t)=>{let n=b[t];n&&(e.glyphAt=St(wt(n,x),n.cols,n.rows,e.drops.length,e.rows))}),b=null,S=null,performance.measure(`rain-prewarm`,{start:E}),L(),h&&!l&&!g&&(_=0,g=requestAnimationFrame(W)))},B=e=>{S=e,E=performance.now(),x=0,C=0,w=0,T=0,b=d.map(e=>Ct(e.drops.length,e.rows)),D||z()},V=(e,t)=>{let n=performance.now(),r=mt(e,c,t,j,Ze[u]);return performance.measure(`rain-atlas`,{start:n}),r},H=(e,t,n)=>{let i=n!==A;return d=Ye.map((a,o)=>{let s=i?void 0:d[o],c=a.colW*n,l=a.rowH*n,u=Math.ceil(e/a.colW),p=Math.ceil(t/a.rowH),m=(s?.drops??[]).slice(0,u);for(;m.length<u;)m.push(gt(a,p,f,r,r()<a.occupancy));let h=St(s?.glyphAt??null,s?.drops.length??0,s?.rows??0,u,p);return{index:o,p:a,atlas:s?.atlas??V(a,n),colW:c,rowH:l,rows:p,drops:m,glyphAt:h}}),A=n,i},U=()=>{if(!p||!k||!i)return;let{w:t,h:n,dpr:r}=k,a=Math.round(t*r),o=Math.round(n*r),s=d.length===0;if(e.width!==a||e.height!==o){let t=!s&&r===A&&e.width>0&&e.height>0?new OffscreenCanvas(e.width,e.height):null;t?.getContext(`2d`)?.drawImage(e,0,0),e.width=a,e.height=o,i.imageSmoothingEnabled=!1,t&&i.drawImage(t,0,0)}let c=H(t,n,r);(s||c)&&(i.clearRect(0,0,e.width,e.height),B(18))},W=e=>{if(g=0,!h||S!==null)return;if(_&&e-_<13.88888888888889){g=requestAnimationFrame(W);return}let t=_?Math.min((e-_)/1e3,it):0;_=e,I(t),g=requestAnimationFrame(W)},te={resize(e,n,r,i){k=t(e,n,r,i,at),U()},start(){h=!0,!p||l||g||S!==null||(_=0,g=requestAnimationFrame(W))},stop(){h=!1,cancelAnimationFrame(g),g=0},setPalette(e){c=e;for(let e of d)e.atlas=V(e.p,A),e.atlas.finish?.()},setGlow(e){if(e!==u){u=e;for(let e of d)e.atlas=V(e.p,A),e.atlas.finish?.()}},setStill(e){l=e,l?(cancelAnimationFrame(g),g=0):h&&te.start()},destroy(){m=!0,te.stop(),cancelAnimationFrame(D),d=[]}};return(async()=>{try{await Promise.all(Ye.map(e=>Tt().load(`${e.font}px ${lt}`,ct)))}catch{}m||(j=ft(pt(ct[0])),f=j.length,p=!0,U(),h&&(h=!1,te.start()))})(),te}var Dt={id:`matrix-rain`,create:(e,t)=>Et(e,t)},Ot=[{width:[14,38],gap:[0,3],skip:0,top:[-.35,.3],cell:[3,4],fog:.74},{width:[18,50],gap:[0,8],skip:.1,top:[-.3,.4],cell:[3,5],fog:.62},{width:[22,62],gap:[0,14],skip:.18,top:[-.25,.5],cell:[4,5],fog:.52},{width:[28,78],gap:[6,34],skip:.3,top:[-.2,.62],cell:[4,6],fog:.42},{width:[40,110],gap:[24,120],skip:.45,top:[-.2,.8],cell:[5,7],fog:.28}],kt={chance:.3,width:[.4,.75],rise:[.04,.18]},At={chance:.18,rise:[.03,.1]},jt={perMpx:10,vertical:.6,tall:{w:[12,20],h:[40,110]},wide:{w:[44,96],h:[14,24]},cool:.3},Mt={perMpx:3,w:[30,70],h:[8,14]},Nt={chance:.25,period:[1.6,2.6],on:.22},Pt={per:220,min:3,max:10,speed:[14,46],y:[.1,.72],tail:[8,26],size:[1.1,2]},J={count:3,rx:[.3,.55],ry:[.05,.1],y:[.2,.8],speed:[3,8],alpha:[.04,.07]},Ft={every:[6,25],length:[.3,.8],rate:14},It=64e3,Lt={tall:{top:.855,right:[.43,.072],rail:.066},wide:{top:.875,right:[.3,.0624],rail:.0572}},Rt={low:{window:0,sign:6,light:4},medium:{window:.35,sign:9,light:6},high:{window:.6,sign:12,light:8},max:{window:1,sign:16,light:11}},zt=.1,Bt=3,Vt=2048,Ht=(e,[t,n])=>t+(n-t)*e(),Ut=(e,[t,n])=>Math.floor(Ht(e,[t,n+1])),Wt=1e6;function Gt(e,t,n,r){let i=Ot[e],a=[],o=-Ut(r,[0,20]);for(;o<t;){let e=Ut(r,i.width),t=Ut(r,i.gap);if(r()>=i.skip){let t=Math.round(Ht(r,i.top)*n),s=1+Math.floor(r()*8388607),c=null;if(r()<kt.chance&&e>=12){let i=Math.max(4,Math.round(e*Ht(r,kt.width)));c={x:o+Math.floor(r()*(e-i+1)),w:i,top:Math.round(t-Ht(r,kt.rise)*n)}}let l=null,u=c??{x:o,w:e,top:t};u.top>0&&r()<At.chance&&(l={x:u.x+Math.floor(r()*u.w),top:Math.round(u.top-Ht(r,At.rise)*n)}),a.push({x:o,w:e,top:t,upper:c,spire:l,seed:s})}o+=e+t}return a}function Kt(e,t){let n=new Float32Array(t).fill(Wt),r=(e,r,i)=>{for(let a=Math.max(0,e);a<Math.min(t,e+r);a++)n[a]=Math.min(n[a],i)};for(let t of e)r(t.x,t.w,t.top),t.upper&&r(t.upper.x,t.upper.w,t.upper.top),t.spire&&r(t.spire.x,1,t.spire.top);return n}function qt(e,t,n,r,i){for(let a=t+1;a<e.tops.length;a++){let t=e.tops[a];for(let a=Math.max(0,Math.floor(n));a<=Math.min(e.cols-1,Math.floor(r));a++)if(t[a]<=i)return!1}return!0}function Jt(e,t){let n=[],r=e.w*e.h/1e6,i=[{n:Math.round(jt.perMpx*r),billboard:!1},{n:Math.round(Mt.perMpx*r),billboard:!0}];for(let{n:r,billboard:a}of i){let i=0;for(let o=0;i<r&&o<r*40;o++){let r=a?1:2+Math.floor(t()*2),o=!a&&t()<jt.vertical,s=a?Mt:o?jt.tall:jt.wide,c=Ut(t,s.w),l=Ut(t,s.h),u=e.layers[r],d=u[Math.floor(t()*u.length)];if(!d||d.w<c+4)continue;let f=d.x+2+Math.floor(t()*(d.w-c-3)),p=Math.max(d.top,0)+6,m=Math.round(Ht(t,[p,e.h*.8]));f<0||f+c>e.w||m+l>e.h*.85||!qt(e,r,f-1,f+c+1,m+l+1)||n.some(e=>f<e.x+e.w+3&&e.x<f+c+3&&m<e.y+e.h+3&&e.y<m+l+3)||(n.push({x:f,y:m,w:c,h:l,layer:r,cool:a||t()<jt.cool,vertical:o,seed:1+Math.floor(t()*8388607),phase:t()*Math.PI*2}),i++)}}return n}function Yt(e,t){let n=[];return e.layers.forEach((r,i)=>{if(!(i<2))for(let a of r){let r=a.spire?{x:a.spire.x+.5,y:a.spire.top}:{x:a.x+a.w/2,y:(a.upper??a).top};r.y<=2||r.y>e.h*.7||!a.spire&&t()>=Nt.chance||qt(e,i,r.x-2,r.x+2,r.y-2)&&n.push({x:r.x,y:r.y-1,layer:i,period:Ht(t,Nt.period),phase:t()})}}),n}function Xt(e,t){let n=e<t?Lt.tall:Lt.wide,r=n.top*t;return{top:r,right:n.right[0]*e+n.right[1]*t,railTop:r-n.rail*t}}function Zt(e,t,n){let r=Math.ceil(e)+1,i=Ot.map((r,i)=>Gt(i,e,t,n)),a={w:e,h:t,cols:r,layers:i,tops:i.map(e=>Kt(e,r)),signs:[],beacons:[],ledge:Xt(e,t)};return a.signs=Jt(a,n),a.beacons=Yt(a,n),a}function Qt(e){return Math.ceil(e.cols/Vt)}function $t(e){let t=Qt(e),n=new Float32Array(Vt*t*e.layers.length*4),r=(e,n)=>((e*t+Math.floor(n/Vt))*Vt+n%Vt)*4;for(let t=0;t<e.layers.length;t++){for(let i=0;i<e.cols;i++)n[r(t,i)]=Wt;for(let i of e.layers[t]){let a=(a,o,s,c)=>{for(let l=Math.max(0,a);l<Math.min(e.cols,a+o);l++){let e=r(t,l);s>n[e]||(n[e]=s,n[e+1]=i.x,n[e+2]=i.w,n[e+3]=c)}};a(i.x,i.w,i.top,i.seed),i.upper&&a(i.upper.x,i.upper.w,i.upper.top,i.seed),i.spire&&a(i.spire.x,1,i.spire.top,-i.seed)}}return n}function en(e){let t=parseInt(e.replace(`#`,``),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}function Y(e,t,n){return[e[0]+(t[0]-e[0])*n,e[1]+(t[1]-e[1])*n,e[2]+(t[2]-e[2])*n]}var X=[1,1,1];function tn(e){let t=en(e.bg),n=en(e.cool),r=en(e.accent),i=en(e.bright);return{skyTop:n,skyMid:Y(Y(n,r,.18),t,.08),skyLow:Y(n,r,.55),lowGlow:Y(t,r,.24),faceFar:Y(n,t,.2),faceNear:Y(n,t,.6),edge:Y(n,X,.55),winPale:Y(n,X,.55),winViolet:Y(Y(n,r,.5),X,.3),winPink:Y(r,X,.3),winWhite:Y(n,X,.82),signWarm:r,signCool:Y(n,X,.45),beacon:r,droneWhite:Y(i,X,.5),droneCool:Y(n,X,.5),seam:Y(t,n,.16),ledge:Y(t,n,.16),ledgeTop:Y(Y(n,X,.15),t,.3),rail:Y(t,n,.3),glass:Y(t,n,.45)}}function nn(e,t,n){let r=Math.min(1,Math.max(0,t/n)),i=r<.5?Y(e.skyTop,e.skyMid,r*2):Y(e.skyMid,e.skyLow,r*2-1),a=Math.min(1,Math.max(0,(r-.4)/.6)),o=a*a*(3-2*a);return[i[0]+e.lowGlow[0]*o,i[1]+e.lowGlow[1]*o,i[2]+e.lowGlow[2]*o]}function rn(e,t){let n=[],r=(e,t,r,i)=>n.push(e,t,r[0]*i,r[1]*i,r[2]*i,i),i=(e,t,n,i,a,o)=>{r(e,t,a,o),r(n,t,a,o),r(e,i,a,o),r(n,t,a,o),r(n,i,a,o),r(e,i,a,o)},a=e.ledge,{w:o,h:s}=e,c=a.right-3;i(-2,a.railTop,c,a.top,t.glass,.3),i(-2,a.railTop,c,a.railTop+2.2,t.rail,1);for(let e of[o*.02,(o*.02+c)/2,c-3])i(e,a.railTop,e+3,a.top,t.rail,1);i(-2,a.top,a.right,s+2,t.ledge,1),i(-2,a.top,a.right,a.top+1.6,t.ledgeTop,.85),i(-2,a.top+s*.03,a.right,a.top+s*.042,t.seam,.6);for(let e of[.22,.51,.8])i(a.right*e,a.top+s*.042,a.right*e+1,s+2,t.seam,.5);return new Float32Array(n)}var an=`#version 300 es
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
`,on=`#version 300 es
// megacity full.vert: one triangle covering the whole target; the city is
// worked out per pixel from gl_FragCoord (city.frag).
// One set of shaders, byte for byte: cyberdeck_terminal src/wallpaper/megacity/shaders/full.vert, fluid_motion assets/shaders/mc_full.vert.
void main() {
    vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
    gl_Position = vec4(p, 0.0, 1.0);
}
`,sn=`#version 300 es
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
`,cn=`#version 300 es
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
`,ln=`#version 300 es
// megacity shape.frag: a foreground triangle's colour (premultiplied: its
// fading edge blends smoothly).
// One set of shaders, byte for byte: cyberdeck_terminal src/wallpaper/megacity/shaders/shape.frag, fluid_motion assets/shaders/mc_shape.frag.
precision mediump float;

in vec4 vColor;
out vec4 fragColor;

void main() {
    fragColor = vColor;
}
`,un=`#version 300 es
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
`,dn=`#version 300 es
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
`,fn=`#version 300 es
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
`,Z=(e,[t,n])=>t+(n-t)*e(),pn=Pt.max,mn=class{city;rng;time=0;signBright;flickerIn;flickerLeft;dx=new Float32Array(pn);dy=new Float32Array(pn);dv=new Float32Array(pn);dTail=new Float32Array(pn);dSize=new Float32Array(pn);dKind=new Uint8Array(pn);drones=0;hx=new Float32Array(J.count);hy=new Float32Array(J.count);hrx=new Float32Array(J.count);hry=new Float32Array(J.count);hv=new Float32Array(J.count);ha=new Float32Array(J.count);droneTarget;constructor(e,t){this.city=e,this.rng=t;let n=e.signs.length;this.signBright=new Float32Array(n).fill(1),this.flickerIn=new Float32Array(n).map(()=>Z(t,Ft.every)),this.flickerLeft=new Float32Array(n),this.droneTarget=Math.min(Pt.max,Math.max(Pt.min,Math.round(e.w/Pt.per)));for(let n=0;n<J.count;n++)this.hrx[n]=Z(t,J.rx)*e.w,this.hry[n]=Z(t,J.ry)*e.h,this.hx[n]=t()*e.w,this.hy[n]=Z(t,J.y)*e.h,this.hv[n]=Z(t,J.speed)*(t()<.5?-1:1),this.ha[n]=Z(t,J.alpha);for(;this.drones<this.droneTarget;)this.launch(!0)}launch(e){let t=this.rng,n=this.drones++,r=t()<.5;this.dv[n]=Z(t,Pt.speed)*(r?1:-1),this.dTail[n]=Z(t,Pt.tail),this.dSize[n]=Z(t,Pt.size),this.dx[n]=e?t()*this.city.w:r?-this.dTail[n]:this.city.w+this.dTail[n],this.dy[n]=Z(t,Pt.y)*this.city.h,this.dKind[n]=t()<.6?0:t()<.6?1:2}advance(e){let{city:t,rng:n}=this;this.time=(this.time+e)%It;for(let r=0;r<t.signs.length;r++)if(this.flickerLeft[r]>0){this.flickerLeft[r]=this.flickerLeft[r]-e;let t=Math.floor(this.time*Ft.rate+r*7.3)%3!=0;this.signBright[r]=t?.95:.12}else this.flickerIn[r]=this.flickerIn[r]-e,this.flickerIn[r]<=0&&(this.flickerIn[r]=Z(n,Ft.every),this.flickerLeft[r]=Z(n,Ft.length)),this.signBright[r]=.88+.12*Math.sin(this.time*.6+t.signs[r].phase);let r=0;for(;r<this.drones;)this.dx[r]=this.dx[r]+this.dv[r]*e,(this.dv[r]>0?this.dx[r]-this.dTail[r]>t.w:this.dx[r]+this.dTail[r]<0)?(this.drones--,this.dx[r]=this.dx[this.drones],this.dy[r]=this.dy[this.drones],this.dv[r]=this.dv[this.drones],this.dTail[r]=this.dTail[this.drones],this.dSize[r]=this.dSize[this.drones],this.dKind[r]=this.dKind[this.drones]):r++;for(;this.drones<this.droneTarget;)this.launch(!1);for(let n=0;n<J.count;n++){this.hx[n]=this.hx[n]+this.hv[n]*e;let r=this.hrx[n];this.hx[n]>t.w+r?this.hx[n]=-r:this.hx[n]<-r&&(this.hx[n]=t.w+r)}}beacon(e){let t=this.city.beacons[e],n=(this.time+t.phase*t.period)%t.period;return n<Nt.on?Math.sin(Math.PI*n/Nt.on):0}};function hn(e,t,n,r,i,a,o,s){let c=Y(n,nn(r,a,o),Ot[i].fog*s);e[t]=c[0],e[t+1]=c[1],e[t+2]=c[2]}function gn(e,t,n,r){let{city:i}=e,a=Rt[n],o=0;for(let n=0;n<i.signs.length&&(o+1)*12<=r.length;n++){let s=i.signs[n],c=o++*12;r[c]=s.x,r[c+1]=s.y,r[c+2]=s.w,r[c+3]=s.h,hn(r,c+4,s.cool?t.signCool:t.signWarm,t,s.layer,s.y,i.h,.6),r[c+7]=e.signBright[n],r[c+8]=s.seed,r[c+9]=+!!s.vertical,r[c+10]=a.sign*(s.layer===1?.5:1),r[c+11]=0}return o}function _n(e,t,n,r){let{city:i}=e,a=Rt[n],o=0,s=(e,t,n,i,a,s,c,l,u)=>{if((o+1)*12>r.length)return;let d=o++*12;r[d]=e,r[d+1]=t,r[d+2]=n,r[d+3]=i,r[d+4]=a[0],r[d+5]=a[1],r[d+6]=a[2],r[d+7]=s,r[d+8]=c,r[d+9]=l,r[d+10]=u,r[d+11]=0};for(let n=0;n<J.count;n++){let r=nn(t,e.hy[n],i.h);s(e.hx[n],e.hy[n],e.hrx[n],e.hry[n],Y(r,[1,1,1],.25),e.ha[n],0,0,1)}let c=[0,0,0];for(let n=0;n<i.beacons.length;n++){let r=e.beacon(n);if(r<=.01)continue;let o=i.beacons[n];hn(c,0,t.beacon,t,o.layer,o.y,i.h,.5),s(o.x,o.y,a.light,a.light,c,r,1,0,0)}for(let n=0;n<e.drones;n++){let r=e.dKind[n],i=r===0?t.droneWhite:r===1?t.droneCool:t.beacon;s(e.dx[n],e.dy[n],a.light,a.light,i,.9,e.dSize[n]/2,e.dTail[n]*Math.sign(e.dv[n]),0)}return o}function vn(e){return{signs:new Float32Array(Math.max(1,e.signs.length)*12),glows:new Float32Array((J.count+e.beacons.length+pn)*12)}}var yn=`#version 300 es
precision mediump float;
uniform sampler2D uCache;
out vec4 fragColor;
void main() {
    fragColor = texelFetch(uCache, ivec2(gl_FragCoord.xy), 0);
}
`;function bn(e,t,n){let r=(t,n)=>{let r=e.createShader(t);return r?(e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(console.error(`megacity shader:`,e.getShaderInfoLog(r)),null)):null},i=r(e.VERTEX_SHADER,t),a=r(e.FRAGMENT_SHADER,n),o=e.createProgram();if(!i||!a||!o)return null;if(e.attachShader(o,i),e.attachShader(o,a),e.linkProgram(o),!e.getProgramParameter(o,e.LINK_STATUS))return console.error(`megacity program:`,e.getProgramInfoLog(o)),null;let s=new Map;return{program:o,u(t){return s.has(t)||s.set(t,e.getUniformLocation(o,t)),s.get(t)}}}function xn(e,t,n){let r=e.createBuffer(),i=e.createVertexArray();e.bindVertexArray(i),e.bindBuffer(e.ARRAY_BUFFER,r);let a=t.reduce((e,t)=>e+t,0)*4,o=0;return t.forEach((t,r)=>{e.enableVertexAttribArray(r),e.vertexAttribPointer(r,t,e.FLOAT,!1,a,o*4),n&&e.vertexAttribDivisor(r,1),o+=t}),e.bindVertexArray(null),{buffer:r,vao:i}}function Sn(e){let t=bn(e,on,an),n=bn(e,fn,dn),r=bn(e,cn,sn),i=bn(e,un,ln),a=bn(e,on,yn);if(!t||!n||!r||!i||!a)return null;let o=e.createTexture();return e.bindTexture(e.TEXTURE_2D,o),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),{city:t,copy:a,cache:null,sign:n,glow:r,shape:i,empty:e.createVertexArray(),skyline:o,signs:xn(e,[4,4,4],!0),glows:xn(e,[4,4,4],!0),shapes:{...xn(e,[2,4],!1),count:0}}}function Cn(e,t,n,r,i){let a=e=>`rgb(${e.map(e=>Math.round(Math.min(1,e)*255)).join(`, `)})`;e.setTransform(r,0,0,r,0,0);let o=e.createLinearGradient(0,0,0,n);o.addColorStop(0,a(i.skyTop)),o.addColorStop(.5,a(i.skyMid)),o.addColorStop(1,a(i.skyLow)),e.fillStyle=o,e.fillRect(0,0,t,n),e.fillStyle=a(i.ledge),e.fillRect(0,n*.855,t*.5,n*.145)}function wn(e,n,r=Math.random){let i=e,a=i.getContext(`webgl2`,{alpha:!1,antialias:!1,depth:!1,preserveDrawingBuffer:!0,powerPreference:`low-power`}),o=a?Sn(a):null,s=n.glow,c=tn(n.palette),l=n.still,u=null,d=null,f=null,p=null,m=!1,h=!1,g=!1,_=0,v=0,y=NaN,b=(t,n)=>{if(n.cache&&n.cache.w===e.width&&n.cache.h===e.height)return n.cache;n.cache&&(t.deleteFramebuffer(n.cache.fbo),t.deleteTexture(n.cache.texture));let r=t.createTexture();t.bindTexture(t.TEXTURE_2D,r),t.texStorage2D(t.TEXTURE_2D,1,t.RGBA8,e.width,e.height),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST);let i=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,i),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,r,0),t.bindFramebuffer(t.FRAMEBUFFER,null),n.cache={texture:r,fbo:i,w:e.width,h:e.height},y=NaN,n.cache},x=()=>{a&&o&&d&&(a.bindTexture(a.TEXTURE_2D,o.skyline),a.texImage2D(a.TEXTURE_2D,0,a.RGBA32F,Vt,Qt(d)*d.layers.length,0,a.RGBA,a.FLOAT,$t(d)))},S=()=>{if(!a||!o||!d||!u)return;let e=rn(d,c);a.bindBuffer(a.ARRAY_BUFFER,o.shapes.buffer),a.bufferData(a.ARRAY_BUFFER,e,a.STATIC_DRAW),o.shapes.count=e.length/6},C=()=>{if(!a||!o||!d||!u)return;y=NaN;let t=o.city;a.useProgram(t.program),a.uniform1i(t.u(`uSkyline`),0),a.uniform1i(t.u(`uLayers`),Ot.length),a.uniform1i(t.u(`uRows`),Qt(d)),a.uniform1i(t.u(`uCols`),d.cols),a.uniform2f(t.u(`uTarget`),e.width,e.height),a.uniform1f(t.u(`uDensity`),u.dpr),a.uniform1f(t.u(`uHeight`),d.h),a.uniform2fv(t.u(`uCell`),new Float32Array(Ot.flatMap(e=>[e.cell[0],e.cell[1]]))),a.uniform1fv(t.u(`uFog`),new Float32Array(Ot.map(e=>e.fog))),a.uniform3f(t.u(`uSkyTop`),...c.skyTop),a.uniform3f(t.u(`uSkyMid`),...c.skyMid),a.uniform3f(t.u(`uSkyLow`),...c.skyLow),a.uniform3f(t.u(`uLowGlow`),...c.lowGlow),a.uniform3f(t.u(`uFaceFar`),...c.faceFar),a.uniform3f(t.u(`uFaceNear`),...c.faceNear),a.uniform3f(t.u(`uEdge`),...c.edge),a.uniform3f(t.u(`uWinPale`),...c.winPale),a.uniform3f(t.u(`uWinViolet`),...c.winViolet),a.uniform3f(t.u(`uWinPink`),...c.winPink),a.uniform3f(t.u(`uWinWhite`),...c.winWhite),a.uniform1f(t.u(`uWindowGlow`),Rt[s].window),a.useProgram(o.copy.program),a.uniform1i(o.copy.u(`uCache`),0);for(let t of[o.sign,o.glow,o.shape])a.useProgram(t.program),a.uniform2f(t.u(`uTarget`),e.width,e.height),a.uniform1f(t.u(`uDensity`),u.dpr)},w=()=>{u&&(d=Zt(u.w,u.h,r),f=new mn(d,r),p=vn(d),x(),S(),C())},T=()=>{if(u){if(a&&o&&!h&&d&&f&&p){a.viewport(0,0,e.width,e.height),a.disable(a.BLEND),a.bindVertexArray(o.empty),a.activeTexture(a.TEXTURE0);let t=b(a,o),n=Math.floor(f.time);n!==y&&(y=n,a.bindFramebuffer(a.FRAMEBUFFER,t.fbo),a.useProgram(o.city.program),a.uniform1f(o.city.u(`uTime`),n),a.bindTexture(a.TEXTURE_2D,o.skyline),a.drawArrays(a.TRIANGLES,0,3),a.bindFramebuffer(a.FRAMEBUFFER,null)),a.useProgram(o.copy.program),a.bindTexture(a.TEXTURE_2D,t.texture),a.drawArrays(a.TRIANGLES,0,3),a.enable(a.BLEND),a.blendFunc(a.ONE,a.ONE_MINUS_SRC_ALPHA);let r=gn(f,c,s,p.signs);r&&(a.useProgram(o.sign.program),a.bindBuffer(a.ARRAY_BUFFER,o.signs.buffer),a.bufferData(a.ARRAY_BUFFER,p.signs.subarray(0,r*12),a.STREAM_DRAW),a.bindVertexArray(o.signs.vao),a.drawArraysInstanced(a.TRIANGLE_STRIP,0,4,r));let i=_n(f,c,s,p.glows);i&&(a.useProgram(o.glow.program),a.bindBuffer(a.ARRAY_BUFFER,o.glows.buffer),a.bufferData(a.ARRAY_BUFFER,p.glows.subarray(0,i*12),a.STREAM_DRAW),a.bindVertexArray(o.glows.vao),a.drawArraysInstanced(a.TRIANGLE_STRIP,0,4,i)),a.useProgram(o.shape.program),a.bindVertexArray(o.shapes.vao),a.drawArrays(a.TRIANGLES,0,o.shapes.count),a.bindVertexArray(null),a.disable(a.BLEND)}else if(!a){let e=i.getContext(`2d`);e&&Cn(e,u.w,u.h,u.dpr,c)}g||(g=!0,n.onReady?.())}},E=e=>{if(_=0,!m||l)return;if(v&&e-v<13.88888888888889){_=requestAnimationFrame(E);return}let t=v?Math.min((e-v)/1e3,zt):0;v=e,f?.advance(t),T(),_=requestAnimationFrame(E)},D={resize(n,r,i,a){let o=t(n,r,i,a,Bt);e.width=Math.round(o.w*o.dpr),e.height=Math.round(o.h*o.dpr);let s=!u||o.w!==u.w||o.h!==u.h;u=o,s||!d?w():(S(),C()),T()},start(){m=!0,l||_||!o||(v=0,_=requestAnimationFrame(E))},stop(){m=!1,cancelAnimationFrame(_),_=0},setStill(e){l=e,l?D.stop():m&&D.start(),T()},setGlow(e){s=e,C(),l&&T()},setPalette(e){c=tn(e),S(),C(),l&&T()},destroy(){D.stop(),u=null,d=null,f=null}};return i.addEventListener(`webglcontextlost`,e=>{e.preventDefault(),h=!0}),i.addEventListener(`webglcontextrestored`,()=>{h=!1,o=a?Sn(a):null,x(),S(),C(),T()}),D}var Tn={id:`megacity`,create:(e,t)=>wn(e,t)},En=`#version 300 es
// neural_link.frag: a stroke with a smooth one-pixel edge (as the web's
// antialiased lines), premultiplied.
precision mediump float;

in float vAcross;
flat in vec3 vColor;
flat in float vAlpha;
flat in float vHalf;
out vec4 fragColor;

void main() {
    float cover = clamp(vHalf + 0.5 - abs(vAcross), 0.0, 1.0);
    float a = vAlpha * cover;
    fragColor = vec4(vColor * a, a);
}
`,Dn=`#version 300 es
// neural-net link.vert (web): one quad per link, as fluid_motion's
// neural_link.vert draws it, but with each link's ends sent per instance
// (a desktop screen can hold more nodes than that shader's uniform array).
// Opacity by length (longer is fainter) times the link's own weight;
// links wholly off one side of the screen are dropped. Its fragment
// shader, link.frag, is fluid_motion's neural_link.frag byte for byte.
layout(location = 0) in vec4 aEnds;   // node a (x, y), node b (x, y): CSS px
layout(location = 1) in float aWeight; // the link's own brightness

uniform vec2 uTargetPx;   // the canvas (device px)
uniform float uDensity;   // device px per CSS px
uniform float uMaxLink;   // the longest link (CSS px)
uniform float uWidth;     // the stroke's width (CSS px)
uniform float uStrength;  // the pass's opacity (the glow pass is faint)
#include neural_shade

out float vAcross;        // device px from the centre line
flat out vec3 vColor;
flat out float vAlpha;
flat out float vHalf;     // half the stroke's width (device px)

void main() {
    vec2 a = aEnds.xy;
    vec2 b = aEnds.zw;
    // Wholly off the screen: no quad at all (outside the clip volume).
    if ((a.x < 0.0 && b.x < 0.0) || (a.x > uScreen.x && b.x > uScreen.x) || (a.y < 0.0 && b.y < 0.0) || (a.y > uScreen.y && b.y > uScreen.y)) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        vAcross = 0.0; vColor = vec3(0.0); vAlpha = 0.0; vHalf = 0.0;
        return;
    }
    float len = length(b - a);
    float share = min(1.0, len / uMaxLink);
    vAlpha = uStrength * min(1.0, mix(0.6, 0.16, share) * aWeight);
    vColor = shade((a + b) * 0.5);
    // The quad: the segment, widened by half the stroke plus a pixel for the smooth edge.
    vec2 along = len > 0.0 ? (b - a) / len : vec2(1.0, 0.0);
    vec2 across = vec2(-along.y, along.x);
    vHalf = uWidth * 0.5 * uDensity;
    float reach = vHalf + 1.0;
    float side = float(gl_VertexID & 1) * 2.0 - 1.0;
    vec2 end = (gl_VertexID >> 1) == 0 ? a : b;
    vec2 pos = end * uDensity + across * side * reach;
    vAcross = side * reach;
    gl_Position = vec4(pos.x / uTargetPx.x * 2.0 - 1.0, 1.0 - pos.y / uTargetPx.y * 2.0, 0.0, 1.0);
}
`,On=`// neural_shade.glsl: NOT a shader on its own: the palette's colour along the
// neural net's diagonal, pasted into the shaders that need it by
// scene/neural/NeuralRenderer.kt (and by tools/shader-check) where they say
// "#include neural_shade". Mirrors lib/neural/NeuralSim.kt diagonal() and shade().
uniform vec2 uScreen;  // the screen (dp)
uniform vec3 uCool;    // --cool lifted 40% towards white
uniform vec3 uBright;  // --text-bright
uniform vec3 uAccent;  // --accent

vec3 shade(vec2 p) {
    vec2 s = p / uScreen;
    float t = clamp(1.05 * s.y + 0.35 * s.x - 0.2, 0.0, 1.0);
    if (t < 0.3) return mix(uCool, uBright, smoothstep(0.0, 1.0, t / 0.3));
    return mix(uBright, uAccent, smoothstep(0.0, 1.0, min(1.0, (t - 0.3) / 0.34)));
}

// Where a point sits on the diagonal (0 top left … 1 bottom right).
float diagonal(vec2 p) {
    vec2 s = p / uScreen;
    return clamp(1.05 * s.y + 0.35 * s.x - 0.2, 0.0, 1.0);
}
`,kn=`#version 300 es
// neural_spark.frag: a node's sprite, worked out instead of copied: a
// white-hot core tinted with its colour, out to the colour at its edge,
// then the halo fading out (the web's gradient stops, interpolated as
// canvas gradients are: unpremultiplied).
precision mediump float;

uniform float uEdge;  // the core's edge, as a share of the sprite's radius
uniform float uHalo;  // the halo's strength (GLOW level)

in vec2 vLocal;
flat in vec3 vColor;
flat in float vAlpha;
out vec4 fragColor;

void main() {
    float r = length(vLocal);
    vec3 c = vColor;
    float e = uEdge;
    float s1 = 0.55 * e;
    float s3 = min(0.99, 1.6 * e);
    float s4 = min(0.995, 3.0 * e);
    vec4 k;
    if (r < s1) k = mix(vec4(mix(c, vec3(1.0), 0.75), 1.0), vec4(mix(c, vec3(1.0), 0.45), 1.0), r / s1);
    else if (r < e) k = mix(vec4(mix(c, vec3(1.0), 0.45), 1.0), vec4(c, 0.95), (r - s1) / (e - s1));
    else if (r < s3) k = mix(vec4(c, 0.95), vec4(c, uHalo * 0.55), (r - e) / (s3 - e));
    else if (r < s4) k = mix(vec4(c, uHalo * 0.55), vec4(c, uHalo * 0.18), (r - s3) / (s4 - s3));
    else k = mix(vec4(c, uHalo * 0.18), vec4(c, 0.0), clamp((r - s4) / (1.0 - s4), 0.0, 1.0));
    float a = k.a * vAlpha;
    fragColor = vec4(k.rgb * a, a);
}
`,An=`#version 300 es
// neural-net spark.vert (web): the nodes and the signals, one glow sprite
// each, sent per instance (x, y, radius, opacity; CSS px), coloured along
// the diagonal: fluid_motion's neural_spark.vert with the sprites in a
// buffer instead of a uniform array. Its fragment shader, spark.frag, is
// fluid_motion's neural_spark.frag byte for byte.
layout(location = 0) in vec4 aSpark;

uniform vec2 uTargetPx;   // the canvas (device px)
uniform float uDensity;   // device px per CSS px
#include neural_shade

out vec2 vLocal;          // -1..1 across the sprite
flat out vec3 vColor;
flat out float vAlpha;

void main() {
    vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1)) * 2.0 - 1.0;
    vLocal = corner;
    vColor = shade(aSpark.xy);
    vAlpha = aSpark.w;
    vec2 pos = (aSpark.xy + corner * aSpark.z) * uDensity;
    gl_Position = vec4(pos.x / uTargetPx.x * 2.0 - 1.0, 1.0 - pos.y / uTargetPx.y * 2.0, 0.0, 1.0);
}
`,jn=e=>e.replace(`#include neural_shade`,On);function Mn(e,t,n){let r=(t,n)=>{let r=e.createShader(t);return r?(e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(console.error(`neural-net shader:`,e.getShaderInfoLog(r)),null)):null},i=r(e.VERTEX_SHADER,t),a=r(e.FRAGMENT_SHADER,n),o=e.createProgram();if(!i||!a||!o)return null;if(e.attachShader(o,i),e.attachShader(o,a),e.linkProgram(o),!e.getProgramParameter(o,e.LINK_STATUS))return console.error(`neural-net program:`,e.getProgramInfoLog(o)),null;let s=new Map;return{program:o,u(t){return s.has(t)||s.set(t,e.getUniformLocation(o,t)),s.get(t)}}}function Nn(e){let t=Mn(e,jn(Dn),En),n=Mn(e,jn(An),kn);if(!t||!n)return null;let r=e.createBuffer(),i=e.createBuffer(),a=e.createBuffer(),o=e.createVertexArray();e.bindVertexArray(o),e.bindBuffer(e.ARRAY_BUFFER,r),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,4,e.FLOAT,!1,16,0),e.vertexAttribDivisor(0,1),e.bindBuffer(e.ARRAY_BUFFER,i),e.enableVertexAttribArray(1),e.vertexAttribPointer(1,1,e.FLOAT,!1,4,0),e.vertexAttribDivisor(1,1);let s=e.createVertexArray();return e.bindVertexArray(s),e.bindBuffer(e.ARRAY_BUFFER,a),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,4,e.FLOAT,!1,16,0),e.vertexAttribDivisor(0,1),e.bindVertexArray(null),{link:t,spark:n,linkVao:o,endsBuffer:r,weightBuffer:i,sparkVao:s,sparkBuffer:a}}function Pn(e,t,n){e.bindBuffer(e.ARRAY_BUFFER,t.weightBuffer),e.bufferData(e.ARRAY_BUFFER,n,e.STATIC_DRAW)}function Fn(e,t=0){let n=parseInt(e.replace(`#`,``),16),r=[n>>16&255,n>>8&255,n&255].map(e=>(e+(255-e)*t)/255);return[r[0],r[1],r[2]]}function In(e,t,n,r){e.uniform2f(t.u(`uTargetPx`),e.drawingBufferWidth,e.drawingBufferHeight),e.uniform1f(t.u(`uDensity`),n.dpr),e.uniform2f(t.u(`uScreen`),n.w,n.h),e.uniform3fv(t.u(`uCool`),Fn(r.cool,.4)),e.uniform3fv(t.u(`uBright`),Fn(r.bright)),e.uniform3fv(t.u(`uAccent`),Fn(r.accent))}function Ln(e,t,n,r){e.viewport(0,0,e.drawingBufferWidth,e.drawingBufferHeight),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),e.useProgram(t.link.program),In(e,t.link,n,r),e.uniform1f(t.link.u(`uMaxLink`),n.maxLink),e.bindBuffer(e.ARRAY_BUFFER,t.endsBuffer),e.bufferData(e.ARRAY_BUFFER,n.ends.subarray(0,n.links*4),e.STREAM_DRAW),e.bindVertexArray(t.linkVao),n.lineGlow>0&&(e.uniform1f(t.link.u(`uWidth`),n.lineWidth*n.glowWidth),e.uniform1f(t.link.u(`uStrength`),n.lineGlow),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,4,n.links)),e.uniform1f(t.link.u(`uWidth`),n.lineWidth),e.uniform1f(t.link.u(`uStrength`),1),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,4,n.links),e.useProgram(t.spark.program),In(e,t.spark,n,r),e.uniform1f(t.spark.u(`uEdge`),n.edge),e.uniform1f(t.spark.u(`uHalo`),n.halo),e.bindBuffer(e.ARRAY_BUFFER,t.sparkBuffer),e.bufferData(e.ARRAY_BUFFER,n.sprites.subarray(0,n.sparks*4),e.STREAM_DRAW),e.bindVertexArray(t.sparkVao),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,4,n.sparks),e.bindVertexArray(null)}var Rn=[1,1.5,2,3,4];function zn(e){return{level:2,locked:!1,base:1/0,gaps:[],since:e+600}}function Bn(e,t){e.gaps.length=0,e.since=t+600}function Vn(e,t,n,r){if(n<e.since||(e.gaps.push(t),n-e.since<2e3))return null;let i=[...e.gaps].sort((e,t)=>e-t),a=i[i.length>>1],o=i[Math.floor(i.length*.9)];return e.base=Math.min(e.base,a),Bn(e,n),e.level>r?(e.level=r,e.level):o>e.base*1.4?e.level===0?null:(e.level--,e.locked=!0,e.level):!e.locked&&e.level<r?(e.level++,e.level):null}var Hn=.14,Un=[[.78,.18,.16,.24],[.6,.55,.18,.18],[.88,.62,.12,.16],[.32,.42,.2,.12]],Wn=[2,2,3,3,3,4,4,6,9],Gn=.42,Kn=[10,38],qn=[26,70],Jn=[1.3,3.6],Yn=[.6,.16],Xn=[.35,1.6],Zn=1.3,Qn=1.1,$n=[240,460],er=[1,4],tr=.8,nr=.12,rr={low:{halo:.35,haloSize:4,lineGlow:0},medium:{halo:.5,haloSize:5,lineGlow:.08},high:{halo:.65,haloSize:6.5,lineGlow:.14},max:{halo:.8,haloSize:8,lineGlow:.22}},ir=.1,ar=3,or=(e,[t,n])=>t+(n-t)*e();function sr(e){let t=parseInt(e.replace(`#`,``),16);return[t>>16&255,t>>8&255,t&255]}function cr(e,t,n){return[e[0]+(t[0]-e[0])*n,e[1]+(t[1]-e[1])*n,e[2]+(t[2]-e[2])*n]}function lr([e,t,n],r=1){return`rgba(${Math.round(e)}, ${Math.round(t)}, ${Math.round(n)}, ${r})`}function ur(e,t){return Math.min(1,Math.max(0,1.05*t+.35*e-.2))}function dr(e,t){let n=sr(e.bright),r=e=>e*e*(3-2*e),i=cr(sr(e.cool),[255,255,255],.4);return t<fr?cr(i,n,r(t/fr)):cr(n,sr(e.accent),r(Math.min(1,(t-fr)/(pr-fr))))}var fr=.3,pr=.64;function mr(e,t,n,r,i){let a=e.length,o=new Set,s=[];for(let c=0;c<a;c++){let l=[];for(let n=0;n<a;n++){if(n===c)continue;let i=Math.hypot(e[n]-e[c],t[n]-t[c]);i<=r&&l.push([i,n])}l.sort((e,t)=>e[0]-t[0]);let u=l.slice(0,n[c]*3);for(let e=u.length-1;e>0;e--){let t=Math.floor(i()*(e+1));[u[e],u[t]]=[u[t],u[e]]}for(let[,e]of u.slice(0,n[c])){let[t,n]=c<e?[c,e]:[e,c];o.has(t*a+n)||(o.add(t*a+n),s.push([t,n]))}}return s}function hr(e,t,n){let r=e*(1+2*Hn),i=t*(1+2*Hn),a=Math.max(12,Math.round(26*r*i/1e6)),o=()=>new Float32Array(a),s={w:e,h:t,hx:o(),hy:o(),ax:o(),ay:o(),wx:o(),wy:o(),px:o(),py:o(),radius:o(),flash:o(),rise:new Uint8Array(a),x:o(),y:o()},c=new Uint8Array(a),l=Un.reduce((e,t)=>e+t[3],0);for(let o=0;o<a;o++){if(n()<.55)s.hx[o]=-Hn*e+n()*r,s.hy[o]=-Hn*t+n()*i;else{let r=n()*l,i=Un.find(e=>(r-=e[3])<0)??Un[0];s.hx[o]=i[0]*e+(n()+n()-1)*i[2]*e,s.hy[o]=i[1]*t+(n()+n()-1)*i[2]*e}s.ax[o]=or(n,Kn),s.ay[o]=or(n,Kn),s.wx[o]=2*Math.PI/or(n,qn),s.wy[o]=s.wx[o]*(.7+n()*.6),s.px[o]=n()*2*Math.PI,s.py[o]=n()*2*Math.PI,c[o]=Wn[Math.floor(n()*Wn.length)],s.radius[o]=Jn[0]+(Jn[1]-Jn[0])*Math.min(1,(c[o]-2)/5+n()*.35)}let u=mr(s.hx,s.hy,c,Gn*Math.hypot(e,t),n),d=Array.from({length:a},()=>[]);u.forEach(([e,t],n)=>{d[e].push(n),d[t].push(n)});let f=new Float32Array(u.length).map(()=>or(n,Xn));return{...s,links:u,weight:f,linksOf:d}}function gr(e,t){let n=Math.ceil(4*t);return Math.ceil(n*e)/n}function _r(e,t,n){let r=rr[t],i=Math.ceil(4*n),a=Math.ceil(i*r.haloSize),o=[],s=[],c=[255,255,255];for(let t=0;t<32;t++){let n=dr(e,t/31);s.push(lr(n));let l=new OffscreenCanvas(a*2,a*2),u=l.getContext(`2d`);if(u){let e=u.createRadialGradient(a,a,0,a,a,a),t=i/a;e.addColorStop(0,lr(cr(n,c,.75))),e.addColorStop(t*.55,lr(cr(n,c,.45))),e.addColorStop(t,lr(n,.95)),e.addColorStop(Math.min(.99,t*1.6),lr(n,r.halo*.55)),e.addColorStop(Math.min(.995,t*3),lr(n,r.halo*.18)),e.addColorStop(1,lr(n,0)),u.fillStyle=e,u.fillRect(0,0,a*2,a*2)}o.push(l)}return{node:o,core:i,size:a,line:s}}function vr(e,n,r=Math.random){let i=e,a=i.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!0,powerPreference:`low-power`}),o=a?Nn(a):null,s=!1,c=a?null:i.getContext(`2d`),l=null,u=zn(performance.now()),d=new Float32Array,f=new Float32Array,p=n.palette,m=n.glow,h=n.still,g=null,_=null,v=1,y=!1,b=!1,x=!1,S=0,C=0,w=0,T=[],E=(e,t)=>{if(g){for(let n=0;n<g.hx.length;n++)g.x[n]=g.hx[n]+g.ax[n]*Math.sin(g.wx[n]*e+g.px[n]),g.y[n]=g.hy[n]+g.ay[n]*Math.sin(g.wy[n]*e+g.py[n]),g.rise[n]?(g.flash[n]=Math.min(1,g.flash[n]+t/nr),g.flash[n]===1&&(g.rise[n]=0)):g.flash[n]=Math.max(0,g.flash[n]-t/tr);for(w+=Qn*t;w>=1&&g.links.length;){--w;let e=Math.floor(r()*g.links.length),t=g.links[e],n=r()<.5?t[0]:t[1];g.rise[n]=1,T.push({link:e,from:n,along:0,speed:0,hops:Math.round(or(r,er))-1,first:!0})}for(let e=T.length-1;e>=0;e--){let n=T[e],[i,a]=g.links[n.link];if(n.speed||=or(r,$n)/Math.max(1,Math.hypot(g.x[a]-g.x[i],g.y[a]-g.y[i])),n.along+=n.speed*t,n.along<1)continue;let o=n.from===i?a:i;g.rise[o]=1;let s=g.linksOf[o].filter(e=>e!==n.link);n.hops>0&&s.length?(n.link=s[Math.floor(r()*s.length)],n.from=o,n.along=0,n.speed=0,n.hops--,n.first=!1):T.splice(e,1)}}},D=e=>{let{w:t,h:n}=e,r=rr[m],i=e.links.length;d.length<i*4&&(d=new Float32Array(i*4));for(let t=0;t<i;t++){let[n,r]=e.links[t];d[4*t]=e.x[n],d[4*t+1]=e.y[n],d[4*t+2]=e.x[r],d[4*t+3]=e.y[r]}let a=gr(r.haloSize,v),o=(e,t,n,r,i)=>{f[4*e]=t,f[4*e+1]=n,f[4*e+2]=r,f[4*e+3]=i};f.length<(e.x.length+T.length)*4&&(f=new Float32Array((e.x.length+T.length+16)*4));let s=0;for(let r=0;r<e.x.length;r++){let i=e.x[r],c=e.y[r],l=e.radius[r]*(1+.8*e.flash[r])*a;i<-l||c<-l||i>t+l||c>n+l||o(s++,i,c,l,Math.min(1,.8+.2*e.flash[r]))}for(let t of T){let[n,r]=e.links[t.link],i=t.from===n?r:n,c=e.x[t.from]+(e.x[i]-e.x[t.from])*t.along,l=e.y[t.from]+(e.y[i]-e.y[t.from])*t.along;o(s++,c,l,2.2*a,t.first?Math.min(1,t.along*8):1)}return{w:t,h:n,dpr:v,ends:d,links:i,sprites:f,sparks:s,maxLink:Gn*Math.hypot(t,n),lineWidth:Zn,lineGlow:r.lineGlow,glowWidth:4,edge:1/a,halo:r.halo}},O=()=>{g&&(a?o&&!s&&Ln(a,o,D(g),p):k(),x||(x=!0,n.onReady?.()))},k=()=>{if(!c||!g||!_)return;let{w:t,h:n}=g,r=rr[m];c.setTransform(1,0,0,1,0,0),c.clearRect(0,0,e.width,e.height),c.setTransform(v,0,0,v,0,0);let i=(e,r)=>Math.round(ur(e/t,r/n)*31),a=Gn*Math.hypot(t,n),o=g.links,s=(e,r)=>{c.lineWidth=e;let s=-1;for(let e=0;e<o.length;e++){let[l,u]=o[e],d=g.x[l],f=g.y[l],p=g.x[u],m=g.y[u];if(d<0&&p<0||d>t&&p>t||f<0&&m<0||f>n&&m>n)continue;let h=Math.min(1,Math.hypot(p-d,m-f)/a);c.globalAlpha=r*Math.min(1,(Yn[0]+(Yn[1]-Yn[0])*h)*g.weight[e]);let v=i((d+p)/2,(f+m)/2);v!==s&&(c.strokeStyle=_.line[s=v]),c.beginPath(),c.moveTo(d,f),c.lineTo(p,m),c.stroke()}};r.lineGlow>0&&s(Zn*4,r.lineGlow),s(Zn,1);let l=_.size/_.core;for(let e=0;e<g.x.length;e++){let r=g.x[e],a=g.y[e],o=g.radius[e]*(1+.8*g.flash[e])*l;r<-o||a<-o||r>t+o||a>n+o||(c.globalAlpha=Math.min(1,.8+.2*g.flash[e]),c.drawImage(_.node[i(r,a)],r-o,a-o,2*o,2*o))}for(let e of T){let[t,n]=g.links[e.link],r=e.from===t?n:t,a=g.x[e.from]+(g.x[r]-g.x[e.from])*e.along,o=g.y[e.from]+(g.y[r]-g.y[e.from])*e.along,s=2.2*l;c.globalAlpha=e.first?Math.min(1,e.along*8):1,c.drawImage(_.node[i(a,o)],a-s,o-s,2*s,2*s)}c.globalAlpha=1},A=e=>{if(S=0,!y||h)return;C&&a&&l&&Vn(u,e-C,e,N())!==null&&P();let t=C?Math.min((e-C)/1e3,ir):0;C=e,E(e/1e3,t),O(),S=requestAnimationFrame(A)},j=()=>{E(performance.now()/1e3,0),O()},M={resize(e,t,n,r){b||!c&&!a||(l={cw:e,ch:t,ratio:n,zoom:r},P())},start(){y=!0,h||S||b||(C=0,Bn(u,performance.now()),S=requestAnimationFrame(A))},stop(){y=!1,cancelAnimationFrame(S),S=0},setStill(e){h=e,h?(cancelAnimationFrame(S),S=0,j()):y&&M.start()},setGlow(e){e!==m&&(m=e,c&&(_=_r(p,m,v)),h&&j())},setPalette(e){p=e,c&&(_=_r(p,m,v)),h&&j()},destroy(){b=!0,M.stop(),g=null,_=null}},N=()=>{if(!l)return 0;let{w:e,h:n,dpr:r}=t(l.cw,l.ch,l.ratio,l.zoom,ar),i=0;return Rn.forEach((t,a)=>{Math.max(e,n)*r*t<=8192&&(i=a)}),i},P=()=>{if(!l)return;let{cw:n,ch:i,ratio:s,zoom:d}=l,{w:f,h,dpr:y}=t(n,i,s,d,ar),b=Math.min(u.level,N()),x=a?y*Rn[b]:y;if(e.width=Math.round(f*x),e.height=Math.round(h*x),c&&(!_||x!==v)&&(_=_r(p,m,x)),v=x,!g||g.w!==f||g.h!==h){let e=performance.now();g=hr(f,h,r),T.length=0,a&&o&&Pn(a,o,g.weight),performance.measure(`neural-scene`,{start:e})}Bn(u,performance.now()),j()};return i.addEventListener(`webglcontextlost`,e=>{e.preventDefault(),s=!0}),i.addEventListener(`webglcontextrestored`,()=>{s=!1,o=a?Nn(a):null,a&&o&&g&&Pn(a,o,g.weight),O()}),M}var yr={id:`neural-net`,create:(e,t)=>vr(e,t)},br={cells:30,layers:[0,1.15,2.5]},xr={width:[1,3],depth:[1,3],height:[.5,2.2],fill:[.9,.42,.2],seam:.035},Q={target:[0,.6,0],yaw:36,pitch:38,distance:12.5,fov:34},Sr={yaw:4,yawPeriod:53,pitch:1.6,pitchPeriod:67},Cr={front:.8,back:.3,fresnel:.3},wr={magenta:6,blue:4,reach:[1.3,2.8],strength:[.9,1.8]},Tr={amount:.22,period:[9,17]},Er={width:1,glow:2.4},Dr={low:{edge:.25,light:.85},medium:{edge:.4,light:.95},high:{edge:.55,light:1},max:{edge:.75,light:1.1}},Or=.1,kr=3,Ar=(e,[t,n])=>t+(n-t)*e(),jr=(e,[t,n])=>t+Math.floor(e()*(n-t+1));function Mr(e){let t=br.cells,n=t/2,r=new Float32Array(t*t),i=[];br.layers.forEach((a,o)=>{let s=br.layers[o+1],c=new Uint8Array(t*t),l=Math.round(xr.fill[o]*t*t),u=0;for(let o=0;o<t*t*6&&u<l;o++){let o=jr(e,xr.width),l=jr(e,xr.depth),d=Math.floor(e()*(t-o+1)),f=Math.floor(e()*(t-l+1)),p=!0;for(let e=d;e<d+o&&p;e++)for(let n=f;n<f+l&&p;n++)p=!c[n*t+e]&&r[n*t+e]<=a-.05;if(!p)continue;let m=Ar(e,xr.height),h=s===void 0?m:Math.min(m,Math.max(xr.height[0],m*.6));for(let e=d;e<d+o;e++)for(let n=f;n<f+l;n++)c[n*t+e]=1,r[n*t+e]=Math.max(r[n*t+e],a+h);u+=o*l;let g=xr.seam;i.push(d-n+g/2,a,f-n+g/2,o-g,h,l-g)}});let a=[],o=(t,n,r,i,o)=>a.push({x:n,y:r,z:i,kind:t,reach:o,strength:Ar(e,wr.strength),period:Ar(e,Tr.period),phase:e()*Math.PI*2}),s=[0,1,2,3,4,5,6,7,8];for(let t=s.length-1;t>0;t--){let n=Math.floor(e()*(t+1));[s[t],s[n]]=[s[n],s[t]]}let c=t=>[-6+(t%3+e())*4,-6+(Math.floor(t/3)+e())*4];for(let t=0;t<wr.magenta+wr.blue;t++){let[n,r]=c(s[t%9]);o(t<wr.magenta?0:1,n,Ar(e,[.3,2.6]),r,Ar(e,wr.reach))}return{boxes:new Float32Array(i),count:i.length/6,lights:a}}function Nr(e,t,n){let r=Math.PI/180,i=(Q.yaw+Sr.yaw*Math.sin(e/Sr.yawPeriod*Math.PI*2))*r,a=(Q.pitch+Sr.pitch*Math.sin(e/Sr.pitchPeriod*Math.PI*2))*r,[o,s,c]=Q.target,l=[o+Q.distance*Math.cos(a)*Math.sin(i),s+Q.distance*Math.sin(a),c+Q.distance*Math.cos(a)*Math.cos(i)],u=Rr([o-l[0],s-l[1],c-l[2]]),d=Rr(Lr(u,[0,1,0])),f=Lr(d,u),p=Q.fov*r/(n>0?n:1),m=1/Math.tan(p/2),h=new Float32Array([d[0],f[0],-u[0],0,d[1],f[1],-u[1],0,d[2],f[2],-u[2],0,-Ir(d,l),-Ir(f,l),Ir(u,l),1]);return{eye:l,forward:u,viewProj:zr(new Float32Array([m/t,0,0,0,0,m,0,0,0,0,80.5/-79.5,-1,0,0,80/-79.5,0]),h)}}function Pr(e,t,n,r){let i=e.boxes,[a,o,s]=t.eye,[c,l,u]=t.forward;for(let t=0;t<e.count;t++){let e=t*6;r[t]=(i[e]+i[e+3]/2-a)*c+(i[e+1]+i[e+4]/2-o)*l+(i[e+2]+i[e+5]/2-s)*u}for(let t=1;t<e.count;t++){let e=n[t],i=r[e],a=t-1;for(;a>=0&&r[n[a]]<i;)n[a+1]=n[a],a--;n[a+1]=e}}function Fr(e,t){return 1+Tr.amount*Math.sin(t/e.period*Math.PI*2+e.phase)}function Ir(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function Lr(e,t){return[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]]}function Rr(e){let t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]}function zr(e,t){let n=new Float32Array(16);for(let r=0;r<4;r++)for(let i=0;i<4;i++)n[r*4+i]=e[i]*t[r*4]+e[4+i]*t[r*4+1]+e[8+i]*t[r*4+2]+e[12+i]*t[r*4+3];return n}var Br=`#version 300 es
// prism back.frag: what's behind the glass: deep navy, lighter towards the
// bottom (the reference is), with wide soft pools of the accent and the
// cool colour where the light comes through.
precision highp float;

uniform vec3 uBg;      // the deep navy
uniform vec3 uAccent;  // magenta
uniform vec3 uCool;    // electric blue
uniform vec2 uAspect;  // (w / h, 1): pools stay round
uniform float uLight;  // the glow level's light strength

in vec2 vUv;
out vec4 fragColor;

// A soft pool of light: its centre (shares of the screen) and size.
float pool(vec2 c, float r) {
    vec2 d = (vUv - c) * uAspect;
    return exp(-dot(d, d) / (r * r));
}

void main() {
    // vUv.y is 0 at the bottom: brighter there.
    vec3 c = uBg * mix(1.2, 0.55, vUv.y);
    c += uAccent * 0.09 * uLight * (pool(vec2(0.12, 0.62), 0.32) + pool(vec2(0.95, 0.55), 0.3) + 0.7 * pool(vec2(0.42, 0.18), 0.28));
    c += uCool * 0.08 * uLight * (pool(vec2(0.55, 0.62), 0.35) + pool(vec2(0.3, 0.3), 0.3) + pool(vec2(0.8, 0.12), 0.25));
    fragColor = vec4(c, 1.0);
}
`,Vr=`#version 300 es
// prism box.frag: a face of smoky glass. Its body is dark, tinted by the
// light pools near it (magenta and blue: the reference's light inside and
// behind the glass), brighter at grazing angles (fresnel), fading into the
// dark with distance. Its edges are thin lit lines: how far a pixel is from
// the face's edge (units), over how fast that changes across the screen
// (its gradient's length), gives px, so every edge is the same smooth width
// at any distance and angle (as HORIZON's lines). Each line sits wholly
// inside its face (its centre a core-width in), and the face's own outline
// fades out over its last device px: without multisampling, a triangle's
// edge is a hard step, and the bright glass against the dark stepped
// (0.23.1). Premultiplied: the body blends over what's behind; the light
// and the edges add to it.
precision highp float;

const int MAX_LIGHTS = 16;
uniform vec4 uLightPos[MAX_LIGHTS];  // xyz, reach (units)
uniform vec3 uLightCol[MAX_LIGHTS];  // colour × strength × breath
uniform int uLights;
uniform vec3 uEye;
uniform vec3 uBody;      // the glass's own colour (dark navy)
uniform vec3 uEdge;      // the edges' colour
uniform float uAlpha;    // the body's opacity (front faces more than back ones)
uniform float uFresnel;  // how much brighter at grazing angles
uniform float uDensity;  // device px per CSS px
uniform float uEdgeW;    // the edge's core width (CSS px)
uniform float uEdgeGlow; // the edge glow's reach (CSS px)
uniform float uGlowAmt;  // the edge glow's strength (GLOW level)
uniform float uFar;      // where faces have faded to the dark (units from the eye)

in vec3 vWorld;
in vec3 vLocal;
flat in vec3 vNormal;
flat in vec3 vSize;
out vec4 fragColor;

void main() {
    // The light pools here.
    vec3 light = vec3(0.0);
    for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= uLights) break;
        vec3 d = vWorld - uLightPos[i].xyz;
        light += uLightCol[i] * exp(-dot(d, d) / (uLightPos[i].w * uLightPos[i].w));
    }
    vec3 v = normalize(uEye - vWorld);
    float facing = abs(dot(vNormal, v));
    float fres = pow(1.0 - facing, 3.0);
    // Tops catch more of the light (the reference's lit upper faces).
    float catchLight = vNormal.y > 0.5 ? 0.85 : 0.55;

    // Distance to the face's nearest edge (units): along the two axes the face spans.
    vec3 a = abs(vNormal);
    vec3 e = min(vLocal, vSize - vLocal);
    float d = a.x > 0.5 ? min(e.y, e.z) : (a.y > 0.5 ? min(e.x, e.z) : min(e.x, e.y));
    float g = length(vec2(dFdx(d), dFdy(d)));
    float dev = d / max(g, 1e-6);  // device px to the face's edge
    float px = dev / uDensity;     // CSS px
    float off = px - uEdgeW;       // from the line's centre, a core-width in
    float core = exp(-0.5 * pow(off / (0.6 * uEdgeW), 2.0));
    float glow = uGlowAmt * exp(-0.5 * pow(off / uEdgeGlow, 2.0));
    // The outline: full cover a device px in, none at the triangle's edge.
    float cover = clamp(dev, 0.0, 1.0);

    // Fading into the dark with distance (the far blocks sink into the navy).
    float fade = 1.0 - smoothstep(uFar * 0.55, uFar, length(uEye - vWorld));

    float alpha = uAlpha * (0.8 + 0.2 * fres);
    vec3 body = uBody * 0.7 * alpha;
    vec3 add = (light * catchLight + uEdge * 0.25 * fres * uFresnel) * fade;
    add += (uEdge + light * 0.6) * (core + glow) * fade;
    fragColor = vec4(body + add, alpha) * cover;
}
`,Hr=`#version 300 es
// prism box.vert: the glass blocks, one instance each: a unit cube's
// corner (aCorner, 0–1) scaled to the block (aMin, aSize) and placed by the
// camera. Passes the world position, the face's normal and the point's
// place on the block (units from its min corner), for the edges and light.
layout(location = 0) in vec3 aCorner;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec3 aMin;
layout(location = 3) in vec3 aSize;

uniform mat4 uViewProj;

out vec3 vWorld;
out vec3 vLocal;
flat out vec3 vNormal;
flat out vec3 vSize;

void main() {
    vLocal = aCorner * aSize;
    vWorld = aMin + vLocal;
    vNormal = aNormal;
    vSize = aSize;
    gl_Position = uViewProj * vec4(vWorld, 1.0);
}
`,Ur=`#version 300 es
// prism full.vert: one triangle over the whole screen (no buffer: from
// gl_VertexID), for the background.
out vec2 vUv;

void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    vUv = p;
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;function Wr(e){let t=Number.parseInt(e.slice(1),16);return[(t>>16&255)/255,(t>>8&255)/255,(t&255)/255]}function Gr(e,t,n){return[e[0]+(t[0]-e[0])*n,e[1]+(t[1]-e[1])*n,e[2]+(t[2]-e[2])*n]}function Kr(e){let t=Wr(e.bg),n=Wr(e.accent),r=Wr(e.cool),i=[1,1,1],a=Gr(Gr(t,r,.12),n,.035),o=Gr(r,i,.3).map(e=>e*.45);return{navy:a,magenta:n,blue:r.map(e=>e*.55),edge:o}}function qr(e,t,n){let r=(t,n)=>{let r=e.createShader(t);return r?(e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(console.error(`prism shader:`,e.getShaderInfoLog(r)),null)):null},i=r(e.VERTEX_SHADER,t),a=r(e.FRAGMENT_SHADER,n),o=e.createProgram();if(!i||!a||!o)return null;if(e.attachShader(o,i),e.attachShader(o,a),e.linkProgram(o),!e.getProgramParameter(o,e.LINK_STATUS))return console.error(`prism program:`,e.getProgramInfoLog(o)),null;let s=new Map;return{program:o,u(t){return s.has(t)||s.set(t,e.getUniformLocation(o,t)),s.get(t)}}}function Jr(){let e=[[-1,0,0],[0,-1,0],[0,0,-1],[1,0,0],[0,1,0],[0,0,1]],t=[];for(let n of e){let e=n.findIndex(e=>e!==0),r=+(n[e]>0),[i,a]=[0,1,2].filter(t=>t!==e),o=(t,n)=>{let o=[0,0,0];return o[e]=r,o[i]=t,o[a]=n,o},s=[o(0,0),o(1,0),o(1,1),o(0,1)],c=s[1].map((e,t)=>e-s[0][t]),l=s[2].map((e,t)=>e-s[0][t]),u=[c[1]*l[2]-c[2]*l[1],c[2]*l[0]-c[0]*l[2],c[0]*l[1]-c[1]*l[0]];u[0]*n[0]+u[1]*n[1]+u[2]*n[2]<0&&(s=[s[0],s[3],s[2],s[1]]);for(let e of[0,1,2,0,2,3])t.push(...s[e],...n)}return new Float32Array(t)}function Yr(e){let t=qr(e,Ur,Br),n=qr(e,Hr,Vr);if(!t||!n)return null;let r=e.createBuffer(),i=e.createBuffer(),a=e.createVertexArray();return e.bindVertexArray(a),e.bindBuffer(e.ARRAY_BUFFER,r),e.bufferData(e.ARRAY_BUFFER,Jr(),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,3,e.FLOAT,!1,24,0),e.enableVertexAttribArray(1),e.vertexAttribPointer(1,3,e.FLOAT,!1,24,12),e.bindBuffer(e.ARRAY_BUFFER,i),e.enableVertexAttribArray(2),e.vertexAttribPointer(2,3,e.FLOAT,!1,24,0),e.vertexAttribDivisor(2,1),e.enableVertexAttribArray(3),e.vertexAttribPointer(3,3,e.FLOAT,!1,24,12),e.vertexAttribDivisor(3,1),e.bindVertexArray(null),{back:t,box:n,empty:e.createVertexArray(),boxVao:a,instances:i}}function Xr(e,t,n,r,i){let a=(e,t=1)=>`rgba(${e.map(e=>Math.round(Math.min(1,e)*255)).join(`, `)}, ${t})`;e.setTransform(r,0,0,r,0,0),e.fillStyle=a(i.navy),e.fillRect(0,0,t,n);for(let[r,o,s]of[[.15,.4,i.magenta],[.6,.35,i.blue]]){let i=e.createRadialGradient(t*r,n*o,0,t*r,n*o,n*.45);i.addColorStop(0,a(s,.22)),i.addColorStop(1,a(s,0)),e.fillStyle=i,e.fillRect(0,0,t,n)}}var Zr=16,Qr=.2;function $r(e,n,r=Math.random){let i=e,a=i.getContext(`webgl2`,{alpha:!1,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!0,powerPreference:`low-power`}),o=a?Yr(a):null,s=n.glow,c=Kr(n.palette),l=n.still,u=Mr(r),d=Uint16Array.from({length:u.count},(e,t)=>t),f=new Float32Array(u.count),p=new Float32Array(u.count*6),m=new Float32Array(64),h=new Float32Array(48),g=null,_=!1,v=0,y=0,b=0,x=!1,S=!1,C=()=>{if(g){if(a&&o&&!S){let{w:e,h:t,dpr:n,zoom:r}=g,i=Dr[s],l=Nr(b,e/t,r);a.viewport(0,0,a.drawingBufferWidth,a.drawingBufferHeight),a.disable(a.BLEND),a.useProgram(o.back.program),a.uniform3fv(o.back.u(`uBg`),c.navy),a.uniform3fv(o.back.u(`uAccent`),c.magenta),a.uniform3fv(o.back.u(`uCool`),c.blue),a.uniform2f(o.back.u(`uAspect`),e/t,1),a.uniform1f(o.back.u(`uLight`),i.light),a.bindVertexArray(o.empty),a.drawArrays(a.TRIANGLES,0,3),Pr(u,l,d,f);for(let e=0;e<u.count;e++){let t=d[e]*6;for(let n=0;n<6;n++)p[e*6+n]=u.boxes[t+n]}let _=Math.min(Zr,u.lights.length);for(let e=0;e<_;e++){let t=u.lights[e],n=t.kind===0?c.magenta:c.blue,r=t.strength*Fr(t,b)*i.light*Qr;m[e*4]=t.x,m[e*4+1]=t.y,m[e*4+2]=t.z,m[e*4+3]=t.reach,h[e*3]=n[0]*r,h[e*3+1]=n[1]*r,h[e*3+2]=n[2]*r}a.enable(a.BLEND),a.blendFunc(a.ONE,a.ONE_MINUS_SRC_ALPHA),a.useProgram(o.box.program),a.uniformMatrix4fv(o.box.u(`uViewProj`),!1,l.viewProj),a.uniform4fv(o.box.u(`uLightPos`),m),a.uniform3fv(o.box.u(`uLightCol`),h),a.uniform1i(o.box.u(`uLights`),_),a.uniform3fv(o.box.u(`uEye`),l.eye),a.uniform3fv(o.box.u(`uBody`),c.navy),a.uniform3fv(o.box.u(`uEdge`),c.edge),a.uniform1f(o.box.u(`uAlpha`),Cr.front),a.uniform1f(o.box.u(`uFresnel`),Cr.fresnel),a.uniform1f(o.box.u(`uDensity`),n),a.uniform1f(o.box.u(`uEdgeW`),Er.width),a.uniform1f(o.box.u(`uEdgeGlow`),Er.glow),a.uniform1f(o.box.u(`uGlowAmt`),i.edge),a.uniform1f(o.box.u(`uFar`),Q.distance*2),a.bindBuffer(a.ARRAY_BUFFER,o.instances),a.bufferData(a.ARRAY_BUFFER,p,a.STREAM_DRAW),a.bindVertexArray(o.boxVao),a.drawArraysInstanced(a.TRIANGLES,0,36,u.count),a.bindVertexArray(null),a.disable(a.BLEND)}else if(!a){let e=i.getContext(`2d`);e&&Xr(e,g.w,g.h,g.dpr,c)}x||(x=!0,n.onReady?.())}},w=e=>{v=0,_&&!l&&(y&&e-y<13.88888888888889||(b+=y?Math.min((e-y)/1e3,Or):0,y=e,C()),v=requestAnimationFrame(w))},T={resize(n,r,i,a){let o=t(n,r,i,1,kr);e.width=Math.round(o.w*o.dpr),e.height=Math.round(o.h*o.dpr),g={...o,zoom:a>0&&Number.isFinite(a)?a:1},C()},start(){_=!0,l||v||!o||(y=0,v=requestAnimationFrame(w))},stop(){_=!1,cancelAnimationFrame(v),v=0},setStill(e){l=e,l?T.stop():_&&T.start(),C()},setGlow(e){s=e,l&&C()},setPalette(e){c=Kr(e),l&&C()},destroy(){T.stop(),g=null}};return i.addEventListener(`webglcontextlost`,e=>{e.preventDefault(),S=!0}),i.addEventListener(`webglcontextrestored`,()=>{S=!1,o=a?Yr(a):null,C()}),T}var ei={id:`prism`,create:(e,t)=>$r(e,t)},ti=(e,[t,n])=>t+Math.floor(e()*(n-t+1)),ni=[` = `,`->`,` == `,` += `,`: `,`.`,` * `,` | `,` `,` `,` `];function ri(e,t){let n=2+Math.floor(e()*6),r=``;for(let i=0;i<n;i++)r+=t[Math.floor(e()*t.length)];return r}function ii(e,t,n){let r=ri(e,t);for(;r.length<n;){let n=ni[Math.floor(e()*ni.length)];r+=n+(e()<.12?`"${ri(e,t)}"`:ri(e,t))}return e()<.15&&(r+=`:`),r}function ai(e,t,n,r,i){let a=[],o=t/r.lanes,s=e();for(let t=-1;t<r.lanes;t++){let c=Math.floor(e()*(r.gap[1]+1));for(;c<n;){let l=Math.floor((t+s)*o+(e()-.5)*o*.25),u=ti(e,r.block),d=0;for(let t=0;t<u&&c<n;t++,c++){let t=ii(e,i,ti(e,r.length)),n=l+d*2,o=n<0?t.slice(-n):t;o.trim()&&a.push({row:c,col:Math.max(0,n),text:o}),t.endsWith(`:`)?d=Math.min(d+1,4):d>0&&e()<.25&&d--}c+=ti(e,r.gap)}}return a}var oi=[{font:9,lineHeight:1.4,speed:6,blur:.5,glowReach:0,glow:0,alpha:.3,tone:`far`,lanes:6,block:[6,16],gap:[0,1],length:[16,44],resolution:1,weight:0},{font:11,lineHeight:1.45,speed:10,blur:0,glowReach:4,glow:.25,alpha:.35,tone:`text`,lanes:5,block:[6,14],gap:[0,2],length:[14,40],resolution:1,weight:0},{font:15,lineHeight:1.5,speed:16,blur:0,glowReach:7,glow:.3,alpha:.45,tone:`text`,lanes:4,block:[5,12],gap:[1,3],length:[14,36],resolution:1,weight:.25},{font:24,lineHeight:1.45,speed:26,blur:.8,glowReach:16,glow:.45,alpha:.5,tone:`focus`,lanes:3,block:[5,12],gap:[1,3],length:[14,32],resolution:1,weight:.7},{font:38,lineHeight:1.4,speed:42,blur:5,glowReach:24,glow:.4,alpha:.2,tone:`accent`,lanes:2,block:[2,5],gap:[2,6],length:[8,18],resolution:.35,weight:1}],si={low:.45,medium:.75,high:1,max:1.4},ci=.6,li=1.4,ui=1.6,di=.6,fi=3,pi=.1,mi=`#version 300 es
// full.vert: one triangle covering the whole target, built from gl_VertexID
// alone (no buffers). vPos is the place on the target as shares of it:
// (0, 0) at the top left, (1, 1) at the bottom right.
out vec2 vPos;

void main() {
    vec2 share = vec2(gl_VertexID == 1 ? 2.0 : 0.0, gl_VertexID == 2 ? 2.0 : 0.0);
    vPos = share;
    gl_Position = vec4(share.x * 2.0 - 1.0, 1.0 - share.y * 2.0, 0.0, 1.0);
}
`,hi=`#version 300 es
// kernel.frag: QUANTUM KERNEL's whole frame in one pass (1.0). Each depth's
// sheet (engine.ts paintDepth: its code drawn once by the canvas, colour,
// glow and blur baked in) is a premultiplied texture, a loop repeating down
// the screen (GL_REPEAT). Each is read at its own scroll and laid over the
// ones behind it, back to front, on the background: source-over, as the
// canvas used to copy them one after another. The line being run in the
// focus depth gets its sheet added again over itself (the canvas's
// 'lighter', clamped as the canvas clamps), fading in and out. The sheets
// are the same as before, so the picture is too; only the copying moved to
// the graphics card (in a browser without one it cost the most of any
// wallpaper: half a second of every second at 1920 × 1080).
precision highp float;

uniform sampler2D uDepth0;
uniform sampler2D uDepth1;
uniform sampler2D uDepth2;
uniform sampler2D uDepth3;
uniform sampler2D uDepth4;
uniform float uOffset[5];   // each depth's scroll (px of the target)
uniform float uLoopH[5];    // each depth's loop height (px of the target)
uniform vec2 uScreen;       // the target (px)
uniform vec3 uBack;         // the background (--bg: black in every palette)
uniform vec4 uRunRect;      // the line being run (px: left, top, right, bottom)
uniform float uRun;         // how strongly it's added again now (0: none)

in vec2 vPos;
out vec4 fragColor;

// Depth i's sheet here: its loop read at its scroll.
vec4 sheet(sampler2D t, int i) {
    return texture(t, vec2(vPos.x, (vPos.y * uScreen.y + uOffset[i]) / uLoopH[i]));
}

void main() {
    vec2 p = vPos * uScreen;
    vec3 c = uBack;
    vec4 s = sheet(uDepth0, 0);
    c = c * (1.0 - s.a) + s.rgb;
    s = sheet(uDepth1, 1);
    c = c * (1.0 - s.a) + s.rgb;
    s = sheet(uDepth2, 2);
    c = c * (1.0 - s.a) + s.rgb;
    // The focus depth, then the line being run added again over it.
    s = sheet(uDepth3, 3);
    c = c * (1.0 - s.a) + s.rgb;
    float inRun = step(uRunRect.x, p.x) * step(p.x, uRunRect.z) * step(uRunRect.y, p.y) * step(p.y, uRunRect.w);
    c = min(c + s.rgb * uRun * inRun, vec3(1.0));
    s = sheet(uDepth4, 4);
    c = c * (1.0 - s.a) + s.rgb;
    fragColor = vec4(min(c, vec3(1.0)), 1.0);
}
`;function gi(e){let t=parseInt(e.replace(`#`,``),16);return[t>>16&255,t>>8&255,t&255]}function _i(e,t,n){let[r,i]=[gi(e),gi(t)];return`rgb(${r.map((e,t)=>Math.round(e+(i[t]-e)*n)).join(`, `)})`}function vi(e){return{far:_i(_i(e.bg,e.dim,.8),e.cool,.3),text:_i(e.text,e.cool,.35),focus:_i(e.accent,e.cool,.25),accent:_i(e.accent,e.cool,.4)}}function yi(e){let t=(t,n)=>{let r=e.createShader(t);return r?(e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(console.error(`quantum kernel shader:`,e.getShaderInfoLog(r)),null)):null},n=t(e.VERTEX_SHADER,mi),r=t(e.FRAGMENT_SHADER,hi),i=e.createProgram(),a=e.createVertexArray();if(!n||!r||!i||!a)return null;if(e.attachShader(i,n),e.attachShader(i,r),e.linkProgram(i),!e.getProgramParameter(i,e.LINK_STATUS))return console.error(`quantum kernel program:`,e.getProgramInfoLog(i)),null;let o=new Map,s=t=>(o.has(t)||o.set(t,e.getUniformLocation(i,t)),o.get(t));e.useProgram(i);for(let t=0;t<oi.length;t++)e.uniform1i(s(`uDepth${t}`),t);return{program:i,u:s,empty:a}}function bi(e){let[t,n,r]=gi(e);return[t/255,n/255,r/255]}function xi(){return typeof document>`u`?self.fonts:document.fonts}function Si(e,n,r=Math.random){let i=e,a=i.getContext(`webgl2`,{alpha:!1,antialias:!1,depth:!1,stencil:!1,preserveDrawingBuffer:!0,powerPreference:`low-power`}),o=a?yi(a):null,s=a?null:i.getContext(`2d`),c=!1,l=new Float32Array(oi.length),u=new Float32Array(oi.length),d=new Float32Array(4),f=bi(n.palette.bg),p=n.palette,m=n.glow,h=n.still,g={w:0,h:0,dpr:1},_=[],v=[...st],y=new Set,b=!1,x=!1,S=!1,C=!1,w=0,T=0,E=null,D=li*.5,O=e=>{let t=e.spec,n=vi(p)[t.tone],r=si[m],i=g.dpr*t.resolution,o=t.glowReach*r,s=Math.ceil(o*2+t.blur*3+e.lineH),c=Math.max(1,Math.round(g.w*i)),l=new OffscreenCanvas(c,Math.max(1,Math.round((e.loopH+2*s)*i))),u=l.getContext(`2d`);u.scale(i,i),u.font=`${t.font}px ${lt}`,u.textAlign=`center`,u.textBaseline=`middle`,u.fillStyle=n,u.strokeStyle=n,u.lineWidth=t.weight;for(let n of e.lines)for(let r of[-e.loopH,0,e.loopH]){let i=s+(n.row+.5)*e.lineH+r;if(!(i<-e.lineH||i>e.loopH+2*s+e.lineH))for(let r=0;r<n.text.length;r++){let a=n.text[r];if(a===` `)continue;let o=(n.col+r+.5)*e.colW;if(o>g.w+e.colW)break;y.has(a)?(u.save(),u.translate(o,i),u.scale(-1,1),u.fillText(a,0,0),t.weight>0&&u.strokeText(a,0,0),u.restore()):(u.fillText(a,o,i),t.weight>0&&u.strokeText(a,o,i))}}let d=new OffscreenCanvas(c,Math.max(1,Math.round(e.loopH*i))),f=d.getContext(`2d`),h=-s*i;o>0&&t.glow>0&&(f.filter=`blur(${o*i*.5}px)`,f.globalAlpha=Math.min(1,t.glow*r*.7),f.drawImage(l,0,h),f.globalCompositeOperation=`lighter`,f.filter=`blur(${o*i*.15}px)`,f.globalAlpha=Math.min(1,t.glow*r*.8),f.drawImage(l,0,h)),f.filter=t.blur>0?`blur(${t.blur*i}px)`:`none`,f.globalAlpha=t.alpha,f.drawImage(l,0,h),f.filter=`none`,f.globalAlpha=1,f.globalCompositeOperation=`source-over`,e.sheetW=d.width,e.sheetH=d.height,e.scale=i,a?(k(e,d),e.sheet=null):e.sheet=d},k=(e,t)=>{a&&o&&!c&&(e.tex??=a.createTexture(),a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,e.tex),a.pixelStorei(a.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!0),a.texImage2D(a.TEXTURE_2D,0,a.RGBA8,a.RGBA,a.UNSIGNED_BYTE,t),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.REPEAT))},A=()=>{if(a)for(let e of _)e.tex&&a.deleteTexture(e.tex);_=oi.map(e=>{let t=e.font*ci,n=e.font*e.lineHeight,i=Math.ceil(g.w/t),a=Math.max(8,Math.ceil(g.h/n)+2);return{spec:e,lines:ai(r,i,a,e,v),colW:t,lineH:n,loopH:a*n,sheet:null,sheetW:0,sheetH:0,scale:1,tex:null,offset:r()*a*n}}),j()},j=()=>{for(let e of _)O(e)},M=()=>_.find(e=>e.spec.tone===`focus`)??null,N=e=>{for(let t of _)t.offset=(t.offset+t.spec.speed*e)%t.loopH;let t=M();if(t&&t.lines.length!==0){if(E)E.t+=e,E.t>=1.6&&(E=null);else if((D-=e)<=0){D=li*(.6+r()*.8);let e=t.lines.map((e,t)=>({l:e,i:t})).filter(({l:e})=>{let n=((e.row*t.lineH-t.offset)%t.loopH+t.loopH)%t.loopH;return n>g.h*.05&&n<g.h*.9});e.length&&(E={line:e[Math.floor(r()*e.length)].i,t:0})}}},P=e=>{if(!e.sheet||!s)return;let t=g.dpr/e.scale,n=-e.offset*g.dpr,r=e.loopH*g.dpr;s.drawImage(e.sheet,0,n,e.sheet.width*t,r),s.drawImage(e.sheet,0,n+r,e.sheet.width*t,r)},F=()=>{let e=M();if(!E||!e||!e.sheetW)return null;let t=e.lines[E.line];if(!t)return null;let n=e.spec.glowReach*2,r=Math.max(0,(t.col*e.colW-n)*e.scale),i=Math.min(e.sheetW-r,(t.text.length*e.colW+2*n)*e.scale),a=t.row*e.lineH-n,o=Math.max(0,a*e.scale),s=Math.min(e.sheetH-o,(e.lineH+2*n)*e.scale);if(i<=0||s<=0)return null;let c=((a-e.offset)%e.loopH+e.loopH)%e.loopH,l=g.dpr/e.scale;return{sheet:e.sheet,sx:r,sy:o,sw:i,sh:s,x:r*l,y:c*g.dpr,w:i*l,h:s*l,strength:di*Math.sin(Math.PI*E.t/ui)}},ee=()=>{let e=F();e?.sheet&&s&&(s.globalCompositeOperation=`lighter`,s.globalAlpha=e.strength,s.drawImage(e.sheet,e.sx,e.sy,e.sw,e.sh,e.x,e.y,e.w,e.h),s.globalAlpha=1,s.globalCompositeOperation=`source-over`)},I=()=>{if(!a||!o||c||_.length!==oi.length)return;for(let e=0;e<_.length;e++){let t=_[e];l[e]=t.offset*g.dpr,u[e]=t.loopH*g.dpr,a.activeTexture(a.TEXTURE0+e),a.bindTexture(a.TEXTURE_2D,t.tex)}let t=F();d[0]=t?t.x:0,d[1]=t?t.y:0,d[2]=t?t.x+t.w:0,d[3]=t?t.y+t.h:0,a.viewport(0,0,e.width,e.height),a.useProgram(o.program),a.uniform1fv(o.u(`uOffset`),l),a.uniform1fv(o.u(`uLoopH`),u),a.uniform2f(o.u(`uScreen`),e.width,e.height),a.uniform3f(o.u(`uBack`),f[0],f[1],f[2]),a.uniform4fv(o.u(`uRunRect`),d),a.uniform1f(o.u(`uRun`),t?t.strength:0),a.bindVertexArray(o.empty),a.drawArrays(a.TRIANGLES,0,3),a.bindVertexArray(null)},L=()=>{if(a)I();else if(s){s.fillStyle=p.bg,s.fillRect(0,0,e.width,e.height);for(let e of _)P(e),e.spec.tone===`focus`&&ee()}else return;C||(C=!0,n.onReady?.())},R=e=>{if(w=0,!S||h)return;if(T&&e-T<13.88888888888889){w=requestAnimationFrame(R);return}let t=T?Math.min((e-T)/1e3,pi):0;T=e,N(t),L(),w=requestAnimationFrame(R)},z=()=>{!b||x||g.w<=0||g.h<=0||(e.width=Math.max(1,Math.round(g.w*g.dpr)),e.height=Math.max(1,Math.round(g.h*g.dpr)),A(),L())},B={resize(e,n,r,i){g=t(e,n,r,i,fi),z()},start(){S=!0,!b||h||w||(T=0,w=requestAnimationFrame(R))},stop(){S=!1,cancelAnimationFrame(w),w=0},setStill(e){h=e,h?(cancelAnimationFrame(w),w=0,L()):S&&B.start()},setGlow(e){e!==m&&(m=e,b&&(j(),L()))},setPalette(e){p=e,f=bi(e.bg),b&&(j(),L())},destroy(){if(x=!0,B.stop(),a)for(let e of _)e.tex&&a.deleteTexture(e.tex);_=[]}};return i.addEventListener(`webglcontextlost`,e=>{e.preventDefault(),c=!0}),i.addEventListener(`webglcontextrestored`,()=>{c=!1,o=a?yi(a):null;for(let e of _)e.tex=null;b&&(j(),L())}),(async()=>{try{await Promise.all(oi.map(e=>xi().load(`${e.font}px ${lt}`,ct)))}catch{}if(x)return;let e=pt(ct[0]);y=e?new Set(ct):new Set;let t=[...st].filter(e=>/[0-9A-Z]/.test(e));v=e?[...ct,...ct,...t]:t,b=!0,z(),S&&(S=!1,B.start())})(),B}var Ci={id:`quantum-kernel`,create:(e,t)=>Si(e,t)},wi=[{kind:`sky`,top:[0,0],bottom:.8,spacing:[0,0],slope:0,facet:.075,stretch:3.2,rough:.45,haze:0,snow:0,speed:3,resolution:.5,soften:0},{kind:`rock`,top:[.05,.27],bottom:.8,spacing:[.16,.42],slope:1.3,facet:.024,stretch:1.2,rough:.35,haze:.36,snow:.34,speed:6,resolution:1,soften:0},{kind:`rock`,top:[.34,.5],bottom:.76,spacing:[.28,.62],slope:.85,facet:.036,stretch:1.3,rough:.35,haze:.16,snow:0,speed:11,resolution:1,soften:0},{kind:`rock`,top:[.48,.62],bottom:.9,spacing:[.55,1.1],slope:.5,facet:.055,stretch:1.5,rough:.3,haze:0,snow:0,speed:18,resolution:1,soften:0},{kind:`cloud`,top:[.66,.73],bottom:.92,spacing:[.1,.18],slope:.85,facet:.024,stretch:1.3,rough:.35,haze:.18,snow:0,speed:24,resolution:1,soften:.8},{kind:`cloud`,top:[.75,.82],bottom:.99,spacing:[.14,.26],slope:.82,facet:.032,stretch:1.3,rough:.35,haze:.06,snow:0,speed:32,resolution:1,soften:1},{kind:`cloud`,top:[.84,.91],bottom:1.06,spacing:[.2,.36],slope:.8,facet:.042,stretch:1.3,rough:.35,haze:0,snow:0,speed:44,resolution:1,soften:1.2}],Ti=1.6,Ei={x:.85,y:.5,z:-.3},Di={x:.42,y:.25,reach:.38,strength:.42},Oi={low:.5,medium:.75,high:1,max:1.35},ki=3,Ai=.1,ji=(e,[t,n])=>t+e()*(n-t);function Mi(e,t,n){let r=((e-t)%n+n)%n;return Math.min(r,n-r)}function Ni(e,t,n){let r=[],i=0;for(;i<n;){let n=ji(e,t);r.push(n),i+=n}let a=n/i,o=[],s=e()*r[0]*a;for(let e of r)o.push(s%n),s+=e*a;return o}function Pi(e,t,n,r){let i=t.bottom*n;if(t.kind===`sky`)return()=>-t.facet*n*.5;let a=Ni(e,[t.spacing[0]*n,t.spacing[1]*n],r);if(t.kind===`rock`){let o=a.map(r=>({c:r,y:(t.top[0]+(t.top[1]-t.top[0])*e()**Fi)*n,s:t.slope*(.7+e()*.8)})),s=e=>{let t=i;for(let n of o)t=Math.min(t,n.y+n.s*Mi(e,n.c,r));return t},c=Ni(e,[t.facet*n*3,t.facet*n*7],r).map(r=>({c:r,y:s(r)-ji(e,[.2,1])*t.facet*n*Ii,s:t.slope*1.9}));return e=>{let t=s(e);for(let n of c)t=Math.min(t,n.y+n.s*Mi(e,n.c,r));return t}}let o=a.map((i,o)=>{let s=a.length;return{c:i,r:Math.max(Mi(i,a[(o+s-1)%s],r),Mi(i,a[(o+1)%s],r))*ji(e,[.6,.72]),y:ji(e,t.top)*n}});for(let n of[...o])e()<.8&&o.push({c:n.c+(e()-.5)*n.r*.8,r:n.r*ji(e,[.5,.7]),y:n.y-n.r*t.slope*ji(e,[.3,.55])});return e=>{let n=i;for(let i of o){let a=Mi(e,i.c,r)/i.r;a<1&&(n=Math.min(n,i.y+i.r*t.slope*(1-Math.sqrt(1-a*a))))}return n}}var Fi=.55,Ii=2.6,Li=.9,Ri=.52;function zi(e,t,n){if(e.length<2)return;let r=e.map(e=>e.light).sort((e,t)=>e-t),i=r[Math.floor(r.length*.1)],a=r[Math.floor(r.length*.9)],o=Math.max(.01,a-i);for(let r of e)r.light=Math.min(1,Math.max(0,t+(r.light-i)/o*(n-t)))}function Bi(e){let t=Math.hypot(e.x,e.y,e.z);return[e.x/t,e.y/t,e.z/t]}var Vi=Bi(Ei);function Hi(e,t,n,r){let i=Pi(e,t,n,r),a=t.bottom*n,o=t.facet*n,s=Math.max(4,Math.round(r/(o*t.stretch))),c=r/s,l=0;for(let e=0;e<s;e++)l+=i(e*c)/s;let u=Math.max(2,Math.round((a-l)/o)),d=Math.max(o,a-l),f=[];for(let n=0;n<s;n++){let r=[];for(let o=0;o<=u;o++){let s=o/u,l=(n+o%2*.5+(e()-.5)*t.rough)*c,f=i(l),p=o>0&&o<u?(e()-.5)*t.rough*((a-f)/u):0;r.push({x:l,y:f+(a-f)*s+p,z:(1-s)*d})}f.push(r)}let p=(e,t)=>{let n=f[e%s][t];return e>=s?{x:n.x+r,y:n.y,z:n.z}:n},m=[],h=(t.top[0]+t.snow*(t.bottom-t.top[0]))*n;for(let n=0;n<s;n++)for(let r=0;r<u;r++){let o=p(n,r),s=p(n+1,r),c=p(n+1,r+1),l=p(n,r+1),d=r%2==0?[[o,s,l],[s,c,l]]:[[o,s,c],[o,c,l]];for(let[n,o,s]of d){let c=(n.y+o.y+s.y)/3,l=Math.min(1,Math.max(0,(r+.5)/u)),d,f=1;if(t.kind===`cloud`){let t=i((n.x+o.x+s.x)/3),r=Math.min(1,Math.max(0,(c-t)/Math.max(1,(a-t)*Li)));d=Math.min(1,Math.max(0,.12+(1-r)**1.2*.85+(e()-.5)*.04))}else if(t.kind===`sky`)d=Math.min(1,Math.max(0,c/(a*Ri)+(e()-.5)*.16));else{let t=[o.x-n.x,n.y-o.y,o.z-n.z],r=[s.x-n.x,n.y-s.y,s.z-n.z],i=[t[1]*r[2]-t[2]*r[1],t[2]*r[0]-t[0]*r[2],t[0]*r[1]-t[1]*r[0]];i[1]<0&&(i=i.map(e=>-e));let a=Math.hypot(i[0],i[1],i[2])||1;f=i[1]/a;let c=(i[0]*Vi[0]+i[1]*Vi[1]+i[2]*Vi[2])/a;d=Math.min(1,Math.max(0,c+(e()-.5)*.08))}let p=t.snow>0&&c<h&&f>.35&&e()<.8;m.push({x:[n.x,o.x,s.x],y:[n.y,o.y,s.y],light:d,snow:p,depth:l})}}t.kind===`rock`&&zi(m,.06,.94);let g=[];for(let e=-1;e<=s+1;e++){let t=e<0?{x:p(s-1,0).x-r,y:p(s-1,0).y}:p(e,0);g.push({x:t.x,y:t.y})}let _=a;for(let e of g)_=Math.min(_,e.y);return{facets:m,outline:g,top:_,bottom:a}}function Ui(e){let t=parseInt(e.replace(`#`,``),16);return[t>>16&255,t>>8&255,t&255]}function $(e,t,n){return[e[0]+(t[0]-e[0])*n,e[1]+(t[1]-e[1])*n,e[2]+(t[2]-e[2])*n]}var Wi=1.6;function Gi(e,t){let n=Math.min(1,Math.max(0,t))*(e.length-1),r=Math.min(e.length-2,Math.floor(n));return $(e[r],e[r+1],n-r)}var Ki=[255,255,255],qi=[.16,.28,.46,.68,.88],Ji=.36;function Yi(e){let t=Ui(e.bg),n=Ui(e.cool),r=Ui(e.accent),i=Ui(e.bright),a=Ui(e.dim),o=$(t,n,.42),s=$($(n,r,.3),t,.45),c=$(r,t,.18),l=$(r,i,.3);return{sky:[$(t,n,.32),$($(n,a,.35),t,.42),$($(n,r,.45),t,.25),$(r,i,.42)],rock:[$(o,t,.35),o,s,c,l],snow:[$(n,i,.35),$(i,n,.2),$(i,r,.15)],cloud:qi.map(e=>$(t,Ki,e)),cloudHaze:$(t,Ki,Ji),haze:$($(n,a,.4),t,.3),glow:$(r,i,.45)}}function Xi(e,t,n){let r;return r=t.kind===`sky`?Gi(e.sky,n.light):n.snow?Gi(e.snow,n.light):t.kind===`cloud`?$(Gi(e.cloud,n.light),e.cloud[0],n.depth**1.5*.3):$(Gi(e.rock,n.light**Wi),e.rock[0],n.depth*.3),t.haze>0&&(r=$(r,t.kind===`cloud`?e.cloudHaze:e.haze,t.haze)),`rgb(${Math.round(r[0])}, ${Math.round(r[1])}, ${Math.round(r[2])})`}function Zi(e,t){let n=t.kind===`sky`?e.sky[1]:t.kind===`cloud`?e.cloud[0]:e.rock[1];return t.haze>0&&(n=$(n,t.kind===`cloud`?e.cloudHaze:e.haze,t.haze)),`rgb(${Math.round(n[0])}, ${Math.round(n[1])}, ${Math.round(n[2])})`}var Qi=4,$i=6;function ea(e,n,r=Math.random){let i=e.getContext(`2d`),a=n.palette,o=n.glow,s=n.still,c={w:0,h:0,dpr:1},l=0,u=[],d=null,f=!1,p=!1,m=!1,h=0,g=0,_=e=>{let t=e.spec,n=Yi(a),r=c.dpr*t.resolution,i=t.soften>0?Math.ceil(t.soften*3)+1:0,o=Math.max(0,Math.floor(e.shape.top)-i),s=Math.min(c.h,Math.ceil(e.shape.bottom),Math.ceil(e.hidden+$i+i)),u=Math.max(1,Math.round((l+Qi)*r)),d=Math.max(1,Math.round((s-o)*r)),f=i>0?new OffscreenCanvas(u+Math.round(2*i*r),d+Math.round(i*r)):new OffscreenCanvas(u,d),p=f.getContext(`2d`);p.scale(r,r),p.translate(i,-o),p.lineJoin=`round`,p.lineWidth=1/r;for(let r of[-l,0,l]){p.fillStyle=Zi(n,t),p.beginPath();let a=e.shape.outline;p.moveTo(a[0].x+r,a[0].y);for(let e of a)p.lineTo(e.x+r,e.y);p.lineTo(a[a.length-1].x+r,s+i+2),p.lineTo(a[0].x+r,s+i+2),p.closePath(),p.fill()}for(let r of e.shape.facets){let e=Xi(n,t,r);p.fillStyle=e,p.strokeStyle=e;for(let e of[-l,0,l]){let t=Math.min(r.x[0],r.x[1],r.x[2])+e;Math.max(r.x[0],r.x[1],r.x[2])+e<-i-2||t>l+Qi+i+2||(p.beginPath(),p.moveTo(r.x[0]+e,r.y[0]),p.lineTo(r.x[1]+e,r.y[1]),p.lineTo(r.x[2]+e,r.y[2]),p.closePath(),p.fill(),p.stroke())}}let m=f;if(i>0){m=new OffscreenCanvas(u,d);let e=m.getContext(`2d`);e.filter=`blur(${t.soften*r}px)`,e.drawImage(f,-Math.round(i*r),0)}e.strip=m,e.y0=o,e.scale=r},v=()=>{let e=.25,t=Math.max(1,Math.round(c.w*e)),n=Math.max(1,Math.round(c.h*e)),r=new OffscreenCanvas(t,n),i=r.getContext(`2d`),[s,l,u]=Yi(a).glow.map(Math.round),f=Di.strength*Oi[o];i.translate(Di.x*t,Di.y*n),i.scale(2.2,1);let p=Di.reach*n,m=i.createRadialGradient(0,0,0,0,0,p);for(let e of[0,.25,.5,.75,1])m.addColorStop(e,`rgba(${s}, ${l}, ${u}, ${(f*(1-e)**2).toFixed(3)})`);i.fillStyle=m,i.fillRect(-p,-p,p*2,p*2),d=r},y=()=>{l=Math.round(c.w*Ti),u=wi.map(e=>({spec:e,shape:Hi(r,e,c.h,l),strip:null,y0:0,scale:1,offset:r()*l,hidden:1/0}));let e=1/0;for(let t=u.length-1;t>=0;t--){let n=u[t];n.hidden=e;let r=0;for(let e of n.shape.outline)r=Math.max(r,e.y);e=Math.min(e,r)}b()},b=()=>{for(let e of u)_(e);v()},x=e=>{for(let t of u)t.offset=(t.offset+t.spec.speed*e)%l},S=t=>{if(!t.strip||!i)return;let n=l*c.dpr,r=t.strip.width/t.scale*c.dpr,a=t.strip.height/t.scale*c.dpr,o=t.y0*c.dpr,s=-t.offset*c.dpr;i.drawImage(t.strip,s,o,r,a),s+n<e.width&&i.drawImage(t.strip,s+n,o,r,a)},C=()=>{i&&(i.fillStyle=a.bg,i.fillRect(0,0,e.width,e.height),u.forEach((t,n)=>{S(t),n===0&&d&&(i.globalCompositeOperation=`lighter`,i.drawImage(d,0,0,e.width,e.height),i.globalCompositeOperation=`source-over`)}),m||(m=!0,n.onReady?.()))},w=e=>{if(h=0,!p||s)return;if(g&&e-g<13.88888888888889){h=requestAnimationFrame(w);return}let t=g?Math.min((e-g)/1e3,Ai):0;g=e,x(t),C(),h=requestAnimationFrame(w)},T=()=>{f||c.w<=0||c.h<=0||(e.width=Math.max(1,Math.round(c.w*c.dpr)),e.height=Math.max(1,Math.round(c.h*c.dpr)),y(),C())},E={resize(e,n,r,i){c=t(e,n,r,i,ki),T()},start(){p=!0,s||h||(g=0,h=requestAnimationFrame(w))},stop(){p=!1,cancelAnimationFrame(h),h=0},setStill(e){s=e,s?(cancelAnimationFrame(h),h=0,C()):p&&E.start()},setGlow(e){e!==o&&(o=e,v(),C())},setPalette(e){a=e,u.length!==0&&(b(),C())},destroy(){f=!0,E.stop(),u=[],d=null}};return E}var ta={id:`summit`,create:(e,t)=>ea(e,t)},na={width:[.2,.26],lean:[.11,.16],alpha:[.85,1],speed:[.0035,.006]},ra={width:[.07,.2],lean:[0,.05],alpha:[.1,.22],speed:[.006,.014]},ia=.18,aa=.35,oa=4.5,sa=[.35,1.1],ca=[.12,.45],la=[.8,2.2],ua=.2,da=[.05,.22],fa={low:.75,medium:.9,high:1,max:1.18},pa=.1,ma=3,ha=(e,[t,n])=>t+(n-t)*e();function ga(e){let t=parseInt(e.replace(`#`,``),16);return[t>>16&255,t>>8&255,t&255]}function _a(e){let t=ga(e.cool),n=ga(e.accent);return{pale:t.map((e,t)=>Math.round(e+(255-e)*(t===2?.92:.62))).join(`, `),red:n.join(`, `),flare:((e,t)=>e.map(e=>Math.round(e+(255-e)*t)).join(`, `))(t,.35)}}function va(e,t,n=Math.random){let r=e.getContext(`2d`),i=t.palette,a=t.glow,o=t.still,s=0,c=0,l=1,u=1,d=!1,f=!1,p=0,m=0,h=0,g=_a(i),_=[],v=[],y=[],b=null,x=(e,t,r)=>{let i=ha(n,t.width)*s*u,a=ha(n,t.lean)*s;return{kind:e,width:i,lean:a,x:r?n()*s:-i-a,alpha:ha(n,t.alpha),speed:ha(n,t.speed)*s*u,phase:n()*6.28}},S=()=>{let e=new OffscreenCanvas(4,96),t=e.getContext(`2d`);if(!t||!r)return null;for(let e=0;e<96;e++)t.fillStyle=`rgba(255, 255, 255, ${(n()<.12?.6+n()*.4:n()*.25).toFixed(3)})`,t.fillRect(0,e,4,1);return r.createPattern(e,`repeat`)},C=()=>{let e=x(`pale`,na,!0);e.x=s*(-.03+n()*.06),_=[e,...Array.from({length:3},(e,t)=>{let r=x(`red`,ra,!0);return r.x=s*(.42+t*.55/3+n()*.06),r})],v=[],y=Array.from({length:10},()=>({y:c*n()**1.5,alpha:ha(n,da),rate:.3+n()*1.2,phase:n()*6.28})),b=S(),b?.setTransform({a:u,b:0,c:0,d:u,e:0,f:0})},w=e=>{for(let t of _)t.x+=t.speed*e,t.x-t.lean>s+t.width&&Object.assign(t,x(t.kind,t.kind===`pale`?na:ra,!1));for(h+=oa*e;h>=1;){--h;let e=c*Math.min(1,n()**2.6);v.push({x:0,y:e,speed:ha(n,sa)*s*u,length:ha(n,ca)*s*u,width:ha(n,la)*u,pale:n()<ua,alpha:.35+n()*.6})}for(let t of v)t.x+=t.speed*e;v=v.filter(e=>e.x-e.length<s)},T=n=>{if(!r||!s)return;let i=fa[a];r.setTransform(1,0,0,1,0,0),r.globalCompositeOperation=`source-over`,r.clearRect(0,0,e.width,e.height),r.globalCompositeOperation=`lighter`;for(let e of _){let t=e.kind===`pale`,a=t?g.pale:g.red,o=Math.min(1,e.alpha*i*(.9+.1*Math.sin(n*.4+e.phase))),s=t?ia*.45:ia;if(r.setTransform(l,0,-l*e.lean/c,l,l*e.lean,0),t){let t=r.createLinearGradient(e.x-e.width*.6,0,e.x+e.width*1.6,0);t.addColorStop(0,`rgba(${a}, 0)`),t.addColorStop(.35,`rgba(${a}, ${.12*o})`),t.addColorStop(.65,`rgba(${a}, ${.12*o})`),t.addColorStop(1,`rgba(${a}, 0)`),r.fillStyle=t,r.fillRect(e.x-e.width*.6,0,e.width*2.2,c)}let u=r.createLinearGradient(e.x,0,e.x+e.width,0);if(u.addColorStop(0,`rgba(${a}, 0)`),u.addColorStop(s,`rgba(${a}, ${o})`),u.addColorStop(1-s,`rgba(${a}, ${o*.92})`),u.addColorStop(1,`rgba(${a}, 0)`),r.fillStyle=u,r.fillRect(e.x,0,e.width,c),!t){let t=r.createLinearGradient(0,0,0,c);t.addColorStop(0,`rgba(${a}, ${o*.55})`),t.addColorStop(.45,`rgba(${a}, 0)`),r.fillStyle=t,r.fillRect(e.x+e.width*s,0,e.width*(1-2*s),c)}b&&(r.globalAlpha=aa*o*(t?.22:1),r.fillStyle=b,r.fillRect(e.x+e.width*ia*.5,0,e.width*(1-ia),c),r.globalAlpha=1)}r.setTransform(l,0,0,l,0,0);for(let e of y){let t=e.alpha*i*(.55+.45*Math.sin(n*e.rate+e.phase)),a=r.createLinearGradient(0,0,s,0);a.addColorStop(0,`rgba(${g.red}, 0)`),a.addColorStop(.45,`rgba(${g.red}, ${t})`),a.addColorStop(1,`rgba(${g.red}, ${t*.4})`),r.fillStyle=a,r.fillRect(0,e.y,s,u)}for(let e of v){let t=e.pale?g.pale:g.red,n=r.createLinearGradient(e.x-e.length,0,e.x,0);n.addColorStop(0,`rgba(${t}, 0)`),n.addColorStop(1,`rgba(${t}, ${Math.min(1,e.alpha*i)})`),r.fillStyle=n,r.fillRect(e.x-e.length,e.y-e.width/2,e.length,e.width),r.globalAlpha=.18*i,r.fillRect(e.x-e.length,e.y-e.width*2,e.length,e.width*4),r.globalAlpha=1}let o=.85+.15*Math.sin(n*.25),d=s*.995,p=c*.88,m=s*.17*u,h=r.createRadialGradient(d,p,0,d,p,m);h.addColorStop(0,`rgba(${g.pale}, ${.95*i*o})`),h.addColorStop(.18,`rgba(${g.flare}, ${.6*i*o})`),h.addColorStop(.5,`rgba(${g.flare}, ${.16*i*o})`),h.addColorStop(1,`rgba(${g.flare}, 0)`),r.fillStyle=h,r.fillRect(d-m,p-m,2*m,2*m),r.strokeStyle=`rgba(${g.flare}, ${.45*i*o})`,r.lineWidth=4*u,r.beginPath(),r.arc(d+(s*.72-d)*u,p+(c*.5-p)*u,s*.36*u,Math.PI*.08,Math.PI*.4),r.stroke(),r.globalCompositeOperation=`source-over`,f||(f=!0,t.onReady?.())},E=e=>{if(p=0,!d||o)return;if(m&&e-m<13.88888888888889){p=requestAnimationFrame(E);return}let t=m?Math.min((e-m)/1e3,pa):0;m=e,w(t),T(e/1e3),p=requestAnimationFrame(E)},D={resize(t,n,r,i){let a=Math.min(ma,Math.max(1,r));e.width=Math.round(t*a),e.height=Math.round(n*a);let o=i>0&&Number.isFinite(i)?i:1,d=t!==s||n!==c||o!==u;s=t,c=n,l=a,u=o,(d||!b)&&C(),T(performance.now()/1e3)},start(){d=!0,o||p||(m=0,p=requestAnimationFrame(E))},stop(){d=!1,cancelAnimationFrame(p),p=0},setStill(e){o=e,o?D.stop():d&&D.start(),T(performance.now()/1e3)},setGlow(e){a=e,o&&T(performance.now()/1e3)},setPalette(e){i=e,g=_a(i),o&&T(performance.now()/1e3)},destroy(){D.stop(),s=0}};return D}var ya=[Dt,yr,{id:`velocity`,create:(e,t)=>va(e,t)},R,Tn,Te,Je,ei,Ci,ta];function ba(t){let n=e(t);return ya.find(e=>e.id===n)??ya[0]}export{ba as findWallpaper};