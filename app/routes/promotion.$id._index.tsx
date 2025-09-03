import { type LoaderFunctionArgs, type MetaFunction, json } from "@remix-run/node";
import { Link, useLoaderData, useRouteError } from "@remix-run/react";
import companyLogo from '../images/easydairy-logo.jpg';
import { FaAngleRight, FaImage, FaTriangleExclamation } from "react-icons/fa6";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import QuillComponent from '../components/ui/RichTextEditor';

export const meta: MetaFunction = (request) => {
  return [
    { title: `Easy Dairy Promotion` },
    { name: "description", content: "Easy Dairy Promotion" },
  ];
};  

export type AnimalPromotionMobileView = {
  ID: string,
  name: string,
  breed: string,
  business: string,
  businessId: string,
  description: string,
  sections: {title: string, description: string}[],
  listings?: {
      animalUuid: string,
      name: string,
      price: number,
      description: string,
      dob: Date,
      milkPerYear: number,
      fatKg: number,
      proteinKg: number,
      asi: number,
      bpi: number,
      hwi: number,
      milkSession: number
  }[]
}

export async function loader({request, params}: LoaderFunctionArgs) {
  const promoId = params.id

  const response: {success: boolean, data: AnimalPromotionMobileView} = await fetch(`${process.env.BASE_URL}/api/public/promotion/${promoId}`).then(resp => resp.json())

  if (!response.success) {
    console.error(`FATAL ERROR: Promotion does not exist or is no longer valid ${params.id}`, `source: ${request.url}`)
    throw new Response("Promotion does not exist or is no longer valid", {status: 404})
  }
  const prices = response.data.listings?.map((l) => l.price) ?? []
  const milkPerYear = response.data.listings?.map((l) => l.milkPerYear) ?? []

  const client = new S3Client({
    region: 'ap-southeast-2'
  });
  let animalphoto = ''
  try {
    const command = new GetObjectCommand({
      Bucket: "easydairy-public",
      Key: `userUploads/${response.data.businessId}/${promoId}.jpg`,
    });
    const imgResponse = await client.send(command);
    // The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
    const str = await imgResponse.Body?.transformToByteArray();
    if (str) {
      animalphoto = 'data:image/jpeg;base64,' + Buffer.from(str).toString('base64')
    }
  } catch (err) {
    // console.error(err);
  }

  return json({
    promotion: {
      ...response.data,
      breedPic: animalphoto,
      priceRange: prices.length ? `$${Math.min(...prices)} - $${Math.max(...prices)}` : '',
      milkYear: milkPerYear.length ? `${Math.min(...milkPerYear).toLocaleString()}KG - ${Math.max(...milkPerYear).toLocaleString()}KG` : ''
    },
    promoId: promoId,
  })
}

export default function Promotion() {
  const data = useLoaderData<typeof loader>()
  return (
    <main className="bg-gray-100">
      <header className="text-center">
        <h1 className="text-3xl bg-primary-500 p-2 text-white">{data.promotion.name}</h1>
        <p className="p-1.5 text-black bg-secondary-500 font-bold">By {data.promotion.business}</p>
      </header>
      <section className="w-full max-w-2xl m-auto flex justify-center min-h-[300px]">
        {!data.promotion.breedPic ? 
        <div className="h-80 bg-gray-200 flex justify-center items-center w-full">
          <FaImage className="text-gray-700 text-3xl" />
        </div>
        : <img src={data.promotion.breedPic} alt={data.promotion.breed} className="object-cover" />}
      </section>
      <section className="bg-primary-500 p-3 flex flex-col gap-1 justify-center items-center">
        <h4 className="text-2xl text-white">{data.promotion.breed}</h4>
        {data.promotion.priceRange && <p className="font-bold text-white">Price Range: {data.promotion.priceRange} per head</p>}
      </section>
      <section className="p-4 m-auto max-w-2xl">
        <p>{data.promotion.description}</p>
      </section>
      <section className="bg-primary-500 p-2 flex justify-center">
        <p className="font-bold text-white">{data.promotion.milkYear} Milk/Year</p>
      </section>
      {data.promotion.sections?.map((sect: {title: string, description: string}, i: number) => <section key={`sect-${i}`} className="px-4 pt-4 max-w-2xl m-auto">
        <div className="p-4 bg-white">
          <h4 className="text-2xl text-black mb-2">{sect.title}</h4>
          <QuillComponent
            theme={'snow'}
            value={sect.description}
            modules= {{
              "toolbar": false
            }}
            readOnly={true}
            className="border-none"
          />
          {/* <p>{sect.description}</p> */}
          {/* <img src={data.promotion.additional.image} alt={data.promotion.name} /> */}
        </div>
      </section>)}
      <section className="px-4 pt-4 max-w-2xl m-auto">
        <div className="p-4 bg-white">
          <h4 className="text-2xl text-black mb-3">Listings</h4>
          <ul className="flex flex-col gap-1">
            {data.promotion.listings?.map((li: {name: string, animalUuid: string, price: number}, i: number) => <li key={`list-${i}`} className="bg-gray-100 rounded-full">
              <Link to={`/promotion/${data.promoId}/${li.animalUuid}`} className="flex gap-2 items-center py-2 px-4 w-full">
                <p>{li.name}</p>
                <span className="bg-primary-500 rounded-full px-2 py-1 text-white font-bold">${li.price}</span>
                <span className="ml-auto">
                  <FaAngleRight className="text-2xl text-gray-700" />
                </span>
              </Link>
            </li>)}
          </ul>
        </div>
      </section>
      <footer className="flex gap-2 items-center justify-center py-4">
        <p className="text-sm">Powered by</p>
        <img src={companyLogo} alt='Easy Dairy Logo' className='w-16 h-8' />
      </footer>
    </main>
  )
}

export function ErrorBoundary() {
  const error = useRouteError() as {data: string}
  console.error(error.data)
  return (
      <main className="min-h-screen bg-white">
        <div className="flex justify-center items-center gap-2 p-10">
          <FaTriangleExclamation className="text-red-600" />
          <h1 className="text-2xl">{error.data}</h1>
        </div>
      </main>
  )
}