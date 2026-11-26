import type {Metadata} from 'next';
import AcquisitionLanding from '../../components/AcquisitionLanding';
export const metadata:Metadata={title:'Manage Your Occupied Rental | Keywise',description:'Bring your existing lease, rent records and repairs together. Start with one occupied rental.',alternates:{canonical:'https://keywise.app/start/landlords'}};
export default async function Page({searchParams}:{searchParams:Promise<{source?:string|string[]}>}){
 const source=(await searchParams).source;
 return <AcquisitionLanding source={source==='landlord-community'?'landlord-community':'direct'}/>;
}
