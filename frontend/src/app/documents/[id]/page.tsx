import {Shell} from '@/components/shell';
import {ShippingDocument} from '@/components/shipping-document';
export const metadata={title:'Shipment documents'};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Shell><ShippingDocument id={id}/></Shell>;}
