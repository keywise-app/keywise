import type {Metadata} from 'next';
import AcquisitionLanding from '../../components/AcquisitionLanding';
export const metadata:Metadata={title:'Rental Organization for Your Landlord Clients | Keywise',description:'Help independent landlord clients organize the rental after move-in, without requiring a payment switch.',alternates:{canonical:'https://keywise.app/start/agents'}};
export default function Page(){return <AcquisitionLanding agents/>;}
