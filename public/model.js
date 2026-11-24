export const categories={'不限':null,'日式料理':'japanese_restaurant','燒肉':'barbecue_restaurant','火鍋':'hot_pot_restaurant','義式料理':'italian_restaurant','韓式料理':'korean_restaurant','中式料理':'chinese_restaurant','美式料理':'american_restaurant','台式小吃':'taiwanese_restaurant','早午餐':'brunch_restaurant','咖啡廳':'cafe','甜點':'dessert_restaurant','牛排':'steak_house','泰式料理':'thai_restaurant','法式料理':'french_restaurant','居酒屋':'japanese_izakaya_restaurant','素食':'vegetarian_restaurant'};
export function km(a,b){const r=Math.PI/180,dlat=(b.lat-a.lat)*r,dlng=(b.lng-a.lng)*r;const h=Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlng/2)**2;return 6371*2*Math.asin(Math.min(1,Math.sqrt(h)))}
export function score(p,f){if(collection(p))return 0;let v=0,w=0;const add=(a,b)=>{v+=a*b;w+=b};if(p.rating){add(Math.max(0,Math.min(1,((p.rating*(p.reviews||0)+4.1*50)/((p.reviews||0)+50)-3)/2)),55);add(Math.min(1,Math.log1p(p.reviews||0)/Math.log(1501)),15)}if(Number.isFinite(p.distance))add(Math.max(0,1-p.distance/f.radius),20);if(p.priceMin!=null&&p.priceMax!=null)add(f.max==null?1:Math.max(0,Math.min(1,(f.max-p.priceMin+1)/(p.priceMax-p.priceMin+1))),10);if(f.party){const group=['hot_pot_restaurant','barbecue_restaurant','chinese_restaurant'];const solo=['japanese_restaurant','cafe','brunch_restaurant'];if(f.party>=3&&p.types?.some(t=>group.includes(t)))add(1,8);else if(f.party===1&&p.types?.some(t=>solo.includes(t)))add(1,8)}return Math.max(0,(w?Math.round(v/w*100):0)-(p.reviewQuality?.penalty||0))}
export function filter(p,f){if(collection(p))return false;if(f.excludeSuspect!==false&&p.reviewQuality?.level==='high')return false;if((p.rating??0)<f.rating||(p.reviews??0)<f.reviews)return false;if(Number.isFinite(p.distance)&&p.distance>f.radius)return false;if(f.open&&p.open!==true)return false;const known=p.priceMin!=null&&p.priceMax!=null;if(f.min!=null||f.max!=null){if(!known&&!f.unknown)return false;if(known&&((f.min!=null&&p.priceMax<f.min)||(f.max!=null&&p.priceMin>f.max)))return false}if(f.types.length&&!f.types.some(t=>p.types?.includes(t)))return false;return true}
export function normalize(p,center){const level={PRICE_LEVEL_FREE:[0,0],PRICE_LEVEL_INEXPENSIVE:[0,300],PRICE_LEVEL_MODERATE:[300,800],PRICE_LEVEL_EXPENSIVE:[800,1800],PRICE_LEVEL_VERY_EXPENSIVE:[1800,5000]}[p.priceLevel];const range=p.priceRange;const valid=range?.startPrice?.currencyCode==='TWD'&&range?.endPrice?.currencyCode==='TWD';const money=m=>Number(m?.units||0)+Number(m?.nanos||0)/1e9;return {reviewQuality:analyzeReviews(p.reviews),id:p.id,primaryType:p.primaryType||null,containers:(p.containingPlaces||[]).map(x=>x.id||x.name?.replace(/^places\//,'')).filter(Boolean),name:p.displayName?.text||'未命名',address:p.formattedAddress||'',types:p.types||[],rating:p.rating??null,reviews:p.userRatingCount??null,lat:p.location?.latitude,lng:p.location?.longitude,distance:center&&p.location?km(center,{lat:p.location.latitude,lng:p.location.longitude}):null,priceMin:valid?money(range.startPrice):level?.[0]??null,priceMax:valid?money(range.endPrice):level?.[1]??null,priceApprox:!valid,open:p.currentOpeningHours?.openNow??null,maps:p.googleMapsUri||null,photo:p.photos?.[0]?.name||null,photoAuthors:p.photos?.[0]?.authorAttributions||[]}}

export function collection(p){const t=p.primaryType||'', ts=p.types||[], n=p.name||'';if(t==='shopping_mall'||t==='department_store')return '購物中心';if(['hotel','lodging','resort_hotel'].includes(t))return '飯店';if(t==='food_court')return '美食街';if(!t||t==='establishment'||t==='point_of_interest'){if(ts.includes('shopping_mall')||ts.includes('department_store')||/購物中心|百貨公司|遠東巨城/.test(n))return '購物中心';if(ts.includes('food_court')||/美食街$/.test(n))return '美食街';if(ts.includes('lodging')||ts.includes('hotel'))return '飯店';}return null}
export function insideVenue(p,id){return Array.isArray(p.containers)&&p.containers.includes(id)}

// Google supplies relevance-ranked samples, not a random or newest-first sample.
export function analyzeReviews(input,now=Date.now()){
 const rows=(Array.isArray(input)?input:[]).filter(r=>Number.isFinite(r.rating)&&r.rating>=1&&r.rating<=5).slice(0,5).map(r=>{
 const text=String(r.originalText?.text||r.text?.text||'').trim();const clean=text.replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase();
 const date=Date.parse(r.publishTime);const age=Number.isFinite(date)?Math.max(0,(now-date)/86400000):Infinity;
 const weight=age<=30?1:age<=90?.8:age<=180?.6:age<=365?.3:.1;
 const generic=/^(?:很好吃|好吃|超好吃|美味|讚|棒|很棒|超棒|推|推薦|大推|推推|五星|好店|不錯|非常好|服務很好|服務好|環境很好|環境好|氣氛好|值得推薦|一定再來|good|great|nice|excellent|delicious|好吃推薦|讚讚)+$/iu;
 const topic=/牛|豬|雞|魚|肉|麵|飯|湯|鍋|菜|咖啡|甜點|蛋糕|餐點|套餐|份量|價格|價位|上菜|候位|店員|服務|環境|座位|口感|味道|調味|醬|飲料|麵包|壽司|拉麵|pizza|steak|coffee|food|portion|service|wait|price|taste/iu;
 const detail=/嫩|脆|鹹|甜|酸|辣|香|苦|硬|軟|乾|油|鮮|濃|淡|熟|生|厚|薄|慢|快|等了|分鐘|元|貴|便宜|足夠|偏少|偏多|小時|親切|擁擠|安靜|乾淨|不耐煩|主動|冷|熱|juicy|crispy|tender|salty|slow|minutes|expensive|friendly/iu;
 const weak=!clean||generic.test(clean)||!(topic.test(text)&&detail.test(text))&&clean.length<24;
 const neg=/沒有.{0,12}(?:送|贈|換)|並未|不需要.{0,8}(?:評論|五星)|取消.{0,10}活動|以前.{0,12}(?:送|贈|換)/u;
 const incentive=!neg.test(text)&&/(?:五星|五顆星|5星|5顆星|好評|評論|評價|評分|google\s*review).{0,18}(?:送|贈|換|折扣|免費|招待)|(?:送|贈|換|折扣|免費|招待).{0,18}(?:五星|五顆星|5星|好評|評論|評價|評分)/iu.test(text);
 return {clean,age,weight,weak,incentive,rating:r.rating};});
 const five=rows.filter(r=>r.rating===5), weak=five.filter(r=>r.weak), recent=rows.filter(r=>r.age<=180), recentWeak=weak.filter(r=>r.age<=180), totalWeight=rows.reduce((a,r)=>a+r.weight,0), weakWeight=weak.reduce((a,r)=>a+r.weight,0);
 const repeats=weak.some((r,i)=>r.clean.length>=4&&weak.slice(i+1).some(x=>x.clean===r.clean));
 const freshGift=rows.some(r=>r.incentive&&r.age<=180), oldGift=rows.some(r=>r.incentive&&! (r.age<=180));
 let level='normal',penalty=0,reason='抽樣未發現明顯異常';
 if(freshGift){level='high';penalty=20;reason='近半年抽樣提及評論換贈品';}
 else if(rows.length===5&&five.length===5&&weak.length>=4&&recentWeak.length>=3&&weakWeight/totalWeight>=.7){level='high';penalty=20;reason='5則抽樣皆五星，'+weak.length+'則缺乏具體心得';}
 else if(rows.length>=4&&recent.length>=2&&((five.length>=4&&weak.length>=3&&weakWeight/totalWeight>=.5)||repeats&&recentWeak.length>=2)){level='medium';penalty=8;reason='五星抽樣心得偏少或文字重複';}
 else if(oldGift){level='history';reason='較舊或日期不明的抽樣提及評論贈品';}
 else if(rows.length<5||recent.length<3){level='insufficient';reason='近期抽樣評論資訊不足';}
 return {level,penalty,reason,sampleCount:rows.length,fiveCount:five.length,weakCount:weak.length,recentCount:recent.length};
}
