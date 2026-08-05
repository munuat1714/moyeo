type AnalyticsEnv = { DB: D1Database; ANALYTICS_VIEW_TOKEN?: string }

const EVENT_LABELS: Record<string, string> = {
  landing_view: '랜딩 방문', demo_view: '데모 방문', landing_interest_yes: '관심 있음',
  landing_interest_not_yet: '아직 모름', landing_demo_click: '랜딩 CTA 클릭', room_created: '여행방 생성',
  recommendations_viewed: '추천 확인', final_route_confirmed: '최종 경로 확정', schedule_edit: '일정 편집',
  schedule_copy: '일정 복사', feedback_helpful: '도움 됨', feedback_not_helpful: '아쉬움',
  beta_interest: '베타 관심', interview_interest: '인터뷰 관심',
}

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`

export async function handleAnalyticsDashboard(request: Request, env: AnalyticsEnv, url: URL) {
  if (!url.pathname.startsWith('/insights/')) return null
  const token = decodeURIComponent(url.pathname.slice('/insights/'.length)).replace(/\/$/, '')
  if (!env.ANALYTICS_VIEW_TOKEN || token !== env.ANALYTICS_VIEW_TOKEN) return new Response('Not Found', { status: 404 })

  const period = ['7', '30', '90', 'all'].includes(url.searchParams.get('period') ?? '') ? url.searchParams.get('period')! : '30'
  const cutoff = period === 'all' ? '2000-01-01' : `-${Number(period) - 1} days`
  const dateCondition = period === 'all' ? 'event_date>=?1' : "event_date>=date('now','+9 hours',?1)"
  if (url.searchParams.get('format') === 'json' || url.searchParams.get('format') === 'csv') {
    const [totals, daily, campaigns] = await Promise.all([
      env.DB.prepare(`SELECT event_name,SUM(event_count) event_count,SUM(session_count) session_count
        FROM anonymous_event_counts WHERE ${dateCondition} GROUP BY event_name ORDER BY session_count DESC`).bind(cutoff).all(),
      env.DB.prepare(`SELECT event_date,event_name,SUM(event_count) event_count,SUM(session_count) session_count
        FROM anonymous_event_counts WHERE ${dateCondition} GROUP BY event_date,event_name ORDER BY event_date`).bind(cutoff).all(),
      env.DB.prepare(`SELECT campaign_source,campaign_medium,campaign_name,event_name,SUM(event_count) event_count,SUM(session_count) session_count
        FROM anonymous_event_counts WHERE ${dateCondition} AND (campaign_source<>'' OR campaign_medium<>'' OR campaign_name<>'')
        GROUP BY campaign_source,campaign_medium,campaign_name,event_name ORDER BY session_count DESC LIMIT 300`).bind(cutoff).all(),
    ])
    if (url.searchParams.get('format') === 'csv') {
      const rows = [['날짜', '이벤트', '이벤트 횟수', '익명 세션 수'], ...daily.results.map((row: any) => [row.event_date, EVENT_LABELS[row.event_name] ?? row.event_name, row.event_count, row.session_count])]
      return new Response('\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n'), { headers: {
        'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="moyeo-insights-${period}days.csv"`,
        'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow',
      } })
    }
    return Response.json({ labels: EVENT_LABELS, period, totals: totals.results, daily: daily.results, campaigns: campaigns.results }, {
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
    })
  }

  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 })
  return new Response(DASHBOARD_HTML, { headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-ancestors 'none'",
  } })
}

