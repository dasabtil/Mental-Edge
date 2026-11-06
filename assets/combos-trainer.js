/* Mental Edge · entraînement au comptage de combos (river)
   Moteur : spots générés au hasard (board de 5 cartes + range + question), comptage exact par énumération.
   Le coeur (jusqu'à "interface") reste en JavaScript très simple pour pouvoir être testé hors navigateur. */
(function(root){
  "use strict";
  var RANKS="23456789TJQKA";
  var SUITSYM=["♠","♥","♦","♣"]; /* pique, coeur, carreau, trèfle */
  var CATS=["hauteur","paire","deux paires","brelan","quinte","couleur","full","carré","quinte flush"];
  var MAXC=40; /* au-delà, le comptage de tête n'a plus de sens */

  function straightHigh(mask){
    var h;
    for(h=12;h>=4;h--){ if(((mask>>(h-4))&31)===31) return h; }
    if((mask&0x100F)===0x100F) return 3; /* A2345 */
    return -1;
  }
  function pack(cat,ks){
    var v=cat,i;
    for(i=0;i<5;i++){ v=v*16+(i<ks.length?ks[i]+1:0); }
    return v;
  }
  /* cs : 5 à 7 cartes (entier = rang*4 + couleur, rang 0 = deux, 12 = as). Renvoie un score comparable. */
  function evaluate(cs){
    var cnt=[0,0,0,0,0,0,0,0,0,0,0,0,0],sc=[0,0,0,0],sm=[0,0,0,0],mask=0,i,c,r,s,k;
    for(i=0;i<cs.length;i++){c=cs[i];r=c>>2;s=c&3;cnt[r]++;sc[s]++;sm[s]|=(1<<r);mask|=(1<<r);}
    var fs=-1;
    for(s=0;s<4;s++){ if(sc[s]>=5) fs=s; }
    if(fs>=0){ var sf=straightHigh(sm[fs]); if(sf>=0) return pack(8,[sf]); }
    var quads=-1,trips=[],pairs=[],singles=[];
    for(r=12;r>=0;r--){
      if(cnt[r]===4) quads=r;
      else if(cnt[r]===3) trips.push(r);
      else if(cnt[r]===2) pairs.push(r);
      else if(cnt[r]===1) singles.push(r);
    }
    if(quads>=0){
      k=-1;
      for(r=12;r>=0;r--){ if(r!==quads&&cnt[r]>0){k=r;break;} }
      return pack(7,[quads,k]);
    }
    if(trips.length>=1&&(trips.length>=2||pairs.length>=1)){
      var p2;
      if(trips.length>=2){ p2=trips[1]; if(pairs.length&&pairs[0]>p2) p2=pairs[0]; }
      else p2=pairs[0];
      return pack(6,[trips[0],p2]);
    }
    if(fs>=0){
      var f=[];
      for(r=12;r>=0&&f.length<5;r--){ if(sm[fs]&(1<<r)) f.push(r); }
      return pack(5,f);
    }
    var sh=straightHigh(mask);
    if(sh>=0) return pack(4,[sh]);
    if(trips.length===1) return pack(3,[trips[0],singles[0],singles[1]]);
    if(pairs.length>=2){
      k=-1;
      for(r=12;r>=0;r--){ if(r!==pairs[0]&&r!==pairs[1]&&cnt[r]>0){k=r;break;} }
      return pack(2,[pairs[0],pairs[1],k]);
    }
    if(pairs.length===1) return pack(1,[pairs[0],singles[0],singles[1],singles[2]]);
    return pack(0,singles.slice(0,5));
  }
  function catOf(score){ return Math.floor(score/1048576); }

  /* "AKs" -> 4 combos, "AKo" -> 12, "TT" -> 6 */
  function combosOf(hand){
    var a=RANKS.indexOf(hand.charAt(0)),b=RANKS.indexOf(hand.charAt(1)),out=[],s,t;
    if(a===b){ for(s=0;s<4;s++){ for(t=s+1;t<4;t++){ out.push([a*4+s,a*4+t]); } } }
    else if(hand.charAt(2)==="s"){ for(s=0;s<4;s++){ out.push([a*4+s,b*4+s]); } }
    else { for(s=0;s<4;s++){ for(t=0;t<4;t++){ if(s!==t) out.push([a*4+s,b*4+t]); } } }
    return out;
  }
  function has(arr,x){ var i; for(i=0;i<arr.length;i++){ if(arr[i]===x) return true; } return false; }

  /* Mains d'une range retenues : fréquence >= seuil. Ordre de la grille (paires, suited, offsuit par hauteur). */
  function rangeHands(range,seuil){
    var out=[],i,j,h,f;
    for(i=12;i>=0;i--){ for(j=12;j>=0;j--){
      if(i===j) h=RANKS.charAt(i)+RANKS.charAt(j);
      else if(i>j) h=RANKS.charAt(i)+RANKS.charAt(j)+"s";
      else h=RANKS.charAt(j)+RANKS.charAt(i)+"o";
      f=range.hands[h];
      if(typeof f==="number"&&f>=seuil) out.push(h);
    } }
    return out;
  }

  /* Détail de chaque combo vivant de la range sur ce board. dead = cartes du héros (bloqueurs). */
  function analyse(hands,board,dead){
    var res=[],i,j,cs,c1,c2,score,cat,br=[],topB=-1,r;
    for(i=0;i<board.length;i++){ r=board[i]>>2; br.push(r); if(r>topB) topB=r; }
    for(i=0;i<hands.length;i++){
      cs=combosOf(hands[i]);
      for(j=0;j<cs.length;j++){
        c1=cs[j][0];c2=cs[j][1];
        if(has(board,c1)||has(board,c2)) continue;
        if(dead&&(has(dead,c1)||has(dead,c2))) continue;
        score=evaluate(board.concat([c1,c2]));
        cat=catOf(score);
        res.push({hand:hands[i],c1:c1,c2:c2,score:score,cat:cat,sub:subLabel(cat,score,c1,c2,br,topB)});
      }
    }
    return res;
  }
  function subLabel(cat,score,c1,c2,br,topB){
    var r1=c1>>2,r2=c2>>2,pr;
    if(cat===3) return (r1===r2)?"brelan (set)":"brelan (trips)";
    if(cat===1){
      pr=Math.floor(score/65536)%16-1; /* rang de la paire */
      if(r1===r2&&r1>topB) return "overpair";
      if(pr===topB&&(r1===topB||r2===topB)) return "top paire";
      return "paire";
    }
    return CATS[cat];
  }

  function boardInfo(board){
    var cnt=[0,0,0,0,0,0,0,0,0,0,0,0,0],sc=[0,0,0,0],i,paired=false,fl=0;
    for(i=0;i<board.length;i++){ cnt[board[i]>>2]++; sc[board[i]&3]++; }
    for(i=0;i<13;i++){ if(cnt[i]>=2) paired=true; }
    for(i=0;i<4;i++){ if(sc[i]>fl) fl=sc[i]; }
    return {paired:paired,flush3:fl>=3};
  }

  /* Questions par catégorie. ok(info) = la question a un sens sur ce board ; t(x) = le combo est compté. */
  var QUESTIONS=[
    {id:"full+",txt:"ont un full ou mieux",ok:function(b){return b.paired;},t:function(x){return x.cat>=6;}},
    {id:"flush",txt:"ont une couleur (pas mieux)",ok:function(b){return b.flush3;},t:function(x){return x.cat===5;}},
    {id:"flush+",txt:"ont une couleur ou mieux",ok:function(b){return b.flush3;},t:function(x){return x.cat>=5;}},
    {id:"straight",txt:"ont une quinte (pas mieux)",ok:function(b){return true;},t:function(x){return x.cat===4;}},
    {id:"straight+",txt:"ont une quinte ou mieux",ok:function(b){return true;},t:function(x){return x.cat>=4;}},
    {id:"trips",txt:"ont un brelan (pas mieux)",ok:function(b){return true;},t:function(x){return x.cat===3;}},
    {id:"trips+",txt:"ont un brelan ou mieux",ok:function(b){return true;},t:function(x){return x.cat>=3;}},
    {id:"twopair",txt:"ont deux paires (pas mieux)",ok:function(b){return !b.paired;},t:function(x){return x.cat===2;}},
    {id:"twopair+",txt:"ont deux paires ou mieux",ok:function(b){return !b.paired;},t:function(x){return x.cat>=2;}},
    {id:"toppair",txt:"ont la top paire (pas mieux)",ok:function(b){return !b.paired;},t:function(x){return x.sub==="top paire";}},
    {id:"overpair",txt:"ont une overpair (pas mieux)",ok:function(b){return !b.paired;},t:function(x){return x.sub==="overpair";}}
  ];
  function questionById(id){ var i; for(i=0;i<QUESTIONS.length;i++){ if(QUESTIONS[i].id===id) return QUESTIONS[i]; } return null; }

  /* Tous les comptes d'un spot (sert aux tests et à la génération). */
  function countAll(hands,board,hero){
    var list=analyse(hands,board,hero||null),bi=boardInfo(board),out={},i,j,q,n,hs,beat=0,tie=0;
    for(i=0;i<QUESTIONS.length;i++){
      q=QUESTIONS[i];
      if(!q.ok(bi)){ out[q.id]=-1; continue; }
      n=0;
      for(j=0;j<list.length;j++){ if(q.t(list[j])) n++; }
      out[q.id]=n;
    }
    if(hero){
      hs=evaluate(board.concat(hero));
      for(j=0;j<list.length;j++){ if(list[j].score>hs) beat++; else if(list[j].score===hs) tie++; }
      out.beat=beat; out.tie=tie;
    }
    out.alive=list.length;
    return out;
  }

  root.ComboCore={evaluate:evaluate,catOf:catOf,combosOf:combosOf,rangeHands:rangeHands,analyse:analyse,countAll:countAll,boardInfo:boardInfo,QUESTIONS:QUESTIONS,CATS:CATS,RANKS:RANKS};

  /* ======================= interface ======================= */
  if(typeof document==="undefined") return;

  var $=function(id){return document.getElementById(id);};
  var DATA=root.COMBO_RANGES||{ranges:[],seuil:50};
  var SEUIL=DATA.seuil||50;
  var CLE_REG="comboReglages",CLE_VUS="comboVus",CLE_STATS="comboStats";
  var spot=null,t0=0,repondu=false,serie={n:0,exact:0,abs:0,ms:0};

  function lire(cle,def){ try{ var v=JSON.parse(localStorage.getItem(cle)||"null"); return v===null?def:v; }catch(e){ return def; } }
  function ecrire(cle,v){ try{ localStorage.setItem(cle,JSON.stringify(v)); }catch(e){} }

  function rnd(n){ return Math.floor(Math.random()*n); }
  function tirerCartes(n,exclues){
    var out=[],c;
    while(out.length<n){ c=rnd(52); if(!has(out,c)&&!(exclues&&has(exclues,c))) out.push(c); }
    return out;
  }
  function tirerBoard(){
    var b,bi,i;
    for(i=0;i<20;i++){
      b=tirerCartes(5,null);bi=boardInfo(b);
      if(bi.paired||bi.flush3||Math.random()<0.5) return b; /* un peu plus de boards appariés ou à couleur */
    }
    return b;
  }
  function trierBoard(b){ return b.slice().sort(function(x,y){ return (y>>2)-(x>>2)||(x&3)-(y&3); }); }
  function cle(s){ return s.range.id+"|"+s.qid+"|"+s.board.slice().sort(function(a,b){return a-b;}).join(".")+"|"+(s.hero?s.hero.slice().sort(function(a,b){return a-b;}).join("."):""); }

  function groupes(list){
    /* regroupe les combos comptés par type de main, du plus fort au plus faible */
    var ordre=["quinte flush","carré","full","couleur","quinte","brelan (set)","brelan (trips)","deux paires","overpair","top paire","paire","hauteur"];
    var map={},i,x,g,out=[];
    for(i=0;i<list.length;i++){
      x=list[i];
      if(!map[x.sub]) map[x.sub]={label:x.sub,n:0,mains:{},ordreMains:[]};
      g=map[x.sub];g.n++;
      if(!g.mains[x.hand]){ g.mains[x.hand]=0; g.ordreMains.push(x.hand); }
      g.mains[x.hand]++;
    }
    for(i=0;i<ordre.length;i++){ if(map[ordre[i]]) out.push(map[ordre[i]]); }
    return out;
  }

  function construireCat(range,hands,board){
    var list=analyse(hands,board,null),bi=boardInfo(board),cands=[],i,j,q,sel,n;
    for(i=0;i<QUESTIONS.length;i++){
      q=QUESTIONS[i];
      if(!q.ok(bi)) continue;
      sel=[];
      for(j=0;j<list.length;j++){ if(q.t(list[j])) sel.push(list[j]); }
      n=sel.length;
      if(n>MAXC) continue;
      if(n===0&&Math.random()>0.04) continue; /* un zéro de temps en temps, pas plus */
      cands.push({q:q,sel:sel});
    }
    if(!cands.length) return null;
    var c=cands[rnd(cands.length)];
    return {range:range,board:board,hero:null,qid:c.q.id,texte:"Combien de combos de cette range "+c.q.txt+" ?",reponse:c.sel.length,groupes:groupes(c.sel),egalites:0,mainHeros:""};
  }
  function construireBeat(range,hands,board){
    var i,hero,hs,cat,list,sel,eg,j,sub,br=[],topB=-1,r;
    for(i=0;i<board.length;i++){ r=board[i]>>2; br.push(r); if(r>topB) topB=r; }
    for(i=0;i<60;i++){
      hero=tirerCartes(2,board);
      hs=evaluate(board.concat(hero));cat=catOf(hs);
      if(cat<1||cat>5) continue;
      sub=subLabel(cat,hs,hero[0],hero[1],br,topB);
      if(cat===1&&sub==="paire") continue; /* une main qui vaut la peine d'être défendue */
      list=analyse(hands,board,hero);sel=[];eg=0;
      for(j=0;j<list.length;j++){ if(list[j].score>hs) sel.push(list[j]); else if(list[j].score===hs) eg++; }
      if(sel.length<1||sel.length>MAXC) continue;
      return {range:range,board:board,hero:hero,qid:"beat",texte:"Combien de combos de cette range battent ta main ? (égalités non comptées)",reponse:sel.length,groupes:groupes(sel),egalites:eg,mainHeros:sub};
    }
    return null;
  }
  function nouveauSpot(){
    var reg=reglages(),vus=lire(CLE_VUS,[]),essai,range,hands,board,type,s,dernier=null,dispo=[],i;
    for(i=0;i<DATA.ranges.length;i++){ if(reg.range==="toutes"||DATA.ranges[i].id===reg.range) dispo.push(DATA.ranges[i]); }
    if(!dispo.length) return null;
    for(essai=0;essai<300;essai++){
      range=dispo[rnd(dispo.length)];
      hands=rangeHands(range,SEUIL);
      board=tirerBoard();
      type=reg.type==="mix"?(Math.random()<0.4?"beat":"cat"):reg.type;
      s=(type==="beat")?construireBeat(range,hands,board):construireCat(range,hands,board);
      if(!s) continue;
      s.board=trierBoard(s.board);
      s.cle=cle(s);dernier=s;
      if(has(vus,s.cle)) continue;
      vus.push(s.cle);
      if(vus.length>3000) vus=vus.slice(vus.length-3000);
      ecrire(CLE_VUS,vus);
      return s;
    }
    return dernier;
  }

  function carteHTML(c){ return "<span class=\"cb-carte cb-s"+(c&3)+"\">"+RANKS.charAt(c>>2)+"<i>"+SUITSYM[c&3]+"</i></span>"; }
  function reglages(){ return {range:$("cbRange").value||"toutes",type:$("cbType").value||"mix"}; }

  function afficherSpot(){
    spot=nouveauSpot();
    repondu=false;
    $("cbFeedback").innerHTML="";
    $("cbAns").value="";
    $("cbOk").textContent="Valider";
    if(!spot){ $("cbQ").textContent="Aucune range disponible (assets/combos-ranges.js introuvable)."; return; }
    var i,h="";
    for(i=0;i<spot.board.length;i++) h+=carteHTML(spot.board[i]);
    $("cbRangeLbl").textContent=spot.range.label;
    $("cbBoard").innerHTML=h;
    if(spot.hero){ $("cbHero").innerHTML="Ta main : "+carteHTML(spot.hero[0])+carteHTML(spot.hero[1])+" <span class=\"cb-mainlbl\">("+spot.mainHeros+")</span>"; }
    else $("cbHero").innerHTML="";
    $("cbQ").textContent=spot.texte;
    if($("cbGrid").className.indexOf("ouvert")>=0) dessinerGrille();
    t0=Date.now();
  }

  function valider(){
    if(!spot) return;
    if(repondu){ afficherSpot(); $("cbAns").focus(); return; }
    var brut=$("cbAns").value,n=parseInt(brut,10);
    if(brut===""||isNaN(n)||n<0) { $("cbAns").focus(); return; }
    repondu=true;
    var ms=Date.now()-t0,ecart=Math.abs(n-spot.reponse),ok=(ecart===0),i,j,g,m,lignes="";
    serie.n++;serie.abs+=ecart;serie.ms+=ms;if(ok)serie.exact++;
    var tot=lire(CLE_STATS,{n:0,exact:0,abs:0,ms:0});
    tot.n++;tot.abs+=ecart;tot.ms+=ms;if(ok)tot.exact++;
    ecrire(CLE_STATS,tot);
    for(i=0;i<spot.groupes.length;i++){
      g=spot.groupes[i];m=[];
      for(j=0;j<g.ordreMains.length;j++) m.push(g.ordreMains[j]+" ×"+g.mains[g.ordreMains[j]]);
      lignes+="<tr><td>"+g.label+"</td><td class=\"cb-n\">"+g.n+"</td><td>"+m.join(" · ")+"</td></tr>";
    }
    var tete="<div class=\"cb-verdict "+(ok?"cb-ok":"cb-ko")+"\">"+(ok?"Exact · ":"Écart de "+ecart+" · Bonne réponse : ")+spot.reponse+" combo"+(spot.reponse>1?"s":"")+" <span class=\"cb-temps\">· "+Math.round(ms/1000)+" s</span></div>";
    if(!ok) tete+="<div class=\"cb-ta\">Ta réponse : "+n+"</div>";
    var pied=(spot.qid==="beat"&&spot.egalites)?"<div class=\"cb-ta\">Égalités avec ta main (non comptées) : "+spot.egalites+"</div>":"";
    $("cbFeedback").innerHTML=tete+(lignes?"<div class=\"tablewrap\"><table class=\"cb-detail\">"+lignes+"</table></div>":"<div class=\"cb-ta\">Aucun combo.</div>")+pied;
    $("cbOk").textContent="Spot suivant";
    stats();
  }
  function stats(){
    var tot=lire(CLE_STATS,{n:0,exact:0,abs:0,ms:0}),t=[];
    if(serie.n) t.push("Cette série : "+serie.exact+"/"+serie.n+" exacts, écart moyen "+(serie.abs/serie.n).toFixed(1).replace(".",",")+", "+Math.round(serie.ms/serie.n/1000)+" s par spot.");
    if(tot.n) t.push("Depuis le début : "+tot.n+" spot"+(tot.n>1?"s":"")+", "+Math.round(100*tot.exact/tot.n)+" % exacts.");
    t.push("Range d'open complète, sans filtre postflop : une main ouverte au moins une fois sur deux compte pour tous ses combos, les autres pour zéro. Un combo qui contient une carte du board ou de ta main n'existe pas. La réponse ne dépasse jamais "+MAXC+".");
    t.push("Source : "+(DATA.source||"")+"."+(DATA.date?" Données du "+DATA.date.split("-").reverse().join("/")+".":""));
    $("cbStats").innerHTML=t.join("<br>");
  }
  function dessinerGrille(){
    if(!spot){ $("cbGrid").innerHTML=""; return; }
    var hands=rangeHands(spot.range,SEUIL),i,j,h,html="<div class=\"cb-grille\">";
    for(i=12;i>=0;i--){ for(j=12;j>=0;j--){
      if(i===j) h=RANKS.charAt(i)+RANKS.charAt(j);
      else if(i>j) h=RANKS.charAt(i)+RANKS.charAt(j)+"s";
      else h=RANKS.charAt(j)+RANKS.charAt(i)+"o";
      html+="<span class=\""+(has(hands,h)?"in":"")+"\">"+h+"</span>";
    } }
    $("cbGrid").innerHTML=html+"</div>";
  }

  function init(){
    if(!$("cbRange")) return;
    var sel=$("cbRange"),i,o,reg=lire(CLE_REG,{range:"toutes",type:"mix"});
    o=document.createElement("option");o.value="toutes";o.textContent="Toutes";sel.appendChild(o);
    for(i=0;i<DATA.ranges.length;i++){
      o=document.createElement("option");o.value=DATA.ranges[i].id;o.textContent=DATA.ranges[i].label;sel.appendChild(o);
    }
    sel.value=reg.range;if(!sel.value) sel.value="toutes";
    $("cbType").value=reg.type;if(!$("cbType").value) $("cbType").value="mix";
    function change(){ ecrire(CLE_REG,reglages()); afficherSpot(); }
    sel.addEventListener("change",change);
    $("cbType").addEventListener("change",change);
    $("cbOk").addEventListener("click",valider);
    $("cbAns").addEventListener("keydown",function(e){ if(e.key==="Enter"){ e.preventDefault(); valider(); } });
    $("cbPasser").addEventListener("click",function(){ afficherSpot(); });
    $("cbVoir").addEventListener("click",function(){
      var g=$("cbGrid"),ouvert=g.className.indexOf("ouvert")>=0;
      g.className=ouvert?"":"ouvert";
      $("cbVoir").textContent=ouvert?"Voir la range":"Masquer la range";
      if(ouvert) g.innerHTML=""; else dessinerGrille();
    });
    afficherSpot();
    stats();
  }
  root.ComboTrainer={init:init};
})(typeof window!=="undefined"?window:this);
