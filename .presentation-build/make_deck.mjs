import fs from 'node:fs/promises';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const OUT='/Users/johogyeong/Documents/Codex/2026-10-28/x20/output/presentation/주간개발공유_개인화패션플랫폼.pptx';
const W=1280,H=720;
const C={bg:'#F7F5F0',ink:'#20211F',muted:'#73756F',green:'#315B4A',mint:'#DDE9DF',orange:'#D9784D',white:'#FFFFFF',line:'#DDDCD5',dark:'#17241E'};
const p=Presentation.create({slideSize:{width:W,height:H}});
function shape(s,geo,x,y,w,h,fill='none',lineFill='none',lw=0){return s.shapes.add({geometry:geo,position:{left:x,top:y,width:w,height:h},fill,line:{style:'solid',fill:lineFill,width:lw}})}
function text(s,str,x,y,w,h,size=24,color=C.ink,bold=false,align='left'){
 const a=shape(s,'textbox',x,y,w,h); a.text=str; a.text.style={fontFamily:'Arial',fontSize:size,color,bold,alignment:align,verticalAlignment:'middle',wrap:true}; return a;
}
function base(title,kicker='이번 주 개발 공유'){
 const s=p.slides.add(); s.background.fill=C.bg;
 shape(s,'rect',0,0,18,H,C.green); text(s,kicker,64,34,420,24,14,C.green,true); text(s,title,64,72,1140,68,40,C.ink,true);
 shape(s,'rect',64,657,1152,1,C.line); text(s,'개인화 패션 쇼핑 플랫폼',64,670,540,20,12,C.muted); text(s,String(p.slides.items.length).padStart(2,'0'),1160,668,55,22,13,C.green,true,'right'); return s;
}
function notes(s,t){s.speakerNotes.text=t;}
function pill(s,label,x,y,w,fill=C.mint,color=C.green){shape(s,'roundRect',x,y,w,34,fill); text(s,label,x+10,y+2,w-20,28,14,color,true,'center');}
function bullet(s,label,body,x,y,w,accent=C.green){shape(s,'ellipse',x,y+8,10,10,accent);text(s,label,x+24,y,w-24,28,21,C.ink,true);text(s,body,x+24,y+34,w-30,54,16,C.muted,false);}

