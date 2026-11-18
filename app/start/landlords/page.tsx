import type {Metadata} from 'next';
import AcquisitionLanding from '../../components/AcquisitionLanding';
export const metadata:Metadata={title:'Manage Your Occupied Rental | Keywise',description:'Bring your existing lease, rent records and repairs together. Start with one occupied rental.',alternates:{canonical:'https://keywise.app/start/landlords'}};
export default function Page(){return <AcquisitionLanding/>;}
