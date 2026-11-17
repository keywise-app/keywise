export const extractionKeys = ['tenant_name','email','phone','property','building_address','unit_number','rent','deposit','start_date','end_date','property_type','beds','baths','sqft','pets','parking','laundry','utilities_included','payment_day','payment_frequency','late_fee_percent','late_fee_fixed','late_fee_type','late_fee_days','late_fee_clause','landlord_name'] as const;
const numeric = new Set(['rent','deposit','beds','baths','sqft','payment_day','late_fee_percent','late_fee_fixed','late_fee_days']);
export function normalizeExtraction(raw: unknown, pageCount?:number) {
 if (!raw || typeof raw!=='object' || Array.isArray(raw)) throw new Error('Invalid extraction');
 const values:Record<string,string|number> = {},fields:Record<string,any> = {};
 for (const key of extractionKeys) {
  const candidate = (raw as any)[key];
  const object = candidate && typeof candidate==='object' && !Array.isArray(candidate) ? candidate : null;
  let value = object?.value;
  let valid = (typeof value==='string' && value.length<=3000) || (typeof value==='number' && Number.isFinite(value));
  if (value==='' || value==null) valid=false;
  if (numeric.has(key)) valid=valid && /^\d+(\.\d{1,2})?$/.test(String(value)) && Number(value)>=0;
  if (key.endsWith('_date')) valid=valid && /^\d{4}-\d{2}-\d{2}$/.test(String(value)) && Number.isFinite(new Date(String(value)).getTime()) && new Date(String(value)).toISOString().slice(0,10)===value;
  if (key==='payment_day') valid=valid && Number.isInteger(Number(value)) && Number(value)>=1 && Number(value)<=31;
  if (key==='payment_frequency') valid=valid && ['monthly','weekly','bi-weekly'].includes(String(value));
  const conflict=object?.status==='conflict';
  const quote=typeof object?.quote==='string' ? object.quote.slice(0,3000):'';
  // A model's page attribution is a suggestion, never a verified citation.
  const page=Number.isInteger(object?.page) && object.page>=1 && (!pageCount || object.page<=pageCount) ? object.page:null;
  values[key]=valid && !conflict ? value : '';
  fields[key]={value:values[key],status:conflict?'conflict':valid?'needs_review':'unknown',quote,suggested_page:page,verified:false};
 }
 return {...values,fields};
}
