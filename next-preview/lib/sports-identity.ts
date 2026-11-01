/**
 * Sports visual identity rights registry.
 *
 * Provider artwork is NOT automatically licensed for publication.
 * A rights-approved asset can be enabled only after its exact source,
 * license, attribution and any third-party trademark permission are recorded.
 * Never assume strCreativeCommons (on a team) clears a specific badge.
 */
export type EntityKind = 'team' | 'league';
export type ApprovedImage = {
  entity:EntityKind;
  providerId:string;
  sourceUrl:string;
  approvedUrl:string;
  creator:string;
  licence:string;
  attribution:string;
  permissionReference:string;
  reviewedAt:string;
};
export type BrandIdentity = { imageUrl:string|null; alt:string; attribution:string|null; permitted:boolean };
export const APPROVED_ARTWORK:Readonly<Record<string,ApprovedImage>>=Object.freeze({
  // Add entries only after verifying individual image rights.
  // Format: 'team:133604': { ... } or 'league:4328': { ... }.
});
const TRUSTED_HOSTS=new Set(['www.thesportsdb.com','r2.thesportsdb.com']);
export function validSportsImageUrl(value:unknown):value is string{
  if(typeof value!=='string'||value.length>600)return false;
  try{
    const url=new URL(value);
    return url.protocol==='https:'&&!url.username&&!url.password
      &&TRUSTED_HOSTS.has(url.hostname)
      &&/^\/images\/(media|icons)\//.test(url.pathname)
      &&!url.search&&!url.hash;
  }catch{return false}
}
export function approvedVisual(kind:EntityKind,providerId:string|number|null|undefined,source:unknown,alt:string):BrandIdentity{
  const item=APPROVED_ARTWORK[kind+':'+String(providerId??'')];
  if(!item||item.entity!==kind||item.providerId!==String(providerId)||!validSportsImageUrl(source)
    ||source!==item.sourceUrl||!validSportsImageUrl(item.approvedUrl)
    ||!item.creator||!item.licence||!item.attribution||!item.permissionReference||!item.reviewedAt){
    return {imageUrl:null,alt,attribution:null,permitted:false};
  }
  return {imageUrl:item.approvedUrl,alt,attribution:item.attribution,permitted:true};
}
const FLAGS:Readonly<Record<string,{emoji:string,iso:string}>>={
  England:{emoji:'🏴',iso:'gb-eng'},
  Spain:{emoji:'🇪🇸',iso:'es'},
  Germany:{emoji:'🇩🇪',iso:'de'},
  Italy:{emoji:'🇮🇹',iso:'it'},
  France:{emoji:'🇫🇷',iso:'fr'}
};
export function countryIdentity(country:string){
  return FLAGS[country]||{emoji:'🌐',iso:'unknown'};
}

/**
 * Approved registry lookup for components where provider event rows omit artwork.
 * Registry entries must have individual provenance and permission evidence.
 * Does not authorize arbitrary provider URLs.
 */
export function approvedById(kind:EntityKind,providerId:string|number|null|undefined,alt:string):BrandIdentity{
 const item=APPROVED_ARTWORK[kind+':'+String(providerId??'')];
 if(!item)return {imageUrl:null,alt,attribution:null,permitted:false};
 return approvedVisual(kind,providerId,item.sourceUrl,alt);
}
export function approvalCoverage(){
 const items=Object.values(APPROVED_ARTWORK);
 return {
  approvedClubs:items.filter(x=>x.entity==='team'&&approvedById('team',x.providerId,'').permitted).length,
  approvedLeagues:items.filter(x=>x.entity==='league'&&approvedById('league',x.providerId,'').permitted).length
 };
}

/**
 * Factual identification of football teams and competitions on the public web.
 * TheSportsDB terms permit use of artwork from official API endpoints, while
 * requiring third-party uses to be independently lawful. These are NOT claimed
 * to be owned or licensed by EthioLiveScores. Preserve marks exactly as supplied.
 * See https://www.thesportsdb.com/docs_terms_of_use.php .
 */
export function providerIdentity(kind:EntityKind,providerId:string|number|null|undefined,source:unknown,alt:string):BrandIdentity{
 const verified=approvedVisual(kind,providerId,source,alt);
 if(verified.permitted)return verified;
 if(!/^\d{1,15}$/.test(String(providerId??''))||!validSportsImageUrl(source))
  return {imageUrl:null,alt,attribution:null,permitted:false};
 return {imageUrl:source,alt,attribution:'TheSportsDB — third-party club and league marks remain the property of their owners',permitted:true};
}