const DASHBOARD_HTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>모두의 여행 · 익명 통계</title><style>
:root{font-family:Pretendard,"Malgun Gothic",sans-serif;color:#191f28;background:#f7f8fa}*{box-sizing:border-box}body{margin:0}button,select{font:inherit}main{width:min(100% - 32px,980px);margin:auto;padding:38px 0 70px}header{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:20px}h1{margin:5px 0;font-size:30px;letter-spacing:-1.4px}header p,.muted{margin:0;color:#6b7684;font-size:13px}.badge{color:#1769cf;font-size:12px;font-weight:800}.toolbar{display:flex;align-items:center;gap:8px;margin-bottom:18px}.toolbar select,.toolbar a{min-height:40px;border:1px solid #d9dde3;border-radius:10px;background:#fff;padding:0 12px;color:#333;text-decoration:none;font-size:12px}.toolbar a{display:flex;align-items:center;font-weight:800}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.card,section{border:1px solid #e2e5e9;border-radius:16px;background:#fff}.card{padding:18px}.card small{color:#6b7684}.card b{display:block;margin-top:8px;font-size:28px}.card em{display:block;margin-top:5px;color:#1769cf;font-size:11px;font-style:normal}section{margin-top:16px;padding:22px}h2{margin:0 0 5px;font-size:18px}.funnel,.daily{display:grid;gap:12px;margin-top:20px}.row{display:grid;grid-template-columns:110px 1fr 52px;align-items:center;gap:10px;font-size:12px}.track{height:12px;overflow:hidden;border-radius:10px;background:#eef0f2}.fill{height:100%;border-radius:10px;background:#3182f6}.row strong{text-align:right}.daily-row{display:grid;grid-template-columns:76px 1fr 1fr;gap:8px;align-items:center;font-size:11px}.daily-row div{display:flex;height:22px;overflow:hidden;border-radius:6px;background:#eef0f2}.daily-row i{display:block;background:#3182f6}.daily-row i.demo{background:#8ebfff}.campaigns{margin-top:16px;display:grid;gap:8px}.campaign{padding:13px;border-radius:12px;background:#f7f8fa;display:grid;grid-template-columns:1fr auto;gap:6px}.campaign b{font-size:13px}.campaign span,.empty{color:#6b7684;font-size:11px}.loading{padding:80px 0;text-align:center;color:#6b7684}.error{color:#b42318}.privacy{margin-top:18px;color:#6b7684;font-size:11px;line-height:1.6}@media(max-width:680px){main{padding-top:24px}header{display:block}.toolbar{margin-top:15px}.cards{grid-template-columns:1fr 1fr}.card b{font-size:23px}.row{grid-template-columns:82px 1fr 42px}section{padding:17px}.campaign{grid-template-columns:1fr}.daily-row{grid-template-columns:68px 1fr}}
</style></head><body><main><header><div><span class="badge">MOYEO INSIGHTS</span><h1>익명 전환 통계</h1><p>한국시간 기준 · 새로고침하면 최신 합계를 불러옵니다.</p></div><p id="updated"></p></header><div class="toolbar"><select id="period" aria-label="조회 기간"><option value="7">최근 7일</option><option value="30" selected>최근 30일</option><option value="90">최근 90일</option><option value="all">전체</option></select><a id="csv" href="#">CSV 내려받기</a></div><div id="app" class="loading">통계를 불러오는 중이에요…</div></main><script>
const number=v=>new Intl.NumberFormat('ko-KR').format(v||0),esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const sel=document.querySelector('#period');const params=new URLSearchParams(location.search);sel.value=params.get('period')||'30';sel.onchange=()=>{params.set('period',sel.value);location.search=params};document.querySelector('#csv').onclick=e=>{e.currentTarget.href=location.pathname+'?format=csv&period='+sel.value};
fetch(location.pathname+'?format=json&period='+sel.value,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{const counts=Object.fromEntries(data.totals.map(x=>[x.event_name,Number(x.session_count)]));const views=counts.landing_view||0,demos=counts.demo_view||0,rooms=counts.room_created||0,finals=counts.final_route_confirmed||0,rate=(a,b)=>b?Math.round(a/b*1000)/10:0,funnel=['landing_view','demo_view','room_created','recommendations_viewed','final_route_confirmed'],max=Math.max(1,...funnel.map(k=>counts[k]||0)),grouped={},days={};data.campaigns.forEach(x=>{const key=[x.campaign_source||'(직접)',x.campaign_medium,x.campaign_name].filter(Boolean).join(' · ');grouped[key]=grouped[key]||{};grouped[key][x.event_name]=Number(x.session_count)});data.daily.forEach(x=>{days[x.event_date]=days[x.event_date]||{};days[x.event_date][x.event_name]=Number(x.session_count)});const dayMax=Math.max(1,...Object.values(days).flatMap(x=>[x.landing_view||0,x.demo_view||0]));document.querySelector('#app').className='';document.querySelector('#app').innerHTML=\`<div class="cards"><div class="card"><small>랜딩 세션</small><b>\${number(views)}</b><em>선택 기간</em></div><div class="card"><small>데모 세션</small><b>\${number(demos)}</b><em>랜딩 대비 \${rate(demos,views)}%</em></div><div class="card"><small>여행방 생성</small><b>\${number(rooms)}</b><em>데모 대비 \${rate(rooms,demos)}%</em></div><div class="card"><small>최종 경로</small><b>\${number(finals)}</b><em>생성 대비 \${rate(finals,rooms)}%</em></div></div><section><h2>서비스 전환 흐름</h2><p class="muted">같은 브라우저 세션의 반복 새로고침은 한 번만 셉니다.</p><div class="funnel">\${funnel.map(k=>\`<div class="row"><span>\${esc(data.labels[k]||k)}</span><div class="track"><div class="fill" style="width:\${(counts[k]||0)/max*100}%"></div></div><strong>\${number(counts[k])}</strong></div>\`).join('')}</div></section><section><h2>날짜별 추이</h2><p class="muted">진한 파랑은 랜딩, 연한 파랑은 데모 세션입니다.</p><div class="daily">\${Object.entries(days).slice(-31).map(([day,c])=>\`<div class="daily-row"><span>\${day.slice(5)}</span><div><i style="width:\${(c.landing_view||0)/dayMax*100}%"></i></div><div><i class="demo" style="width:\${(c.demo_view||0)/dayMax*100}%"></i></div></div>\`).join('')||'<div class="empty">아직 날짜별 데이터가 없습니다.</div>'}</div></section><section><h2>광고 캠페인별 결과</h2><p class="muted">utm_source, utm_medium, utm_campaign 기준입니다.</p><div class="campaigns">\${Object.keys(grouped).length?Object.entries(grouped).map(([name,c])=>\`<div class="campaign"><b>\${esc(name)}</b><strong>랜딩 \${number(c.landing_view)} · 데모 \${number(c.demo_view)} · 생성 \${number(c.room_created)}</strong><span>최종 경로 \${number(c.final_route_confirmed)}</span></div>\`).join(''):'<div class="empty">아직 UTM이 포함된 유입이 없습니다.</div>'}</div></section><p class="privacy">이름, 연락처, IP, 기기 식별자는 저장하지 않습니다. 날짜·이벤트·광고 UTM별 합계와 브라우저 세션당 최초 발생 여부만 집계합니다.</p>\`;document.querySelector('#updated').textContent=new Date().toLocaleString('ko-KR')+' 확인';}).catch(()=>{document.querySelector('#app').innerHTML='<p class="error">통계를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>'});
</script></body></html>`