// 1 Cover
{
 const s=p.slides.add(); s.background.fill=C.dark;
 shape(s,'ellipse',890,-130,520,520,'#263A30'); shape(s,'ellipse',1010,390,330,330,'#D9784D');
 pill(s,'주간 개발 공유',72,70,150,'#DDE9DF',C.green);
 text(s,'개인화 패션\n쇼핑 플랫폼',72,168,710,190,58,C.white,true);
 text(s,'이번 주 구현 기능과 현재 연동 상태',76,390,650,54,25,'#D8E0D9');
 text(s,'프론트엔드 · 상품 API · 로그인 · 찜 목록',76,598,720,32,18,'#B5C2B9');
 text(s,'2026.11',76,644,240,24,15,'#B5C2B9');
 notes(s,'이번 주 개발 내용을 공유드리겠습니다. 상품 탐색부터 로그인, 찜 목록을 중심으로 프론트엔드와 백엔드를 연결했고, 현재 확인 가능한 기능과 다음 작업을 설명하겠습니다.');
}
// 2 Scope
{
 const s=base('이번 주 작업 범위');
 text(s,'사용자가 상품을 둘러보고 계정에 찜을 저장하는 기본 흐름을 연결했습니다.',64,155,1100,50,22,C.muted);
 const xs=[64,350,636,922]; const labels=[['상품 탐색','상품 목록과 상세 정보','GET /products'],['계정','가입·로그인과 토큰 처리','/auth/register · /auth/login'],['찜','추가·삭제·목록 불러오기','/users/me/favorites'],['화면','홈·목록·상세·찜 페이지','React + TypeScript']];
 labels.forEach((a,i)=>{const x=xs[i];shape(s,'roundRect',x,260,250,250,C.white,C.line,1);pill(s,String(i+1).padStart(2,'0'),x+22,282,56);text(s,a[0],x+22,338,210,38,26,C.ink,true);text(s,a[1],x+22,392,206,58,17,C.muted);text(s,a[2],x+22,464,208,40,13,C.green,true);});
 text(s,'개발 환경은 Vite 기반 React 앱이며, API 주소는 환경 변수로 관리합니다.',64,560,1100,36,17,C.muted);
 notes(s,'이번 주에는 앱의 핵심 사용 흐름 중 상품 조회와 계정별 찜 저장을 우선 연결했습니다. 앱과 API 서버가 별도 프로세스이며, 프론트엔드는 정해진 API 주소로 요청합니다.');
}
// 3 Architecture
{
 const s=base('프론트엔드와 백엔드 연결 구조');
 const boxes=[{x:64,w:300,title:'React 화면',sub:'홈 · 상품 목록\n상품 상세 · 찜 목록',fill:C.white},{x:488,w:300,title:'API 클라이언트',sub:'공통 요청 처리\nBearer 토큰 전달',fill:C.mint},{x:912,w:300,title:'FastAPI + PostgreSQL',sub:'상품 카탈로그\n사용자 · 찜 데이터',fill:C.white}];
 boxes.forEach(b=>{shape(s,'roundRect',b.x,244,b.w,188,b.fill,C.line,1);text(s,b.title,b.x+20,278,b.w-40,40,23,C.ink,true,'center');text(s,b.sub,b.x+20,334,b.w-40,70,17,C.muted,false,'center');});
 shape(s,'rect',365,326,110,3,C.orange); shape(s,'triangle',460,316,20,22,C.orange);
 shape(s,'rect',789,326,110,3,C.orange); shape(s,'triangle',884,316,20,22,C.orange);
 pill(s,'요청',382,276,72,C.white,C.orange);pill(s,'응답',806,276,72,C.white,C.orange);
 text(s,'로그인 성공 시 받은 JWT를 저장하고, 보호된 API 요청의 Authorization 헤더에 담습니다.',86,490,1080,64,20,C.ink,true,'center');
 text(s,'브라우저 화면  →  API 서버  →  데이터베이스',86,572,1080,34,16,C.green,true,'center');
 notes(s,'화면 컴포넌트가 직접 DB에 접근하지 않습니다. API 클라이언트가 서버에 HTTP 요청을 보내고, 서버가 데이터베이스를 조회하거나 수정합니다. 로그인 응답의 JWT가 사용자 식별에 쓰입니다.');
}
// 4 user flow
{
 const s=base('사용자 흐름: 로그인부터 찜 확인까지');
 const steps=[['01','가입 또는 로그인','인증 API 응답으로 사용자 확인'],['02','상품 탐색','상품 목록과 상세를 서버에서 조회'],['03','하트 선택','로그인 토큰과 article_id 전송'],['04','찜 목록 열기','현재 사용자 기준 목록 조회']];
 steps.forEach((it,i)=>{const y=184+i*105;shape(s,'ellipse',76,y,58,58,i===3?C.orange:C.green);text(s,it[0],76,y+4,58,50,17,C.white,true,'center');text(s,it[1],166,y,330,30,22,C.ink,true);text(s,it[2],166,y+38,810,30,17,C.muted);if(i<3)shape(s,'rect',103,y+62,2,42,C.line);});
 shape(s,'roundRect',950,218,250,226,C.mint);text(s,'확인 포인트',974,244,200,32,20,C.green,true);text(s,'로그인 토큰\narticle_id\nAPI 응답 상태',974,296,200,118,19,C.ink,false);
 notes(s,'사용자는 회원가입 또는 로그인을 마친 뒤 상품을 봅니다. 찜 버튼은 상품의 article_id와 JWT를 보내고, 찜 목록 화면은 로그인한 사용자 기준으로 저장된 상품을 서버에서 가져옵니다.');
}
// 5 DB truth
{
 const s=base('찜 데이터는 사용자 ID와 상품 ID로 저장');
 text(s,'app.user_favorites 테이블의 실제 키 구조',64,155,900,34,20,C.muted);
 const cols=[['user_id','uuid','어느 사용자'],['article_id','varchar(20)','어느 상품'],['created_at','timestamp','저장한 시각']];
 cols.forEach((c,i)=>{const x=64+i*382;shape(s,'roundRect',x,236,340,168,C.white,C.line,1);text(s,c[0],x+22,262,300,34,24,C.green,true);text(s,c[1],x+22,307,300,26,16,C.muted);shape(s,'rect',x+22,350,296,1,C.line);text(s,c[2],x+22,363,296,27,15,C.ink);});
 text(s,'PRIMARY KEY (user_id, article_id)',80,452,700,36,20,C.ink,true);
 text(s,'같은 사용자가 같은 상품을 중복 저장하지 않도록 막습니다.',80,496,820,30,17,C.muted);
 shape(s,'roundRect',884,442,316,128,C.dark);text(s,'검증 방법',910,462,250,30,20,C.white,true);text(s,'Postman GET /users/me/favorites\n또는 DB에서 user_id로 조회',910,504,268,48,15,'#D8E0D9');
 notes(s,'사용자가 공유한 DDL 기준으로 설명합니다. 복합 기본키가 중복 찜을 방지하고, 외래키가 실제 사용자 및 상품과 연결합니다. Postman에서는 인증 토큰을 넣어 GET users/me/favorites를 호출하면 API가 반환하는 목록을 확인할 수 있고, DB에서는 user_id와 article_id 행으로 확인할 수 있습니다.');
}
// 6 status matrix
{
 const s=base('현재 구현 상태');
 const rows=[['백엔드 연결','상품 목록·상세 조회','구현'],['인증','회원가입·로그인 및 JWT 사용','구현'],['찜','추가·삭제·목록 조회','구현'],['홈 추천','일반 상품 목록 표시','추천 전용 API 연결 전'],['취향·장바구니','브라우저 상태 중심','서버 영속화 미완료'],['광고 생성','화면/요청 흐름 미연동','추가 구현 필요']];
 const x=[64,64+250,64+760]; const y0=182; const rh=65;
 text(s,'영역',x[0],y0,210,30,16,C.muted,true);text(s,'현재 동작',x[1],y0,470,30,16,C.muted,true);text(s,'상태',x[2],y0,390,30,16,C.muted,true);
 rows.forEach((r,i)=>{const y=y0+42+i*rh;shape(s,'rect',64,y,1150,1,C.line);text(s,r[0],x[0],y+10,225,38,18,C.ink,true);text(s,r[1],x[1],y+10,490,38,17,C.ink);text(s,r[2],x[2],y+10,390,38,16,i<3?C.green:C.orange,true);});
 notes(s,'발표에서 상태를 과장하지 않도록 분리했습니다. 실제 소스에서 상품 조회, 가입·로그인, 찜 API 호출이 구현되어 있습니다. 홈은 상품 목록을 보여주며 개인화 추천 API는 별도 연결 전입니다. 취향과 장바구니는 브라우저 저장 중심이고 광고 생성은 아직 프론트 API와 연결하지 않았습니다.');
}
// 7 demo
{
 const s=base('시연 순서와 성공 확인 기준');
 const items=[['1','상품 목록 열기','서버 응답 상품 카드가 표시되는지 확인'],['2','로그인 후 상품 찜하기','하트 상태와 성공 안내 확인'],['3','찜 목록 이동','방금 선택한 상품이 목록에 보이는지 확인'],['4','Postman으로 재조회','GET 응답의 article_id와 상품 확인']];
 items.forEach((r,i)=>{const y=174+i*102; pill(s,r[0],72,y,52,i===3?'#F5E2D8':C.mint,i===3?C.orange:C.green);text(s,r[1],154,y-1,360,30,21,C.ink,true);text(s,r[2],154,y+38,800,28,16,C.muted);});
 shape(s,'roundRect',920,220,270,198,C.white,C.line,1);text(s,'실패 시 확인',944,244,220,34,20,C.ink,true);text(s,'401: 다시 로그인해 토큰 갱신\n빈 목록: 계정과 DB 연결 확인\n상품 ID 오류: API 상품 ID 사용',944,294,230,92,15,C.muted);
 notes(s,'시연은 화면에서 찜을 추가한 뒤 목록 화면에서 보이는지 확인하고, 같은 로그인 토큰을 Postman에 넣어 API 응답도 확인하는 순서가 좋습니다. 토큰은 화면이나 발표 자료에 노출하지 말고, 401은 재로그인 후 다시 확인합니다.');
}
// 8 next
{
 const s=base('다음 개발 단계');
 bullet(s,'추천 API 연결','사용자 취향과 행동 기반 추천 응답을 홈에 연결',72,192,520,C.green);
 bullet(s,'취향과 장바구니 서버 저장','브라우저 상태와 API 데이터 간 동기화',670,192,520,C.orange);
 bullet(s,'오류·세션 처리 보강','토큰 만료, 빈 응답, 네트워크 오류 흐름 정리',72,356,520,C.orange);
 bullet(s,'광고 생성 플로우 연결','작업 생성, 상태 조회, 결과 화면 연동',670,356,520,C.green);
 text(s,'현재 기반 위에 기능별 API를 연결하고, Postman 응답과 화면 동작을 함께 검증합니다.',72,548,1080,52,20,C.ink,true,'center');
 notes(s,'다음 단계에서는 추천 전용 엔드포인트와 취향 저장을 연결하고, 토큰 만료 상황을 더 명확하게 처리합니다. 광고 생성은 백엔드의 작업 생성과 상태 조회 API 계약에 맞춰 별도로 이어가겠습니다.');
}

await fs.mkdir('/Users/johogyeong/Documents/Codex/2026-10-28/x20/output/presentation',{recursive:true});
const pptx=await PresentationFile.exportPptx(p); await pptx.save(OUT);
for(let i=0;i<p.slides.items.length;i++){
 const png=await p.export({slide:p.slides.items[i],format:'png',scale:1});
 await fs.writeFile(`/Users/johogyeong/Documents/Codex/2026-10-28/x20/.presentation-build/slide-${String(i+1).padStart(2,'0')}.png`,new Uint8Array(await png.arrayBuffer()));
}
console.log(OUT);
