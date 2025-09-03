import { type LoaderFunctionArgs, type MetaFunction, json } from "@remix-run/node";
import { useLoaderData, useMatches, useNavigate, useNavigation, useRouteError } from "@remix-run/react";
import companyLogo from '../images/easydairy-logo.jpg';
import { FaAngleLeft, FaImage, FaTriangleExclamation } from "react-icons/fa6";
import moment from "moment";
import type { AnimalPromotionMobileView } from "./promotion.$id._index";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import QuillComponent from '../components/ui/RichTextEditor';

export const meta: MetaFunction = (request) => {
  return [
    { title: `Easy Dairy Promotion - Single Animal` },
    { name: "description", content: "Easy Dairy Promotion - Single Animal" },
  ];
};  

export async function loader({request, params}: LoaderFunctionArgs) {
  const promoId = params.id
  const animalId = params.animalId

  const response: {success: boolean, data: AnimalPromotionMobileView} = await fetch(`${process.env.BASE_URL}/api/public/promotion/${promoId}`).then(resp => resp.json())

  if (!response.success) {
    console.error(`FATAL ERROR: Promotion does not exist or is no longer valid`, `source: ${request.url}`)
    throw new Response("Promotion does not exist or is no longer valid", {status: 404})
  }
  const currAnimal = response.data.listings.find((l) => l.animalUuid === animalId)
  if (!currAnimal) {
    console.error(`FATAL ERROR: Promotion does not contain this animal ${params.animalId}`, `source: ${request.url}`)
    throw new Response("Promotion does not contain this animal", {status: 404})
  }
  const months = moment().diff(new Date(currAnimal.dob), 'months')

  const client = new S3Client({
    region: 'ap-southeast-2'
  });

  let animalphoto = ''
  try {
    const command = new GetObjectCommand({
      Bucket: "easydairy-public",
      Key: `userUploads/${response.data.businessId}/${animalId}_promo.jpg`,
    });
    const imgResponse = await client.send(command);
    // The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
    const str = await imgResponse.Body?.transformToByteArray();
    if (str) {
      animalphoto = 'data:image/jpeg;base64,' + Buffer.from(str).toString('base64')
    }
  } catch (err) {
    console.error(err);
  }
  return json({
    promotion: {
      promoId,
      ...currAnimal,
      age: `${Math.floor(months/12)} years ${months % 12} months old`,
      fat: Math.round(currAnimal.fatKg / currAnimal.milkPerYear * 10000) / 100,
      protein: Math.round(currAnimal.proteinKg / currAnimal.milkPerYear * 10000) / 100, 
      image: animalphoto
    },
    business: response.data.business
  })
}

export default function SinglePromotion() {
  const data = useLoaderData<typeof loader>()
  const navi = useNavigate()
  const goBack = () => {
    window.history.length > 1 ? window.history.back() : navi(`/promotion/${data.promotion.promoId}`)
  }
  return (
    <main className="bg-gray-100">
      <header className="text-center">
        <h1 className="text-3xl bg-primary-500 p-2 text-white relative">
          <button onClick={goBack} type="button" className="absolute left-2 top-3.5">
            <FaAngleLeft className="text-white text-2xl" />
          </button>
          {data.promotion.name}
        </h1>
        <p className="p-1.5 text-black bg-secondary-500 font-bold">By {data.business}</p>
      </header>
      <section className="w-full max-w-2xl m-auto flex justify-center min-h-[300px]">
        {data.promotion.image ?
        <img src={data.promotion.image} alt={data.promotion.name} className="object-cover" />
        : <div className="h-80 bg-gray-200 flex justify-center items-center w-full">
          <FaImage className="text-gray-700 text-3xl" />
        </div>}
      </section>
      <section className="bg-primary-500 p-3 flex flex-col gap-1 justify-center items-center">
        <h4 className="text-2xl text-white">${data.promotion.price}</h4>
        <p className="font-bold text-white">{data.promotion.age}</p>
      </section>
      <section className="p-4 m-auto max-w-2xl flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-2 text-center">
            <h6 className="text-2xl">{(data.promotion.milkPerYear ?? 0).toLocaleString()}KG</h6>
            <p>Milk/Year</p>
          </div>
          <div className="bg-white p-2 text-center">
            <h6 className="text-2xl">{data.promotion.fat ?? 0}%</h6>
            <p>Fat</p>
          </div>
          <div className="bg-white p-2 text-center">
            <h6 className="text-2xl">{data.promotion.protein ?? 0}%</h6>
            <p>Protein</p>
          </div>
        </div>
        <div className="flex justify-between items-center bg-white">
          <p className="px-4 py-2">Australian Selection Index (ASI)</p>
          <div className="bg-primary-500 p-2 text-white font-bold">{data.promotion.asi ?? 0}</div>
        </div>
        <div className="flex justify-between items-center bg-white">
          <p className="px-4 py-2">Balanced Performance Index (BPI)</p>
          <div className="bg-primary-500 p-2 text-white font-bold">{data.promotion.bpi ?? 0}</div>
        </div>
        <div className="flex justify-between items-center bg-white">
          <p className="px-4 py-2">Health Weighted Index (HWI)</p>
          <div className="bg-primary-500 p-2 text-white font-bold">{data.promotion.hwi ?? 0}</div>
        </div>
      </section>
      <section className="bg-primary-500 p-2 flex justify-center">
        <p className="font-bold text-white">{data.promotion.milkSession ?? '0 days'} in milk last session</p>
      </section>
      {data.promotion.description && <section className="px-4 pt-4 max-w-2xl m-auto">
        <div className="p-4 bg-white overflow-hidden break-words">
          <h4 className="text-2xl text-black mb-2">Additional Information</h4>
          <QuillComponent
            theme={'snow'}
            value={data.promotion.description}
            modules= {{
              "toolbar": false
            }}
            readOnly={true}
            className="border-none"
          />
          {/* <p>{data.promotion.description}</p> */}
        </div>
      </section>}
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